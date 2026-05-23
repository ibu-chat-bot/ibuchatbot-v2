import { parseTxt } from '../../../../lib/parsers/parseTxt'
import { parseDocx } from '../../../../lib/parsers/parseDocx'
import { parsePdf } from '../../../../lib/parsers/parsePdf'
import { parseXlsx } from '../../../../lib/parsers/parseXlsx'

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return Response.json(
        { error: 'Dosya yüklenmesi zorunludur' },
        { status: 400 }
      )
    }

    const filename = file.name
    const extension = filename.split('.').pop().toLowerCase()
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let entries = []

    console.log(`Parsing file: ${filename} (ext: ${extension})...`)

    switch (extension) {
      case 'txt':
        entries = parseTxt(buffer.toString('utf-8'))
        break
      case 'docx':
        entries = await parseDocx(buffer)
        break
      case 'pdf':
        entries = await parsePdf(buffer)
        break
      case 'xlsx':
      case 'xls':
        entries = parseXlsx(buffer)
        break
      default:
        return Response.json(
          { error: `Desteklenmeyen dosya formatı: .${extension}. Lütfen .txt, .docx, .pdf, veya .xlsx dosyası yükleyin.` },
          { status: 400 }
        )
    }

    // Clean up empty questions/answers
    entries = entries.filter(e => e.question.trim() && e.answer.trim())

    return Response.json({
      success: true,
      filename,
      count: entries.length,
      entries,
    })
  } catch (err) {
    console.error('Error parsing file upload:', err)
    return Response.json(
      { error: err.message || 'Dosya çözümlenirken bilinmeyen bir hata oluştu' },
      { status: 500 }
    )
  }
}
