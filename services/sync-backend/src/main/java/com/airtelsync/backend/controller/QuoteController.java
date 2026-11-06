package com.airtelsync.backend.controller;

import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Quote;
import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.domain.quote.QuoteService;
import com.airtelsync.backend.dto.request.QuoteRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/v1/quotes")
public class QuoteController {

    private final QuoteService quoteService;
    private final ProfileService profileService;

    public QuoteController(QuoteService quoteService, ProfileService profileService) {
        this.quoteService = quoteService;
        this.profileService = profileService;
    }

    @PostMapping
    public ResponseEntity<Quote> createQuote(
        @Valid @RequestBody QuoteRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        Profile profile = profileService.getProfileFromJwt(jwt);
        List<CartLine> lines = request.lines().stream()
            .map(l -> new CartLine(l.productId(), l.quantity()))
            .toList();

        Quote quote = quoteService.quote(lines, profile);
        return ResponseEntity.ok(quote);
    }
}