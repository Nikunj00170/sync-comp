package com.airtelsync.backend;

import com.airtelsync.backend.config.CognitoJwtTestConfiguration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.builder.SpringApplicationBuilder;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

/** Test-only HTTP server. Signing keys and fixture tokens never enter the production JAR. */
public class FrontendIntegrationServer {
    public static void main(String[] args) throws Exception {
        var app = new SpringApplicationBuilder(SyncBackendApplication.class, CognitoJwtTestConfiguration.class)
            .properties("server.port=18081", "SYNC_DEMO_ENABLED=true", "KYC_MODE=mock",
                "SYNC_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5174", "COGNITO_ISSUER_URI=", "COGNITO_CLIENT_ID=")
            .run(args);
        var users = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < 32; i++) {
            String subject = "frontend-" + UUID.randomUUID();
            var expiry = Instant.now().plusSeconds(3600);
            String token = CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
                CognitoJwtTestConfiguration.CLIENT_ID, "access", expiry, null, subject,
                "frontend@example.com", "Frontend Customer", CognitoJwtTestConfiguration.TEST_KEY_PAIR);
            users.add(Map.of("access_token", token, "token_type", "Bearer", "scope", "openid email",
                "expires_at", expiry.getEpochSecond(), "profile", Map.of("sub", subject, "email", "frontend@example.com", "name", "Frontend Customer")));
        }
        Path fixture = Path.of(System.getenv("SYNC_FRONTEND_AUTH_FILE"));
        Files.writeString(fixture, new ObjectMapper().writeValueAsString(users), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        Runtime.getRuntime().addShutdownHook(new Thread(app::close));
    }
}
