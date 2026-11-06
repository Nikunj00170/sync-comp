package com.airtelsync.backend.dto.request;

import jakarta.validation.constraints.*;

public record UploadRequest(
    @NotBlank @Size(max = 255) String name,
    @NotNull @Pattern(regexp = "application/pdf|image/jpeg|image/png") String type,
    @NotNull @Min(1) @Max(10485760) Long size
) {}
