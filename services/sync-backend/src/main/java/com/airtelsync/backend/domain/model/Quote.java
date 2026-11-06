package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Quote(
    @JsonProperty("version") String version,
    @JsonProperty("lines") List<CartLine> lines,
    @JsonProperty("monthly") int monthly,
    @JsonProperty("setup") int setup,
    @JsonProperty("tax") int tax,
    @JsonProperty("total") int total,
    @JsonProperty("errors") List<String> errors
) {
}