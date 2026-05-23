-- ============================================================
-- IBU Chatbot — Supabase SQL Setup
-- SQL Editor'da çalıştırın (Settings > SQL Editor > New Query)
-- ============================================================

-- 1. pgvector eklentisini etkinleştir
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Bilgi tabanı tablosu
CREATE TABLE IF NOT EXISTS ibu_documents (
  id         BIGSERIAL PRIMARY KEY,
  question   TEXT        NOT NULL,
  answer     TEXT        NOT NULL,
  category   TEXT        DEFAULT 'genel',
  language   TEXT        DEFAULT 'tr',
  embedding  vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sohbet logları tablosu
CREATE TABLE IF NOT EXISTS ibu_chat_logs (
  id               BIGSERIAL PRIMARY KEY,
  session_id       TEXT,
  user_message     TEXT,
  bot_response     TEXT,
  language         TEXT        DEFAULT 'tr',
  similarity_score FLOAT       DEFAULT 0,
  has_context      BOOLEAN     DEFAULT FALSE,
  context_count    INTEGER     DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vector index (hız için)
CREATE INDEX IF NOT EXISTS ibu_documents_embedding_idx
  ON ibu_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 5. Semantic arama fonksiyonu
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT  DEFAULT 0.62,
  match_count     INT    DEFAULT 4,
  filter_lang     TEXT   DEFAULT NULL
)
RETURNS TABLE (
  id         BIGINT,
  question   TEXT,
  answer     TEXT,
  category   TEXT,
  language   TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.question,
    d.answer,
    d.category,
    d.language,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM ibu_documents d
  WHERE
    (filter_lang IS NULL OR d.language = filter_lang)
    AND 1 - (d.embedding <=> query_embedding) >= match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. RLS (Row Level Security) — servis key bypass eder, public read yok
ALTER TABLE ibu_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ibu_chat_logs  ENABLE ROW LEVEL SECURITY;

-- Servis role için tam erişim
CREATE POLICY "service_role_all_documents" ON ibu_documents
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_logs" ON ibu_chat_logs
  FOR ALL USING (true) WITH CHECK (true);

-- 7. updated_at otomatik güncellemesi
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ibu_documents_updated_at
  BEFORE UPDATE ON ibu_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Kurulum tamamlandı!
SELECT 'IBU Chatbot tabloları hazır ✓' AS durum;
