package com.airtelsync.backend.domain.eligibility;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.Product;
import com.airtelsync.backend.domain.model.Profile;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import com.airtelsync.backend.TestcontainersConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class EligibilityServiceTest {

    @Autowired
    private CatalogueService catalogueService;

    @Autowired
    private EligibilityService eligibilityService;

    @Test
    void eligibleProductReturnsEmptyReasons() {
        Product p01 = catalogueService.getById("P01");
        Profile profile = TestFixtures.demoProfile();
        List<String> reasons = eligibilityService.checkEligibility(p01, profile);
        assertTrue(reasons.isEmpty());
    }

    @Test
    void tierRestriction() {
        Product p03 = catalogueService.getById("P03"); // tier 1 only
        Profile profile = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 2, 10, 1, 10000, true, List.of(), "Address", ""
        );
        List<String> reasons = eligibilityService.checkEligibility(p03, profile);
        assertTrue(reasons.stream().anyMatch(r -> r.contains("Tier")));
    }

    @Test
    void minEmployeesRestriction() {
        Product p03 = catalogueService.getById("P03"); // minEmployees: 5
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        List<String> reasons = eligibilityService.checkEligibility(p03, profile);
        assertTrue(reasons.isEmpty());

        Profile lowEmployees = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 2, 1, 10000, true, List.of(), "Address", ""
        );
        reasons = eligibilityService.checkEligibility(p03, lowEmployees);
        assertTrue(reasons.stream().anyMatch(r -> r.contains("employees")));
    }

    @Test
    void minSitesRestriction() {
        Product p10 = catalogueService.getById("P10"); // minSites: 3
        Profile profile = TestFixtures.demoProfile(); // sites: 1
        List<String> reasons = eligibilityService.checkEligibility(p10, profile);
        assertTrue(reasons.stream().anyMatch(r -> r.contains("locations")));

        Profile multiSite = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 10, 3, 10000, true, List.of(), "Address", ""
        );
        reasons = eligibilityService.checkEligibility(p10, multiSite);
        assertFalse(reasons.stream().anyMatch(r -> r.contains("locations")));
    }

    @Test
    void gstinRequirement() {
        Product p03 = catalogueService.getById("P03"); // requiresGstin: true
        Profile withoutGstin = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 10, 1, 10000, false, List.of(), "Address", ""
        );
        List<String> reasons = eligibilityService.checkEligibility(p03, withoutGstin);
        assertTrue(reasons.stream().anyMatch(r -> r.contains("GST")));

        Profile withGstin = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 10, 1, 10000, true, List.of(), "Address", ""
        );
        reasons = eligibilityService.checkEligibility(p03, withGstin);
        assertFalse(reasons.stream().anyMatch(r -> r.contains("GST")));
    }

    @Test
    void everyProductRespectsConstraints() {
        Profile baseProfile = TestFixtures.demoProfile();
        for (Product product : catalogueService.getAllProducts()) {
            if (product.requiresGstin()) {
                Profile noGstin = new Profile(
                    baseProfile.name(), baseProfile.business(), baseProfile.email(),
                    baseProfile.industry(), baseProfile.city(), baseProfile.tier(),
                    baseProfile.employees(), baseProfile.sites(), baseProfile.budget(),
                    false, baseProfile.priorities(), baseProfile.address(), baseProfile.phone()
                );
                List<String> reasons = eligibilityService.checkEligibility(product, noGstin);
                assertTrue(reasons.stream().anyMatch(r -> r.contains("GST")),
                    "Product " + product.id() + " requires GST but profile without GST was eligible");
            }
            if (product.minEmployees() > 1) {
                Profile lowEmp = new Profile(
                    baseProfile.name(), baseProfile.business(), baseProfile.email(),
                    baseProfile.industry(), baseProfile.city(), baseProfile.tier(),
                    1, baseProfile.sites(), baseProfile.budget(),
                    baseProfile.hasGstin(), baseProfile.priorities(), baseProfile.address(), baseProfile.phone()
                );
                List<String> reasons = eligibilityService.checkEligibility(product, lowEmp);
                assertTrue(reasons.stream().anyMatch(r -> r.contains("employees")),
                    "Product " + product.id() + " requires minEmployees > 1 but profile with 1 employee was eligible");
            }
            if (product.minSites() > 1) {
                Profile singleSite = new Profile(
                    baseProfile.name(), baseProfile.business(), baseProfile.email(),
                    baseProfile.industry(), baseProfile.city(), baseProfile.tier(),
                    baseProfile.employees(), 1, baseProfile.budget(),
                    baseProfile.hasGstin(), baseProfile.priorities(), baseProfile.address(), baseProfile.phone()
                );
                List<String> reasons = eligibilityService.checkEligibility(product, singleSite);
                assertTrue(reasons.stream().anyMatch(r -> r.contains("locations")),
                    "Product " + product.id() + " requires minSites > 1 but profile with 1 site was eligible");
            }
            if (!product.tiers().contains(2)) {
                Profile tier2 = new Profile(
                    baseProfile.name(), baseProfile.business(), baseProfile.email(),
                    baseProfile.industry(), baseProfile.city(), 2,
                    baseProfile.employees(), baseProfile.sites(), baseProfile.budget(),
                    baseProfile.hasGstin(), baseProfile.priorities(), baseProfile.address(), baseProfile.phone()
                );
                List<String> reasons = eligibilityService.checkEligibility(product, tier2);
                assertTrue(reasons.stream().anyMatch(r -> r.contains("Tier")),
                    "Product " + product.id() + " not available in tier 2 but tier 2 profile was eligible");
            }
        }
    }

    @Test
    void defaultQuantityPerSite() {
        Product p01 = catalogueService.getById("P01"); // unit: per site
        Profile profile = TestFixtures.demoProfile(); // sites: 1
        assertEquals(1, eligibilityService.defaultQuantity(p01, profile));

        Profile multiSite = new Profile(
            profile.name(), profile.business(), profile.email(), profile.industry(),
            profile.city(), profile.tier(), profile.employees(), 3, profile.budget(),
            profile.hasGstin(), profile.priorities(), profile.address(), profile.phone()
        );
        assertEquals(3, eligibilityService.defaultQuantity(p01, multiSite));
    }

    @Test
    void defaultQuantityPerUser() {
        Product p16 = catalogueService.getById("P16"); // unit: per user
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(12, eligibilityService.defaultQuantity(p16, profile));
    }

    @Test
    void defaultQuantityPerDevice() {
        Product p20 = catalogueService.getById("P20"); // unit: per device
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(12, eligibilityService.defaultQuantity(p20, profile));
    }

    @Test
    void defaultQuantityPerLine() {
        Product p07 = catalogueService.getById("P07"); // unit: per line
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(12, eligibilityService.defaultQuantity(p07, profile));
    }

    @Test
    void defaultQuantityDefault() {
        Product p17 = catalogueService.getById("P17"); // unit: per account
        Profile profile = TestFixtures.demoProfile();
        assertEquals(1, eligibilityService.defaultQuantity(p17, profile));
    }

    @Test
    void defaultQuantityAllProductsMatchTypeScript() {
        // Verify every product's defaultQuantity matches TypeScript logic:
        // - per site -> profile.sites()
        // - per user, per device, per line -> profile.employees()
        // - all others -> 1
        Profile profile = TestFixtures.demoProfile(); // employees: 12, sites: 1

        for (Product product : catalogueService.getAllProducts()) {
            int expected;
            switch (product.unit()) {
                case "per site" -> expected = profile.sites(); // 1
                case "per user", "per device", "per line" -> expected = profile.employees(); // 12
                default -> expected = 1;
            }
            int actual = eligibilityService.defaultQuantity(product, profile);
            assertEquals(expected, actual,
                "Product " + product.id() + " (" + product.unit() + ") should have defaultQuantity=" + expected + " but got " + actual);
        }
    }

    @Test
    void defaultQuantityPerChannelReturnsOne() {
        Product p12 = catalogueService.getById("P12"); // unit: per channel
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p12, profile));
    }

    @Test
    void defaultQuantityPerIPReturnsOne() {
        Product p11 = catalogueService.getById("P11"); // unit: per IP
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p11, profile));
    }

    @Test
    void defaultQuantityPerNumberReturnsOne() {
        Product p13 = catalogueService.getById("P13"); // unit: per number
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p13, profile));
    }

    @Test
    void defaultQuantityPerPackReturnsOne() {
        Product p14 = catalogueService.getById("P14"); // unit: per pack
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p14, profile));
    }

    @Test
    void defaultQuantityPerAccountReturnsOne() {
        Product p15 = catalogueService.getById("P15"); // unit: per account
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p15, profile));
    }

    @Test
    void defaultQuantityPerCounterReturnsOne() {
        Product p19 = catalogueService.getById("P19"); // unit: per counter
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p19, profile));
    }

    @Test
    void defaultQuantityPerCameraReturnsOne() {
        Product p23 = catalogueService.getById("P23"); // unit: per camera
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p23, profile));
    }

    @Test
    void defaultQuantityPerVehicleReturnsOne() {
        Product p25 = catalogueService.getById("P25"); // unit: per vehicle
        Profile profile = TestFixtures.demoProfile(); // employees: 12
        assertEquals(1, eligibilityService.defaultQuantity(p25, profile));
    }
}