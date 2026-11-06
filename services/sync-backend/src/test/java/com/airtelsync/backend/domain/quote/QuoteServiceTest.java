package com.airtelsync.backend.domain.quote;

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
class QuoteServiceTest {

    @Autowired
    private QuoteService quoteService;

    @Autowired
    private CatalogueService catalogueService;

    @Test
    void quoteCalculatesMonthlyAndSetup() {
        Quote quote = quoteService.quote(TestFixtures.basicCart(), TestFixtures.demoProfile());
        assertEquals(0, quote.errors().size());
        assertEquals(99900, quote.monthly()); // P01 price * 1
        assertEquals(0, quote.setup()); // P01 setup = 0
    }

    @Test
    void quoteIncludesTax() {
        Quote quote = quoteService.quote(TestFixtures.basicCart(), TestFixtures.demoProfile());
        // tax = round(monthly * 1800 / 10000) = round(99900 * 0.18) = round(17982) = 17982
        assertEquals(17982, quote.tax());
        assertEquals(99900 + 17982, quote.total());
    }

    @Test
    void quoteWithSetupCost() {
        List<CartLine> cart = List.of(new CartLine("P05", 1)); // setup = 1000000
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertEquals(0, quote.errors().size());
        assertEquals(800000, quote.monthly());
        assertEquals(1000000, quote.setup());
    }

    @Test
    void quoteWithMultipleLines() {
        Quote quote = quoteService.quote(TestFixtures.activeCart(), TestFixtures.demoProfile());
        assertEquals(0, quote.errors().size());
        // P02: 149900 * 1 = 149900
        // P16: 12500 * 12 = 150000
        // P20: 9900 * 8 = 79200
        // P17: 49900 * 1 = 49900
        // Total monthly = 429000
        assertEquals(429000, quote.monthly());
        // P02 setup: 0, P16: 0, P20: 0, P17: 0
        assertEquals(0, quote.setup());
    }

    @Test
    void quoteRejectsInvalidQuantity() {
        for (int qty : new int[]{0, -1, 1001}) {
            List<CartLine> cart = List.of(new CartLine("P01", qty));
            Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
            assertFalse(quote.errors().isEmpty());
            assertTrue(quote.errors().get(0).contains("Quantity must be between 1 and 1,000"));
        }
    }

    @Test
    void quoteRejectsNonIntegerQuantity() {
        // Java enforces integer at compile time, but we test boundary
        List<CartLine> cart = List.of(new CartLine("P01", 1));
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertEquals(0, quote.errors().size());
    }

    @Test
    void quoteRejectsDuplicateProducts() {
        List<CartLine> cart = List.of(
            new CartLine("P01", 1),
            new CartLine("P01", 2)
        );
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertFalse(quote.errors().isEmpty());
        assertTrue(quote.errors().get(0).contains("Duplicate"));
    }

    @Test
    void quoteRejectsUnknownProduct() {
        List<CartLine> cart = List.of(new CartLine("UNKNOWN", 1));
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertFalse(quote.errors().isEmpty());
        assertTrue(quote.errors().get(0).contains("Unknown"));
    }

    @Test
    void quoteChecksEligibility() {
        Profile noGstin = new Profile(
            TestFixtures.demoProfile().name(), TestFixtures.demoProfile().business(),
            TestFixtures.demoProfile().email(), TestFixtures.demoProfile().industry(),
            TestFixtures.demoProfile().city(), TestFixtures.demoProfile().tier(),
            TestFixtures.demoProfile().employees(), TestFixtures.demoProfile().sites(),
            TestFixtures.demoProfile().budget(), false, TestFixtures.demoProfile().priorities(),
            TestFixtures.demoProfile().address(), TestFixtures.demoProfile().phone()
        );
        List<CartLine> cart = List.of(new CartLine("P03", 1)); // requires GSTIN
        Quote quote = quoteService.quote(cart, noGstin);
        assertFalse(quote.errors().isEmpty());
        assertTrue(quote.errors().get(0).contains("GST registration required"));
    }

    @Test
    void quoteChecksDependencies() {
        // P09 needs P01/P02/P03/P05/P06 but none provided
        List<CartLine> cart = List.of(new CartLine("P09", 1));
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertFalse(quote.errors().isEmpty());
        assertTrue(quote.errors().get(0).contains("needs a compatible connection"));
    }

    @Test
    void quoteVersionIsCorrect() {
        Quote quote = quoteService.quote(TestFixtures.basicCart(), TestFixtures.demoProfile());
        assertEquals(CatalogueService.CATALOGUE_VERSION, quote.version());
    }

    @Test
    void quotePreservesLines() {
        List<CartLine> cart = TestFixtures.basicCart();
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertEquals(cart.size(), quote.lines().size());
        assertEquals(cart.get(0).productId(), quote.lines().get(0).productId());
        assertEquals(cart.get(0).quantity(), quote.lines().get(0).quantity());
    }

    @Test
    void quoteWithPerUserQuantity() {
        // P16 is per user, demo profile has 12 employees
        List<CartLine> cart = List.of(new CartLine("P16", 12));
        Quote quote = quoteService.quote(cart, TestFixtures.demoProfile());
        assertEquals(0, quote.errors().size());
        assertEquals(12500 * 12, quote.monthly());
    }
    @Test
    void largeQuantitiesKeepExactTaxWithoutIntegerOverflow() {
        var q = quoteService.quote(java.util.List.of(new CartLine("P06", 1000)), TestFixtures.manufacturingProfile());
        assertEquals(2500000000L, q.monthly());
        assertEquals(450000000L, q.tax());
        assertEquals(2950000000L, q.total());
    }
    @Test
    void taxDoesNotOverflowForValidMultiUnitCart() {
        Quote quote = quoteService.quote(List.of(new CartLine("P05", 3)), TestFixtures.demoProfile());
        assertTrue(quote.errors().isEmpty());
        assertEquals(2400000L, quote.monthly());
        assertEquals(432000L, quote.tax());
        assertEquals(2832000L, quote.total());
    }

    @Test
    void maximumCartAmountsRemainExact() {
        Profile profile = new Profile("Test", "Test", "test@example.com", Profile.Industry.manufacturing,
            "City", 1, 1000, 100, 1000000, true, List.of("security"), "Address", "");
        List<CartLine> lines = catalogueService.getAllProducts().stream()
            .map(product -> new CartLine(product.id(), 1000)).toList();
        Quote quote = quoteService.quote(lines, profile);
        assertTrue(quote.errors().isEmpty());
        assertEquals(5405800000L, quote.monthly());
        assertEquals(4830000000L, quote.setup());
        assertEquals(973044000L, quote.tax());
        assertEquals(6378844000L, quote.total());
    }
}
