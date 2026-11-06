package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Product(
    @JsonProperty("id") String id,
    @JsonProperty("category") String category,
    @JsonProperty("name") String name,
    @JsonProperty("description") String description,
    @JsonProperty("unit") String unit,
    @JsonProperty("price") int price,
    @JsonProperty("priceMax") int priceMax,
    @JsonProperty("setup") int setup,
    @JsonProperty("contract") int contract,
    @JsonProperty("tiers") List<Integer> tiers,
    @JsonProperty("minEmployees") int minEmployees,
    @JsonProperty("minSites") int minSites,
    @JsonProperty("requiresGstin") boolean requiresGstin,
    @JsonProperty("dependencies") List<String> dependencies,
    @JsonProperty("installDays") int installDays,
    @JsonProperty("segments") List<String> segments
) {
    public Product {
        tiers = java.util.List.copyOf(tiers);
        dependencies = java.util.List.copyOf(dependencies);
        segments = java.util.List.copyOf(segments);
    }

}