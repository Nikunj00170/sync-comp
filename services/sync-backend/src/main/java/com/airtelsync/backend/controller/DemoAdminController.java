package com.airtelsync.backend.controller;

import com.airtelsync.backend.application.CustomerOrderService;
import com.airtelsync.backend.domain.model.Order;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/demo/orders")
public class DemoAdminController {
    private final CustomerOrderService orders;
    public DemoAdminController(CustomerOrderService orders) { this.orders = orders; }
    // Admin scope and the demo flag are both required. Only the admin's own demo records are affected.
    @PostMapping("/{id}/advance")
    public Order advance(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) { return orders.transition(jwt.getSubject(), id, true); }
}
