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
    private final com.airtelsync.backend.application.SmartKycService smart;
    public KycController(CustomerKycService kyc, com.airtelsync.backend.application.SmartKycService smart) { this.kyc = kyc; this.smart = smart; }
    @PostMapping("/assessment") public com.airtelsync.backend.domain.kyc.KycChecks.Assessment assessment(@AuthenticationPrincipal Jwt jwt) { return smart.assess(jwt.getSubject()); }
    @GetMapping public Kyc get(@AuthenticationPrincipal Jwt jwt) { return kyc.get(jwt.getSubject()); }
    @PutMapping public Kyc consent(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody KycRequest request) {
        return kyc.consent(jwt.getSubject(), request.provider(), request.consent());
    }
    @PostMapping("/demo-verification") public Kyc demo(@AuthenticationPrincipal Jwt jwt) { return kyc.verifyDemo(jwt.getSubject()); }
}
