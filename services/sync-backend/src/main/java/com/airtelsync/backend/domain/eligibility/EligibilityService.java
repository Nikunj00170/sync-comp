package com.airtelsync.backend.domain.eligibility;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.Product;
import com.airtelsync.backend.domain.model.Profile;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class EligibilityService {

    private final CatalogueService catalogueService;

    public EligibilityService(CatalogueService catalogueService) {
        this.catalogueService = catalogueService;
    }

    public List<String> checkEligibility(Product product, Profile profile) {
        List<String> reasons = new ArrayList<>();

        if (!product.tiers().contains(profile.tier())) {
            reasons.add("Available in Tier " + String.join(" / ", product.tiers().stream().map(String::valueOf).toList()) + " cities");
        }
        if (profile.employees() < product.minEmployees()) {
            reasons.add("Needs at least " + product.minEmployees() + " employees");
        }
        if (profile.sites() < product.minSites()) {
            reasons.add("Needs at least " + product.minSites() + " locations");
        }
        if (product.requiresGstin() && !profile.hasGstin()) {
            reasons.add("GST registration required");
        }
        return reasons;
    }

    public boolean isEligible(Product product, Profile profile) {
        return checkEligibility(product, profile).isEmpty();
    }

    public int defaultQuantity(Product product, Profile profile) {
        return switch (product.unit()) {
            case "per site" -> profile.sites();
            case "per user", "per device", "per line" -> profile.employees();
            default -> 1;
        };
    }
}