package com.airtelsync.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.airtelsync.backend.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class SecurityConfigTest {

	@Autowired
	private WebApplicationContext context;

	private MockMvc mockMvc;

	@BeforeEach
	void setup() {
		mockMvc = MockMvcBuilders.webAppContextSetup(context)
            .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity())
            .build();
	}

	@Test
	void healthEndpointPermitsUnauthenticatedAccess() throws Exception {
		mockMvc.perform(get("/health"))
			.andExpect(status().isOk());
	}

	@Test
	void unknownEndpointRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/unknown"))
			.andExpect(status().isForbidden());
	}

	@Test
	void actuatorHealthEndpointRequiresAuthentication() throws Exception {
		// Only /health is public; actuator endpoints require authentication.
		mockMvc.perform(get("/actuator/health"))
			.andExpect(status().isForbidden());
	}

}