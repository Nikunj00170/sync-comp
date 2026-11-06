package com.airtelsync.backend.controller;

import com.airtelsync.backend.config.CognitoJwtTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "SYNC_DEMO_ENABLED=false")
@Import(CognitoJwtTestConfiguration.class)
class DemoDisabledTest {
    @Autowired WebApplicationContext context;
    @Test void demoVerificationAndCheckoutFailClosed() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(SecurityMockMvcConfigurers.springSecurity()).build();
        String auth = "Bearer " + CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), CognitoJwtTestConfiguration.TEST_KEY_PAIR);
        mvc.perform(post("/v1/kyc/demo-verification").header("Authorization", auth))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.error.code").value("DEMO_DISABLED"));
        mvc.perform(post("/v1/orders").header("Authorization", auth).header("Idempotency-Key", "checkout-123")
            .contentType(MediaType.APPLICATION_JSON).content(OrdersControllerTest.BODY))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.error.code").value("DEMO_DISABLED"));
    }
}
