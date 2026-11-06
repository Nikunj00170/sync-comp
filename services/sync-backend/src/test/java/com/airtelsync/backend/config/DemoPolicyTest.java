package com.airtelsync.backend.config;

import com.airtelsync.backend.application.DemoPolicy;
import com.airtelsync.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DemoPolicyTest {
    @Test void demoFlagAndMockKycModeAreBothRequired() {
        assertDoesNotThrow(() -> new DemoPolicy(true, "mock").requireEnabled());
        assertThrows(ApiException.class, () -> new DemoPolicy(false, "mock").requireEnabled());
        assertThrows(ApiException.class, () -> new DemoPolicy(true, "live").requireEnabled());
    }
}
