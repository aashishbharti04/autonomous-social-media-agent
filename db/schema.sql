-- ─────────────────────────────────────────────────────────────
-- Autonomous Social Media Agent — PostgreSQL schema
-- The in-memory store (backend/src/store/repository.ts) mirrors these tables.
-- Set DB_PROVIDER=postgres and DATABASE_URL to run against a real database.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name  TEXT        NOT NULL,
    email TEXT UNIQUE NOT NULL,
    plan  TEXT        NOT NULL DEFAULT 'free'
                      CHECK (plan IN ('free', 'pro', 'business'))
);

CREATE TABLE IF NOT EXISTS social_accounts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     TEXT NOT NULL
                 CHECK (platform IN ('linkedin','instagram','facebook','twitter','threads','pinterest')),
    access_token TEXT NOT NULL,           -- store encrypted at rest in production
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS posts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform      TEXT NOT NULL,
    content       TEXT NOT NULL,
    hashtags      TEXT[] NOT NULL DEFAULT '{}',
    image_url     TEXT,
    status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','published','failed')),
    scheduled_for TIMESTAMPTZ,
    published_at  TIMESTAMPTZ,
    external_id   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reach           INTEGER NOT NULL DEFAULT 0,
    impressions     INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    likes           INTEGER NOT NULL DEFAULT 0,
    engagement_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    type       TEXT NOT NULL
               CHECK (type IN ('timing','hashtags','format','topic','frequency')),
    suggestion TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_user      ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_platform  ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_post  ON analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_recs_post       ON recommendations(post_id);

-- Long-term AI memory (RAG) lives in a vector DB (ChromaDB / pgvector).
-- pgvector option:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE TABLE memory_records (
--     id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
--     text        TEXT NOT NULL,
--     embedding   vector(256) NOT NULL,
--     metadata    JSONB NOT NULL DEFAULT '{}'
-- );
