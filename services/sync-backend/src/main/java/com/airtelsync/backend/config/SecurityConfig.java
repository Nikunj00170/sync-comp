package com.airtelsync.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.AuthenticationEntryPoint;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		AuthenticationEntryPoint unauthorizedEntryPoint = (request, response, authException) -> {
			response.setStatus(401);
			response.setContentType("application/json");
			response.getWriter().write("{\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Authentication required.\",\"details\":[]}}");
		};
		http
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.GET, "/health").permitAll()
				.requestMatchers(HttpMethod.GET, "/v1/catalogue").permitAll()
				.requestMatchers("/v1/admin/**").hasAuthority("SCOPE_admin")
				.requestMatchers("/actuator/**").authenticated()
				.anyRequest().authenticated()
			)
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
			.httpBasic(httpBasic -> httpBasic.disable())
			.formLogin(formLogin -> formLogin.disable())
			.exceptionHandling(exceptions -> exceptions
				.authenticationEntryPoint(unauthorizedEntryPoint)
				.accessDeniedHandler((request, response, accessDeniedException) -> {
					response.setStatus(403);
					response.setContentType("application/json");
					response.getWriter().write("{\"error\":{\"code\":\"ACCESS_DENIED\",\"message\":\"You do not have permission to access this resource.\",\"details\":[]}}");
				})
			)
			.oauth2ResourceServer(oauth2 -> oauth2
				.authenticationEntryPoint(unauthorizedEntryPoint)
				.jwt(Customizer.withDefaults())
			);
		return http.build();
	}

}
