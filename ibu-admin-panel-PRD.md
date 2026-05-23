# IBU Chatbot — Admin Panel Geliştirme Dokümantasyonu

## Proje Özeti

Uluslararası Balkan Üniversitesi'nin chatbot sistemini yönetmek için tam kapsamlı bir admin paneli. Bu panel üç ana modülden oluşur:

1. **Bilgi Tabanı Yönetimi** — Belge yükleme, Q&A düzenleme, Supabase senkronizasyonu
2. **Log & Analitik Paneli** — Konuşma logları, kategori analizi, PDF rapor indirme
3. **Widget Kod Üretici** — WordPress'e yapıştırılmaya hazır kod çıktısı

---

## Teknik Altyapı (Mevcut Sistem)

```
Supabase PostgreSQL + pgvector
├── ibu_documents   (bilgi tabanı, embedding vector(1536))
├── ibu_chat_logs   (konuşma logları)
└── match_documents() (semantic arama RPC fonksiyonu)

Next.js 14 App Router
└── /api/chat  →  OpenAI Embedding + GPT-4o + Supabase

WordPress Widget
└── Vanilla JS, sağ altta sabit, streaming SSE
```

Admin panel bu sisteme **ek bir Next.js uygulaması** olarak kurulur ya da aynı Next.js projesine `/admin` route olarak eklenir.

---

## Ortam Değişkenleri

```env
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://PROJE_ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...      # service_role key
ADMIN_USERNAME=ibu_admin              # basit auth için
ADMIN_PASSWORD_HASH=bcrypt_hash_here  # bcryptjs ile hash'le
NEXTJS_SECRET=random_32_char_string   # JWT secret
```

---

## Modül 1: Bilgi Tabanı Yönetimi

### 1.1 Sayfa: `/admin/knowledge`

#### Görsel Düzen

```
┌─────────────────────────────────────────────────────┐
│  [+ Yeni Soru Ekle]  [📁 Dosya Yükle]  [🔄 Sync]  │
│                                          Arama: [__] │
├─────────────────────────────────────────────────────┤
│ Filtre: [Tümü ▼] [Türkçe ▼] [Kategori ▼]           │
├──────┬───────────────────┬────────────┬─────────────┤
│  ID  │ Soru              │ Kategori   │ İşlemler    │
├──────┼───────────────────┼────────────┼─────────────┤
│  42  │ Kayıt tarihleri.. │ kayit      │ ✏️ 🗑️       │
│  43  │ Burs başvurusu..  │ burs       │ ✏️ 🗑️       │
└──────┴───────────────────┴────────────┴─────────────┘
         Sayfa: [< 1 2 3 >]   Toplam: 150 kayıt
```

#### Özellikler

**Dosya Yükleme (Drag & Drop)**

Desteklenen formatlar: `.txt`, `.docx`, `.pdf`, `.xlsx`

Parse mantığı her format için şöyle çalışır:

- **TXT**: `Soru:` ve `Cevap:` etiketlerini satır satır okur, boş satırla ayrılmış blokları parse eder
- **DOCX**: mammoth.js ile metne çevirir, aynı parse mantığını uygular
- **PDF**: pdf-parse ile metni çıkarır, aynı parse mantığını uygular
- **XLSX**: SheetJS ile okur, A sütunu = Soru, B sütunu = Cevap, C sütunu = Kategori (opsiyonel)

**Yükleme Akışı (adım adım)**

```
Dosya seçildi
    ↓
Frontend: dosyayı /api/admin/parse-file'a POST et (multipart/form-data)
    ↓
API: formatı algıla → parse et → [{question, answer, category, language}] döndür
    ↓
Frontend: "Önizleme Modalı" aç
    │  ┌─────────────────────────────────────────┐
    │  │ 47 kayıt bulundu — 3 hatalı             │
    │  │ ──────────────────────────────────────  │
    │  │ ✅ Kayıt tarihleri ne... → Güz donemi.. │
    │  │ ✅ Burs başvurusu nas... → Online por.. │
    │  │ ❌ Boş cevap (satır 23) — [Düzenle]    │
    │  │                                         │
    │  │ [İptal]  [Seçilenleri Kaydet (44)]      │
    │  └─────────────────────────────────────────┘
    ↓
Kullanıcı onayladı
    ↓
/api/admin/sync-embeddings'e POST et
    ↓
API: her kayıt için OpenAI embedding üret (batch 20'lik gruplar)
    ↓
Supabase ibu_documents tablosuna upsert et
    ↓
Frontend: progress bar göster (%0 → %100)
    ↓
"✅ 44 kayıt başarıyla yüklendi" toast mesajı
```

