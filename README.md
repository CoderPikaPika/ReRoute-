# SIH Freight & Logistics Platform

A production-oriented freight management prototype connecting shippers, transporters, and administrators.

## Phase 1 status

The repository foundation is in place:

- React, Vite, and TypeScript frontend shell
- Express and TypeScript backend shell
- MongoDB configuration layer
- Environment-variable validation
- Versioned API health endpoint
- Shared linting and formatting commands
- Docker Compose MongoDB development service

Product features such as authentication, vehicles, shipments, matching, and tracking are implemented in subsequent phases.

## Prerequisites

- Node.js 22+
- npm 11+
- MongoDB 7+ locally, or Docker Desktop for the supplied MongoDB service

## Install

Install all workspace dependencies from the repository root:

    npm install

Create local environment files:

    Copy-Item backend/.env.example backend/.env
    Copy-Item frontend/.env.example frontend/.env

Set secure local values for the JWT settings in backend/.env.

## Run locally

Start MongoDB with Docker:

    docker compose up -d mongodb

Start the frontend and backend:

    npm run dev

The API health endpoint is available at:

    http://localhost:5000/api/v1/health

The frontend runs at:

    http://localhost:5173

## Demo authentication

Create the demo accounts:

    npm run seed:auth --workspace=@sih-freight/backend

All accounts use password: Demo@12345.

| Role | Email |
| --- | --- |
| Admin | admin@example.com |
| Shipper | shipper@example.com |
| Transporter | transporter@example.com |

## Quality checks

    npm run lint
    npm run format:check
    npm run build

## Architecture

The backend follows:

    Routes -> Controllers -> Services -> Repositories -> MongoDB

See docs/architecture.md and docs/setup.md for the Phase 1 architecture and setup details.

## Prototype boundary

Future phases will label simulated route movement as a prototype simulation. No current feature claims real-time GPS, live routing, pricing, payment, or external notification integration.
