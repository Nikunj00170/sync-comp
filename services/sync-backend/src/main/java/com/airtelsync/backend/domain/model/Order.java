package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Order(
    @JsonProperty("id") String id,
    @JsonProperty("name") String name,
    @JsonProperty("createdAt") String createdAt,
    @JsonProperty("status") OrderStatus status,
    @JsonProperty("lines") List<CartLine> lines,
    @JsonProperty("quote") Quote quote,
    @JsonProperty("address") String address,
    @JsonProperty("slot") String slot,
    @JsonProperty("events") List<TimelineEvent> events
) {
    public Order {
        lines = java.util.List.copyOf(lines);
        events = java.util.List.copyOf(events);
    }

}