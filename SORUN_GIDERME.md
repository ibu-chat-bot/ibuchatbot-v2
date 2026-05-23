# IBU Chatbot — Sorun Giderme & Kurulum Kılavuzu v3.0

## Sık Karşılaşılan Sorunlar ve Çözümleri

---

### 🔴 SORUN: WordPress'te "Bağlantı Hatası" / API bağlanmıyor

**Sebep 1: `apiUrl` güncellenmemiş**
```javascript
// wordpress_widget.js içinde bunu bulun ve değiştirin:
apiUrl: 'https://YOUR-NEXTJS-APP.vercel.app/api/chat',
//                ^^^ Vercel URL'nizle değiştirin!
```

**Sebep 2: CORS — WordPress siteniz ALLOWED_ORIGINS'te yok**

Vercel Dashboard → Project → Settings → Environment Variables:
```
ALLOWED_ORIGINS=https://siteniz.com,https://www.siteniz.com
```
Değiştirdikten sonra mutlaka **Redeploy** edin!

**Sebep 3: Mixed content (HTTP/HTTPS karışımı)**

WordPress siteniz `https://` ise API da `https://` olmalı.
Vercel otomatik HTTPS sağlar, sorun yoktur.

**Test için tarayıcı konsolunda çalıştırın:**
```javascript
fetch('https://YOUR-APP.vercel.app/api/chat')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
// Beklenen: {"status":"IBU Chat API çalışıyor ✓",...}
```

---

### 🟡 SORUN: Cevaplar alakasız veya "bilmiyorum" diyor

**Sebep: Supabase'de veri yok veya similarity eşiği çok yüksek**

1. `sync_data.js` çalıştırın:
   ```bash
   node sync_data.js --local   # qa_data.txt dosyanız varsa
   ```
   
2. Eşiği düşürün — `route.js` içinde:
   ```javascript
   match_threshold: 0.62,  // 0.55'e düşürün
   ```

3. Supabase SQL Editor'da test:
   ```sql
   SELECT COUNT(*) FROM ibu_documents;
   -- 0 dönüyorsa veri yok, sync_data.js çalıştırın
   ```

---

### 🟡 SORUN: Widget çift açılıyor / çakışıyor

**Sebep: wordpress_widget.js iki kez yükleniyor**

v3.0'da bu fix var (`window.__ibuChatLoaded` kontrolü).
Eski widget JS'i tamamen kaldırıp yenisini ekleyin.

WPCode'da eski snippet'i **deaktive edin**, yenisini ekleyin.

---

### 🟡 SORUN: Öneri butonları çalışmıyor

**Sebep: API "Bunları da sorabilirsiniz:" döndürmüyor**

System prompt'a ekleyin (ibu-system-prompt-update.md'den):
```
Her cevabın sonuna şu formatı ekle:
💡 Bunları da sorabilirsiniz:
- İlgili soru 1
- İlgili soru 2
- İlgili soru 3
```

---

### 🟡 SORUN: WhatsApp butonu her cevabın altında çıkıyor

**Sebep: Similarity skoru 0.70'in altında dönüyor**

İki seçenek:
1. Eşiği düşürün: `whatsappThreshold: 0.55`
2. Veya daha fazla veri ekleyin ki sorular eşleşsin

---

### 🟡 SORUN: Mesaj gönderilmiyor (send butonu yanıt vermiyor)

Tarayıcı konsol hatasını kontrol edin (F12):
- `net::ERR_CONNECTION_REFUSED` → Vercel deploy edilmemiş
- `403 Forbidden` → CORS hatası (yukarıya bakın)
- `500 Internal Server Error` → OPENAI_API_KEY veya SUPABASE_URL yanlış

---

### 🔴 SORUN: Vercel'de "500 Internal Server Error"

**Vercel Logs'u kontrol edin:**
Vercel Dashboard → Project → Functions → `/api/chat` → Logs

Yaygın sebepler:
- `OPENAI_API_KEY` geçersiz veya eksik
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` yanlış
- `match_documents` fonksiyonu Supabase'de yok (supabase_setup.sql çalıştırın)

---

## Kurulum Adımları (Sıfırdan)

### 1. Supabase

1. [supabase.com](https://supabase.com) → New Project
2. SQL Editor → `supabase_setup.sql` dosyasını yapıştır → Run
3. Settings → API → `URL` ve `service_role` key'i kopyala

### 2. Next.js Projesi

```bash
# Yeni proje (sadece ilk kurulumda)
npx create-next-app@latest ibu-chat-app --app --no-src-dir
cd ibu-chat-app
npm install openai @supabase/supabase-js

# Klasör oluştur
mkdir -p app/api/chat

# route.js'i kopyala (bu paketteki route.js)
cp route.js app/api/chat/route.js
```

**.env.local** dosyası oluştur:
```env
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
ALLOWED_ORIGINS=https://siteniz.com,https://www.siteniz.com
```

Yerel test:
```bash
npm run dev
# http://localhost:3000/api/chat → {"status":"IBU Chat API çalışıyor ✓"}
```

### 3. Veri Yükleme

**qa_data.txt** formatı:
```
Soru: Kayıt tarihleri ne zaman?
Cevap: Güz dönemi kayıtları Temmuz-Eylül arası yapılmaktadır.
Kategori: kayit

Soru: Burs başvurusu nasıl yapılır?
Cevap: Online portal üzerinden başvurabilirsiniz.
Kategori: burs

Question: When are enrollment dates?
Answer: Fall semester enrollment is July-September.
Category: enrollment
```

```bash
npm install dotenv
node sync_data.js --local --dry-run  # önce test et
node sync_data.js --local            # sonra yükle
```

### 4. Vercel Deploy

```bash
npm install -g vercel
vercel

# Environment variables ekle
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add ALLOWED_ORIGINS

vercel --prod
```

Deploy URL'nizi not alın: `https://ibu-chat-app-xxx.vercel.app`

### 5. WordPress Widget

1. **wordpress_widget.js** dosyasında `apiUrl`'yi güncelleyin:
   ```javascript
   apiUrl: 'https://ibu-chat-app-xxx.vercel.app/api/chat',
   ```

2. WordPress Admin → Plugins → WPCode yükleyin

3. WPCode → Add Snippet → JavaScript Snippet
   - İçeriği yapıştırın
   - Location: **Footer**
   - Activate → Save

4. Sitenizi ziyaret edin → sağ altta chat butonu görünmeli

---

## Kontrol Listesi

- [ ] `supabase_setup.sql` çalıştırıldı
- [ ] `ibu_documents` tablosunda veri var (`SELECT COUNT(*) FROM ibu_documents`)
- [ ] Vercel'de 4 environment variable set edildi
- [ ] `vercel --prod` ile deploy edildi
- [ ] `wordpress_widget.js` içinde `apiUrl` güncellendi
- [ ] ALLOWED_ORIGINS'e WordPress URL eklendi
- [ ] Tarayıcı konsolunda hata yok

---

## Aylık Tahmini Maliyet

| Servis | Kullanım | Maliyet |
|--------|----------|---------|
| OpenAI Embeddings | ~5000 sorgu/ay | ~$1-3 |
| OpenAI GPT-4o | ~5000 sorgu/ay | ~$25-50 |
| Supabase | Free tier | $0 |
| Vercel | Free tier | $0 |
| **Toplam** | | **~$25-55/ay** |
