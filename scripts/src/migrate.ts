import { pool } from "@workspace/db";

async function main() {
  const client = await pool.connect();
  console.log("Running migrations...");

  try {
    // ── Step 1: Core schema additions ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO event_types (name, icon) VALUES
        ('Hiking', '🥾'), ('Cycling', '🚴'), ('Camping', '⛺'),
        ('Kayaking', '🛶'), ('Running', '🏃'), ('Climbing', '🧗'),
        ('Cultural', '🏛️'), ('Walking', '🚶'), ('Other', '🎯')
      ON CONFLICT (name) DO NOTHING;

      ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL;

      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS full_name_ar TEXT;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS nationality TEXT;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS nationality_other TEXT;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '+962';
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS has_medical_conditions BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS medical_details TEXT;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waiver_accepted_at TIMESTAMPTZ;

      ALTER TABLE participants ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS waiver_accepted_at TIMESTAMPTZ;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participants_phone_unique') THEN
          ALTER TABLE participants ADD CONSTRAINT participants_phone_unique UNIQUE (phone);
        END IF;
      END $$;

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participants_email_unique') THEN
          ALTER TABLE participants DROP CONSTRAINT participants_email_unique;
        END IF;
      END $$;

      ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'system';
      ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS actor_id TEXT;
      ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS old_value TEXT;
      ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS new_value TEXT;

      CREATE TABLE IF NOT EXISTS participant_emails (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS completed_events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL,
        short_description TEXT NOT NULL,
        cover_image_url TEXT,
        event_date TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS media_banners (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'image',
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        title TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event_financials (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
        price_per_person INTEGER NOT NULL DEFAULT 0,
        total_collected INTEGER NOT NULL DEFAULT 0,
        referral_discounts INTEGER NOT NULL DEFAULT 0,
        manual_discounts INTEGER NOT NULL DEFAULT 0,
        promo_discounts INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Step 2: Upgrade completed_events.event_date TEXT → DATE ──────────────
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE completed_events ALTER COLUMN event_date TYPE DATE
          USING CASE WHEN event_date IS NULL THEN NULL ELSE event_date::DATE END;
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // ── Step 3: Upgrade old_value / new_value TEXT → JSONB ────────────────────
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE activity_log ALTER COLUMN old_value TYPE JSONB
          USING CASE WHEN old_value IS NULL THEN NULL ELSE old_value::JSONB END;
      EXCEPTION WHEN others THEN NULL; END $$;

      DO $$ BEGIN
        ALTER TABLE activity_log ALTER COLUMN new_value TYPE JSONB
          USING CASE WHEN new_value IS NULL THEN NULL ELSE new_value::JSONB END;
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // ── Step 3: Backfill participant_emails from participants.email ────────────
    await client.query(`
      INSERT INTO participant_emails (participant_id, email, is_primary)
      SELECT id, email, TRUE FROM participants
      WHERE email IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // ── Step 4: Backfill events.event_type_id from events.category ───────────
    await client.query(`
      UPDATE events e
      SET event_type_id = et.id
      FROM event_types et
      WHERE et.name = CASE e.category
        WHEN 'hiking'       THEN 'Hiking'
        WHEN 'cycling'      THEN 'Cycling'
        WHEN 'walking'      THEN 'Walking'
        WHEN 'summer-night' THEN 'Other'
        ELSE NULL
      END
      AND e.event_type_id IS NULL;
    `);

    console.log("✓ All migrations applied successfully");
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
