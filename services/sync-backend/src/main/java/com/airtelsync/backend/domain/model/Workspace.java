package com.airtelsync.backend.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Workspace(
    @JsonProperty("version") int version,
    @JsonProperty("profile") Profile profile,
    @JsonProperty("cart") List<CartLine> cart,
    @JsonProperty("saved") List<String> saved,
    @JsonProperty("orders") List<Order> orders,
    @JsonProperty("invoices") List<Invoice> invoices,
    @JsonProperty("kyc") Kyc kyc,
    @JsonProperty("tickets") List<Ticket> tickets,
    @JsonProperty("notifications") List<Notification> notifications,
    @JsonProperty("preferences") Preferences preferences,
    @JsonProperty("draftStep") int draftStep
) {
    public record Preferences(
        @JsonProperty("emailUpdates") boolean emailUpdates,
        @JsonProperty("reminders") boolean reminders,
        @JsonProperty("compactMotion") boolean compactMotion
    ) {
    }
}