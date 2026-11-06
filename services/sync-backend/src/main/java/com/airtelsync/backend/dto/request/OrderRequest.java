package com.airtelsync.backend.dto.request;

import jakarta.validation.Valid;
import com.airtelsync.backend.dto.request.QuoteRequest.CartLineRequest;
import jakarta.validation.constraints.*;
import java.util.List;

public record OrderRequest(
    @NotEmpty @Size(max = 100) @Valid List<@NotNull CartLineRequest> lines,
    @NotNull @AssertTrue Boolean demoConsent
) {}
