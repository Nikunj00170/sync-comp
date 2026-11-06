package com.airtelsync.backend.controller;

import com.airtelsync.backend.config.CognitoJwtTestConfiguration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(CognitoJwtTestConfiguration.class)
class ActivityControllerTest {
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    String auth;
    static final String BODY = "{\"subject\":\"Broadband issue\",\"category\":\"Connectivity\",\"description\":\"Please check the broadband connection.\"}";
    @BeforeEach void setup() {
        auth = token(UUID.randomUUID().toString());
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(SecurityMockMvcConfigurers.springSecurity()).build();
    }
    String token(String subject) {
        return "Bearer " + CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), null,
            subject, null, null, CognitoJwtTestConfiguration.TEST_KEY_PAIR);
    }
    @Test void ticketLifecycleAndNotificationOwnership() throws Exception {
        var json = new ObjectMapper();
        var result = mvc.perform(post("/v1/tickets").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("open")).andReturn().getResponse().getContentAsString();
        String id = json.readTree(result).get("id").asText();
        mvc.perform(get("/v1/tickets").header("Authorization", auth)).andExpect(jsonPath("$.length()").value(1));
        String other = token(UUID.randomUUID().toString());
        mvc.perform(get("/v1/tickets/" + id).header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(post("/v1/tickets/" + id + "/resolve").header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(post("/v1/tickets/" + id + "/resolve").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("resolved"));
        String notices = mvc.perform(get("/v1/notifications").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andReturn().getResponse().getContentAsString();
        String nid = json.readTree(notices).get(0).get("id").asText();
        mvc.perform(post("/v1/notifications/" + nid + "/read").header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(post("/v1/notifications/" + nid + "/read").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true));
        mvc.perform(get("/v1/notifications").header("Authorization", other)).andExpect(content().json("[]"));
    }
    @Test void validatesAndRequiresAuthentication() throws Exception {
        mvc.perform(get("/v1/tickets")).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(post("/v1/tickets").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
            .content(BODY.replace("Broadband issue", "x"))).andExpect(status().isBadRequest());
        mvc.perform(get("/v1/absent").header("Authorization", auth)).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        mvc.perform(post("/v1/admin/demo/orders/anything/advance").header("Authorization", auth))
            .andExpect(status().isForbidden());
    }
}
