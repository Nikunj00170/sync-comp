package com.airtelsync.backend.config;

import com.airtelsync.backend.application.DocumentStorage;
import com.airtelsync.backend.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;

class AwsProfileGuardTest {
    @Test void cloudProfileCannotAccidentallyRunWithEphemeralStorage() {
        new ApplicationContextRunner().withInitializer(context -> context.getEnvironment().setActiveProfiles("aws"))
            .withUserConfiguration(AwsProfileGuard.class)
            .withBean(CustomerStore.class, InMemoryCustomerStore::new)
            .withBean(DocumentStorage.class, () -> new InMemoryDocumentStorage("http://localhost:8080"))
            .run(context -> {
                assertNotNull(context.getStartupFailure());
                assertTrue(context.getStartupFailure().getMessage().contains("requireDurableAwsStorage"));
            });
    }
}
