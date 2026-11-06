package com.airtelsync.backend.exception;

import com.airtelsync.backend.dto.response.ApiErrorResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        List<ApiErrorResponse.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .map(this::toFieldError)
            .collect(Collectors.toList());

        ApiErrorResponse response = ApiErrorResponse.of(
            "VALIDATION_ERROR",
            "A few details need your attention.",
            fieldErrors
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedJson(HttpMessageNotReadableException ex) {
        ApiErrorResponse response = ApiErrorResponse.of(
            "MALFORMED_REQUEST",
            "Invalid request body.",
            List.of(new ApiErrorResponse.FieldError("body", "Malformed JSON"))
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        List<ApiErrorResponse.FieldError> fieldErrors = ex.getConstraintViolations().stream()
            .map(v -> new ApiErrorResponse.FieldError(
                v.getPropertyPath().toString(),
                v.getMessage()
            ))
            .collect(Collectors.toList());

        ApiErrorResponse response = ApiErrorResponse.of(
            "VALIDATION_ERROR",
            "A few details need your attention.",
            fieldErrors
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        ApiErrorResponse response = ApiErrorResponse.of(
            "INVALID_REQUEST",
            ex.getMessage(),
            List.of()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        ApiErrorResponse response = ApiErrorResponse.of(
            "ACCESS_DENIED",
            "You do not have permission to access this resource.",
            List.of()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.status()).body(ApiErrorResponse.of(ex.code(), ex.getMessage(), List.of()));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(Exception ex) {
        return ResponseEntity.status(404).body(ApiErrorResponse.of("NOT_FOUND", "Route not found.", List.of()));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethod(Exception ex) {
        return ResponseEntity.status(405).body(ApiErrorResponse.of("METHOD_NOT_ALLOWED", "Method not allowed.", List.of()));
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleType(Exception ex) {
        return ResponseEntity.badRequest().body(ApiErrorResponse.of("INVALID_REQUEST", "Invalid parameter.", List.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        ApiErrorResponse response = ApiErrorResponse.of(
            "INTERNAL_ERROR",
            "An unexpected error occurred.",
            List.of()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    private ApiErrorResponse.FieldError toFieldError(FieldError fieldError) {
        return new ApiErrorResponse.FieldError(fieldError.getField(), fieldError.getDefaultMessage());
    }
}