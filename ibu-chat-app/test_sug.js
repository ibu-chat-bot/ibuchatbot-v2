function extractSuggestions(text) {
    const markers = [
        '💡 Bunları da sorabilirsiniz:',
        '💡 Bunları da sorabilirsiniz',
        'Bunları da sorabilirsiniz:',
        'Bunları da sorabilirsiniz',
    ];
    let markerIdx = -1;
    let markerLen = 0;
    for (const marker of markers) {
        const idx = text.indexOf(marker);
        if (idx !== -1) { markerIdx = idx; markerLen = marker.length; break; }
    }
    if (markerIdx === -1) return { mainText: text, suggestions: [] };
    const mainText = text.slice(0, markerIdx).trim();
    const sugPart  = text.slice(markerIdx + markerLen);
    const suggestions = sugPart
        .split('\n')
        .map(s => s.replace(/^[\-\•\*\d\.] */, '').trim())
        .filter(s => s.length > 5 && s.length < 120);
    return { mainText, suggestions };
}

const text = `Uluslararası Balkan Üniversitesi'nin anlaşmalı acenteleri: - **Yelken Eğitim Danışmanlık** - **Draft Eğitim Danışmanlık** Bu acenteler okulla yapılan anlaşmalar kapsamında kayıt alma yetkisine sahiptir. Ancak acenteyle çalışmak zorunlu değildir. 💡 Bunları da sorabilirsiniz: • Acente olmadan direkt kayıt yaptırabilir miyim? • Kayıt için hangi belgeler gerekli? • Kayıt süreci kaç gün sürer?`;

console.log(extractSuggestions(text));
