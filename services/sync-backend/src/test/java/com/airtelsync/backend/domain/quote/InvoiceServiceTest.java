package com.airtelsync.backend.domain.quote;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Invoice;
import com.airtelsync.backend.domain.model.InvoiceLine;
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
class InvoiceServiceTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private QuoteService quoteService;

    @Test
    void makeInvoiceCreatesValidInvoice() {
        List<CartLine> lines = TestFixtures.basicCart();
        Profile profile = TestFixtures.demoProfile();

        Invoice invoice = invoiceService.makeInvoice(lines, profile, "November 2026");

        assertEquals("November 2026", invoice.period());
        assertEquals("unpaid", invoice.status());
        assertEquals("INV", invoice.id().substring(0, 3));
        assertEquals(lines.size(), invoice.lines().size());
        assertEquals(99900, invoice.subtotal());
        assertEquals(17982, invoice.tax());
        assertEquals(99900 + 17982, invoice.total());
        assertNotNull(invoice.billedTo());
        assertEquals(profile.name(), invoice.billedTo().name());
        assertEquals(profile.business(), invoice.billedTo().business());
        assertEquals(profile.email(), invoice.billedTo().email());
        assertEquals(profile.address(), invoice.billedTo().address());
    }

    @Test
    void makeInvoiceIncludesProductDetails() {
        List<CartLine> lines = TestFixtures.basicCart();
        Profile profile = TestFixtures.demoProfile();

        Invoice invoice = invoiceService.makeInvoice(lines, profile, "November 2026");

        InvoiceLine line = invoice.lines().get(0);
        assertEquals("P01", line.productId());
        assertEquals(1, line.quantity());
        assertEquals("Biz Fibre 100", line.name());
        assertEquals(99900, line.unitPrice());
        assertEquals("Connectivity", line.category());
        assertEquals("per site", line.unit());
    }

    @Test
    void makeInvoiceThrowsOnInvalidQuote() {
        Profile noGstin = new Profile(
            TestFixtures.demoProfile().name(), TestFixtures.demoProfile().business(),
            TestFixtures.demoProfile().email(), TestFixtures.demoProfile().industry(),
            TestFixtures.demoProfile().city(), TestFixtures.demoProfile().tier(),
            TestFixtures.demoProfile().employees(), TestFixtures.demoProfile().sites(),
            TestFixtures.demoProfile().budget(), false, TestFixtures.demoProfile().priorities(),
            TestFixtures.demoProfile().address(), TestFixtures.demoProfile().phone()
        );
        List<CartLine> lines = List.of(new CartLine("P03", 1)); // requires GSTIN

        assertThrows(IllegalArgumentException.class,
            () -> invoiceService.makeInvoice(lines, noGstin, "November 2026"));
    }

    @Test
    void invoiceSnapshotsAmountsIndependently() {
        List<CartLine> cart = TestFixtures.basicCart();
        Profile profile = TestFixtures.demoProfile();

        Invoice invoice = invoiceService.makeInvoice(cart, profile, "November 2026");
        long originalTotal = invoice.total();

        // Modify original cart
        cart = List.of(new CartLine("P01", 100)); // different quantity

        // Invoice should be unchanged
        assertEquals(originalTotal, invoice.total());
        assertEquals(1, invoice.lines().get(0).quantity());
        assertEquals(99900, invoice.lines().get(0).unitPrice());
        assertEquals("Biz Fibre 100", invoice.lines().get(0).name());
    }

    @Test
    void invoiceBillingDetailsFixedAfterAccountChanges() {
        Profile account = new Profile(
            TestFixtures.demoProfile().name(), TestFixtures.demoProfile().business(),
            TestFixtures.demoProfile().email(), TestFixtures.demoProfile().industry(),
            TestFixtures.demoProfile().city(), TestFixtures.demoProfile().tier(),
            TestFixtures.demoProfile().employees(), TestFixtures.demoProfile().sites(),
            TestFixtures.demoProfile().budget(), TestFixtures.demoProfile().hasGstin(),
            TestFixtures.demoProfile().priorities(), TestFixtures.demoProfile().address(),
            TestFixtures.demoProfile().phone()
        );

        Invoice invoice = invoiceService.makeInvoice(TestFixtures.basicCart(), account, "November 2026");

        account = new Profile(
            "New Name", "Renamed business", "new@example.com",
            account.industry(), account.city(), account.tier(),
            account.employees(), account.sites(), account.budget(),
            account.hasGstin(), account.priorities(), "A different address",
            account.phone()
        );

        assertEquals("Aanya Sharma", invoice.billedTo().name());
        assertEquals("Northstar Studio", invoice.billedTo().business());
        assertEquals("aanya@example.com", invoice.billedTo().email());
        assertEquals("24, Indiranagar, Bengaluru, Karnataka 560038", invoice.billedTo().address());
    }

    @Test
    void demoInvoicesReconcile() {
        Profile profile = TestFixtures.demoProfile();
        List<CartLine> activeLines = TestFixtures.activeCart();

        Invoice invoice = invoiceService.makeInvoice(activeLines, profile, "November 2026");

        assertEquals(invoice.subtotal() + invoice.tax(), invoice.total());
        assertEquals(0, quoteService.quote(activeLines, profile).errors().size());
    }

    @Test
    void invoiceWithMultipleProducts() {
        List<CartLine> lines = List.of(
            new CartLine("P01", 1),
            new CartLine("P16", 12)
        );
        Profile profile = TestFixtures.demoProfile();

        Invoice invoice = invoiceService.makeInvoice(lines, profile, "November 2026");

        assertEquals(2, invoice.lines().size());
        assertEquals(99900 + 12500 * 12, invoice.subtotal());
        assertEquals(2, invoice.lines().size());
    }
}