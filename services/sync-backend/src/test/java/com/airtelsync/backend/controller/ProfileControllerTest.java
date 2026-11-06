package com.airtelsync.backend.controller;

import com.airtelsync.backend.config.CognitoJwtTestConfiguration;
import org.junit.jupiter.api.*;
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
class ProfileControllerTest {
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    String subject;
    static final String BODY = """
        {"name":"  Customer One  ","business":"Example Studio","email":"contact@example.com",
        "industry":"retail","city":"Mumbai","tier":2,"employees":10,"sites":2,
        "budget":20000,"hasGstin":false,"priorities":["productivity"],"address":"123 Road","phone":"ext. 123"}
        """;

    @BeforeEach void setup() {
        subject = UUID.randomUUID().toString();
        mvc = MockMvcBuilders.webAppContextSetup(context)
            .apply(SecurityMockMvcConfigurers.springSecurity()).build();
    }

    String token(String sub) {
        return "Bearer " + CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), null,
            sub, "same-email@example.com", "Initial Name", CognitoJwtTestConfiguration.TEST_KEY_PAIR);
    }

    @Test void requiresAuthentication() throws Exception {
        mvc.perform(get("/v1/me")).andExpect(status().isUnauthorized());
        mvc.perform(put("/v1/me").contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isUnauthorized());
    }

    @Test void onboardingDefaultsDoNotSaveOrInventAnIdentity() throws Exception {
        mvc.perform(get("/v1/me").header("Authorization", token(subject)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.business").value(""));
    }

    @Test void firstPutCreatesAndSubsequentGetsRetainContactFields() throws Exception {
        mvc.perform(put("/v1/me").header("Authorization", token(subject))
            .contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Customer One"))
            .andExpect(jsonPath("$.email").value("contact@example.com"));
        mvc.perform(get("/v1/me").header("Authorization", token(subject)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.business").value("Example Studio"));
    }

    @Test void subjectsWithSameEmailCannotReadOrOverwriteEachOther() throws Exception {
        String other = UUID.randomUUID().toString();
        mvc.perform(put("/v1/me").header("Authorization", token(subject))
            .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isOk());
        mvc.perform(get("/v1/me").header("Authorization", token(other)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.business").value(""));
        mvc.perform(put("/v1/me").header("Authorization", token(other))
            .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("Example Studio", "Other Business")))
            .andExpect(status().isOk());
        mvc.perform(get("/v1/me").header("Authorization", token(subject)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.business").value("Example Studio"));
    }

    @Test void validatesTrimmedNamesAndRequiredFields() throws Exception {
        for (String body : new String[]{BODY.replace("  Customer One  ", " x "),
                BODY.replace("20000", "499"), BODY.replace("[\"productivity\"]", "[null]"),
                BODY.replace("\"123 Road\"", "null"), BODY.replace("contact@example.com", "invalid")}) {
            mvc.perform(put("/v1/me").header("Authorization", token(subject))
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        }
    }

    @Test void rejectsMalformedJson() throws Exception {
        mvc.perform(put("/v1/me").header("Authorization", token(subject))
            .contentType(MediaType.APPLICATION_JSON).content("{"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
    }
}
