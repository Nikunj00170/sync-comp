package com.airtelsync.backend.domain.profile;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.DocumentMeta;
import com.airtelsync.backend.domain.model.Invoice;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.domain.model.Notification;
import com.airtelsync.backend.domain.model.Order;
import com.airtelsync.backend.domain.model.OrderStatus;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Quote;
import com.airtelsync.backend.domain.model.Ticket;
import com.airtelsync.backend.domain.model.TimelineEvent;
import com.airtelsync.backend.domain.model.Workspace;
import com.airtelsync.backend.domain.quote.InvoiceService;
import com.airtelsync.backend.domain.quote.OrderService;
import com.airtelsync.backend.domain.quote.QuoteService;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceService {

    private final CatalogueService catalogueService;
    private final QuoteService quoteService;
    private final OrderService orderService;
    private final InvoiceService invoiceService;

    public WorkspaceService(
        CatalogueService catalogueService,
        QuoteService quoteService,
        OrderService orderService,
        InvoiceService invoiceService
    ) {
        this.catalogueService = catalogueService;
        this.quoteService = quoteService;
        this.orderService = orderService;
        this.invoiceService = invoiceService;
    }

    public Workspace initialWorkspace() {
        Profile profile = new Profile(
            "Aanya Sharma",
            "Northstar Studio",
            "aanya@example.com",
            Profile.Industry.professional,
            "Bengaluru",
            1,
            12,
            1,
            6000,
            true,
            List.of("productivity", "security"),
            "24, Indiranagar, Bengaluru, Karnataka 560038",
            ""
        );

        List<CartLine> activeLines = List.of(
            new CartLine("P02", 1),
            new CartLine("P16", 12),
            new CartLine("P20", 8),
            new CartLine("P17", 1)
        );

        // Use fixed timezone (Asia/Kolkata) for deterministic demo data timestamps
        ZoneId demoZone = ZoneId.of("Asia/Kolkata");
        Instant now = Instant.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.forLanguageTag("en-IN"));

        java.util.function.Function<Integer, String> before = days ->
            now.minusSeconds(days * 86400L).atZone(demoZone).format(formatter);

        java.util.function.Function<Integer, String> beforeDouble = days ->
            now.minusSeconds((long) (days * 86400 * 0.6)).atZone(demoZone).format(formatter);

        String current = now.atZone(demoZone).format(monthFormatter);
        String previous = now.minusSeconds(30L * 86400).atZone(demoZone).format(monthFormatter);

        Quote activeQuote = quoteService.quote(activeLines, profile);

        List<TimelineEvent> activeEvents = new ArrayList<>();
        List<OrderStatus> orderSteps = List.of(
            OrderStatus.received,
            OrderStatus.verification,
            OrderStatus.confirmed,
            OrderStatus.scheduled,
            OrderStatus.installing,
            OrderStatus.active
        );
        for (int i = 0; i < orderSteps.size(); i++) {
            OrderStatus s = orderSteps.get(i);
            activeEvents.add(new TimelineEvent(
                orderService.getStatusLabel(s),
                "Sample service milestone.",
                before.apply(36 - i)
            ));
        }

        Order active = new Order(
            "SYNC-20481",
            "Your connected workspace",
            before.apply(36),
            OrderStatus.active,
            activeLines,
            activeQuote,
            profile.address(),
            "",
            activeEvents
        );

        List<CartLine> pendingLines = List.of(
            new CartLine("P22", 1),
            new CartLine("P01", 1)
        );

        Quote pendingQuote = quoteService.quote(pendingLines, profile);

        List<TimelineEvent> pendingEvents = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            OrderStatus s = orderSteps.get(i);
            pendingEvents.add(new TimelineEvent(
                orderService.getStatusLabel(s),
                "Sample installation progress.",
                beforeDouble.apply(3 - i)
            ));
        }

        Order pending = new Order(
            "SYNC-20846",
            "Studio guest Wi-Fi",
            before.apply(3),
            OrderStatus.scheduled,
            pendingLines,
            pendingQuote,
            profile.address(),
            now.plusSeconds(2 * 86400).toString(),
            pendingEvents
        );

        Invoice invoice = invoiceService.makeInvoice(activeLines, profile, current);

        List<Invoice> invoices = List.of(
            new Invoice(
                "INV-2026-0042",
                invoice.period(),
                invoice.issuedAt(),
                invoice.dueAt(),
                invoice.status(),
                invoice.lines(),
                invoice.subtotal(),
                invoice.tax(),
                invoice.total(),
                invoice.paymentReference(),
                invoice.billedTo()
            ),
            new Invoice(
                "INV-2026-0031",
                previous,
                before.apply(32),
                before.apply(25),
                "paid",
                invoice.lines(),
                invoice.subtotal(),
                invoice.tax(),
                invoice.total(),
                "DEMO-PAY-0031",
                invoice.billedTo()
            )
        );

        List<Notification> notifications = List.of(
            new Notification(
                "n1",
                "Your installation is on the calendar",
                "Review your sample guest Wi-Fi installation and choose a convenient slot.",
                "/orders/SYNC-20846",
                false,
                before.apply(0).replace("T", "T00:")
            ),
            new Notification(
                "n2",
                "One bill. Every service.",
                "Your consolidated demo invoice is ready to review.",
                "/billing",
                false,
                before.apply(1)
            ),
            new Notification(
                "n3",
                "Let's finish your business profile",
                "Complete verification to try the full demo checkout.",
                "/verification",
                false,
                before.apply(2)
            )
        );

        return new Workspace(
            1,
            profile,
            List.of(),
            List.of(),
            List.of(pending, active),
            invoices,
            new Kyc("pending", null, false, List.of(), null),
            List.of(),
            notifications,
            new Workspace.Preferences(true, true, false),
            0
        );
    }
}