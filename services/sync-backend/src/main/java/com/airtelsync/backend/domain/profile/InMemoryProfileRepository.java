package com.airtelsync.backend.domain.profile;

import com.airtelsync.backend.domain.model.Profile;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryProfileRepository implements ProfileRepository {
    private final ConcurrentHashMap<String, Profile> profiles = new ConcurrentHashMap<>();

    public Optional<Profile> findBySubject(String subject) {
        return Optional.ofNullable(profiles.get(subject));
    }

    public Profile save(String subject, Profile profile) {
        profiles.put(subject, profile);
        return profile;
    }
}
