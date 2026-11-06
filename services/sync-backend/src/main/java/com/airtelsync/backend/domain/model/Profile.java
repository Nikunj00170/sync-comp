package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Profile(
    @JsonProperty("name") String name,
    @JsonProperty("business") String business,
    @JsonProperty("email") String email,
    @JsonProperty("industry") Industry industry,
    @JsonProperty("city") String city,
    @JsonProperty("tier") int tier,
    @JsonProperty("employees") int employees,
    @JsonProperty("sites") int sites,
    @JsonProperty("budget") int budget,
    @JsonProperty("hasGstin") boolean hasGstin,
    @JsonProperty("priorities") java.util.List<String> priorities,
    @JsonProperty("address") String address,
    @JsonProperty("phone") String phone
) {
    public Profile {
        priorities = java.util.List.copyOf(priorities);
    }

    public enum Industry {
        professional, retail, manufacturing, hospitality
    }
}