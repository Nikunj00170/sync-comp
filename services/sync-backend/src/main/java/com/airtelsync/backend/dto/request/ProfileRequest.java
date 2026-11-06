package com.airtelsync.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProfileRequest(
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 70, message = "Name must be between 2 and 70 characters")
    String name,

    @NotBlank(message = "Business name is required")
    @Size(min = 2, max = 100, message = "Business name must be between 2 and 100 characters")
    String business,

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    String email,

    @NotNull(message = "Industry is required")
    Industry industry,

    @NotBlank(message = "City is required")
    @Size(min = 2, max = 70, message = "City must be between 2 and 70 characters")
    String city,

    @NotNull(message = "Tier is required")
    @Min(value = 1, message = "Tier must be at least 1")
    @Max(value = 2, message = "Tier must not exceed 2")
    Integer tier,

    @NotNull(message = "Employees is required")
    @Min(value = 1, message = "Employees must be at least 1")
    @Max(value = 1000, message = "Employees must not exceed 1000")
    Integer employees,

    @NotNull(message = "Sites is required")
    @Min(value = 1, message = "Sites must be at least 1")
    @Max(value = 100, message = "Sites must not exceed 100")
    Integer sites,

    @NotNull(message = "Budget is required")
    @Min(value = 500, message = "Budget must be at least 500")
    @Max(value = 1000000, message = "Budget must not exceed 1,000,000")
    Integer budget,

    @NotNull(message = "GSTIN status is required")
    Boolean hasGstin,

    @NotNull(message = "Priorities is required")
    @Size(min = 1, message = "Choose at least one priority")
    List<@NotNull String> priorities,

    @NotNull
    @Size(max = 250, message = "Address must not exceed 250 characters")
    String address,

    @NotNull
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    String phone
) {
    public ProfileRequest {
        name = name == null ? null : name.strip();
        business = business == null ? null : business.strip();
        city = city == null ? null : city.strip();
    }

    public enum Industry {
        professional, retail, manufacturing, hospitality
    }
}
