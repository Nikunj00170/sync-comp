package com.airtelsync.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import java.time.Duration;
import org.springframework.core.env.Environment;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.regions.providers.DefaultAwsRegionProviderChain;

@Configuration
public class AwsAdaptersConfiguration {
    private final Environment environment;
    public AwsAdaptersConfiguration(Environment environment) { this.environment = environment; }

    Region region() {
        String configured = environment.getProperty("aws.region");
        return configured == null || configured.isBlank()
            ? DefaultAwsRegionProviderChain.builder().build().getRegion() : Region.of(configured);
    }
    @Bean(destroyMethod = "close")
    DefaultCredentialsProvider awsCredentialsProvider() {
        var builder = DefaultCredentialsProvider.builder();
        String profile = environment.getProperty("aws.profile");
        if (profile != null && !profile.isBlank()) builder.profileName(profile);
        return builder.build();
    }
    private ClientOverrideConfiguration timeouts() {
        return ClientOverrideConfiguration.builder().apiCallTimeout(Duration.ofSeconds(10))
            .apiCallAttemptTimeout(Duration.ofSeconds(4)).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.kyc.ocr", havingValue = "textract")
    software.amazon.awssdk.services.textract.TextractClient textractClient(DefaultCredentialsProvider credentials) {
        return software.amazon.awssdk.services.textract.TextractClient.builder()
            .region(region()).credentialsProvider(credentials).httpClientBuilder(UrlConnectionHttpClient.builder()).overrideConfiguration(timeouts()).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.storage", havingValue = "dynamodb")
    DynamoDbClient dynamoDbClient(DefaultCredentialsProvider credentials) {
        return DynamoDbClient.builder().region(region()).credentialsProvider(credentials).httpClientBuilder(UrlConnectionHttpClient.builder())
            .overrideConfiguration(timeouts()).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.documents", havingValue = "s3")
    S3Client s3Client(DefaultCredentialsProvider credentials) {
        return S3Client.builder().region(region()).credentialsProvider(credentials).httpClientBuilder(UrlConnectionHttpClient.builder())
            .overrideConfiguration(timeouts()).build();
    }
    @Bean @ConditionalOnProperty(name = "sync.documents", havingValue = "s3")
    S3Presigner s3Presigner(DefaultCredentialsProvider credentials) {
        return S3Presigner.builder().region(region()).credentialsProvider(credentials).build();
    }
}
