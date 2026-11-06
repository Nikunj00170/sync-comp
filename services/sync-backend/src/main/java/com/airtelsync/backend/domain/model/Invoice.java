package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Invoice(
    @JsonProperty("id") String id,
    @JsonProperty("period") String period,
    @JsonProperty("issuedAt") String issuedAt,
    @JsonProperty("dueAt") String dueAt,
    @JsonProperty("status") String status,
    @JsonProperty("lines") List<InvoiceLine> lines,
    @JsonProperty("subtotal") int subtotal,
    @JsonProperty("tax") int tax,
    @JsonProperty("total") int total,
    @JsonProperty("paymentReference") String paymentReference,
    @JsonProperty("billedTo") BilledTo billedTo
) {
    public record BilledTo(
        @JsonProperty("name") String name,
        @JsonProperty("business") String business,
        @JsonProperty("email") String email,
        @JsonProperty("address") String address
    ) {
    }
}