package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CartLine(
    @JsonProperty("productId") String productId,
    @JsonProperty("quantity") int quantity
) {
}