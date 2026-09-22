-- ══════════════════════════════════════════════════════════════
-- Gravlytics — PostgreSQL DDL
-- Metadata store: users, orgs, sites, memberships, API keys
-- ══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum types ──
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'github');
CREATE TYPE api_key_scope AS ENUM ('ingestion', 'query', 'all');

-- ── Users ──
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash   VARCHAR(255),                        -- NULL for OAuth-only users
    name            VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url      TEXT DEFAULT '',
    auth_provider   auth_provider NOT NULL DEFAULT 'email',
    provider_id     VARCHAR(255),                        -- OAuth provider user ID
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);

-- ── Organizations (tenants) ──
CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON organizations(slug);

-- ── Organization memberships ──
CREATE TABLE IF NOT EXISTS memberships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role            user_role NOT NULL DEFAULT 'viewer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(org_id);

-- ── Invitations ──
CREATE TABLE IF NOT EXISTS invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inviter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'viewer',
    token           VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_invitations_org ON invitations(org_id);
CREATE INDEX idx_invitations_token ON invitations(token);

-- ── Sites ──
CREATE TABLE IF NOT EXISTS sites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain          VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL DEFAULT '',
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    tracking_id     VARCHAR(20) NOT NULL UNIQUE,         -- Short ID for tracker script
    salt            VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    salt_rotated_at DATE NOT NULL DEFAULT CURRENT_DATE,
    public          BOOLEAN NOT NULL DEFAULT FALSE,      -- Public dashboard?
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sites_org ON sites(org_id);
CREATE INDEX idx_sites_domain ON sites(domain);
CREATE INDEX idx_sites_tracking_id ON sites(tracking_id);

-- ── API Keys ──
CREATE TABLE IF NOT EXISTS api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL DEFAULT 'Default',
    key_hash        VARCHAR(255) NOT NULL,               -- bcrypt hash of the key
    key_prefix      VARCHAR(10) NOT NULL,                -- First 8 chars for display
    scope           api_key_scope NOT NULL DEFAULT 'all',
    rate_limit      INT NOT NULL DEFAULT 1000,           -- Requests per minute
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_site ON api_keys(site_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ── Goals / Event definitions ──
CREATE TABLE IF NOT EXISTS goals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    event_name      VARCHAR(255),                        -- Custom event name to match
    page_path       VARCHAR(500),                        -- Page path pattern to match
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_site ON goals(site_id);

-- ── Saved reports ──
CREATE TABLE IF NOT EXISTS saved_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    filters         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_site ON saved_reports(site_id);
CREATE INDEX idx_saved_reports_user ON saved_reports(user_id);

-- ── Refresh tokens (for JWT auth) ──
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── Updated_at trigger function ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orgs_updated_at
    BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sites_updated_at
    BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_saved_reports_updated_at
    BEFORE UPDATE ON saved_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
