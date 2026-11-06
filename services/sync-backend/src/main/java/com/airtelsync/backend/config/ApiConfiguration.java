package com.airtelsync.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.*;
import org.springframework.web.cors.*;
import tools.jackson.databind.cfg.EnumFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;
import java.util.*;

@Configuration
public class ApiConfiguration {
    @Bean
    JsonMapperBuilderCustomizer strictJsonTypes() {
        return builder -> builder.enable(EnumFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
            .withCoercionConfig(LogicalType.Integer, config -> config.setCoercion(CoercionInputShape.Float, CoercionAction.Fail))
            .withCoercionConfig(LogicalType.Boolean, config -> {
                config.setCoercion(CoercionInputShape.String, CoercionAction.Fail);
                config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail);
                config.setCoercion(CoercionInputShape.Float, CoercionAction.Fail);
            })
            .withCoercionConfig(LogicalType.Textual, config -> {
                config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail);
                config.setCoercion(CoercionInputShape.Float, CoercionAction.Fail);
                config.setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail);
            });
    }
    @Bean
    CorsConfigurationSource corsConfigurationSource(
        @Value("${SYNC_CORS_ALLOWED_ORIGINS:${FRONTEND_ORIGIN:http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,http://localhost}}") String origins) {
        var allowed = Arrays.stream(origins.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList();
        if (allowed.contains("*")) throw new IllegalArgumentException("Configure exact CORS origins");
        var config = new CorsConfiguration();
        config.setAllowedOrigins(allowed);
        config.setAllowedMethods(List.of("GET", "PUT", "POST", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        config.setExposedHeaders(List.of("X-Next-Cursor"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
