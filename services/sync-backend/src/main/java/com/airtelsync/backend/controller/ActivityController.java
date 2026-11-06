package com.airtelsync.backend.controller;

import com.airtelsync.backend.application.*;
import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.dto.request.TicketRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/v1")
public class ActivityController {
    private final CustomerActivityService activity;
    private final CustomerQueries queries;
    public ActivityController(CustomerActivityService activity, CustomerQueries queries) { this.activity = activity; this.queries = queries; }
    @GetMapping("/tickets")
    public ResponseEntity<List<Ticket>> tickets(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) String after) {
        return OrdersController.page(queries.list(jwt.getSubject(), "TICKET#", Ticket.class, limit, after));
    }
    @PostMapping("/tickets")
    public ResponseEntity<Ticket> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TicketRequest request) {
        return ResponseEntity.status(201).body(activity.create(jwt.getSubject(), request));
    }
    @GetMapping("/tickets/{id}")
    public Ticket get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) { return activity.get(jwt.getSubject(), id); }
    @PostMapping("/tickets/{id}/resolve")
    public Ticket resolve(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) { return activity.resolve(jwt.getSubject(), id); }
    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> notifications(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) String after) {
        return OrdersController.page(queries.list(jwt.getSubject(), "NOTIFICATION#", Notification.class, limit, after));
    }
    @PostMapping("/notifications/{id}/read")
    public Notification read(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) { return activity.read(jwt.getSubject(), id); }
}
