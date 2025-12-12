/**
 * Script to download Arabic fonts for PDF generation
 * تحميل الخطوط العربية لتوليد PDF
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'fonts');

// إنشاء مجلد fonts إذا لم يكن موجوداً
if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

// روابط تحميل خط Cairo من Google Fonts
const fonts = [
    {
        name: 'Cairo-Regular.ttf',
        url: 'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo-Regular.ttf'
    },
    {
        name: 'Cairo-Bold.ttf',
        url: 'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo-Bold.ttf'
    }
];

function downloadFont(font) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(fontsDir, font.name);
        
        // إذا كان الملف موجوداً، تخطيه
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${font.name} موجود مسبقاً`);
            resolve();
            return;
        }
        
        console.log(`⬇️ جاري تحميل ${font.name}...`);
        
        const file = fs.createWriteStream(filePath);
        
        https.get(font.url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ تم تحميل ${font.name} بنجاح`);
                    resolve();
                });
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // اتباع التوجيه
                file.close();
                fs.unlinkSync(filePath);
                downloadFont({ name: font.name, url: response.headers.location }).then(resolve).catch(reject);
            } else {
                file.close();
                fs.unlinkSync(filePath);
                reject(new Error(`فشل التحميل: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            reject(err);
        });
    });
}

async function downloadAllFonts() {
    console.log('🔄 بدء تحميل الخطوط العربية...\n');
    
    try {
        for (const font of fonts) {
            await downloadFont(font);
        }
        
        console.log('\n✅ تم تحميل جميع الخطوط بنجاح!');
        console.log('📁 الملفات موجودة في:', fontsDir);
    } catch (error) {
        console.error('❌ خطأ في تحميل الخطوط:', error.message);
        console.log('\n💡 يمكنك تحميل الخطوط يدوياً من:');
        console.log('   https://fonts.google.com/specimen/Cairo');
        console.log('   ووضعها في مجلد:', fontsDir);
    }
}

downloadAllFonts();

