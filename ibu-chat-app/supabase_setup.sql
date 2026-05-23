-- ============================================================
-- IBU CHATBOT - SUPABASE KURULUM SQL
-- Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================================

-- 1. pgvector extension (zaten aktifse hata vermez)
create extension if not exists vector;

-- 2. Ana bilgi tabanı tablosu
create table if not exists ibu_documents (
  id          bigserial primary key,
  question    text not null,
  answer      text not null,
  category    text default 'genel',   -- 'kayit', 'burs', 'yurt', 'akademik', 'iletisim'
  language    text default 'tr',      -- 'tr' veya 'en'
  embedding   vector(1536),           -- OpenAI text-embedding-3-small
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. Semantic arama index (hız için)
create index if not exists ibu_documents_embedding_idx
  on ibu_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Konuşma logları
create table if not exists ibu_chat_logs (
  id           bigserial primary key,
  session_id   text not null,
  user_message text not null,
  bot_response text not null,
  matched_ids  bigint[],              -- hangi dökümanlar eşleşti
  similarity   float,                 -- en yüksek benzerlik skoru
  language     text default 'tr',
  page_url     text,                  -- hangi sayfadan soruldu
  created_at   timestamptz default now()
);

-- 5. Semantic arama fonksiyonu
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.70,
  match_count     int   default 5,
  filter_lang     text  default null
)
returns table (
  id         bigint,
  question   text,
  answer     text,
  category   text,
  similarity float
)
language sql stable as $$
  select
    id,
    question,
    answer,
    category,
    1 - (embedding <=> query_embedding) as similarity
  from ibu_documents
  where
    1 - (embedding <=> query_embedding) > match_threshold
    and (filter_lang is null or language = filter_lang)
  order by similarity desc
  limit match_count;
$$;

-- 6. RLS politikaları (güvenlik)
alter table ibu_documents  enable row level security;
alter table ibu_chat_logs  enable row level security;

-- Servis rolü her şeyi yapabilir (Next.js API'niz için)
create policy "service_role_all" on ibu_documents
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on ibu_chat_logs
  for all using (auth.role() = 'service_role');

-- Anonim kullanıcı sadece arama yapabilir
create policy "anon_select_documents" on ibu_documents
  for select using (true);

-- ============================================================
-- 7. Sistem Ayarları Tablosu
-- ============================================================
create table if not exists public.ibu_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

-- RLS politikaları (güvenlik)
alter table public.ibu_settings enable row level security;

create policy "service_role_all" on public.ibu_settings
  for all using (auth.role() = 'service_role');

-- ============================================================
-- TEST: Örnek veri ekle (isteğe bağlı)
-- ============================================================
-- insert into ibu_documents (question, answer, category, language) values
-- ('Kayıt tarihleri ne zaman?', 'Güz dönemi kayıtları Temmuz-Eylül, Bahar dönemi Ocak-Şubat arasındadır.', 'kayit', 'tr'),
-- ('When are the enrollment dates?', 'Fall semester enrollment is July-September, Spring semester January-February.', 'kayit', 'en');
