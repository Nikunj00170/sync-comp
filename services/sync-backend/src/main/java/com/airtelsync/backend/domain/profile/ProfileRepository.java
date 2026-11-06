package com.airtelsync.backend.domain.profile;

import com.airtelsync.backend.domain.model.Profile;
import java.util.Optional;

public interface ProfileRepository {
    Optional<Profile> findBySubject(String subject);
    Profile save(String subject, Profile profile);
}
