package com.airtelsync.backend.application;

import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.dto.request.TicketRequest;
import com.airtelsync.backend.exception.ApiException;
import com.airtelsync.backend.persistence.CustomerStore;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;

@Service
public class CustomerActivityService {
    private final CustomerStore store;
    public CustomerActivityService(CustomerStore store) { this.store = store; }
    public Ticket create(String subject, TicketRequest request) {
        String now = Instant.now().toString();
        var ticket = new Ticket(UUID.randomUUID().toString(), request.subject(), request.category(), request.description(), "open", now);
        var notice = new Notification(UUID.randomUUID().toString(), "Support request received", ticket.subject(), "/support", false, now);
        store.transact(subject, List.of(CustomerStore.Write.create("TICKET#" + ticket.id(), ticket),
            CustomerStore.Write.create("NOTIFICATION#" + notice.id(), notice)));
        return ticket;
    }
    public Ticket get(String subject, String id) {
        return store.get(subject, "TICKET#" + id, Ticket.class).orElseThrow(ApiException::notFound).value();
    }
    public Ticket resolve(String subject, String id) {
        var current = store.get(subject, "TICKET#" + id, Ticket.class).orElseThrow(ApiException::notFound);
        var old = current.value();
        if (old.status().equals("resolved")) return old;
        var next = new Ticket(old.id(), old.subject(), old.category(), old.description(), "resolved", old.createdAt());
        store.transact(subject, List.of(CustomerStore.Write.replace("TICKET#" + id, next, current.version())));
        return next;
    }
    public Notification read(String subject, String id) {
        var current = store.get(subject, "NOTIFICATION#" + id, Notification.class).orElseThrow(ApiException::notFound);
        var old = current.value();
        if (old.read()) return old;
        var next = new Notification(old.id(), old.title(), old.text(), old.route(), true, old.createdAt());
        store.transact(subject, List.of(CustomerStore.Write.replace("NOTIFICATION#" + id, next, current.version())));
        return next;
    }
}
