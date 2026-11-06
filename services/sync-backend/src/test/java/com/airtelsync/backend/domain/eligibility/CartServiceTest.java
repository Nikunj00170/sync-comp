package com.airtelsync.backend.domain.eligibility;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
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
class CartServiceTest {

    @Autowired
    private CartService cartService;

    @Autowired
    private CatalogueService catalogueService;

    @Test
    void addToCartAddsProduct() {
        List<CartLine> cart = cartService.addToCart(List.of(), "P01", TestFixtures.demoProfile());
        assertEquals(1, cart.size());
        assertEquals("P01", cart.get(0).productId());
        assertEquals(1, cart.get(0).quantity()); // per site, demo profile has 1 site
    }

    @Test
    void addToCartThrowsOnIneligible() {
        Profile noGstin = new Profile(
            TestFixtures.demoProfile().name(), TestFixtures.demoProfile().business(),
            TestFixtures.demoProfile().email(), TestFixtures.demoProfile().industry(),
            TestFixtures.demoProfile().city(), TestFixtures.demoProfile().tier(),
            TestFixtures.demoProfile().employees(), TestFixtures.demoProfile().sites(),
            TestFixtures.demoProfile().budget(), false, TestFixtures.demoProfile().priorities(),
            TestFixtures.demoProfile().address(), TestFixtures.demoProfile().phone()
        );
        assertThrows(IllegalArgumentException.class,
            () -> cartService.addToCart(List.of(), "P03", noGstin));
    }

    @Test
    void addToCartDoesNotDuplicate() {
        List<CartLine> cart = cartService.addToCart(List.of(), "P01", TestFixtures.demoProfile());
        cart = cartService.addToCart(cart, "P01", TestFixtures.demoProfile());
        assertEquals(1, cart.size());
    }

    @Test
    void addToCartAddsORDependency() {
        // P22 (Secure Wi-Fi) depends on P01 OR P02 OR P03 OR P04
        Profile profile = TestFixtures.demoProfile();
        List<CartLine> cart = cartService.addToCart(List.of(), "P22", profile);

        assertEquals(2, cart.size());
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P22")));
        assertTrue(cart.stream().anyMatch(l -> List.of("P01", "P02", "P03", "P04").contains(l.productId())));
    }

    @Test
    void addToCartReusesExistingDependency() {
        Profile profile = TestFixtures.demoProfile();
        List<CartLine> cart = cartService.addToCart(List.of(), "P01", profile);
        cart = cartService.addToCart(cart, "P22", profile);

        assertEquals(2, cart.size());
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P01")));
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P22")));
    }

    @Test
    void addToCartCascadesWhenDependencyAdded() {
        Profile profile = TestFixtures.demoProfile();
        List<CartLine> cart = cartService.addToCart(List.of(), "P22", profile);

        // P22's cheapest eligible dependency is P04 (89900), not P01 (99900)
        // P09 depends on P01/P02/P03/P05/P06 - P04 is NOT in this list
        // So P09 needs its own dependency (P01, cheapest in its list)
        cart = cartService.addToCart(cart, "P09", profile);

        assertEquals(4, cart.size());
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P22")));
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P04"))); // P22's dependency
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P09")));
        assertTrue(cart.stream().anyMatch(l -> l.productId().equals("P01"))); // P09's dependency
    }

    @Test
    void removeFromCartRemovesProduct() {
        List<CartLine> cart = List.of(
            new CartLine("P01", 1),
            new CartLine("P16", 12)
        );
        List<CartLine> result = cartService.removeFromCart(cart, "P01");
        assertEquals(1, result.size());
        assertEquals("P16", result.get(0).productId());
    }

    @Test
    void removeFromCartCascadesRemovalOfDependents() {
        Profile profile = TestFixtures.demoProfile();
        List<CartLine> cart = cartService.addToCart(List.of(), "P22", profile); // P22 + P04
        cart = cartService.addToCart(cart, "P09", profile); // P09 + P01 (P04 not in P09's deps)

        assertEquals(4, cart.size());

        // Remove P04 - P22 still has P01 as alternate dependency, so P22 stays
        // P09 depends on P01, so both stay
        List<CartLine> result = cartService.removeFromCart(cart, "P04");
        assertEquals(3, result.size());
        assertTrue(result.stream().anyMatch(l -> l.productId().equals("P22")));
        assertTrue(result.stream().anyMatch(l -> l.productId().equals("P09")));
        assertTrue(result.stream().anyMatch(l -> l.productId().equals("P01")));

        // Remove P01 - now P22 loses its last dependency (P04 already gone), P09 loses its dependency
        result = cartService.removeFromCart(result, "P01");
        assertTrue(result.isEmpty());
    }

    @Test
    void removeFromCartPreservesAlternateDependency() {
        // Cart has P22 (depends on P01/P02/P03/P04), P01, P02
        List<CartLine> cart = List.of(
            new CartLine("P22", 1),
            new CartLine("P01", 1),
            new CartLine("P02", 1)
        );

        // Remove P01 - P22 should still have P02 as dependency
        List<CartLine> result = cartService.removeFromCart(cart, "P01");
        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(l -> l.productId().equals("P22")));
        assertTrue(result.stream().anyMatch(l -> l.productId().equals("P02")));
    }

    @Test
    void addToCartThrowsWhenNoEligibleDependency() {
        // P10 requires minSites=3, minEmployees=10, hasGstin=true
        // Create a profile that doesn't meet requirements
        Profile limitedProfile = new Profile(
            "Test", "Test", "test@example.com", Profile.Industry.professional,
            "City", 1, 2, 1, 5000, false, List.of(), "Address", ""
        );
        assertThrows(IllegalArgumentException.class,
            () -> cartService.addToCart(List.of(), "P10", limitedProfile));
    }
}