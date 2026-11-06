package com.airtelsync.backend.config;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;

@TestConfiguration(proxyBeanMethods = false)
public class CognitoJwtTestConfiguration {

	public static final String ISSUER = "https://issuer.test.example/pool";
	public static final String CLIENT_ID = "test-app-client";
	public static final KeyPair TEST_KEY_PAIR;
	public static final RSAPrivateKey PRIVATE_KEY;
	public static final RSAPublicKey PUBLIC_KEY;
	private static final RSAKey SIGNING_JWK;

	static {
		try {
			TEST_KEY_PAIR = KeyPairGenerator.getInstance("RSA").generateKeyPair();
			PRIVATE_KEY = (RSAPrivateKey) TEST_KEY_PAIR.getPrivate();
			PUBLIC_KEY = (RSAPublicKey) TEST_KEY_PAIR.getPublic();
			SIGNING_JWK = new RSAKey.Builder(PUBLIC_KEY)
				.privateKey(PRIVATE_KEY)
				.keyID("test-key")
				.build();
		}
		catch (Exception ex) {
			throw new ExceptionInInitializerError(ex);
		}
	}

	@Bean
    @org.springframework.context.annotation.Primary
	public JwtDecoder testJwtDecoder() {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(PUBLIC_KEY).build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
			JwtValidators.createDefaultWithIssuer(ISSUER),
			CognitoJwtDecoderConfiguration.cognitoAccessTokenValidator(CLIENT_ID)
		));
		return decoder;
	}

	public static String token(String issuer, String clientId, String tokenUse, Instant expiresAt, KeyPair signingPair) {
		return token(issuer, clientId, tokenUse, expiresAt, null, signingPair);
	}

	public static String token(String issuer, String clientId, String tokenUse, Instant expiresAt,
			Instant notBefore, KeyPair signingPair) {
		return token(issuer, clientId, tokenUse, expiresAt, notBefore, "test-subject", null, null, signingPair);
	}

	public static String token(String issuer, String clientId, String tokenUse, Instant expiresAt,
			KeyPair signingPair, Instant notBefore, String email, String name) {
		return token(issuer, clientId, tokenUse, expiresAt, notBefore, "test-subject", email, name, signingPair);
	}

	public static String token(String issuer, String clientId, String tokenUse, Instant expiresAt,
			Instant notBefore, String subject, String email, String name, KeyPair signingPair) {
        return token(issuer, clientId, tokenUse, expiresAt, notBefore, subject, email, name, signingPair, null);
    }

    public static String token(String issuer, String clientId, String tokenUse, Instant expiresAt,
            Instant notBefore, String subject, String email, String name, KeyPair signingPair, String scope) {
		Instant issuedAt = expiresAt.isBefore(Instant.now()) ? expiresAt.minusSeconds(300) : Instant.now().minusSeconds(30);
		JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
			.issuer(issuer)
			.subject(subject)
			.issuedAt(issuedAt)
			.expiresAt(expiresAt)
			.claim("token_use", tokenUse)
			.claim("client_id", clientId);
        if (scope != null) claimsBuilder.claim("scope", scope);
		if (email != null) {
			claimsBuilder.claim("email", email);
		}
		if (name != null) {
			claimsBuilder.claim("name", name);
		}
		if (notBefore != null) {
			claimsBuilder.notBefore(notBefore);
		}
		JwtClaimsSet claims = claimsBuilder.build();
		RSAKey signingJwk = new RSAKey.Builder((RSAPublicKey) signingPair.getPublic())
			.privateKey((RSAPrivateKey) signingPair.getPrivate())
			.keyID("test-key")
			.build();
		JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingJwk)));
		return encoder.encode(JwtEncoderParameters.from(
			JwsHeader.with(SignatureAlgorithm.RS256).keyId("test-key").build(), claims
		)).getTokenValue();
	}
}