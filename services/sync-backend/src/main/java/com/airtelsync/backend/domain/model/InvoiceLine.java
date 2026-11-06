package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record InvoiceLine(
    @JsonProperty("productId") String productId,
    @JsonProperty("quantity") int quantity,
    @JsonProperty("name") String name,
    @JsonProperty("unitPrice") Integer unitPrice,
    @JsonProperty("category") String category,
    @JsonProperty("unit") String unit
) {
}