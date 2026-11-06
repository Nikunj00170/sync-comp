package com.airtelsync.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record HealthResponse(
	@JsonProperty("status") String status,
	@JsonProperty("service") String service
) {
	public static HealthResponse up(String serviceName) {
		return new HealthResponse("UP", serviceName);
	}
}