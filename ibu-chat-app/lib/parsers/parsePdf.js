import { createRequire } from 'module'
import { parseTxt } from './parseTxt.js'

export async function parsePdf(buffer) {
  try {
    const require = createRequire(import.meta.url)
    const pdf = require('pdf-parse')
    const data = await pdf(buffer)
    return parseTxt(data.text)
  } catch (err) {
    console.error('Error parsing PDF file:', err)
    throw new Error('PDF belgesi çözümlenirken hata oluştu')
  }
}
