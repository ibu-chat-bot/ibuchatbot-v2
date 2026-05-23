# IBU Chatbot — WhatsApp Yönlendirme Entegrasyonu

## Nasıl Çalışır?

Chatbot bir soruyu yeterli güvenle cevaplayamazsa (similarity skoru düşükse),
kullanıcıya WhatsApp'a geçiş seçeneği sunar.
WhatsApp linki açıldığında, konuşma özeti otomatik mesaj olarak hazır gelir.

---

## 1. Widget Tarafı — wordpress_widget.js Güncellemesi

### 1.1 WhatsApp Numarası ve Eşik Değeri

`IBU_CONFIG` objesine şu alanları ekleyin:

```javascript
const IBU_CONFIG = {
  // ... mevcut alanlar ...
  whatsappNumber: '905050345791',   // başında + olmadan
  whatsappThreshold: 0.70,          // bu skorun altında WA butonu göster
  showWhatsappAlways: false,         // true yapılırsa her cevabın altında göster
};
```

### 1.2 WhatsApp Link Üretici Fonksiyon

Widget JS dosyasına şu fonksiyonu ekleyin:

```javascript
function buildWhatsAppLink(conversationHistory, lastQuestion) {
  const number = IBU_CONFIG.whatsappNumber;

  // Konuşma özetini hazırla (son 3 mesaj)
  const recentMessages = conversationHistory
    .slice(-6)
    .map(m => `${m.role === 'user' ? '👤' : '🤖'} ${m.content}`)
    .join('\n');

  const message = `Merhaba! IBU web sitesi chatbotundan geliyorum.

❓ Sorum: ${lastQuestion}

📋 Konuşma geçmişim:
${recentMessages}

Yardımcı olabilir misiniz?`;

  return `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;
}
```

### 1.3 WhatsApp Butonu HTML

Cevap balonunun altına eklenecek buton:

```javascript
function createWhatsAppButton(question) {
  const link = buildWhatsAppLink(history, question);

  const wrapper = document.createElement('div');
  wrapper.className = 'ibu-wa-wrapper';
  wrapper.innerHTML = `
    <p class="ibu-wa-text">
      Bu konuda size daha iyi yardımcı olabilmek için 
      WhatsApp destek hattımıza bağlanabilirsiniz.
    </p>
    <a href="${link}" target="_blank" rel="noopener" class="ibu-wa-btn">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
                 -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075
                 -.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059
                 -.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
                 .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52
                 -.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51
                 -.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
                 -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074
                 .149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625
                 .712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413
                 .248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.543 5.876L0 24l6.29-1.542
                 A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894
                 a9.877 9.877 0 01-5.031-1.378l-.361-.214-3.735.916.959-3.624-.235-.373
                 A9.876 9.876 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106c5.421 0 9.894 
                 4.474 9.894 9.894 0 5.421-4.473 9.894-9.894 9.894z"/>
      </svg>
      WhatsApp'ta Devam Et
    </a>
  `;
  return wrapper;
}
```

### 1.4 WhatsApp Butonu CSS

Widget style bloğuna ekleyin:

```css
.ibu-wa-wrapper {
  margin-top: 8px;
  padding: 10px 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  max-width: 84%;
  align-self: flex-start;
}

.ibu-wa-text {
  font-size: 12px;
  color: #166534;
  margin: 0 0 8px;
  line-height: 1.5;
}

.ibu-wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #25d366;
  color: white;
  text-decoration: none;
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 500;
  transition: background 0.15s;
}

.ibu-wa-btn:hover {
  background: #1fba57;
  color: white;
}

/* Dark mode uyumu */
@media (prefers-color-scheme: dark) {
  .ibu-wa-wrapper {
    background: #052e16;
    border-color: #166534;
  }
  .ibu-wa-text {
    color: #86efac;
  }
}
```

### 1.5 sendMessage Fonksiyonu — Güncelleme

Mevcut `sendMessage` fonksiyonunda streaming bittikten sonra şu kontrolü ekleyin:

```javascript
// Stream bitti, similarity skorunu kontrol et
const similarity = data.similarity || 0;   // API'dan gelecek (aşağıda)
const lastUserMsg = text;

