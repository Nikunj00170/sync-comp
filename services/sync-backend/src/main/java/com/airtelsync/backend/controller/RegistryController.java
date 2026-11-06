package com.airtelsync.backend.controller;

import com.airtelsync.backend.application.*;
import com.airtelsync.backend.domain.kyc.MockRegistry;
import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.exception.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.Locale;

@RestController
@RequestMapping("/v1/registries")
public class RegistryController {
    public record Lookup(@NotBlank @Pattern(regexp = "gstin|udyam") String kind, @NotBlank @Size(max = 30) String identifier) {}
    public record Result(String source, String maskedIdentifier, boolean found, String status, boolean businessMatches) {}
    private final MockRegistry registry; private final CustomerKycService kyc; private final DemoPolicy demo; private final ProfileService profiles;
    public RegistryController(MockRegistry registry, CustomerKycService kyc, DemoPolicy demo, ProfileService profiles) {
        this.registry = registry; this.kyc = kyc; this.demo = demo; this.profiles = profiles;
    }
    @PostMapping("/lookup") public Result lookup(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Lookup request) {
        demo.requireEnabled();
        if (!kyc.get(jwt.getSubject()).consent()) throw ApiException.conflict("KYC consent is required for business registration lookup.");
        String business = profiles.requireProfile(jwt.getSubject()).business();
        String id = request.identifier().trim().toUpperCase(Locale.ROOT);
        if (request.kind().equals("gstin")) {
            if (!MockRegistry.validGstin(id)) throw new IllegalArgumentException("GSTIN format or checksum is invalid.");
            var row = registry.gst(id);
            return new Result("synthetic-mock-registry", MockRegistry.mask(id), row.isPresent(), row.map(MockRegistry.Gst::status).orElse("not_found"),
                row.map(r -> r.trade_name().equalsIgnoreCase(business)).orElse(false));
        }
        if (!id.matches("UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}")) throw new IllegalArgumentException("Udyam format is invalid.");
        var row = registry.udyam(id);
        return new Result("synthetic-mock-registry", MockRegistry.mask(id), row.isPresent(), row.isPresent() ? "registered" : "not_found",
            row.map(r -> r.enterprise_name().equalsIgnoreCase(business)).orElse(false));
    }
}
