package com.airtelsync.backend.domain.kyc;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.util.*;

/** Synthetic hackathon registry. Never calls a government service or returns the full dataset. */
@Component
public class MockRegistry {
    public record Gst(String gstin, String legal_name, String trade_name, String constitution,
        String principal_place_of_business, String state, String registration_date, String status) {}
    public record Udyam(String udyam_number, String enterprise_name, String enterprise_type,
        String major_activity, String nic_description, String state, String city, String date_of_registration) {}
    private final Map<String, Gst> gst = new HashMap<>();
    private final Map<String, Udyam> udyam = new HashMap<>();
    public MockRegistry() {
        var json = new ObjectMapper();
        try (var g = getClass().getResourceAsStream("/mock_gstin_registry.json");
             var u = getClass().getResourceAsStream("/mock_udyam_registry.json")) {
            for (var row : json.readValue(g, Gst[].class)) gst.put(row.gstin(), row);
            for (var row : json.readValue(u, Udyam[].class)) udyam.put(row.udyam_number(), row);
        } catch (Exception ex) { throw new IllegalStateException("Synthetic KYC registries are missing or invalid", ex); }
    }
    public Optional<Gst> gst(String id) { return Optional.ofNullable(gst.get(id)); }
    public Optional<Udyam> udyam(String id) { return Optional.ofNullable(udyam.get(id)); }
    public static boolean validGstin(String id) {
        if (id == null || !id.matches("[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]")) return false;
        int sum = 0, factor = 2;
        for (int i = 13; i >= 0; i--) {
            int product = Character.digit(id.charAt(i), 36) * factor;
            sum += product / 36 + product % 36;
            factor = factor == 2 ? 1 : 2;
        }
        return Character.toUpperCase(Character.forDigit((36 - sum % 36) % 36, 36)) == id.charAt(14);
    }
    public static String mask(String id) { return id.length() <= 4 ? "****" : "•".repeat(id.length() - 4) + id.substring(id.length() - 4); }
}
