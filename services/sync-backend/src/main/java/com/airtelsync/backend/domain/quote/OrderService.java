package com.airtelsync.backend.domain.quote;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.domain.model.Order;
import com.airtelsync.backend.domain.model.OrderStatus;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Quote;
import com.airtelsync.backend.domain.model.TimelineEvent;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final CatalogueService catalogueService;
    private final QuoteService quoteService;

    public OrderService(CatalogueService catalogueService, QuoteService quoteService) {
        this.catalogueService = catalogueService;
        this.quoteService = quoteService;
    }

    private static final List<OrderStatus> ORDER_STEPS = List.of(
        OrderStatus.received,
        OrderStatus.verification,
        OrderStatus.confirmed,
        OrderStatus.scheduled,
        OrderStatus.installing,
        OrderStatus.active
    );

    private static final java.util.Map<OrderStatus, String> STATUS_LABELS = java.util.Map.of(
        OrderStatus.received, "Order received",
        OrderStatus.verification, "Verification",
        OrderStatus.confirmed, "Confirmed",
        OrderStatus.scheduled, "Installation scheduled",
        OrderStatus.installing, "Getting you connected",
        OrderStatus.active, "Active",
        OrderStatus.cancelled, "Cancelled"
    );

    public String getStatusLabel(OrderStatus status) {
        return STATUS_LABELS.getOrDefault(status, status.name());
    }

    public List<OrderStatus> getOrderSteps() {
        return ORDER_STEPS;
    }

    public Order nextOrder(Order order) {
        if (order.status() == OrderStatus.active || order.status() == OrderStatus.cancelled) {
            throw new IllegalArgumentException("This order cannot advance");
        }
        int currentIndex = ORDER_STEPS.indexOf(order.status());
        if (currentIndex < 0 || currentIndex >= ORDER_STEPS.size() - 1) {
            throw new IllegalArgumentException("This order cannot advance");
        }
        OrderStatus next = ORDER_STEPS.get(currentIndex + 1);
        List<TimelineEvent> events = new ArrayList<>(order.events());
        events.add(new TimelineEvent(
            STATUS_LABELS.get(next),
            "Simulated milestone in your demo workspace.",
            Instant.now().toString()
        ));
        return new Order(
            order.id(), order.name(), order.createdAt(), next,
            order.lines(), order.quote(), order.address(), order.slot(), events
        );
    }

    public Order cancelOrder(Order order) {
        if (List.of(OrderStatus.active, OrderStatus.installing, OrderStatus.cancelled).contains(order.status())) {
            throw new IllegalArgumentException("This order can no longer be cancelled");
        }
        List<TimelineEvent> events = new ArrayList<>(order.events());
        events.add(new TimelineEvent(
            "Order cancelled",
            "Cancelled in the demo workspace.",
            Instant.now().toString()
        ));
        return new Order(
            order.id(), order.name(), order.createdAt(), OrderStatus.cancelled,
            order.lines(), order.quote(), order.address(), order.slot(), events
        );
    }

    public String makeId(String prefix) {
        return prefix + "-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public Order makeOrder(List<CartLine> lines, Profile profile, Kyc kyc) {
        if (kyc == null || kyc.status() == null || !kyc.status().equals("demo_verified")) {
            throw new IllegalArgumentException("Complete demo verification before placing an order");
        }
        Quote quote = quoteService.quote(lines, profile);
        if (lines.isEmpty() || !quote.errors().isEmpty()) {
            throw new IllegalArgumentException(quote.errors().isEmpty() ? "Add a plan first" : quote.errors().get(0));
        }
        String now = Instant.now().toString();
        String name = lines.size() == 1
            ? catalogueService.getById(lines.get(0).productId()).name()
            : "Your business bundle";

        List<TimelineEvent> events = List.of(new TimelineEvent(
            "Order received",
            "Your demo order is saved. No real service has been purchased.",
            now
        ));

        return new Order(
            makeId("SYNC"),
            name,
            now,
            OrderStatus.received,
            quote.lines(),
            quote,
            profile.address().isEmpty() ? profile.city() : profile.address(),
            "",
            events
        );
    }
}