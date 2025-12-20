# Technology Stack - Bracket of Death (BOD)

## Backend
- **Runtime:** Node.js (Version >= 18.0.0)
- **Language:** TypeScript
- **Framework:** Express.js
- **Middleware:** Compression, CORS, Helmet, Morgan, Express-Rate-Limit

## Frontend
- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Autoprefixer, PostCSS

## Database & Storage
- **Primary Database:** MongoDB (Version 7.0)
- **ODM:** Mongoose (Version 8.0+)
- **Session/Auth Persistence:** Keycloak (PostgreSQL for Keycloak internal data)

## Authentication & Authorization
- **Provider:** Keycloak (Version 23.0)
- **Integration:** Role-Based Access Control (RBAC) managed via Keycloak realms and clients.
- **Identity:** JWT-based session management.

## Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose
- **Orchestration:** Multi-container setup (Frontend, Backend, MongoDB, Keycloak, Keycloak-DB, Secrets-Init)
- **Secrets Management:** Custom initialization service (`secrets-init`)

## Testing & Quality Assurance
- **Unit/Integration Testing:** Jest, ts-jest
- **End-to-End (E2E) Testing:** Playwright
- **Linting:** ESLint with TypeScript support
