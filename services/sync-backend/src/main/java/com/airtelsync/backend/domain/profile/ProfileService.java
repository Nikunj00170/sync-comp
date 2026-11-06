package com.airtelsync.backend.domain.profile;

import com.airtelsync.backend.domain.model.Profile;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProfileService {
    private final ProfileRepository repository;

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
    }

    public Profile getProfileFromJwt(Jwt jwt) {
        return repository.findBySubject(jwt.getSubject()).orElseGet(() -> {
            // Unsaved onboarding defaults. Cognito access tokens need not contain email/name.
            String name = jwt.getClaimAsString("name");
            String email = jwt.getClaimAsString("email");
            return new Profile(name == null ? "" : name, "", email == null ? "" : email,
                Profile.Industry.professional, "", 1, 1, 1, 5000, false, List.of(), "", "");
        });
    }

    public Profile updateProfile(String subject, Profile profile) {
        return repository.save(subject, new Profile(profile.name(), profile.business(), profile.email(),
            profile.industry(), profile.city(), profile.tier(), profile.employees(), profile.sites(),
            profile.budget(), profile.hasGstin(), List.copyOf(profile.priorities()), profile.address(), profile.phone()));
    }
}
