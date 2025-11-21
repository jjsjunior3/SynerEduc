-- Create KV Store table for the application
CREATE TABLE IF NOT EXISTS kv_store_c61d1ad0 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_kv_store_created_at ON kv_store_c61d1ad0(created_at);

-- Enable RLS (if needed)
ALTER TABLE kv_store_c61d1ad0 ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed)
CREATE POLICY "kv_store_all" ON kv_store_c61d1ad0 FOR ALL USING (true);