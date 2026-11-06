package com.airtelsync.backend.dto.request;

import jakarta.validation.constraints.*;

public record TicketRequest(
    @NotBlank @Size(min = 5, max = 160) String subject,
    @NotBlank @Size(max = 80) String category,
    @NotBlank @Size(min = 12, max = 5000) String description
) {
    public TicketRequest {
        subject = subject == null ? null : subject.strip();
        category = category == null ? null : category.strip();
        description = description == null ? null : description.strip();
    }
}
