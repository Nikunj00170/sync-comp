package com.airtelsync.backend.config;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Optional, backend-only local configuration. Never reads the repository's frontend/AI dotenv file. */
public final class BackendLocalEnvironment implements EnvironmentPostProcessor, Ordered {
    static final String SOURCE = "syncBackendLocal-systemEnvironment";
    public int getOrder() { return ConfigDataEnvironmentPostProcessor.ORDER - 1; }

    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!environment.getProperty("SYNC_BACKEND_ENV_ENABLED", Boolean.class, true)) return;
        String configured = environment.getProperty("SYNC_BACKEND_ENV_FILE");
        // Deployed functions use real runtime configuration; local files are for development.
        if (configured == null && environment.containsProperty("AWS_LAMBDA_FUNCTION_NAME")) return;
        Path file = configured == null ? locate(Path.of(System.getProperty("user.dir"))) : Path.of(configured);
        if (file == null || (configured == null && !Files.exists(file))) return;
        try {
            if (Files.size(file) > 128 * 1024) throw new IOException("Local environment file is too large");
            var values = parse(Files.readString(file, StandardCharsets.UTF_8));
            var source = new SystemEnvironmentPropertySource(SOURCE, values);
            var sources = environment.getPropertySources();
            // OS variables/IDE overrides win. Config data is loaded after us, below this local source.
            if (sources.contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME))
                sources.addAfter(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, source);
            else sources.addLast(source);
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot read backend local environment file: " + file, ex);
        }
    }

    static Path locate(Path directory) {
        Path working = directory.toAbsolutePath().normalize();
        String application = "src/main/java/com/airtelsync/backend/SyncBackendApplication.java";
        if (Files.isRegularFile(working.resolve(application))) return working.resolve(".env.local");
        Path backend = working.resolve("services/sync-backend");
        if (Files.isRegularFile(backend.resolve(application))) return backend.resolve(".env.local");
        return null;
    }

    static Map<String, Object> parse(String text) {
        var result = new LinkedHashMap<String, Object>();
        String[] lines = text.replaceFirst("^\\uFEFF", "").split("\\R", -1);
        for (int index = 0; index < lines.length; index++) {
            String line = lines[index].strip();
            if (line.isEmpty() || line.startsWith("#")) continue;
            if (line.startsWith("export ")) line = line.substring(7).stripLeading();
            int separator = line.indexOf('=');
            if (separator < 1 || !line.substring(0, separator).strip().matches("[A-Za-z_][A-Za-z0-9_]*"))
                throw invalid(index);
            String key = line.substring(0, separator).strip();
            String value = line.substring(separator + 1).strip();
            if (value.startsWith("\"") || value.startsWith("'")) {
                char quote = value.charAt(0); var decoded = new StringBuilder(); boolean closed = false;
                for (int i = 1; i < value.length(); i++) {
                    char c = value.charAt(i);
                    if (c == quote) {
                        String tail = value.substring(i + 1).strip();
                        if (!tail.isEmpty() && !tail.startsWith("#")) throw invalid(index);
                        closed = true; break;
                    }
                    if (quote == '"' && c == '\\' && i + 1 < value.length()) {
                        char escaped = value.charAt(++i);
                        switch (escaped) {
                            case 'n' -> decoded.append('\n'); case 'r' -> decoded.append('\r');
                            case 't' -> decoded.append('\t'); case '"', '\\' -> decoded.append(escaped);
                            default -> decoded.append('\\').append(escaped);
                        }
                    } else decoded.append(c);
                }
                if (!closed) throw invalid(index);
                value = decoded.toString();
            } else value = value.replaceFirst("\\s+#.*$", "").stripTrailing();
            // Literal values only: never execute shell commands or expand secrets from other files.
            result.put(key, value);
        }
        return result;
    }
    private static IllegalStateException invalid(int index) {
        return new IllegalStateException("Invalid backend .env.local syntax at line " + (index + 1) + "; use KEY=value or a quoted single-line value.");
    }
}
