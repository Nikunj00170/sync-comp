package com.airtelsync.backend.domain.recommendation;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.eligibility.CartService;
import com.airtelsync.backend.domain.eligibility.EligibilityService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.quote.QuoteService;
import com.airtelsync.backend.domain.model.Quote;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {

    private final CatalogueService catalogueService;
    private final CartService cartService;
    private final EligibilityService eligibilityService;
    private final QuoteService quoteService;

    public RecommendationService(
        CatalogueService catalogueService,
        CartService cartService,
        EligibilityService eligibilityService,
        QuoteService quoteService
    ) {
        this.catalogueService = catalogueService;
        this.cartService = cartService;
        this.eligibilityService = eligibilityService;
        this.quoteService = quoteService;
    }

    public record RecommendationGroup(
        String id,
        String name,
        String eyebrow,
        String description,
        List<String> ids,
        List<CartLine> lines,
        Quote quote
    ) {}

    public List<RecommendationGroup> recommendations(Profile profile) {
        String base = determineBaseProduct(profile);

        List<RecommendationGroupDef> groups = List.of(
            new RecommendationGroupDef(
                "essential",
                "The essentials",
                "LEAN & CONNECTED",
                "The connection your business needs. Nothing you don't.",
                List.of(base)
            ),
            new RecommendationGroupDef(
                "recommended",
                "Your everyday advantage",
                "YOUR BEST MATCH",
                "A thoughtful mix for a connected, productive team.",
                buildRecommendedIds(profile, base)
            ),
            new RecommendationGroupDef(
                "growth",
                "Room to grow",
                "BUILT FOR WHAT'S NEXT",
                "More protection and a stronger foundation for your next chapter.",
                buildGrowthIds(profile, base)
            )
        );

        List<RecommendationGroup> result = new ArrayList<>();
        for (RecommendationGroupDef group : groups) {
            List<CartLine> lines = new ArrayList<>();
            for (String id : new LinkedHashSet<>(group.ids())) {
                if (catalogueService.exists(id) && eligibilityService.isEligible(catalogueService.getById(id), profile)) {
                    lines = cartService.addToCart(lines, id, profile);
                }
            }
            Quote quote = quoteService.quote(lines, profile);
            result.add(new RecommendationGroup(
                group.id(), group.name(), group.eyebrow(), group.description(),
                group.ids(), lines, quote
            ));
        }
        return result;
    }

    private String determineBaseProduct(Profile profile) {
        if (profile.industry() == Profile.Industry.manufacturing &&
            profile.employees() >= 25 &&
            profile.budget() >= 30000 &&
            profile.hasGstin()) {
            return "P06";
        }
        return profile.employees() > 5 ? "P02" : "P01";
    }

    private List<String> buildRecommendedIds(Profile profile, String base) {
        List<String> ids = new ArrayList<>();
        ids.add(base);
        if (profile.priorities().contains("productivity")) ids.add("P16");
        if (profile.priorities().contains("security")) ids.add("P20");
        if (profile.priorities().contains("reliability")) ids.add("P09");
        if (profile.industry() == Profile.Industry.retail) ids.add("P19");
        return ids;
    }

    private List<String> buildGrowthIds(Profile profile, String base) {
        List<String> ids = new ArrayList<>();
        ids.add(base);
        ids.add("P16");
        ids.add("P17");
        ids.add("P20");
        ids.add(profile.sites() >= 3 ? "P10" : "P22");
        return ids;
    }

    private record RecommendationGroupDef(
        String id,
        String name,
        String eyebrow,
        String description,
        List<String> ids
    ) {}
}