package com.airtelsync.backend.controller;

import com.airtelsync.backend.application.CustomerOrderService;
import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.dto.request.OrderRequest;
import com.airtelsync.backend.persistence.CustomerStore;
import com.airtelsync.backend.application.CustomerQueries;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/v1/orders")
public class OrdersController {
    private final CustomerOrderService orders;
    private final CustomerQueries queries;
    public OrdersController(CustomerOrderService orders, CustomerQueries queries) { this.orders = orders; this.queries = queries; }

    @GetMapping
    public ResponseEntity<List<Order>> list(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) String after) {
        return page(queries.list(jwt.getSubject(), "ORDER#", Order.class, limit, after));
    }
    @GetMapping("/{id}")
    public Order get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) { return orders.get(jwt.getSubject(), id); }
    @PostMapping
    public ResponseEntity<Order> create(@AuthenticationPrincipal Jwt jwt,
        @RequestHeader(value = "Idempotency-Key", required = false) String key, @Valid @RequestBody OrderRequest request) {
        var lines = request.lines().stream().map(l -> new CartLine(l.productId(), l.quantity())).toList();
        return ResponseEntity.status(201).body(orders.create(jwt.getSubject(), key, lines));
    }
    @PostMapping("/{id}/cancel")
    public Order cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) { return orders.transition(jwt.getSubject(), id, false); }

    public static <T> ResponseEntity<List<T>> page(CustomerStore.Page<T> page) {
        var response = ResponseEntity.ok();
        if (page.next() != null) response.header("X-Next-Cursor", page.next());
        return response.body(page.items());
    }
}
