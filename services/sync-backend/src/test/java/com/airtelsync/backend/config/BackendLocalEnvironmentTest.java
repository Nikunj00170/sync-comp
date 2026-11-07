package com.airtelsync.backend.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.annotation.Import;
import com.airtelsync.backend.persistence.*;
import com.airtelsync.backend.application.DocumentStorage;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.core.env.*;
import org.springframework.mock.env.MockEnvironment;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class BackendLocalEnvironmentTest {
    @TempDir Path temporary;
    @TestConfiguration(proxyBeanMethods = false) static class EmptyApp {}

    @Test void parsesQuotesCommentsEmptyValuesAndLiteralShellText() {
        var parsed = BackendLocalEnvironment.parse("\uFEFF# local only\nexport AWS_REGION=ap-south-1 # comment\nSCOPE=\"openid email\"\nEMPTY=\nTOKEN='literal#value'\nTEXT=\"a\\\"b\\nline\"\nLITERAL=$(do-not-execute)\n");
        assertEquals("ap-south-1", parsed.get("AWS_REGION"));
        assertEquals("openid email", parsed.get("SCOPE"));
        assertEquals("", parsed.get("EMPTY"));
        assertEquals("literal#value", parsed.get("TOKEN"));
        assertEquals("a\"b\nline", parsed.get("TEXT"));
        assertEquals("$(do-not-execute)", parsed.get("LITERAL"));
    }
    @Test void malformedConfigurationReportsLineWithoutLeakingItsValue() {
        for (String line : List.of("SECRET=\"private-secret", "SECRET=\"private-secret\" extra", "private-secret")) {
            var error = assertThrows(IllegalStateException.class, () -> BackendLocalEnvironment.parse(line));
            assertTrue(error.getMessage().contains("line 1"));
            assertFalse(error.getMessage().contains("private-secret"));
        }
    }
    @Test void discoversBackendFileFromEitherWorkingDirectoryAndIgnoresRootEnv() throws Exception {
        Path backend = temporary.resolve("services/sync-backend");
        Path main = backend.resolve("src/main/java/com/airtelsync/backend/SyncBackendApplication.java");
        Files.createDirectories(main.getParent()); Files.writeString(main, "// fixture");
        Files.writeString(temporary.resolve(".env.local"), "GEMINI_API_KEY=never-load-root\n");
        assertEquals(backend.resolve(".env.local"), BackendLocalEnvironment.locate(temporary));
        assertEquals(backend.resolve(".env.local"), BackendLocalEnvironment.locate(backend));
        assertNull(BackendLocalEnvironment.locate(temporary.resolve("unrelated")));
    }
    @Test void realEnvironmentOverridesFileAndCanonicalPropertiesResolve() throws Exception {
        Path file = temporary.resolve(".env.local");
        Files.writeString(file, "SYNC_STORAGE=dynamodb\nAWS_REGION=ap-south-1\n");
        var env = new MockEnvironment().withProperty("SYNC_BACKEND_ENV_FILE", file.toString());
        env.getPropertySources().addFirst(new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
            Map.of("SYNC_STORAGE", "memory")));
        new BackendLocalEnvironment().postProcessEnvironment(env, new SpringApplication(EmptyApp.class));
        assertEquals("memory", env.getProperty("sync.storage"));
        assertEquals("ap-south-1", env.getProperty("aws.region"));
        assertEquals("ap-south-1", new AwsAdaptersConfiguration(env).region().id());
    }
    @Test void optionalMissingFileAndDisabledLoaderDoNotInterfere() {
        var env = new MockEnvironment().withProperty("SYNC_BACKEND_ENV_ENABLED", "false")
            .withProperty("SYNC_BACKEND_ENV_FILE", temporary.resolve("missing").toString());
        new BackendLocalEnvironment().postProcessEnvironment(env, new SpringApplication(EmptyApp.class));
        assertFalse(env.getPropertySources().contains(BackendLocalEnvironment.SOURCE));
    }
    @Test void explicitMissingFileFailsClearly() {
        var env = new MockEnvironment().withProperty("SYNC_BACKEND_ENV_FILE", temporary.resolve("missing").toString());
        assertThrows(IllegalStateException.class, () -> new BackendLocalEnvironment().postProcessEnvironment(env, new SpringApplication(EmptyApp.class)));
    }
    @TestConfiguration(proxyBeanMethods = false)
    @Import({AwsAdaptersConfiguration.class, DynamoDbCustomerStore.class, InMemoryCustomerStore.class, InMemoryDocumentStorage.class})
    static class DynamoOnlyApp {}

    @Test void fileSelectsDynamoAdapterAndSdkRegionWithoutEnablingS3() throws Exception {
        Path file = temporary.resolve("backend.env");
        Files.writeString(file, "SYNC_STORAGE=dynamodb\nSYNC_DOCUMENTS=memory\nAWS_REGION=ap-south-1\nCUSTOMERS_TABLE=customers-test\nORDERS_TABLE=orders-test\nACTIVITY_TABLE=activity-test\n");
        var app = new SpringApplication(DynamoOnlyApp.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setLogStartupInfo(false);
        try (var context = app.run("--SYNC_BACKEND_ENV_ENABLED=true", "--SYNC_BACKEND_ENV_FILE=" + file, "--spring.main.banner-mode=off")) {
            assertInstanceOf(DynamoDbCustomerStore.class, context.getBean(CustomerStore.class));
            assertInstanceOf(InMemoryDocumentStorage.class, context.getBean(DocumentStorage.class));
            assertEquals("ap-south-1", context.getBean(DynamoDbClient.class).serviceClientConfiguration().region().id());
        }
    }

    @Test void actualSpringStartupLoadsFileBeforeProfilesAndHonorsCommandLineOverrides() throws Exception {
        Path file = temporary.resolve(".env.local");
        Files.writeString(file, "SPRING_PROFILES_ACTIVE=env-fixture\nSYNC_STORAGE=dynamodb\nAWS_REGION=ap-south-1\nQUOTED=\"two words\"\n");
        var app = new SpringApplication(EmptyApp.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setLogStartupInfo(false);
        try (var context = app.run("--SYNC_BACKEND_ENV_ENABLED=true", "--SYNC_BACKEND_ENV_FILE=" + file,
            "--sync.storage=memory", "--spring.main.banner-mode=off")) {
            var env = context.getEnvironment();
            assertTrue(Arrays.asList(env.getActiveProfiles()).contains("env-fixture"));
            assertEquals("memory", env.getProperty("sync.storage"));
            assertEquals("two words", env.getProperty("QUOTED"));
            assertEquals("ap-south-1", env.getProperty("aws.region"));
        }
    }
}
