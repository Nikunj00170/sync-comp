package com.airtelsync.backend.application;

import com.airtelsync.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class DemoPolicy {
    private final boolean enabled;
    private final String kycMode;
    public DemoPolicy(@Value("${SYNC_DEMO_ENABLED:false}") boolean enabled,
        @Value("${KYC_MODE:mock}") String kycMode) { this.enabled = enabled; this.kycMode = kycMode; }
    public void requireEnabled() {
        if (!enabled || !"mock".equals(kycMode)) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "DEMO_DISABLED",
            "Demo checkout and verification are disabled. No live purchase or verification provider is configured.");
    }
}
