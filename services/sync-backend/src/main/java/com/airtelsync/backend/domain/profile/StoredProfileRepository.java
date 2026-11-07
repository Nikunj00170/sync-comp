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
        var previous = store.get(subject, "PROFILE", Profile.class);
        var writes = new java.util.ArrayList<CustomerStore.Write>();
        writes.add(CustomerStore.Write.replace("PROFILE", profile, previous.map(CustomerStore.Stored::version).orElse(0L)));
        var kyc = store.get(subject, "KYC", com.airtelsync.backend.domain.model.Kyc.class);
        if (kyc.isPresent() && previous.isPresent()) {
            var old = previous.get().value();
            if (!old.business().equals(profile.business()) || !old.address().equals(profile.address())
                || old.hasGstin() != profile.hasGstin()) {
                var k = kyc.get().value();
                writes.add(CustomerStore.Write.replace("KYC", new com.airtelsync.backend.domain.model.Kyc(
                    "pending", k.provider(), false, k.documents(), null), kyc.get().version()));
            }
        }
        store.transact(subject, writes);
        return profile;
    }
}
