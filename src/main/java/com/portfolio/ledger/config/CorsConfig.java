package com.portfolio.ledger.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The dashboard and this API run as separate origins in local dev
 * (localhost:3000 vs localhost:8080), so the browser enforces CORS between
 * them. Allowed origins come from CORS_ALLOWED_ORIGINS (app.cors.allowed-origins
 * in application.yml), never hardcoded here -- so this file is identical
 * across environments and the actual origin list lives in config/env, not code.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
