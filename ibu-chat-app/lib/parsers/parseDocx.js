import mammoth from 'mammoth'
import { parseTxt } from './parseTxt.js'

export async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value
    return parseTxt(text)
  } catch (err) {
    console.error('Error parsing DOCX file:', err)
    throw new Error('Word belgesi çözümlenirken hata oluştu')
  }
}
