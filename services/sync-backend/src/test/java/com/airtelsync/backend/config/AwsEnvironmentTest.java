package com.airtelsync.backend.config;

import com.airtelsync.backend.application.*;
import com.airtelsync.backend.exception.ApiException;
import com.airtelsync.backend.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.mock.web.MockHttpServletRequest;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"spring.profiles.active=aws", "CUSTOMERS_TABLE=customers-test", "ORDERS_TABLE=orders-test",
    "ACTIVITY_TABLE=activity-test", "DOCUMENTS_BUCKET=documents-test", "FRONTEND_ORIGIN=https://frontend.example",
    "AWS_REGION=ap-south-1", "KYC_MODE=mock", "SYNC_DEMO_ENABLED=false"})
@Import(CognitoJwtTestConfiguration.class)
class AwsEnvironmentTest {
    @MockitoBean DynamoDbClient dynamo;
    @MockitoBean S3Client s3;
    @MockitoBean S3Presigner signer;
    @Autowired CustomerStore store;
    @Autowired DocumentStorage documents;
    @Autowired CorsConfigurationSource corsConfigurationSource;
    @Autowired DemoPolicy demo;
    @Test void awsProfileUsesDurableAdaptersWithRootEnvironmentNames() {
        assertInstanceOf(DynamoDbCustomerStore.class, store);
        assertInstanceOf(S3DocumentStorage.class, documents);
        var request = new MockHttpServletRequest("GET", "/v1/me");
        var config = corsConfigurationSource.getCorsConfiguration(request);
        assertNotNull(config);
        assertEquals(java.util.List.of("https://frontend.example"), config.getAllowedOrigins());
        assertThrows(ApiException.class, demo::requireEnabled);
    }
}
