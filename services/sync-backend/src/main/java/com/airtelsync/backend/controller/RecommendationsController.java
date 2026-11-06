package com.airtelsync.backend.controller;

import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.domain.recommendation.RecommendationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class RecommendationsController {
    private final RecommendationService recommendations;
    private final ProfileService profiles;
    public RecommendationsController(RecommendationService recommendations, ProfileService profiles) {
        this.recommendations = recommendations; this.profiles = profiles;
    }
    @GetMapping("/v1/recommendations")
    public List<RecommendationService.RecommendationGroup> get(@AuthenticationPrincipal Jwt jwt) {
        return recommendations.recommendations(profiles.requireProfile(jwt.getSubject()));
    }
}
