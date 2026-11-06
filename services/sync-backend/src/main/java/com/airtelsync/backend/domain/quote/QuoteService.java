package com.airtelsync.backend.domain.quote;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.eligibility.EligibilityService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Product;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Quote;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class QuoteService {

    private final CatalogueService catalogueService;
    private final EligibilityService eligibilityService;

    public QuoteService(CatalogueService catalogueService, EligibilityService eligibilityService) {
        this.catalogueService = catalogueService;
        this.eligibilityService = eligibilityService;
    }

    public Quote quote(List<CartLine> lines, Profile profile) {
        List<String> errors = new ArrayList<>();
        long monthly = 0;
        long setup = 0;
        Set<String> seen = new LinkedHashSet<>();

        for (CartLine line : lines) {
            Product product = catalogueService.findById(line.productId()).orElse(null);
            if (product == null) {
                errors.add("Unknown product: " + line.productId());
                continue;
            }
            if (seen.contains(product.id())) {
                errors.add("Duplicate plan: " + product.name());
                continue;
            }
            seen.add(product.id());

            if (line.quantity() < 1 || line.quantity() > 1000) {
                errors.add("Quantity must be between 1 and 1,000 for " + product.name());
                continue;
            }

            errors.addAll(eligibilityService.checkEligibility(product, profile)
                .stream()
                .map(r -> product.name() + ": " + r)
                .toList());

            if (!product.dependencies().isEmpty() &&
                lines.stream().noneMatch(x -> product.dependencies().contains(x.productId()))) {
                errors.add(product.name() + " needs a compatible connection");
            }

            monthly += (long) product.price() * line.quantity();
            setup += (long) product.setup() * line.quantity();
        }

        // Amounts are paise; use integer rounding to avoid overflow and floating-point loss.
        long tax = (monthly * CatalogueService.DEMO_TAX_BPS + 5000L) / 10000L;

        return new Quote(
            CatalogueService.CATALOGUE_VERSION,
            List.copyOf(lines),
            monthly,
            setup,
            tax,
            monthly + tax,
            List.copyOf(errors)
        );
    }
}