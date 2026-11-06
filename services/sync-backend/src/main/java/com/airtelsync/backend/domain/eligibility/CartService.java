package com.airtelsync.backend.domain.eligibility;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Product;
import com.airtelsync.backend.domain.model.Profile;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CartService {

    private final CatalogueService catalogueService;
    private final EligibilityService eligibilityService;

    public CartService(CatalogueService catalogueService, EligibilityService eligibilityService) {
        this.catalogueService = catalogueService;
        this.eligibilityService = eligibilityService;
    }

    public List<CartLine> addToCart(List<CartLine> lines, String productId, Profile profile) {
        Product product = catalogueService.getById(productId);
        List<String> reasons = eligibilityService.checkEligibility(product, profile);
        if (!reasons.isEmpty()) {
            throw new IllegalArgumentException(String.join(". ", reasons));
        }

        List<CartLine> result = new ArrayList<>(lines);
        if (result.stream().noneMatch(line -> line.productId().equals(productId))) {
            int quantity = eligibilityService.defaultQuantity(product, profile);
            result.add(new CartLine(productId, quantity));
        }

        if (!product.dependencies().isEmpty()) {
            boolean hasDependency = result.stream()
                .anyMatch(line -> product.dependencies().contains(line.productId()));
            if (!hasDependency) {
                Optional<Product> dependency = findEligibleDependency(product, profile, result);
                if (dependency.isEmpty()) {
                    throw new IllegalArgumentException("No eligible connection is available for this add-on");
                }
                result = addToCart(result, dependency.get().id(), profile);
            }
        }
        return result;
    }

    private Optional<Product> findEligibleDependency(Product product, Profile profile, List<CartLine> currentLines) {
        Set<String> existingProductIds = currentLines.stream()
            .map(CartLine::productId)
            .collect(java.util.stream.Collectors.toSet());

        return catalogueService.getAllProducts().stream()
            .filter(p -> product.dependencies().contains(p.id()))
            .filter(p -> !existingProductIds.contains(p.id()))
            .filter(p -> eligibilityService.isEligible(p, profile))
            .min(java.util.Comparator.comparingInt(Product::price));
    }

    public List<CartLine> removeFromCart(List<CartLine> lines, String productId) {
        List<CartLine> result = new ArrayList<>(lines.stream()
            .filter(line -> !line.productId().equals(productId))
            .toList());

        boolean changed = true;
        while (changed) {
            List<CartLine> current = new ArrayList<>(result);
            List<CartLine> next = current.stream()
                .filter(line -> {
                    Product product = catalogueService.getById(line.productId());
                    if (product.dependencies().isEmpty()) {
                        return true;
                    }
                    return current.stream()
                        .anyMatch(dep -> product.dependencies().contains(dep.productId()));
                })
                .toList();
            changed = next.size() != current.size();
            result = next;
        }
        return result;
    }
}