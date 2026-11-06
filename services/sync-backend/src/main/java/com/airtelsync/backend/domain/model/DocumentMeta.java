package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DocumentMeta(
    @JsonProperty("id") String id,
    @JsonProperty("name") String name,
    @JsonProperty("size") long size,
    @JsonProperty("type") String type,
    @JsonProperty("uploadedAt") String uploadedAt
) {
}