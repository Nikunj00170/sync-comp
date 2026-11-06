package com.airtelsync.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"COGNITO_ISSUER_URI=", "COGNITO_CLIENT_ID=", "SYNC_CORS_ALLOWED_ORIGINS=http://localhost:5173"})
class CorsTest {
    @Autowired WebApplicationContext context;
    @Test void allowsConfiguredPreflightButKeepsActualRequestAuthenticated() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(SecurityMockMvcConfigurers.springSecurity()).build();
        mvc.perform(options("/v1/me").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "PUT").header("Access-Control-Request-Headers", "authorization,content-type"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(get("/v1/me").header("Origin", "http://localhost:5173"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
        mvc.perform(options("/v1/me").header("Origin", "https://untrusted.example")
            .header("Access-Control-Request-Method", "PUT")).andExpect(status().isForbidden());
        mvc.perform(get("/v1/me").header("Authorization", "Bearer malformed"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
}
