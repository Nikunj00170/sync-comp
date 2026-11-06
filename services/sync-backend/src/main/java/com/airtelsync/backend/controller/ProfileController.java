package com.airtelsync.backend.controller;

import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.dto.request.ProfileRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/v1/me")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<Profile> getProfile(@AuthenticationPrincipal Jwt jwt) {
        Profile profile = profileService.getProfileFromJwt(jwt);
        return ResponseEntity.ok(profile);
    }

    @PutMapping
    public ResponseEntity<Profile> updateProfile(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody ProfileRequest request
    ) {
        String subject = jwt.getSubject();
        Profile updated = toDomainProfile(request);
        Profile saved = profileService.updateProfile(subject, updated);
        return ResponseEntity.ok(saved);
    }

    private Profile toDomainProfile(ProfileRequest request) {
        return new Profile(
            request.name(),
            request.business(),
            request.email(),
            Profile.Industry.valueOf(request.industry().name().toLowerCase()),
            request.city(),
            request.tier(),
            request.employees(),
            request.sites(),
            request.budget(),
            request.hasGstin(),
            request.priorities(),
            request.address() != null ? request.address() : "",
            request.phone() != null ? request.phone() : ""
        );
    }
}