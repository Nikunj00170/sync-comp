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
		mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	@Test
	void healthEndpointPermitsUnauthenticatedAccess() throws Exception {
		mockMvc.perform(get("/health"))
			.andExpect(status().isOk());
	}

	@Test
	void unknownEndpointReturnsNotFound() throws Exception {
		mockMvc.perform(get("/unknown"))
			.andExpect(status().isNotFound());
	}

	@Test
	void actuatorHealthEndpointIsPublicByDefault() throws Exception {
		// Spring Boot Actuator health endpoint is public by default for container health checks
		mockMvc.perform(get("/actuator/health"))
			.andExpect(status().isOk());
	}

}