**Satır İçi Düzenleme (Inline Edit)**

Tablodaki ✏️ butonuna tıklanınca o satır edit moduna geçer:

```
┌─────┬──────────────────────────────────────────────────┐
│ 42  │ [Soru: ________________________________]          │
│     │ [Cevap: _______________________________]          │
│     │ [Kategori: kayit ▼] [Dil: TR ▼]                  │
│     │                        [İptal] [💾 Kaydet]        │
└─────┴──────────────────────────────────────────────────┘
```

Kaydet butonuna tıklanınca:
1. `/api/admin/documents/[id]` endpoint'ine PUT isteği at
2. API: yeni embedding üret, Supabase'i güncelle
3. Frontend: satırı güncelle, "Embedding yenilendi ✓" göster

**Toplu İşlemler**

- Checkbox ile birden fazla kayıt seç
- "Seçilenleri Sil" butonu → onay dialogu → silme
- "Seçilenleri Yeniden Embed Et" → embedding'leri toplu yenile

**Kategori Yönetimi**

Mevcut kategoriler: `kayit`, `burs`, `yurt`, `akademik`, `iletisim`, `genel`
Admin panelde yeni kategori eklenebilir (input + Enter).

---

### 1.2 API Endpoint'leri (Bilgi Tabanı)

```
POST   /api/admin/parse-file          # Dosya yükle ve parse et
GET    /api/admin/documents           # Liste (sayfalama, filtre)
POST   /api/admin/documents           # Yeni kayıt ekle
PUT    /api/admin/documents/[id]      # Kayıt güncelle + re-embed
DELETE /api/admin/documents/[id]      # Kayıt sil
POST   /api/admin/documents/bulk-delete   # Toplu sil
POST   /api/admin/sync-embeddings     # Toplu embedding yükle
```

**GET /api/admin/documents parametreleri:**

```
?page=1&limit=20&search=kayıt&category=burs&language=tr&sort=created_at&order=desc
```

**POST /api/admin/sync-embeddings body:**

```json
{
  "entries": [
    {
      "question": "Kayıt tarihleri ne zaman?",
      "answer": "Güz dönemi Temmuz-Eylül...",
      "category": "kayit",
      "language": "tr"
    }
  ],
  "clearExisting": false
}
```

Response: `{ "success": true, "inserted": 44, "failed": 0, "errors": [] }`

---

## Modül 2: Log & Analitik Paneli

### 2.1 Sayfa: `/admin/logs`

#### Görsel Düzen

