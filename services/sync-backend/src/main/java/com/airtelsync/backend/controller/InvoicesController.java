package com.airtelsync.backend.controller;

import com.airtelsync.backend.domain.model.Invoice;
import com.airtelsync.backend.persistence.CustomerStore;
import com.airtelsync.backend.application.CustomerQueries;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/v1/invoices")
public class InvoicesController {
    private final CustomerQueries queries;
    public InvoicesController(CustomerQueries queries) { this.queries = queries; }
    @GetMapping
    public ResponseEntity<List<Invoice>> list(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) String after) {
        return OrdersController.page(queries.list(jwt.getSubject(), "INVOICE#", Invoice.class, limit, after));
    }
}
