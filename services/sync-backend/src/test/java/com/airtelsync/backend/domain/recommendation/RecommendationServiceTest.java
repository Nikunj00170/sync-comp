package com.airtelsync.backend.domain.recommendation;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Quote;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import com.airtelsync.backend.TestcontainersConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RecommendationServiceTest {

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private CatalogueService catalogueService;

    @Test
    void recommendationsReturnsThreeGroups() {
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(TestFixtures.demoProfile());
        assertEquals(3, groups.size());
        assertEquals("essential", groups.get(0).id());
        assertEquals("recommended", groups.get(1).id());
        assertEquals("growth", groups.get(2).id());
    }

    @Test
    void essentialGroupHasBaseProduct() {
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(TestFixtures.demoProfile());
        RecommendationService.RecommendationGroup essential = groups.get(0);
        assertEquals("P02", essential.ids().get(0)); // demo profile: employees=12 > 5 -> P02
        assertFalse(essential.lines().isEmpty());
        assertEquals(0, essential.quote().errors().size());
    }

    @Test
    void recommendedGroupIncludesPriorityProducts() {
        Profile profile = TestFixtures.demoProfile(); // priorities: productivity, security
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(profile);
        RecommendationService.RecommendationGroup recommended = groups.get(1);

        assertTrue(recommended.ids().contains("P16")); // productivity
        assertTrue(recommended.ids().contains("P20")); // security
        assertTrue(recommended.lines().stream().anyMatch(l -> l.productId().equals("P16")));
        assertTrue(recommended.lines().stream().anyMatch(l -> l.productId().equals("P20")));
    }

    @Test
    void recommendedGroupIncludesRetailProduct() {
        Profile retailProfile = TestFixtures.retailProfile(); // industry: retail
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(retailProfile);
        RecommendationService.RecommendationGroup recommended = groups.get(1);

        assertTrue(recommended.ids().contains("P19")); // retail
    }

    @Test
    void growthGroupIncludesMultiSiteProduct() {
        Profile multiSite = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 10, 3, 40000, true, List.of(), "Address", ""
        );
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(multiSite);
        RecommendationService.RecommendationGroup growth = groups.get(2);

        assertTrue(growth.ids().contains("P10")); // minSites >= 3
    }

    @Test
    void growthGroupIncludesP22ForFewerSites() {
        Profile fewSites = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 10, 2, 40000, true, List.of(), "Address", ""
        );
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(fewSites);
        RecommendationService.RecommendationGroup growth = groups.get(2);

        assertTrue(growth.ids().contains("P22")); // sites < 3
    }

    @Test
    void manufacturingProfileGetsP06AsBase() {
        Profile mfg = TestFixtures.manufacturingProfile(); // employees=25, budget=40000, hasGstin=true
        List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(mfg);
        RecommendationService.RecommendationGroup essential = groups.get(0);

        assertEquals("P06", essential.ids().get(0));
    }

    @Test
    void allRecommendationsHaveValidQuotes() {
        Profile[] profiles = {
            TestFixtures.demoProfile(),
            TestFixtures.manufacturingProfile(),
            TestFixtures.retailProfile(),
            TestFixtures.hospitalityProfile()
        };

        for (Profile profile : profiles) {
            List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(profile);
            for (RecommendationService.RecommendationGroup group : groups) {
                assertFalse(group.lines().isEmpty(), "Group " + group.id() + " should have at least one line");
                assertEquals(0, group.quote().errors().size(), "Group " + group.id() + " quote should have no errors");
                // No duplicate product IDs
                long uniqueIds = group.lines().stream().map(CartLine::productId).distinct().count();
                assertEquals(group.lines().size(), uniqueIds, "Group " + group.id() + " should not have duplicate products");
            }
        }
    }

    @Test
    void recommendationsForAllIndustryTierGstinCombinations() {
        for (Profile.Industry industry : Profile.Industry.values()) {
            for (int tier : new int[]{1, 2}) {
                for (boolean hasGstin : new boolean[]{false, true}) {
                    Profile profile = new Profile(
                        "Test", "Test", "test@example.com", industry,
                        "City", tier, 50, 3, 40000, hasGstin, List.of(), "Address", ""
                    );
                    List<RecommendationService.RecommendationGroup> groups = recommendationService.recommendations(profile);
                    for (RecommendationService.RecommendationGroup group : groups) {
                        assertFalse(group.lines().isEmpty(), "No lines for " + industry + "/tier" + tier + "/gstin" + hasGstin);
                        assertEquals(0, group.quote().errors().size(), "Quote errors for " + industry + "/tier" + tier + "/gstin" + hasGstin);
                        long uniqueIds = group.lines().stream().map(CartLine::productId).distinct().count();
                        assertEquals(group.lines().size(), uniqueIds, "Duplicates for " + industry + "/tier" + tier + "/gstin" + hasGstin);
                    }
                }
            }
        }
    }

    @Test
    void deterministicOrdering() {
        // Same profile should produce same recommendations
        List<RecommendationService.RecommendationGroup> groups1 = recommendationService.recommendations(TestFixtures.demoProfile());
        List<RecommendationService.RecommendationGroup> groups2 = recommendationService.recommendations(TestFixtures.demoProfile());

        assertEquals(groups1.size(), groups2.size());
        for (int i = 0; i < groups1.size(); i++) {
            assertEquals(groups1.get(i).ids(), groups2.get(i).ids());
            assertEquals(groups1.get(i).lines().size(), groups2.get(i).lines().size());
        }
    }
}