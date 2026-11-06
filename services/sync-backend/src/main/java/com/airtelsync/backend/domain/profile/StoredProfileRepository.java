package com.airtelsync.backend.domain.profile;

import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.persistence.CustomerStore;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public class StoredProfileRepository implements ProfileRepository {
    private final CustomerStore store;
    public StoredProfileRepository(CustomerStore store) { this.store = store; }
    public Optional<Profile> findBySubject(String subject) {
        return store.get(subject, "PROFILE", Profile.class).map(CustomerStore.Stored::value);
    }
    public Profile save(String subject, Profile profile) {
        store.transact(subject, List.of(new CustomerStore.Write("PROFILE", profile, null)));
        return profile;
    }
}
