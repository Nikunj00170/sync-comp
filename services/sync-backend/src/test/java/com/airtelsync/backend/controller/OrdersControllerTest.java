package com.airtelsync.backend.controller;

import com.airtelsync.backend.config.CognitoJwtTestConfiguration;
import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.persistence.CustomerStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "SYNC_DEMO_ENABLED=true")
@Import(CognitoJwtTestConfiguration.class)
class OrdersControllerTest {
    @Autowired WebApplicationContext context;
    @Autowired CustomerStore store;
    @Autowired ProfileService profiles;
    MockMvc mvc;
    String subject, auth;
    static final String BODY = "{\"lines\":[{\"productId\":\"P01\",\"quantity\":1}],\"demoConsent\":true}";
    @BeforeEach void setup() {
        subject = UUID.randomUUID().toString(); auth = token(subject);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(SecurityMockMvcConfigurers.springSecurity()).build();
        profiles.updateProfile(subject, TestFixtures.demoProfile());
    }
    String token(String sub) {
        return "Bearer " + CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), null,
            sub, null, null, CognitoJwtTestConfiguration.TEST_KEY_PAIR);
    }
    void verify() {
        store.transact(subject, List.of(CustomerStore.Write.create("KYC", new Kyc("demo_verified", "digio", true, List.of(), Instant.now().toString()))));
    }
    String create(String key) throws Exception {
        return mvc.perform(post("/v1/orders").header("Authorization", auth).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
    }
    @Test void emptyCollectionsAndAuthentication() throws Exception {
        mvc.perform(get("/v1/orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/invoices")).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/orders").header("Authorization", auth)).andExpect(content().json("[]"));
    }
    @Test void checkoutIsAtomicAndIdempotentAndOwnerScoped() throws Exception {
        verify();
        String first = create("checkout-123");
        assertEquals(first, create("checkout-123"));
        var order = store.list(subject, "ORDER#", Order.class, 100, null).items().getFirst();
        mvc.perform(get("/v1/orders/" + order.id()).header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.quote.total").value(117882));
        mvc.perform(get("/v1/orders/" + order.id()).header("Authorization", token("another")))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        mvc.perform(get("/v1/invoices").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].lines[0].unitPrice").value(99900));
        mvc.perform(get("/v1/invoices").header("Authorization", token("another"))).andExpect(content().json("[]"));
        mvc.perform(post("/v1/orders/" + order.id() + "/cancel").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));
        mvc.perform(post("/v1/orders/" + order.id() + "/cancel").header("Authorization", auth))
            .andExpect(status().isConflict());
    }
    @Test void requiresKycAndIdempotencyAndConsent() throws Exception {
        mvc.perform(post("/v1/orders").header("Authorization", auth).header("Idempotency-Key", "checkout-123")
            .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isBadRequest());
        verify();
        mvc.perform(post("/v1/orders").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isBadRequest());
        mvc.perform(post("/v1/orders").header("Authorization", auth).header("Idempotency-Key", "checkout-123")
            .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("true", "false"))).andExpect(status().isBadRequest());
        create("checkout-123");
        mvc.perform(post("/v1/orders").header("Authorization", auth).header("Idempotency-Key", "checkout-123")
            .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("quantity\":1", "quantity\":2")))
            .andExpect(status().isConflict());
    }
    @Test void paginationAndInvalidInputs() throws Exception {
        verify(); create("checkout-123"); create("checkout-456");
        var response = mvc.perform(get("/v1/orders?limit=1").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andReturn().getResponse();
        assertNotNull(response.getHeader("X-Next-Cursor"));
        mvc.perform(get("/v1/orders").param("limit", "1").param("after", response.getHeader("X-Next-Cursor"))
            .header("Authorization", auth)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/v1/orders?limit=101").header("Authorization", auth)).andExpect(status().isBadRequest());
    }
}
