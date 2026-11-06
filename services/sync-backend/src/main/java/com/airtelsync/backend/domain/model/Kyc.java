package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Kyc(
    @JsonProperty("status") String status,
    @JsonProperty("provider") String provider,
    @JsonProperty("consent") boolean consent,
    @JsonProperty("documents") List<DocumentMeta> documents,
    @JsonProperty("verifiedAt") String verifiedAt
) {
}