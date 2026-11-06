package com.airtelsync.backend.config;

import com.airtelsync.backend.application.DocumentStorage;
import com.airtelsync.backend.persistence.*;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.*;

@Configuration
@Profile("aws")
public class AwsProfileGuard {
    @Bean
    InitializingBean requireDurableAwsStorage(CustomerStore records, DocumentStorage documents) {
        return () -> {
            if (!(records instanceof DynamoDbCustomerStore) || !(documents instanceof S3DocumentStorage))
                throw new IllegalStateException("The aws profile requires DynamoDB and S3. Remove local SYNC_STORAGE=memory/SYNC_DOCUMENTS=memory overrides.");
        };
    }
}
