package com.airtelsync.backend.controller;

import com.airtelsync.backend.application.CustomerKycService;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.dto.request.KycRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/kyc")
public class KycController {
    private final CustomerKycService kyc;
    public KycController(CustomerKycService kyc) { this.kyc = kyc; }
    @GetMapping public Kyc get(@AuthenticationPrincipal Jwt jwt) { return kyc.get(jwt.getSubject()); }
    @PutMapping public Kyc consent(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody KycRequest request) {
        return kyc.consent(jwt.getSubject(), request.provider(), request.consent());
    }
    @PostMapping("/demo-verification") public Kyc demo(@AuthenticationPrincipal Jwt jwt) { return kyc.verifyDemo(jwt.getSubject()); }
}
