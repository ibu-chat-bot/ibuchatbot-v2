# IBU Chatbot — Formatting & Öneri Butonları Düzeltmesi

## Hangi Dosya Değişecek?

Sadece `wordpress_widget.js` dosyası güncelleniyor.

---

## Değişiklik 1 — Markdown Render Fonksiyonu

Widget JS dosyasının içine, `IBU_CONFIG` bloğunun hemen altına
şu fonksiyonu ekleyin:

```javascript
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\-\*] (.+)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul style="margin:6px 0 6px 16px;padding:0;">$1</ul>')
    .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener" style="color:#1a3a6b;text-decoration:underline;">$1</a>')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>');
}
```

---

## Değişiklik 2 — Öneri Soruları Parse Fonksiyonu

Aynı yere şu fonksiyonu da ekleyin:

```javascript
function extractSuggestions(text) {
  const markers = [
    '💡 Bunları da sorabilirsiniz:',
    '💡 Bunları da sorabilirsiniz',
    'Bunları da sorabilirsiniz:',
  ];

  let markerIdx = -1;
  let markerLen = 0;

  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      markerIdx = idx;
      markerLen = marker.length;
      break;
    }
  }

  if (markerIdx === -1) {
    return { mainText: text, suggestions: [] };
  }

  const mainText  = text.slice(0, markerIdx).trim();
  const sugPart   = text.slice(markerIdx + markerLen);

  const suggestions = sugPart
    .split('\n')
    .map(s => s.replace(/^[\-\•\*\d\.]\s*/, '').trim())
    .filter(s => s.length > 5 && s.length < 120);

  return { mainText, suggestions };
}
```

---

## Değişiklik 3 — Öneri Butonu Oluşturucu

```javascript
function createSuggestionButtons(suggestions, onClickFn) {
  if (!suggestions || suggestions.length === 0) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'ibu-suggestions';

  suggestions.forEach(sug => {
    const btn = document.createElement('button');
    btn.className = 'ibu-sug-btn';
    btn.textContent = sug;
    btn.onclick = () => {
      wrapper.remove();
      onClickFn(sug);
    };
    wrapper.appendChild(btn);
  });

  return wrapper;
}
```

---

## Değişiklik 4 — CSS Eklemeleri

Widget `<style>` bloğuna şu satırları ekleyin:

```css
.ibu-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  max-width: 84%;
  align-self: flex-start;
}

.ibu-sug-btn {
  background: none;
  border: 1px solid #1a3a6b;
  color: #1a3a6b;
  border-radius: 16px;
  padding: 6px 14px;
  font-size: 12.5px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
  line-height: 1.4;
}

.ibu-sug-btn:hover {
  background: #1a3a6b;
  color: white;
}

.ibu-bubble ul {
  margin: 6px 0 6px 16px;
  padding: 0;
}

.ibu-bubble li {
  margin-bottom: 4px;
  line-height: 1.5;
}

.ibu-bubble strong {
  font-weight: 600;
}
```

---

## Değişiklik 5 — sendMessage Fonksiyonu Güncellemesi

Mevcut `sendMessage` fonksiyonunda streaming bittikten sonra
bot mesajını ekleme kısmını bulun ve şöyle güncelleyin:

### Eskiden:

```javascript
// Stream bitti, bot balonunu güncelle
bubbleEl.innerHTML = fullText.replace(/\n/g, '<br>');
```

### Yenisi:

```javascript
// Stream bitti
// 1. Öneri sorularını ayır
const { mainText, suggestions } = extractSuggestions(fullText);

// 2. Ana metni markdown ile render et
bubbleEl.innerHTML = renderMarkdown(mainText);

// 3. Öneri butonlarını ekle
if (suggestions.length > 0) {
  const sugButtons = createSuggestionButtons(suggestions, (selectedQ) => {
    inputEl.value = '';
    sendMessage(selectedQ);
  });
  if (sugButtons) {
    messagesEl.appendChild(sugButtons);
  }
}

scrollDown();
```

---

## Değişiklik 6 — Streaming Sırasında Render

Streaming devam ederken (kelime kelime gelirken) de
markdown render edilmeli. Streaming loop içindeki güncellemeyi
şöyle değiştirin:

### Eskiden:

```javascript
fullText += data.text;
bubbleEl.innerHTML = fullText.replace(/\n/g, '<br>');
```

### Yenisi:

```javascript
fullText += data.text;
// Streaming sırasında öneri kısmını geçici gizle
const { mainText: streamText } = extractSuggestions(fullText);
bubbleEl.innerHTML = renderMarkdown(streamText);
scrollDown();
```

---

## Test Senaryoları

Değişiklikleri uyguladıktan sonra şu testleri yapın:

**Test 1 — Bold metin**
Soru: "IBU'ya kayıt nasıl yapılır?"
Beklenen: Adımlar `**kalın**` değil, gerçek kalın metin olarak görünmeli.

**Test 2 — Madde işaretleri**
Soru: "Gerekli belgeler neler?"
Beklenen: `-` ile başlayan satırlar düzgün liste olarak görünmeli.

**Test 3 — Öneri butonları**
Herhangi bir soru sor.
Beklenen: Cevabın altında `💡 Bunları da sorabilirsiniz:` yerine
tıklanabilir butonlar çıkmalı.

**Test 4 — Butona tıklama**
Öneri butonlarından birine tıkla.
Beklenen: O soru otomatik gönderilmeli, butonlar kaybolmalı.

**Test 5 — Link**
Soru: "Evrak listesi nerede?"
Beklenen: `[Link metni](URL)` formatı tıklanabilir link olmalı.

---

## Özet

| Değişiklik | Açıklama |
|-----------|----------|
| `renderMarkdown()` | Bold, liste, link formatlarını HTML'e çevirir |
| `extractSuggestions()` | `💡` işaretinden sonrasını ayırır |
| `createSuggestionButtons()` | Tıklanabilir öneri butonları oluşturur |
| CSS eklemeleri | Buton ve liste stilleri |
| `sendMessage()` güncellemesi | Tüm fonksiyonları birbirine bağlar |
| Streaming güncellemesi | Yazarken de düzgün görünür |
