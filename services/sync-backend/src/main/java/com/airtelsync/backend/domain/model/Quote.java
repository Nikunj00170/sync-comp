package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Quote(
    @JsonProperty("version") String version,
    @JsonProperty("lines") List<CartLine> lines,
    @JsonProperty("monthly") long monthly,
    @JsonProperty("setup") long setup,
    @JsonProperty("tax") long tax,
    @JsonProperty("total") long total,
    @JsonProperty("errors") List<String> errors
) {
    public Quote {
        lines = java.util.List.copyOf(lines);
        errors = java.util.List.copyOf(errors);
    }

}