# IBU Chatbot — Kurulum Kılavuzu

## Genel Bakış

Bu sistem 3 bileşenden oluşuyor:

```
[Google Drive Q&A] → [sync_data.js] → [Supabase pgvector]
                                              ↓
[WordPress Widget] ←← [Next.js API] ←← semantic arama + GPT-4o
```

---

## ADIM 1: Supabase Kurulumu

1. Supabase dashboard'a giriş yapın → projenizi açın
2. Sol menüden **SQL Editor** açın
3. `supabase_setup.sql` içeriğini yapıştırın → **Run** butonuna tıklayın
4. Şu tabloların oluştuğunu kontrol edin:
   - `ibu_documents`
   - `ibu_chat_logs`

---

## ADIM 2: Next.js Projesi Kurulumu

```bash
# Yeni proje oluştur
npx create-next-app@latest ibu-chat-app --app --no-src-dir

# Proje klasörüne gir
cd ibu-chat-app

# Paketleri yükle
npm install openai @supabase/supabase-js
```

### .env.local dosyası oluşturun:

```
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://PROJE_ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  ← service_role key (Settings > API)
ALLOWED_ORIGINS=https://ibu.edu.mk,https://www.ibu.edu.mk
```

### API route dosyasını kopyalayın:

```bash
mkdir -p app/api/chat
# api_chat_route.js içeriğini app/api/chat/route.js olarak kaydedin
```

### Test edin:

```bash
npm run dev
# http://localhost:3000/api/chat adresine GET isteği atın
# {"status":"IBU Chat API çalışıyor ✓"} görmeli siniz
```

---

## ADIM 3: Veri Yükleme (sync_data.js)

### Google Drive Q&A Formatı:

```
Soru: Kayıt tarihleri ne zaman?
Cevap: Güz dönemi kayıtları Temmuz-Eylül, Bahar dönemi Ocak-Şubat arasındadır.
Kategori: kayit

Soru: Burs başvurusu nasıl yapılır?
Cevap: Burs başvuruları online portal üzerinden yapılmaktadır. scholarships.ibu.edu.mk adresini ziyaret edin.
Kategori: burs

Question: When are the enrollment dates?
Answer: Fall semester enrollment is July-September, Spring semester is January-February.
Category: enrollment
```

### Senkronizasyonu çalıştırın:

```bash
# Paketleri yükle
npm install @google-cloud/local-auth googleapis dotenv

# Sync'i çalıştır
node sync_data.js
```

Çıktı şöyle görünmeli:
```
🔄 IBU Veri Sync başlıyor...
📥 Google Drive'dan indiriliyor...
📝 Q&A çiftleri parse ediliyor...
✓ 150 Q&A çifti bulundu
🧠 Embedding üretiliyor...
  Embedding: 20/150
  ...
💾 Yeni veriler yükleniyor...
✅ Sync tamamlandı! 150 kayıt yüklendi.
🧪 Test sorgusu:
  [92.3%] Kayıt tarihleri ne zaman?
  [87.1%] Başvuru için son tarih nedir?
```

---

## ADIM 4: Vercel'e Deploy

```bash
# Vercel CLI yükle
npm install -g vercel

# Deploy et
vercel

# Environment variable'ları ekle (Vercel dashboard'dan da yapılabilir)
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add ALLOWED_ORIGINS

# Production deploy
vercel --prod
```

Deploy sonrası URL'nizi not alın:
`https://ibu-chat-app.vercel.app`

---

## ADIM 5: WordPress Widget Kurulumu

### Yöntem A (Önerilen): WPCode Plugin

1. WordPress admin → **Plugins > Add New** → "WPCode" aratın → yükleyin
2. **Code Snippets > Add Snippet** → "JavaScript Snippet" seçin
3. `wordpress_widget.js` içeriğini yapıştırın
4. **Location**: "Footer" seçin
5. İlk satırdaki URL'yi değiştirin:
   ```javascript
   apiUrl: 'https://ibu-chat-app.vercel.app/api/chat',
   ```
6. **Activate** → **Save**

### Yöntem B: footer.php (Manuel)

```php
// Temanızın footer.php dosyasında </body>'den önce:
<script>
// wordpress_widget.js içeriğini buraya yapıştırın
</script>
```

---

## Sistem Özellikleri

| Özellik | Detay |
|---------|-------|
| Arama | Semantic (pgvector cosine similarity) |
| Model | GPT-4o (cevap), text-embedding-3-small (vektör) |
| Streaming | Evet — cevap kelime kelime gelir |
| Dil | Otomatik TR/EN algılama |
| Hafıza | Session bazlı (son 8 mesaj) |
| Loglama | Supabase ibu_chat_logs tablosu |
| Fallback | Eşleşme yoksa iletişim bilgisi verir |
| Mobile | Responsive, tam uyumlu |

---

## Sık Sorulan Sorunlar

### "API hatası: 403" alıyorum
→ ALLOWED_ORIGINS'e WordPress site URL'nizi ekleyin

### Cevaplar alakasız
→ sync_data.js'deki `match_threshold: 0.68` değerini 0.60'a düşürün

### Cevaplar çok yavaş
→ GPT-4o yerine GPT-4o-mini kullanın (api_chat_route.js, line: model: 'gpt-4o')

### Widget görünmüyor
→ Browser console'u açın (F12), JS hata var mı kontrol edin

---

## Aylık Maliyet Tahmini (IBU ölçeğinde)

| Servis | Kullanım | Tahmini Maliyet |
|--------|----------|-----------------|
| OpenAI Embeddings | Sorgu başına ~$0.00002 | ~$2-5/ay |
| OpenAI GPT-4o | Sorgu başına ~$0.005 | ~$20-50/ay |
| Supabase | Free tier (500MB) | $0/ay |
| Vercel | Free tier (100GB/ay) | $0/ay |
| **TOPLAM** | | **~$25-55/ay** |

N8N SaaS ücretiyle kıyaslandığında çok daha ekonomik.
