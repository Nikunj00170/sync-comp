package com.airtelsync.backend.dto.response;

import java.util.List;

public record ApiErrorResponse(
    ErrorDetail error
) {
    public static ApiErrorResponse of(String code, String message, List<FieldError> details) {
        return new ApiErrorResponse(new ErrorDetail(code, message, details));
    }

    public record ErrorDetail(
        String code,
        String message,
        List<FieldError> details
    ) {
    }

    public record FieldError(
        String field,
        String message
    ) {
    }
}