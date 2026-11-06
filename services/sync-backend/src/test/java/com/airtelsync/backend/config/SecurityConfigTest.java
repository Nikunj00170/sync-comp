package com.airtelsync.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.web.context.WebApplicationContext;

import com.airtelsync.backend.TestcontainersConfiguration;

import java.security.KeyPairGenerator;
import java.time.Instant;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@Import({TestcontainersConfiguration.class, CognitoJwtTestConfiguration.class, JwtAuthenticationTestController.class})
@SpringBootTest(properties = {
	"COGNITO_ISSUER_URI=" + CognitoJwtTestConfiguration.ISSUER,
	"COGNITO_CLIENT_ID=" + CognitoJwtTestConfiguration.CLIENT_ID
})
class SecurityConfigTest {

	@Autowired
	private WebApplicationContext context;

	private MockMvc mockMvc;

	@BeforeEach
	void setup() {
		mockMvc = MockMvcBuilders.webAppContextSetup(context)
			.apply(SecurityMockMvcConfigurers.springSecurity())
			.build();
	}

	@Test
	void healthEndpointPermitsUnauthenticatedAccess() throws Exception {
		mockMvc.perform(get("/health"))
			.andExpect(status().isOk());
	}

	@Test
	void catalogueEndpointPermitsUnauthenticatedAccess() throws Exception {
		mockMvc.perform(get("/v1/catalogue"))
			.andExpect(status().isOk());
	}

	@Test
	void quoteEndpointRequiresAuthentication() throws Exception {
		String body = """
			{
				"lines": [
					{"productId": "P01", "quantity": 1}
				]
			}
			""";
		mockMvc.perform(post("/v1/quotes")
				.contentType(MediaType.APPLICATION_JSON)
				.content(body))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
	}

	@Test
	void unknownEndpointRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/unknown"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void actuatorEndpointsRequireAuthentication() throws Exception {
		mockMvc.perform(get("/actuator/health"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsInvalidBearerCredentials() throws Exception {
		mockMvc.perform(post("/v1/quotes")
				.header("Authorization", "Bearer not-a-jwt")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"lines\":[]}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsInvalidSignature() throws Exception {
		var otherPair = KeyPairGenerator.getInstance("RSA").generateKeyPair();
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			CognitoJwtTestConfiguration.CLIENT_ID,
			"access",
			Instant.now().plusSeconds(300),
			otherPair
		);
		mockMvc.perform(post("/v1/quotes").header("Authorization", "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsWrongIssuer() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			"https://issuer.invalid/pool",
			CognitoJwtTestConfiguration.CLIENT_ID,
			"access",
			Instant.now().plusSeconds(300),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(post("/v1/quotes").header("Authorization", "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsExpiredToken() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			CognitoJwtTestConfiguration.CLIENT_ID,
			"access",
			Instant.now().minusSeconds(60),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(post("/v1/quotes").header("Authorization", "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsTokenBeforeNotBeforeTime() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			CognitoJwtTestConfiguration.CLIENT_ID,
			"access",
			Instant.now().plusSeconds(300),
			Instant.now().plusSeconds(120),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(post("/v1/quotes").header("Authorization", "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsIdToken() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			CognitoJwtTestConfiguration.CLIENT_ID,
			"id",
			Instant.now().plusSeconds(300),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(post("/v1/quotes").header("Authorization", "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void quoteEndpointRejectsWrongAppClient() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			"different-client",
			"access",
			Instant.now().plusSeconds(300),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(post("/v1/quotes").header("Authorization", "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void validAccessTokenAuthenticatesAndReachesController() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			CognitoJwtTestConfiguration.CLIENT_ID,
			"access",
			Instant.now().plusSeconds(300),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(get("/v1/test/authenticated").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(content().string("test-subject"));
	}

	@Test
	void validTokenWithoutRequiredAdminScopeReturnsForbidden() throws Exception {
		String token = CognitoJwtTestConfiguration.token(
			CognitoJwtTestConfiguration.ISSUER,
			CognitoJwtTestConfiguration.CLIENT_ID,
			"access",
			Instant.now().plusSeconds(300),
			CognitoJwtTestConfiguration.TEST_KEY_PAIR
		);
		mockMvc.perform(get("/v1/admin/test").header("Authorization", "Bearer " + token))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
	}

	@Test
	void otherProtectedRoutesRequireAuthentication() throws Exception {
		// Any unknown route that isn't explicitly public should be protected
		mockMvc.perform(get("/v1/protected"))
			.andExpect(status().isUnauthorized());
	}
    @Test
    void signedAdminScopeIsMappedToAuthority() throws Exception {
        String token = CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), null,
            "admin-subject", null, null, CognitoJwtTestConfiguration.TEST_KEY_PAIR, "openid admin");
        mockMvc.perform(get("/v1/admin/test").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(content().string("admin"));
    }

    @Test
    void signedTokenWithBlankSubjectIsRejectedBeforeController() throws Exception {
        String token = CognitoJwtTestConfiguration.token(CognitoJwtTestConfiguration.ISSUER,
            CognitoJwtTestConfiguration.CLIENT_ID, "access", Instant.now().plusSeconds(300), null,
            " ", null, null, CognitoJwtTestConfiguration.TEST_KEY_PAIR);
        mockMvc.perform(get("/v1/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }
}
