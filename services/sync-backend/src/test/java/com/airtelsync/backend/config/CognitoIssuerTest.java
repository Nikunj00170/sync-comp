package com.airtelsync.backend.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CognitoIssuerTest {
    @Test void resolvesExistingPoolAndRegionVariablesWithoutBrowserConfiguration() {
        assertEquals("https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_Ab123",
            CognitoIssuer.resolve("", "ap-south-1_Ab123", "ap-south-1"));
        assertEquals("https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_Ab123",
            CognitoIssuer.resolve("", "ap-south-1_Ab123", ""));
        assertEquals("", CognitoIssuer.resolve("", "", ""));
    }
    @Test void explicitIssuerWinsAndInvalidPoolConfigurationFailsClosed() {
        assertEquals("https://issuer.example/pool", CognitoIssuer.resolve("https://issuer.example/pool", "", ""));
        assertThrows(IllegalArgumentException.class, () -> CognitoIssuer.resolve("", "YOUR_POOL_ID", "ap-south-1"));
        assertThrows(IllegalArgumentException.class, () -> CognitoIssuer.resolve("", "ap-south-1_Ab123", "us-east-1"));
    }
}
