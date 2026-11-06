package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Ticket(
    @JsonProperty("id") String id,
    @JsonProperty("subject") String subject,
    @JsonProperty("category") String category,
    @JsonProperty("description") String description,
    @JsonProperty("status") String status,
    @JsonProperty("createdAt") String createdAt
) {
}