# Milestone 3 — Multi-Tenancy, Authentication & RBAC

Milestone 3 equips Gravlytics with organization boundaries, authentication, and role-based permissions.

## Architectural Objectives Achieved

1. **Authentication System**:
   - Secure password hashing using `scrypt` with a cryptographically randomized 16-byte salt (OWASP compliant).
   - Signed JSON Web Tokens (JWT) using HMAC-SHA256 with 7-day expiration.
   - SvelteKit server hooks (`src/hooks.server.ts`) validating tokens and hydrating `event.locals.user`.
   - Dedicated authentication pages:
     - `/login`: Email/password form with OAuth quick sign-in triggers (GitHub & Google).
     - `/register`: User onboarding with password strength requirements.
     - `/logout`: Cookie revocation endpoint.

2. **Metadata Model (PostgreSQL 16)**:
   - `organizations`: Root tenant entity with URL slugs.
   - `memberships`: Links users to organizations with roles:
     - `owner`: Full control over billing, org deletion, members, and all sites.
     - `editor`: Can create, configure, and manage sites, goals, and API keys.
     - `viewer`: Read-only access to analytical views and dashboards.
   - `sites`: Tracked domains with unique short `tracking_id` and isolated cryptographic salts.
   - `api_keys`: Scoped programmatic tokens (`ingestion`, `query`, or `all`).

3. **Management Interfaces (`apps/web/src/routes/(dashboard)/settings/`)**:
   - `/settings`: General organization details and slug management.
   - `/settings/sites`: Multi-site registry, new site wizard, and embed tracking snippet generator.
   - `/settings/team`: Team member directory, invitations, and role management.
   - `/settings/api-keys`: API key generator with one-time secret reveal and instant revocation.

4. **Tenant Isolation Guard**:
   - Every analytical query against ClickHouse strictly filters on `site_id`, preventing any cross-tenant data leakage.
