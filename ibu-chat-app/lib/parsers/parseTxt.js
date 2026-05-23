export function parseTxt(text) {
  const entries = []
  
  // Split blocks by double-spaced newlines
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim())
  
  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n')
    let question = '', answer = '', category = 'genel', language = 'tr'
    
    for (const line of lines) {
      const l = line.trim()
      if (l.startsWith('Soru:')) {
        question = l.replace('Soru:', '').trim()
      } else if (l.startsWith('Cevap:')) {
        answer = l.replace('Cevap:', '').trim()
      } else if (l.startsWith('Question:')) {
        question = l.replace('Question:', '').trim()
        language = 'en'
      } else if (l.startsWith('Answer:')) {
        answer = l.replace('Answer:', '').trim()
        language = 'en'
      } else if (l.startsWith('Kategori:')) {
        category = l.replace('Kategori:', '').trim()
      } else if (l.startsWith('Category:')) {
        category = l.replace('Category:', '').trim()
      }
    }
    
    if (question && answer) {
      entries.push({ question, answer, category, language })
    }
  }
  
  return entries
}
