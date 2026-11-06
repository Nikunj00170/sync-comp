package com.airtelsync.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record QuoteRequest(
    @NotNull(message = "Lines must not be null")
    @NotEmpty(message = "Lines must not be empty")
    @Valid
    List<@NotNull CartLineRequest> lines
) {
    public record CartLineRequest(
        @jakarta.validation.constraints.NotBlank(message = "Product ID must not be blank")
        String productId,

        @jakarta.validation.constraints.Min(value = 1, message = "Quantity must be at least 1")
        @jakarta.validation.constraints.Max(value = 1000, message = "Quantity must not exceed 1000")
        int quantity
    ) {
    }
}