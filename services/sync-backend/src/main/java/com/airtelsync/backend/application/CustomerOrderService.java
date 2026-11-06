package com.airtelsync.backend.application;

import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.domain.quote.*;
import com.airtelsync.backend.exception.ApiException;
import com.airtelsync.backend.persistence.CustomerStore;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CustomerOrderService {
    public record Checkout(String fingerprint, Order order) {}
    private final CustomerStore store;
    private final ProfileService profiles;
    private final OrderService orders;
    private final InvoiceService invoices;
    private final DemoPolicy demo;

    public CustomerOrderService(CustomerStore store, ProfileService profiles, OrderService orders,
                                InvoiceService invoices, DemoPolicy demo) {
        this.store = store; this.profiles = profiles; this.orders = orders; this.invoices = invoices; this.demo = demo;
    }

    public Order create(String subject, String idempotencyKey, List<CartLine> lines) {
        demo.requireEnabled();
        if (idempotencyKey == null || !idempotencyKey.matches("[A-Za-z0-9_-]{8,128}"))
            throw new IllegalArgumentException("Supply an Idempotency-Key of 8–128 letters, digits, underscores or hyphens");
        lines = List.copyOf(lines);
        String fingerprint = lines.toString();
        String key = "CHECKOUT#" + idempotencyKey;
        var previous = store.get(subject, key, Checkout.class);
        if (previous.isPresent()) return replay(previous.get().value(), fingerprint);
        var profile = profiles.requireProfile(subject);
        var kycRecord = store.get(subject, "KYC", Kyc.class);
        var kyc = kycRecord.map(CustomerStore.Stored::value).orElse(null);
        var order = orders.makeOrder(lines, profile, kyc);
        String period = DateTimeFormatter.ofPattern("MMMM uuuu", Locale.ENGLISH).withZone(ZoneOffset.UTC).format(Instant.now());
        var invoice = invoices.makeInvoice(lines, profile, period);
        var notification = new Notification(UUID.randomUUID().toString(), "Your demo order is in",
            order.name() + " is ready to track.", "/orders/" + order.id(), false, Instant.now().toString());
        try {
            store.transact(subject, List.of(CustomerStore.Write.create(key, new Checkout(fingerprint, order)),
                CustomerStore.Write.create("ORDER#" + order.id(), order),
                CustomerStore.Write.create("INVOICE#" + invoice.id(), invoice),
                CustomerStore.Write.create("NOTIFICATION#" + notification.id(), notification),
                CustomerStore.Write.replace("KYC", kyc, kycRecord.orElseThrow().version())));
            return order;
        } catch (ApiException ex) {
            if (ex.status().value() != 409) throw ex;
            var won = store.get(subject, key, Checkout.class);
            if (won.isPresent()) return replay(won.get().value(), fingerprint);
            throw ex;
        }
    }

    private Order replay(Checkout previous, String fingerprint) {
        if (!previous.fingerprint().equals(fingerprint)) throw ApiException.conflict("Idempotency-Key was used for a different checkout.");
        return previous.order();
    }

    public Order get(String subject, String id) {
        return store.get(subject, "ORDER#" + id, Order.class).orElseThrow(ApiException::notFound).value();
    }

    public Order transition(String subject, String id, boolean advance) {
        demo.requireEnabled();
        var current = store.get(subject, "ORDER#" + id, Order.class).orElseThrow(ApiException::notFound);
        Order changed;
        try { changed = advance ? orders.nextOrder(current.value()) : orders.cancelOrder(current.value()); }
        catch (IllegalArgumentException ex) { throw ApiException.conflict(ex.getMessage()); }
        store.transact(subject, List.of(CustomerStore.Write.replace("ORDER#" + id, changed, current.version())));
        return changed;
    }
}
