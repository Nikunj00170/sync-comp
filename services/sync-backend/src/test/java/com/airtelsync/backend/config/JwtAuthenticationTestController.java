package com.airtelsync.backend.config;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class JwtAuthenticationTestController {

	@GetMapping("/v1/test/authenticated")
	String authenticated(@AuthenticationPrincipal Jwt jwt) {
		return jwt.getSubject();
	}
}
