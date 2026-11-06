package com.airtelsync.backend.config;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;

class CognitoValidatorTest {
    @Test void missingConfigurationFailsClosed() {
        var decoder = new CognitoJwtDecoderConfiguration().cognitoJwtDecoder("", "");
        assertThrows(BadJwtException.class, () -> decoder.decode("anything"));
    }

    @Test void requiresSubjectAndExpiration() {
        var validator = CognitoJwtDecoderConfiguration.cognitoAccessTokenValidator("client");
        for (String subject : new String[]{"", " "}) {
            var jwt = Jwt.withTokenValue("test").header("alg", "RS256").subject(subject)
                .expiresAt(Instant.now().plusSeconds(300)).claim("token_use", "access")
                .claim("client_id", "client").build();
            assertTrue(validator.validate(jwt).hasErrors());
        }
        var jwt = Jwt.withTokenValue("test").header("alg", "RS256").subject("customer")
            .claim("token_use", "access").claim("client_id", "client").build();
        assertTrue(validator.validate(jwt).hasErrors());
    }
}
