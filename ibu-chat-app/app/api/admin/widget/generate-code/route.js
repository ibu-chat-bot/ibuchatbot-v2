import fs from 'fs'
import path from 'path'
import { minify } from 'terser'

export async function POST(req) {
  try {
    const {
      apiUrl,
      botName,
      primaryColor,
      accentColor,
      position,
      theme,
      tooltipTr,
      tooltipEn,
      welcomeTr,
      welcomeEn,
      quickRepliesTr,
      quickRepliesEn,
    } = await req.json()

    // 1. Read base widget script
    const widgetPath = path.join(process.cwd(), '..', 'wordpress_widget.js')
    if (!fs.existsSync(widgetPath)) {
      return Response.json(
        { error: 'Widget kaynak dosyası (wordpress_widget.js) bulunamadı.' },
        { status: 404 }
      )
    }

    let code = fs.readFileSync(widgetPath, 'utf8')

    // 2. Build new configuration block
    const newConfigBlock = `const IBU_CONFIG = {
    apiUrl: '${apiUrl.trim()}',
    primaryColor: '${primaryColor.trim()}',
    accentColor: '${accentColor.trim()}',
    botName: '${botName.trim()}',
    theme: '${theme.trim()}',
    tooltipTr: '${tooltipTr.replace(/'/g, "\\'").trim()}',
    tooltipEn: '${tooltipEn.replace(/'/g, "\\'").trim()}',
    welcomeTr: '${welcomeTr.replace(/'/g, "\\'").trim()}',
    welcomeEn: '${welcomeEn.replace(/'/g, "\\'").trim()}',
    placeholderTr: 'Sorunuzu yazın...',
    placeholderEn: 'Type your question...',
    quickRepliesTr: ${JSON.stringify(quickRepliesTr)},
    quickRepliesEn: ${JSON.stringify(quickRepliesEn)},
  };`

    // Replace the IBU_CONFIG definition using regex
    code = code.replace(/const\s+IBU_CONFIG\s*=\s*\{[\s\S]*?\};/, newConfigBlock)

    // 3. Handle Position alignment (bottom-left vs bottom-right)
    if (position === 'bottom-left') {
      // Replace right alignments with left alignments
      code = code.replace(/bottom: 24px;\s*right: 24px;/g, 'bottom: 24px; left: 24px;')
      code = code.replace(/bottom: 92px;\s*right: 24px;/g, 'bottom: 92px; left: 24px;')
      code = code.replace(/bottom: 32px;\s*right: 96px;/g, 'bottom: 32px; left: 96px;')
      code = code.replace(/right: -6px;/g, 'left: -6px; border-top: none; border-right: none; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0;')
      code = code.replace(/transform-origin: bottom right;/g, 'transform-origin: bottom left;')
    }

    // 4. Minify the JS using terser
    console.log('Minifying widget code using Terser...')
    const minified = await minify(code, {
      compress: {
        dead_code: true,
        drop_debugger: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        keep_fargs: false,
        join_vars: true,
      },
      mangle: true,
    })

    if (!minified.code) {
      throw new Error('Terser minification returned empty output.')
    }

    const minifiedScript = `<script>\n${minified.code}\n</script>`
    const sizeInKb = (Buffer.byteLength(minified.code, 'utf8') / 1024).toFixed(2)

    return Response.json({
      success: true,
      code: minifiedScript,
      rawJs: minified.code,
      size: `${sizeInKb} KB`,
    })
  } catch (err) {
    console.error('Error generating widget code:', err)
    return Response.json(
      { error: 'Widget kodu oluşturulurken bir hata oluştu: ' + err.message },
      { status: 500 }
    )
  }
}
