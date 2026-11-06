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

@SpringBootTest(properties = "SYNC_DEMO_ENABLED=true")
@Import(CognitoJwtTestConfiguration.class)
class DocumentsControllerTest {
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    String auth;
    ObjectMapper json = new ObjectMapper();
    @BeforeEach void setup() {
        auth = token(UUID.randomUUID().toString());
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(SecurityMockMvcConfigurers.springSecurity()).build();
    }
    String token(String subject) {
        return "Bearer " + CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), null,
            subject, null, null, CognitoJwtTestConfiguration.TEST_KEY_PAIR);
    }
    String reserve() throws Exception {
        var body = mvc.perform(post("/v1/documents/uploads").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"business.pdf\",\"type\":\"application/pdf\",\"size\":4}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.uploadUrl").isString())
            .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("documentId").asText();
    }
    void upload(String id) throws Exception {
        mvc.perform(put("/v1/documents/" + id + "/content").header("Authorization", auth)
            .contentType("application/pdf").content("test")).andExpect(status().isNoContent());
        mvc.perform(post("/v1/documents/" + id + "/complete").header("Authorization", auth)).andExpect(status().isOk());
    }
    @Test void twoUploadsAndConsentEnableOnlyDemoVerification() throws Exception {
        String first = reserve();
        mvc.perform(post("/v1/documents/" + first + "/complete").header("Authorization", auth))
            .andExpect(status().isConflict());
        upload(first); upload(reserve());
        mvc.perform(post("/v1/kyc/demo-verification").header("Authorization", auth)).andExpect(status().isConflict());
        mvc.perform(put("/v1/kyc").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
            .content("{\"provider\":\"digio\",\"consent\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("pending"));
        mvc.perform(post("/v1/kyc/demo-verification").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("demo_verified"));
        mvc.perform(put("/v1/kyc").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
            .content("{\"provider\":\"digio\",\"consent\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("pending"));
    }
    @Test void customerCannotUploadOrCompleteAnotherCustomersDocument() throws Exception {
        String id = reserve(); String other = token(UUID.randomUUID().toString());
        mvc.perform(put("/v1/documents/" + id + "/content").header("Authorization", other)
            .contentType("application/pdf").content("test")).andExpect(status().isNotFound());
        mvc.perform(post("/v1/documents/" + id + "/complete").header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(get("/v1/kyc").header("Authorization", other)).andExpect(jsonPath("$.documents.length()").value(0));
    }
    @Test void enforcesSizeTypeAndNoOverwriteAndIdempotentCompletion() throws Exception {
        String id = reserve();
        mvc.perform(put("/v1/documents/" + id + "/content").header("Authorization", auth)
            .contentType("image/png").content("test")).andExpect(status().isBadRequest());
        mvc.perform(put("/v1/documents/" + id + "/content").header("Authorization", auth)
            .contentType("application/pdf").content("too long")).andExpect(status().isBadRequest());
        upload(id);
        mvc.perform(post("/v1/documents/" + id + "/complete").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/v1/kyc").header("Authorization", auth)).andExpect(jsonPath("$.documents.length()").value(1));
        mvc.perform(put("/v1/documents/" + id + "/content").header("Authorization", auth)
            .contentType("application/pdf").content("test")).andExpect(status().isConflict());
    }
    @Test void rejectsInvalidMetadataAndUnauthenticatedCalls() throws Exception {
        mvc.perform(post("/v1/documents/uploads")).andExpect(status().isUnauthorized());
        for (String body : new String[]{"{\"name\":\"a\",\"type\":\"text/html\",\"size\":4}",
            "{\"name\":\"a\",\"type\":\"application/pdf\",\"size\":10485761}"}) {
            mvc.perform(post("/v1/documents/uploads").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
    }
    @Test void limitsReservationsToEight() throws Exception {
        for (int i = 0; i < 8; i++) reserve();
        mvc.perform(post("/v1/documents/uploads").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"a\",\"type\":\"application/pdf\",\"size\":4}"))
            .andExpect(status().isConflict());
    }
    @Test void reservationsCanBeRenewedAndDeletedWithoutLeakingOwnershipOrQuota() throws Exception {
        String id = reserve();
        mvc.perform(get("/v1/documents").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].key").doesNotExist());
        mvc.perform(get("/v1/documents").header("Authorization", token(UUID.randomUUID().toString())))
            .andExpect(content().json("[]"));
        mvc.perform(post("/v1/documents/" + id + "/uploads").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.documentId").value(id));
        upload(id);
        mvc.perform(delete("/v1/documents/" + id).header("Authorization", token(UUID.randomUUID().toString())))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/v1/documents/" + id).header("Authorization", auth)).andExpect(status().isNoContent());
        mvc.perform(delete("/v1/documents/" + id).header("Authorization", auth)).andExpect(status().isNoContent());
        mvc.perform(get("/v1/kyc").header("Authorization", auth)).andExpect(jsonPath("$.documents.length()").value(0))
            .andExpect(jsonPath("$.status").value("pending"));
        mvc.perform(post("/v1/documents/" + id + "/complete").header("Authorization", auth)).andExpect(status().isNotFound());
        for (int i = 0; i < 8; i++) reserve();
    }
    @Test void completeCustomerJourneyKeepsInvoiceSnapshotAfterProfileChanges() throws Exception {
        mvc.perform(put("/v1/me").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
            .content(ProfileControllerTest.BODY)).andExpect(status().isOk());
        upload(reserve()); upload(reserve());
        mvc.perform(put("/v1/kyc").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
            .content("{\"provider\":\"digilocker\",\"consent\":true}")).andExpect(status().isOk());
        mvc.perform(post("/v1/kyc/demo-verification").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/v1/recommendations").header("Authorization", auth))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3));
        mvc.perform(post("/v1/orders").header("Authorization", auth).header("Idempotency-Key", "journey-123")
            .contentType(MediaType.APPLICATION_JSON).content(OrdersControllerTest.BODY))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.quote.total").value(117882));
        mvc.perform(put("/v1/me").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
            .content(ProfileControllerTest.BODY.replace("Example Studio", "Changed Business"))).andExpect(status().isOk());
        mvc.perform(get("/v1/invoices").header("Authorization", auth)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].billedTo.business").value("Example Studio"))
            .andExpect(jsonPath("$[0].total").value(117882));
    }
}
