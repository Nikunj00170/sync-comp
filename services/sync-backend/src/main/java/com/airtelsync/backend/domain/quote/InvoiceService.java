package com.airtelsync.backend.domain.quote;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Invoice;
import com.airtelsync.backend.domain.model.InvoiceLine;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Quote;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class InvoiceService {

    private final CatalogueService catalogueService;
    private final QuoteService quoteService;
    private final OrderService orderService;

    public InvoiceService(CatalogueService catalogueService, QuoteService quoteService, OrderService orderService) {
        this.catalogueService = catalogueService;
        this.quoteService = quoteService;
        this.orderService = orderService;
    }

    public Invoice makeInvoice(List<CartLine> lines, Profile profile, String period) {
        Quote quote = quoteService.quote(lines, profile);
        if (!quote.errors().isEmpty()) {
            throw new IllegalArgumentException(String.join(". ", quote.errors()));
        }

        String now = Instant.now().toString();
        String dueAt = Instant.now().plusSeconds(7L * 86400).toString();

        List<InvoiceLine> invoiceLines = quote.lines().stream()
            .map(line -> {
                var product = catalogueService.getById(line.productId());
                return new InvoiceLine(
                    line.productId(),
                    line.quantity(),
                    product.name(),
                    product.price(),
                    product.category(),
                    product.unit()
                );
            })
            .toList();

        return new Invoice(
            orderService.makeId("INV"),
            period,
            now,
            dueAt,
            "unpaid",
            invoiceLines,
            quote.monthly(),
            quote.tax(),
            quote.total(),
            null,
            new Invoice.BilledTo(
                profile.name(),
                profile.business(),
                profile.email(),
                profile.address()
            )
        );
    }
}