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

    // ── Step 1b: Add discount_entries JSONB column to event_financials ────────
    await client.query(`
      ALTER TABLE event_financials ADD COLUMN IF NOT EXISTS discount_entries JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    // ── Step 1c: Add scan_token to sponsors; allow NULL eventId in impressions ─
    await client.query(`
      ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS scan_token TEXT UNIQUE;
      UPDATE sponsors SET scan_token = gen_random_uuid()::text WHERE scan_token IS NULL;
      ALTER TABLE sponsor_impressions ALTER COLUMN event_id DROP NOT NULL;
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

    // ── Step 5: Venue check-ins table ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS venue_checkins (
        id SERIAL PRIMARY KEY,
        sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
        checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS venue_checkins_daily_uniq
        ON venue_checkins (sponsor_id, participant_id, date(checked_in_at AT TIME ZONE 'UTC'));
    `);

    // ── Step 6: Deduplicate participants + backfill missing phones ─────────────

    // 6a: Merge duplicate participants sharing the same non-empty phone.
    //     Keep the record with the lowest id; reassign venue_checkins to it
    //     (skip conflicts), then delete losers.
    await client.query(
      "DO $dedup$\n" +
      "DECLARE\n" +
      "  dup   RECORD;\n" +
      "  loser INTEGER;\n" +
      "BEGIN\n" +
      "  FOR dup IN\n" +
      "    SELECT phone, MIN(id) AS keep_id\n" +
      "    FROM participants\n" +
      "    WHERE phone IS NOT NULL AND phone != ''\n" +
      "    GROUP BY phone\n" +
      "    HAVING COUNT(*) > 1\n" +
      "  LOOP\n" +
      "    FOR loser IN\n" +
      "      SELECT id FROM participants\n" +
      "      WHERE phone = dup.phone AND id != dup.keep_id\n" +
      "    LOOP\n" +
      "      DELETE FROM venue_checkins vc\n" +
      "      WHERE vc.participant_id = loser\n" +
      "        AND EXISTS (\n" +
      "          SELECT 1 FROM venue_checkins vc2\n" +
      "          WHERE vc2.sponsor_id = vc.sponsor_id\n" +
      "            AND vc2.participant_id = dup.keep_id\n" +
      "            AND DATE(vc2.checked_in_at AT TIME ZONE 'UTC')\n" +
      "              = DATE(vc.checked_in_at AT TIME ZONE 'UTC')\n" +
      "        );\n" +
      "      UPDATE venue_checkins SET participant_id = dup.keep_id WHERE participant_id = loser;\n" +
      "      DELETE FROM participants WHERE id = loser;\n" +
      "    END LOOP;\n" +
      "  END LOOP;\n" +
      "END $dedup$;"
    );

    // 6b: Give anonymous phone numbers to participants with no phone so the
    //     unique constraint is satisfied and future upserts won't create duplicates.
    await client.query(
      "UPDATE participants " +
      "SET phone = 'ANON-' || replace(gen_random_uuid()::text, '-', '') " +
      "WHERE phone IS NULL OR phone = '';"
    );

    // 6c: Recompute total_events from actual non-cancelled registrations so
    //     the cached counter matches reality after the dedup above.
    await client.query(
      "UPDATE participants p " +
      "SET total_events = (" +
      "  SELECT COUNT(*)::int FROM registrations r " +
      "  WHERE r.phone = p.phone AND r.status != 'cancelled'" +
      ") " +
      "WHERE p.phone NOT LIKE 'ANON-%';"
    );

    console.log("✓ All migrations applied successfully");
  } catch (err) {
    // Re-throw so main().catch can log it with exit code 1.
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