if (
  similarity < IBU_CONFIG.whatsappThreshold ||
  IBU_CONFIG.showWhatsappAlways
) {
  const waBtn = createWhatsAppButton(lastUserMsg);
  messagesEl.appendChild(waBtn);
  scrollDown();
}
```

---

## 2. API Tarafı — route.js Güncellemesi

### 2.1 Similarity Skorunu Stream'e Ekle

`/api/chat/route.js` dosyasında stream bitince gönderilen
`{ done: true }` mesajına similarity ekleyin:

```javascript
// Mevcut kod:
controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({ done: true, lang })}\n\n`)
)

// Güncellenmiş kod:
const topSimilarity = finalDocs[0]?.similarity || 0;

controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({ 
    done: true, 
    lang,
    similarity: topSimilarity,      // ← bunu ekle
    hasContext: finalDocs.length > 0 // ← bunu da ekle
  })}\n\n`)
)
```

### 2.2 Widget Tarafında Okuma

Widget'ın SSE okuma bloğunda `data.done` kontrolünü güncelleyin:

```javascript
if (data.done) {
  currentLang = data.lang || currentLang;
  
  // WhatsApp butonu kararı
  const similarity = data.similarity || 0;
  const hasContext = data.hasContext !== false;
  
  if (
    !hasContext ||
    similarity < IBU_CONFIG.whatsappThreshold ||
    IBU_CONFIG.showWhatsappAlways
  ) {
    const waBtn = createWhatsAppButton(inputText); // inputText = gönderilen soru
    messagesEl.appendChild(waBtn);
    scrollDown();
  }
}
```

---

## 3. Tetiklenme Senaryoları

Aşağıdaki durumlarda WhatsApp butonu gösterilir:

| Durum | Açıklama |
|-------|----------|
| Similarity < 0.70 | Veritabanında iyi eşleşme bulunamadı |
| hasContext = false | Hiç eşleşme bulunamadı |
| showWhatsappAlways = true | Config'den her zaman göster açık |
| Kullanıcı "canlı destek" yazar | Sistem prompt seviyesinde zaten yönlendirilir |

---

## 4. Ek Özellik — Zaman Bazlı Yönlendirme (Opsiyonel)

Mesai dışı saatlerde (18:00 - 09:00) otomatik WhatsApp butonu ekleyin.
Widget'a şu fonksiyonu ekleyin:

```javascript
function isOutsideBusinessHours() {
  const now = new Date();
  // Makedonya saati (UTC+1/UTC+2)
  const macedoniaOffset = 2; // yaz saati
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const macedoniaTime = new Date(utc + 3600000 * macedoniaOffset);
  
  const hour = macedoniaTime.getHours();
  const day  = macedoniaTime.getDay(); // 0=Pazar, 6=Cumartesi
  
  const isWeekend  = day === 0 || day === 6;
  const isNight    = hour < 9 || hour >= 18;
  
  return isWeekend || isNight;
}
```

Hoşgeldin mesajında kullanımı:

```javascript
if (isOutsideBusinessHours()) {
  addMessage(
    'Şu an mesai saatlerimiz dışındayız (Hafta içi 09:00–18:00). ' +
    'Sorularınızı yanıtlamaya devam ediyorum, acil konular için ' +
    'WhatsApp destek hattımız 7/24 aktiftir.',
    'bot'
  );
}
```

---

## 5. Test Senaryoları

Entegrasyonu test etmek için şu adımları izleyin:

1. `IBU_CONFIG.whatsappThreshold` değerini geçici olarak `0.99` yapın
   → Her cevabın altında WhatsApp butonu çıkmalı

2. WhatsApp linkine tıklayın
   → WhatsApp açılmalı, mesaj alanında konuşma özeti hazır olmalı

3. `IBU_CONFIG.whatsappThreshold` değerini `0.70` geri alın

4. Veritabanında olmayan bir soru sorun (örn: "Futbol takımınız var mı?")
   → Düşük similarity → WhatsApp butonu çıkmalı

5. Veritabanında olan bir soru sorun (örn: "Kayıt tarihleri ne zaman?")
   → Yüksek similarity → WhatsApp butonu çıkmamalı

---

## Özet

Bu entegrasyon için değiştirilen dosyalar:

- `wordpress_widget.js` — `IBU_CONFIG`, `buildWhatsAppLink()`,
  `createWhatsAppButton()`, CSS, `sendMessage()` güncellemesi
- `app/api/chat/route.js` — done event'ine `similarity` ve
  `hasContext` alanları eklenmesi
