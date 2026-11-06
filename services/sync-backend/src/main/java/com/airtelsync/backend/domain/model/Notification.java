package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Notification(
    @JsonProperty("id") String id,
    @JsonProperty("title") String title,
    @JsonProperty("text") String text,
    @JsonProperty("route") String route,
    @JsonProperty("read") boolean read,
    @JsonProperty("createdAt") String createdAt
) {
}