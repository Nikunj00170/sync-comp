package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TimelineEvent(
    @JsonProperty("label") String label,
    @JsonProperty("detail") String detail,
    @JsonProperty("at") String at
) {
}