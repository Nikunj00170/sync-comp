package com.airtelsync.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airtelsync.backend.TestcontainersConfiguration;
import com.airtelsync.backend.config.CognitoJwtTestConfiguration;
import com.airtelsync.backend.domain.quote.QuoteService;
import com.airtelsync.backend.dto.request.QuoteRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

@Import({TestcontainersConfiguration.class, CognitoJwtTestConfiguration.class})
@SpringBootTest(properties = {
    "COGNITO_ISSUER_URI=" + CognitoJwtTestConfiguration.ISSUER,
    "COGNITO_CLIENT_ID=" + CognitoJwtTestConfiguration.CLIENT_ID
})
class QuoteControllerTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private QuoteService quoteService;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
    }

    private String validToken() {
        return CognitoJwtTestConfiguration.token(
            CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID,
            "access",
            java.time.Instant.now().plusSeconds(300),
            CognitoJwtTestConfiguration.TEST_KEY_PAIR
        );
    }

    @Test
    void createQuoteWithValidRequestReturns200() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P01", 1))
        ));

        MvcResult result = mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        String response = result.getResponse().getContentAsString();
        assert response.contains("\"version\":\"case-2026-07-v1\"");
        assert response.contains("\"productId\":\"P01\"");
        assert response.contains("\"monthly\":99900");
        assert response.contains("\"setup\":0");
        assert response.contains("\"tax\":17982");
        assert response.contains("\"total\":117882");
    }

    @Test
    void createQuoteRejectsEmptyLines() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(List.of()));

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createQuoteRejectsNullLines() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(null));

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createQuoteRejectsMissingProductId() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("", 1))
        ));

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details[0].field").value("lines[0].productId"));
    }

    @Test
    void createQuoteRejectsZeroQuantity() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P01", 0))
        ));

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details[0].field").value("lines[0].quantity"));
    }

    @Test
    void createQuoteRejectsNegativeQuantity() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P01", -1))
        ));

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createQuoteRejectsQuantityOverLimit() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P01", 1001))
        ));

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createQuoteRejectsMalformedJson() throws Exception {
        String body = "{ invalid json }";

        mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
    }

    @Test
    void createQuoteRejectsUnauthenticatedRequest() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P01", 1))
        ));

        mockMvc.perform(post("/v1/quotes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void createQuoteDoesNotTrustClientPrices() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P01", 2))
        ));

        MvcResult result = mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        String response = result.getResponse().getContentAsString();
        assert response.contains("\"monthly\":199800");
        assert response.contains("\"total\":235764");
    }

    @Test
    void createQuoteReturnsDomainValidationErrors() throws Exception {
        String body = objectMapper.writeValueAsString(new QuoteRequest(
            List.of(new QuoteRequest.CartLineRequest("P06", 1))
        ));

        MvcResult result = mockMvc.perform(post("/v1/quotes")
                .header("Authorization", "Bearer " + validToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        String response = result.getResponse().getContentAsString();
        assert response.contains("\"errors\"");
        assert response.contains("Internet Leased Line 100");
        assert response.contains("employees");
    }
}