package com.airtelsync.backend.dto.request;

import jakarta.validation.constraints.*;

public record KycRequest(
    @NotNull @Pattern(regexp = "digio|digilocker") String provider,
    @NotNull Boolean consent
) {}
