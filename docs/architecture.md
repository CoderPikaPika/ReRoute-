# Architecture

## Scope

This document records the Phase 1 foundation for the SIH Freight & Logistics Platform. Feature modules are added incrementally in later phases.

## System boundary

    React SPA -> Express API (/api/v1) -> MongoDB

The application is a modular monolith. It deliberately avoids premature microservices while keeping external dependencies replaceable through service interfaces.

## Backend request flow

    Middleware -> Route -> Controller -> Service -> Repository -> Model -> MongoDB

- Middleware handles cross-cutting concerns such as security headers, CORS, rate limiting, request logging, validation, authentication, and centralized errors.
- Routes only map HTTP verbs and paths.
- Controllers translate HTTP input/output.
- Services own business rules.
- Repositories encapsulate persistence access.
- Mongoose models define MongoDB persistence.

## Configuration

backend/src/config/env.ts is the only backend location that reads environment variables. It validates settings during startup and fails fast if configuration is incomplete.

backend/src/config/database.ts owns MongoDB connection lifecycle. backend/src/server.ts owns process startup and graceful shutdown.

## Planned extension points

- MapService: mock routes first, provider integration later
- MatchingService: deterministic ranking first, ML strategy later
- PricingService: configuration-driven formula first, persisted rates later
- TrackingService: route simulation first, GPS/IoT ingestion later
- NotificationService: in-app first, delivery channels later
