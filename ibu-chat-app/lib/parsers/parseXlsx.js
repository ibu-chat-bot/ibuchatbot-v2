import * as XLSX from 'xlsx'

export function parseXlsx(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert worksheet to JSON (header: 1 means array of arrays)
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    const entries = []
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 2) continue
      
      const colA = String(row[0] || '').trim()
      const colB = String(row[1] || '').trim()
      const colC = String(row[2] || 'genel').trim()
      const colD = String(row[3] || '').trim().toLowerCase()
      
      // Skip header row
      if (i === 0 && (colA.toLowerCase() === 'question' || colA.toLowerCase() === 'soru' || colA.toLowerCase() === 's.no')) {
        continue
      }
      
      if (colA && colB) {
        // Language detection
        let language = 'tr'
        if (colD === 'en' || colD === 'english' || colD === 'english-us') {
          language = 'en'
        } else if (colD === 'tr' || colD === 'turkish') {
          language = 'tr'
        } else {
          // Dynamic detection
          language = /[çğıöşüÇĞİÖŞÜ]|\b(ne|nasıl|hangi|kayıt|burs|üniversite)\b/i.test(colA) ? 'tr' : 'en'
        }
        
        entries.push({
          question: colA,
          answer: colB,
          category: colC || 'genel',
          language,
        })
      }
    }
    
    return entries
  } catch (err) {
    console.error('Error parsing XLSX file:', err)
    throw new Error('Excel belgesi çözümlenirken hata oluştu')
  }
}
