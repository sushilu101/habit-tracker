-- Habit entries: one row per day
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  -- Equivalent miles (runs 1:1, bikes 4:1)
  equivalent_miles DECIMAL(6,2),
  raw_run_miles DECIMAL(6,2) DEFAULT 0,
  raw_bike_miles DECIMAL(6,2) DEFAULT 0,
  strava_synced BOOLEAN DEFAULT FALSE,
  -- Wakeup time (stored as HH:MM in PT)
  wakeup_time TIME,
  -- Unhealthy meals (daily count, weekly goal: max 2)
  unhealthy_meals INTEGER DEFAULT 0,
  -- Flossed at night
  flossed BOOLEAN,
  -- Metadata
  sms_confirmed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strava OAuth tokens (single row, upserted)
CREATE TABLE IF NOT EXISTS strava_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS log for debugging / audit trail
CREATE TABLE IF NOT EXISTS sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  from_number TEXT,
  to_number TEXT,
  related_date DATE,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_habit_entries_updated_at
  BEFORE UPDATE ON habit_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strava_tokens_updated_at
  BEFORE UPDATE ON strava_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for date lookups
CREATE INDEX IF NOT EXISTS habit_entries_date_idx ON habit_entries(date DESC);

-- Row Level Security (enable after setting up auth if needed)
-- ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
