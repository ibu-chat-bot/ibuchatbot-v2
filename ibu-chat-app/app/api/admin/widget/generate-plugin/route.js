import fs from 'fs'
import path from 'path'
import { minify } from 'terser'
import JSZip from 'jszip'

export async function POST(req) {
  try {
    const {
      apiUrl,
      botName,
      primaryColor,
      accentColor,
      position,
      welcomeTr,
      welcomeEn,
      quickRepliesTr,
      quickRepliesEn,
    } = await req.json()

    // 1. Read base widget script
    const widgetPath = path.join(process.cwd(), '..', 'wordpress_widget.js')
    if (!fs.existsSync(widgetPath)) {
      return Response.json(
        { error: 'Widget kaynak dosyası bulunamadı.' },
        { status: 404 }
      )
    }

    let code = fs.readFileSync(widgetPath, 'utf8')

    // 2. Build configuration block
    const newConfigBlock = `const IBU_CONFIG = {
    apiUrl: '${apiUrl.trim()}',
    primaryColor: '${primaryColor.trim()}',
    accentColor: '${accentColor.trim()}',
    botName: '${botName.trim()}',
    welcomeTr: '${welcomeTr.trim()}',
    welcomeEn: '${welcomeEn.trim()}',
    placeholderTr: 'Sorunuzu yazın...',
    placeholderEn: 'Type your question...',
    quickRepliesTr: ${JSON.stringify(quickRepliesTr)},
    quickRepliesEn: ${JSON.stringify(quickRepliesEn)},
  };`

    code = code.replace(/const\s+IBU_CONFIG\s*=\s*\{[\s\S]*?\};/, newConfigBlock)

    // Handle position
    if (position === 'bottom-left') {
      code = code.replace(/bottom: 24px;\s*right: 24px;/g, 'bottom: 24px; left: 24px;')
      code = code.replace(/bottom: 92px;\s*right: 24px;/g, 'bottom: 92px; left: 24px;')
      code = code.replace(/transform-origin: bottom right;/g, 'transform-origin: bottom left;')
    }

    // Minify
    const minified = await minify(code, { compress: true, mangle: true })
    if (!minified.code) {
      throw new Error('Minification failed.')
    }

    // 3. Generate PHP bootstrap content
    const phpContent = `<?php
/**
 * Plugin Name: IBU Chatbot Widget
 * Description: Uluslararası Balkan Üniversitesi için özelleştirilmiş AI Chatbot widget entegrasyonu.
 * Version: 1.0.0
 * Author: International Balkan University
 */

if (!defined('ABSPATH')) exit;

function ibu_chat_shortcode() {
    wp_enqueue_script('ibu-chatbot-script', plugin_dir_url(__FILE__) . 'widget.js', [], '1.0.0', true);
    return '<div id="ibu-chat-root"></div>';
}
add_shortcode('ibu_chat', 'ibu_chat_shortcode');

function ibu_chat_footer() {
    wp_enqueue_script('ibu-chatbot-script', plugin_dir_url(__FILE__) . 'widget.js', [], '1.0.0', true);
}
add_action('wp_footer', 'ibu_chat_footer');
?>`

    // 4. Create ZIP archive
    console.log('Zipping WordPress plugin contents...')
    const zip = new JSZip()
    const folder = zip.folder('ibu-chatbot')
    folder.file('ibu-chatbot.php', phpContent)
    folder.file('widget.js', minified.code)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="ibu-chatbot-plugin.zip"',
      },
    })
  } catch (err) {
    console.error('Error generating plugin zip:', err)
    return Response.json(
      { error: 'WordPress eklentisi oluşturulurken bir hata oluştu: ' + err.message },
      { status: 500 }
    )
  }
}
