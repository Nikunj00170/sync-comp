package com.airtelsync.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import java.time.Duration;

@Configuration
public class AwsAdaptersConfiguration {
    private ClientOverrideConfiguration timeouts() {
        return ClientOverrideConfiguration.builder().apiCallTimeout(Duration.ofSeconds(10))
            .apiCallAttemptTimeout(Duration.ofSeconds(4)).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.storage", havingValue = "dynamodb")
    DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder().httpClientBuilder(UrlConnectionHttpClient.builder())
            .overrideConfiguration(timeouts()).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.documents", havingValue = "s3")
    S3Client s3Client() {
        return S3Client.builder().httpClientBuilder(UrlConnectionHttpClient.builder())
            .overrideConfiguration(timeouts()).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.documents", havingValue = "s3")
    S3Presigner s3Presigner() { return S3Presigner.create(); }
}