```
┌──────────────────────────────────────────────────────────────┐
│  📊 GENEL İSTATİSTİKLER                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  1.243   │ │  89.2%   │ │   tr/en  │ │  kayit %34     │  │
│  │  Toplam  │ │ Yanıtlnd │ │  67 / 33 │ │  Popüler Kat.  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  FİLTRELER                                                    │
│  Tarih: [01.01.2025] → [31.01.2025]   Kategori: [Tümü ▼]   │
│  Dil: [Tümü ▼]   Arama: [__________]   [Filtrele] [Temizle] │
├──────────────────────────────────────────────────────────────┤
│  📈 Günlük Soru Grafiği (bar chart — son 30 gün)             │
│  [░░░░▓▓▓░░▓▓▓▓▓░░░░░░▓▓▓▓▓▓░░░▓░░░░░░░░░░░░░░]            │
├──────────────────────────────────────────────────────────────┤
│  🥧 Kategori Dağılımı                                        │
│  kayit %34 | burs %28 | akademik %19 | yurt %12 | diğer %7  │
├──────────────────────────────────────────────────────────────┤
│  KONUŞMA LOGLARI                      [⬇️ PDF İndir]         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 14:23 | tr | kayit | sim: 0.87                          │ │
│  │ 👤 Kayıt tarihleri ne zaman?                            │ │
│  │ 🤖 Güz dönemi kayıtları Temmuz-Eylül arasında...       │ │
│  │ 📎 ibu.edu.mk/kayit  [+] Detay                         │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 14:19 | en | burs | sim: 0.91                          │ │
│  │ 👤 How can I apply for a scholarship?                   │ │
│  │ 🤖 Scholarship applications are submitted via...        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

#### Özellikler

**İstatistik Kartları**

- Toplam soru sayısı (filtreye göre değişir)
- Yanıtlanma oranı: similarity > 0.70 olan kayıtların yüzdesi
- Dil dağılımı: TR vs EN sayısı ve yüzdesi
- En popüler kategori

**Grafik: Günlük Soru Trendi**

- Recharts BarChart kullan
- X ekseni: tarih, Y ekseni: soru sayısı
- Filtre aralığına göre dinamik güncellenir
- Bar üstüne hover'da o günün detay popup'ı

**Grafik: Kategori Dağılımı**

- Recharts PieChart veya yatay BarChart kullan
- Her kategorinin yüzdesi ve toplam sayısı
- Kategoriye tıklanınca log listesini o kategoriye göre filtrele

**Log Listesi**

Her log satırında şunlar görünür:

- Saat + tarih
- Dil (TR/EN)
- Kategori (matched_ids'den Supabase'e join ile)
- Similarity skoru (renk kodlu: >0.85 yeşil, 0.70-0.85 sarı, <0.70 kırmızı)
- Kullanıcı mesajı (tam metin)
- Bot cevabı (ilk 100 karakter + "Devamını Gör" butonu)
- Sayfa URL'si (page_url alanı)

**Filtreler**

```
- Tarih başlangıç + bitiş (date picker)
- Kategori dropdown (dinamik, ibu_documents'tan çekilir)
- Dil (TR / EN / Tümü)
- Metin arama (user_message içinde ILIKE arama)
- Similarity aralığı (slider: 0.50 → 1.00)
- Sayfalama: 20 / 50 / 100 kayıt
```

**PDF Rapor İndirme**

"PDF İndir" butonuna tıklanınca `/api/admin/logs/export` endpoint'i çağrılır.

PDF şablonu şu bölümlerden oluşur:

```
┌──────────────────────────────────────────┐
│   [IBU LOGO]                             │
│   Uluslararası Balkan Üniversitesi       │
│   Chatbot Analitik Raporu                │
│   Dönem: 01.01.2025 – 31.01.2025        │
├──────────────────────────────────────────┤
│   ÖZET İSTATİSTİKLER                    │
│   Toplam Soru: 1.243                    │
│   Yanıtlanma Oranı: 89.2%              │
│   En Aktif Gün: 15 Ocak 2025 (87 soru) │
├──────────────────────────────────────────┤
│   KATEGORİ DAĞILIMI                     │
│   Kayıt      ████████████  34% (423)    │
│   Burs        ██████████    28% (348)   │
│   Akademik    ██████        19% (236)   │
│   Yurt        ████          12% (149)   │
│   Diğer       ██             7%  (87)   │
├──────────────────────────────────────────┤
│   KONUŞMA LOGLARI                       │
│   ┌──────────────────────────────────┐  │
│   │ 15 Ocak 2025, 14:23 | TR | kayit │  │
│   │ Soru: Kayıt tarihleri ne zaman?  │  │
│   │ Cevap: Güz dönemi Temmuz...      │  │
│   └──────────────────────────────────┘  │
│   ... (tüm loglar)                      │
├──────────────────────────────────────────┤
│   Sayfa 1 / 5    |    ibu.edu.mk        │
└──────────────────────────────────────────┘
```

PDF oluşturmak için **@react-pdf/renderer** veya **pdfmake** kullanın.

---

### 2.2 API Endpoint'leri (Loglar)

```
GET  /api/admin/logs               # Log listesi (filtre + sayfalama)
GET  /api/admin/logs/stats         # İstatistik özeti
GET  /api/admin/logs/chart         # Günlük trend verisi
GET  /api/admin/logs/categories    # Kategori dağılımı
GET  /api/admin/logs/export        # PDF rapor indir
```

**GET /api/admin/logs parametreleri:**

```
?page=1
&limit=20
&dateFrom=2025-01-01
&dateTo=2025-01-31
&category=kayit
&language=tr
&search=kayıt
&simMin=0.70
&simMax=1.00
```

**GET /api/admin/logs/stats response:**

```json
{
  "totalCount": 1243,
  "answeredRate": 89.2,
  "languageSplit": { "tr": 833, "en": 410 },
  "topCategory": "kayit",
  "avgSimilarity": 0.821,
  "peakDay": { "date": "2025-01-15", "count": 87 }
}
```

**GET /api/admin/logs/chart response:**

```json
{
  "data": [
    { "date": "2025-01-01", "count": 34 },
    { "date": "2025-01-02", "count": 28 },
    ...
  ]
}
```

**GET /api/admin/logs/export**

Response: `Content-Type: application/pdf` ile binary PDF dosyası.
İstek parametreleri log listesiyle aynı (filtreler PDF'e yansır).

---

## Modül 3: Widget Kod Üretici

### 3.1 Sayfa: `/admin/widget`

#### Görsel Düzen

```
┌────────────────────────────────────────────────────────────────┐
│  WIDGET YAPILANDIRMASI          CANLI ÖNİZLEME                 │
│                                  ┌──────────────────────────┐  │
│  API URL:                        │                          │  │
│  [https://your-app.vercel.app]   │   [Üniversite sayfası    │  │
│                                  │    simüle ediliyor...]   │  │
│  Bot Adı:                        │                          │  │
│  [IBU Asistan_____________]      │              ┌─────────┐ │  │
│                                  │              │ IBU     │ │  │
│  Ana Renk:                       │              │ Asistan │ │  │
│  [#1a3a6b ████]                  │              │         │ │  │
│                                  │              │ Merhaba │ │  │
│  İkincil Renk (altın):           │              │ 👋 ...  │ │  │
│  [#c8a951 ████]                  │              └─────────┘ │  │
│                                  │                    [💬]  │  │
│  Konum:                          └──────────────────────────┘  │
│  ● Sağ Alt  ○ Sol Alt                                          │
│                                                                 │
│  Hoşgeldin Mesajı (TR):                                        │
│  [Merhaba! 👋 Size nasıl yardımcı olabilirim?_______]         │
│                                                                 │
│  Hoşgeldin Mesajı (EN):                                        │
│  [Hello! 👋 How can I help you today?_________________]        │
│                                                                 │
│  Hızlı Cevap Butonları (TR):                                   │
│  [📅 Kayıt tarihleri] [x]                                      │
│  [🎓 Burs imkânları] [x]                                       │
│  [📚 Programlar] [x]                                           │
│  [+ Yeni ekle]                                                  │
│                                                                 │
│  Dil Desteği:  ✅ Türkçe  ✅ İngilizce  □ Arnavutça           │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  ÇIKTI KODU                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ <!-- IBU Chatbot Widget -->                              │  │
│  │ <script>                                                 │  │
│  │ (function(){                                             │  │
│  │   const IBU_CONFIG = {                                   │  │
│  │     apiUrl: 'https://your-app.vercel.app/api/chat',      │  │
│  │     primaryColor: '#1a3a6b',                             │  │
│  │     ...                                                  │  │
│  │   };                                                     │  │
│  │   /* [widget kodu] */                                    │  │
│  │ })();                                                    │  │
│  │ </script>                                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  [📋 Kopyala]  [⬇️ .js Dosyası İndir]                          │
│                                                                 │
│  WORDPRESS KURULUM TALİMATI                                     │
│  1. WordPress Admin → Görünüm → Özelleştir                     │
│  2. "Ek CSS" yerine WPCode plugin'i yükleyin                   │
│  3. Code Snippets → Add Snippet → JavaScript                    │
│  4. Yukarıdaki kodu yapıştırın → Location: Footer              │
│  5. Activate → Save                                             │
└────────────────────────────────────────────────────────────────┘
```

#### Özellikler

**Canlı Önizleme**

- Sağ taraftaki iframe, yapılandırma değiştikçe anlık güncellenir
- Widget gerçekten açılıp kapatılabilir olmalı (fonksiyonel önizleme)
- Arka plan sayfayı simüle eden bir placeholder gösterir

**Kod Üretimi**

- `wordpress_widget.js` dosyasının içindeki `IBU_CONFIG` bloğu form değerleriyle doldurulur
- Tüm widget kodu (CSS + HTML + JS) tek `<script>` bloğuna sıkıştırılır (minify)
- "Kopyala" butonu: `navigator.clipboard.writeText()` ile panoya kopyalar, "Kopyalandı! ✓" gösterir
- ".js Dosyası İndir": `Blob` + `URL.createObjectURL()` ile dosya indirir

**WordPress Kısa Kodu (Shortcode) — Opsiyonel Gelişmiş Özellik**

Admin paneli ayrıca bir WordPress plugin `.zip` dosyası da oluşturabilir.
Bu plugin `[ibu_chat]` kısa kodunu WordPress'e kaydeder.
Sayfa düzenleyicisinde `[ibu_chat]` yazan yere widget embed olur.

Plugin zip içeriği şu dosyalardan oluşur:

```
ibu-chatbot/
├── ibu-chatbot.php   (ana plugin dosyası)
└── widget.js         (minified widget kodu)
```

`ibu-chatbot.php` içeriği:

```php
<?php
/**
 * Plugin Name: IBU Chatbot
 * Description: Uluslararası Balkan Üniversitesi AI Chatbot Widget
 * Version: 1.0.0
 */

function ibu_chat_shortcode() {
    wp_enqueue_script('ibu-chat', plugin_dir_url(__FILE__) . 'widget.js', [], '1.0.0', true);
    return '<div id="ibu-chat-root"></div>';
}
add_shortcode('ibu_chat', 'ibu_chat_shortcode');

function ibu_chat_footer() {
    wp_enqueue_script('ibu-chat', plugin_dir_url(__FILE__) . 'widget.js', [], '1.0.0', true);
}
add_action('wp_footer', 'ibu_chat_footer');
?>
```

"Plugin İndir" butonu: `/api/admin/widget/generate-plugin` endpoint'ine POST eder, `.zip` binary döner.

---

### 3.2 API Endpoint'leri (Widget)

```
POST /api/admin/widget/generate-code    # Minified widget kodu üret
POST /api/admin/widget/generate-plugin  # WordPress plugin .zip oluştur
```

**POST /api/admin/widget/generate-code body:**

```json
{
  "apiUrl": "https://ibu-chat-app.vercel.app/api/chat",
  "botName": "IBU Asistan",
  "primaryColor": "#1a3a6b",
  "accentColor": "#c8a951",
  "position": "bottom-right",
  "welcomeTr": "Merhaba! 👋 Size nasıl yardımcı olabilirim?",
  "welcomeEn": "Hello! 👋 How can I help you today?",
  "quickRepliesTr": ["📅 Kayıt tarihleri", "🎓 Burs imkânları", "📚 Programlar"],
  "quickRepliesEn": ["📅 Enrollment dates", "🎓 Scholarships", "📚 Programs"],
  "languages": ["tr", "en"]
}
```

Response: `{ "code": "<script>...</script>", "minifiedSize": "12.4 KB" }`

---

## Kimlik Doğrulama (Auth)

Admin paneli basit JWT tabanlı auth kullanır.

### Login Sayfası: `/admin/login`

```
┌──────────────────────────┐
│  IBU Admin               │
│  ──────────────────────  │
│  Kullanıcı: [__________] │
│  Şifre:     [__________] │
│             [Giriş Yap]  │
└──────────────────────────┘
```

### Auth Akışı

```
POST /api/admin/auth/login
  body: { username, password }
  → bcrypt.compare(password, ADMIN_PASSWORD_HASH)
  → jwt.sign({ role: 'admin' }, NEXTJS_SECRET, { expiresIn: '24h' })
  → httpOnly cookie olarak kaydet
  → redirect: /admin/knowledge

Tüm /api/admin/* endpoint'leri middleware ile korunur:
  → cookie'den JWT al
  → jwt.verify() ile doğrula
  → geçersizse 401 döndür
```

### Next.js Middleware (middleware.ts)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('ibu_admin_token')?.value
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPath = request.nextUrl.pathname === '/admin/login'
  const isApiPath = request.nextUrl.pathname.startsWith('/api/admin')
    && !request.nextUrl.pathname.includes('/auth/login')

  if ((isAdminPath || isApiPath) && !isLoginPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.NEXTJS_SECRET))
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}
```

---

## Admin Panel Navigasyonu

```
Sidebar (sol, sabit):
┌─────────────────┐
│  🎓 IBU Admin   │
│  ─────────────  │
│  📚 Bilgi Tabanı│  → /admin/knowledge
│  📊 Loglar      │  → /admin/logs
│  🔧 Widget      │  → /admin/widget
│  ─────────────  │
│  ⚙️  Ayarlar    │  → /admin/settings
│  🚪 Çıkış       │  → /api/admin/auth/logout
└─────────────────┘
```

---

## Ayarlar Sayfası: `/admin/settings`

```
┌──────────────────────────────────────────────┐
│  CHATBOT AYARLARI                            │
│                                              │
│  Similarity Threshold (eşik):               │
│  Düşük [──────●────────] Yüksek             │
│  0.50                    0.95               │
│  Mevcut: 0.68                               │
│  (Bu değerin altındaki eşleşmeler göz       │
│   ardı edilir)                              │
│                                              │
│  Fallback Threshold (ikinci deneme):        │
│  [0.60]                                     │
│                                              │
│  Max Token (cevap uzunluğu):                │
│  [600]                                      │
│                                              │
│  GPT Modeli:                                │
│  ● gpt-4o  ○ gpt-4o-mini  ○ gpt-3.5-turbo  │
│                                              │
│  Temperature (yaratıcılık):                 │
│  Düşük [──●─────────────] Yüksek           │
│  0.0                      1.0               │
│  Mevcut: 0.3                               │
│                                              │
│  Sistem Promptu (TR):                       │
│  ┌──────────────────────────────────────┐   │
│  │ Sen IBU'nun asistanısın...           │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Sistem Promptu (EN):                       │
│  ┌──────────────────────────────────────┐   │
│  │ You are IBU's assistant...           │   │
│  └──────────────────────────────────────┘   │
│                                              │
│                          [💾 Ayarları Kaydet]│
└──────────────────────────────────────────────┘
```

Ayarlar Supabase'deki `ibu_settings` tablosuna kaydedilir:

```sql
create table ibu_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Varsayılan değerler:
insert into ibu_settings (key, value) values
  ('match_threshold', '0.68'),
  ('fallback_threshold', '0.60'),
  ('max_tokens', '600'),
  ('gpt_model', 'gpt-4o'),
  ('temperature', '0.3'),
  ('system_prompt_tr', 'Sen IBU''nun resmi asistanısın...'),
  ('system_prompt_en', 'You are IBU''s official assistant...');
```

Chat API `/api/chat/route.js` bu değerleri her istek başında okur.

---

## Paket Bağımlılıkları

```bash
npm install \
  openai \
  @supabase/supabase-js \
  bcryptjs \
  jose \
  recharts \
  @react-pdf/renderer \
  mammoth \
  pdf-parse \
  xlsx \
  jszip \
  terser
```

Açıklamalar:

- `bcryptjs` — şifre hash
- `jose` — JWT (Next.js Edge runtime uyumlu)
- `recharts` — grafikler
- `@react-pdf/renderer` — PDF üretimi
- `mammoth` — DOCX → metin
- `pdf-parse` — PDF → metin
- `xlsx` — Excel okuma
- `jszip` — WordPress plugin .zip oluşturma
- `terser` — widget JS minification

---

## Klasör Yapısı

```
ibu-chat-app/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.js              # Mevcut chat endpoint
│   │   └── admin/
│   │       ├── auth/
│   │       │   ├── login/route.js
│   │       │   └── logout/route.js
│   │       ├── documents/
│   │       │   ├── route.js           # GET liste, POST ekle
│   │       │   ├── [id]/route.js      # PUT güncelle, DELETE sil
│   │       │   └── bulk-delete/route.js
│   │       ├── parse-file/route.js    # Dosya parse
│   │       ├── sync-embeddings/route.js
│   │       ├── logs/
│   │       │   ├── route.js           # GET loglar
│   │       │   ├── stats/route.js
│   │       │   ├── chart/route.js
│   │       │   ├── categories/route.js
│   │       │   └── export/route.js    # PDF indir
│   │       ├── widget/
│   │       │   ├── generate-code/route.js
│   │       │   └── generate-plugin/route.js
│   │       └── settings/route.js
│   ├── admin/
│   │   ├── login/page.jsx
│   │   ├── layout.jsx                 # Sidebar + auth check
│   │   ├── knowledge/page.jsx
│   │   ├── logs/page.jsx
│   │   ├── widget/page.jsx
│   │   └── settings/page.jsx
│   └── page.jsx                       # Ana site (redirect to admin)
├── components/
│   ├── admin/
│   │   ├── Sidebar.jsx
│   │   ├── knowledge/
│   │   │   ├── DocumentTable.jsx
│   │   │   ├── FileUploadZone.jsx
│   │   │   ├── ParsePreviewModal.jsx
│   │   │   └── InlineEditRow.jsx
│   │   ├── logs/
│   │   │   ├── StatsCards.jsx
│   │   │   ├── DailyChart.jsx
│   │   │   ├── CategoryChart.jsx
│   │   │   ├── LogFilters.jsx
│   │   │   └── LogList.jsx
│   │   ├── widget/
│   │   │   ├── WidgetConfigForm.jsx
│   │   │   ├── LivePreview.jsx
│   │   │   └── CodeOutput.jsx
│   │   └── settings/
│   │       └── SettingsForm.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Modal.jsx
│       ├── Toast.jsx
│       └── Pagination.jsx
├── lib/
│   ├── supabase.js        # Supabase client
│   ├── openai.js          # OpenAI client
│   ├── auth.js            # JWT helpers
│   ├── parsers/
│   │   ├── parseTxt.js
│   │   ├── parseDocx.js
│   │   ├── parsePdf.js
│   │   └── parseXlsx.js
│   └── pdf/
│       └── reportTemplate.jsx  # @react-pdf/renderer şablon
├── middleware.ts
├── .env.local
└── next.config.js
```

---

## Öncelik Sırası

Sistemi şu sıraya göre geliştirin:

1. Auth (login/middleware) — güvenlik önce
2. Supabase bağlantısı ve `ibu_settings` tablosu
3. Bilgi Tabanı — listeleme + düzenleme + silme
4. Dosya yükleme + parse + embedding sync
5. Log listesi + filtreler
6. İstatistik kartları + grafikler
7. PDF rapor export
8. Widget kod üretici + canlı önizleme
9. WordPress plugin zip üretici
10. Ayarlar sayfası

---

## Notlar

- Tüm admin UI bileşenleri **Tailwind CSS** ile stillendirilmeli
- Grafik kütüphanesi olarak **Recharts** kullanılmalı
- Tablo sayfalama client-side değil server-side yapılmalı (büyük veri setleri için)
- Dosya yükleme için Next.js `formData()` kullanılmalı, `multer` gerekmez
- PDF oluşturma sırasında uzun sürebilir, loading state gösterilmeli
- Tüm API endpoint'leri try/catch ile sarılmalı, hata mesajları Türkçe olmalı
- Mobile responsive zorunlu değil (admin panel masaüstü öncelikli)
