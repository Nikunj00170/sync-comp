package com.airtelsync.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class CognitoJwtDecoderConfiguration {

	private static final Logger log = LoggerFactory.getLogger(CognitoJwtDecoderConfiguration.class);

	@Bean
	@ConditionalOnMissingBean(JwtDecoder.class)
	JwtDecoder configuredJwtDecoder(
		@Value("${COGNITO_ISSUER_URI:}") String issuerUri,
		@Value("${COGNITO_CLIENT_ID:}") String clientId,
        @Value("${COGNITO_USER_POOL_ID:}") String poolId,
        @Value("${AWS_REGION:}") String region
    ) {
        return cognitoJwtDecoder(CognitoIssuer.resolve(issuerUri, poolId, region), clientId);
    }

    JwtDecoder cognitoJwtDecoder(String issuerUri, String clientId) {
		if (issuerUri.isBlank() || clientId.isBlank()) {
            log.warn("Cognito JWT authentication is unavailable: set COGNITO_CLIENT_ID and either COGNITO_USER_POOL_ID or COGNITO_ISSUER_URI");
			return token -> {
				throw new BadJwtException("Cognito JWT authentication is not configured");
			};
		}

		NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(issuerUri).build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
			JwtValidators.createDefaultWithIssuer(issuerUri),
			cognitoAccessTokenValidator(clientId)
		));
		return decoder;
	}

	static OAuth2TokenValidator<Jwt> cognitoAccessTokenValidator(String clientId) {
		return jwt -> {
			if ("access".equals(jwt.getClaimAsString("token_use"))
					&& clientId.equals(jwt.getClaimAsString("client_id"))
                    && jwt.getSubject() != null && !jwt.getSubject().isBlank()
                    && jwt.getExpiresAt() != null) {
				return OAuth2TokenValidatorResult.success();
			}
			return OAuth2TokenValidatorResult.failure(new OAuth2Error(
				"invalid_token",
				"JWT must be a Cognito access token for the configured app client",
				null
			));
		};
	}
}
