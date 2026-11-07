package com.airtelsync.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(CognitoJwtTestConfiguration.class)
class DefaultDevCorsTest {
    @Autowired WebApplicationContext context;
    @Test void defaultBackendAcceptsTheActualViteLoopbackOriginWithoutWeakeningAuthentication() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(SecurityMockMvcConfigurers.springSecurity()).build();
        mvc.perform(get("/health").header("Origin", "http://127.0.0.1:5173"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5173"));
        mvc.perform(get("/v1/me").header("Origin", "http://127.0.0.1:5173"))
            .andExpect(status().isUnauthorized());
    }
}
