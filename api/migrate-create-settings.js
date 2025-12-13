// Migration: Create settings table for WhatsApp and other system settings

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function createSettingsTable() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // إنشاء جدول settings
        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                setting_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'مفتاح الإعداد (مثل: whatsapp_phone, whatsapp_api_key)',
                setting_value TEXT NULL COMMENT 'قيمة الإعداد',
                setting_type ENUM('text', 'number', 'boolean', 'json') DEFAULT 'text' COMMENT 'نوع القيمة',
                description TEXT NULL COMMENT 'وصف الإعداد',
                category VARCHAR(50) DEFAULT 'general' COMMENT 'فئة الإعداد (whatsapp, general, etc)',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_setting_key (setting_key),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء/التحقق من جدول: settings');
        
        // إضافة إعدادات الواتساب الافتراضية
        const defaultSettings = [
            {
                key: 'whatsapp_phone',
                value: '',
                type: 'text',
                description: 'رقم الواتساب الخاص بالمالك لإرسال الرسائل',
                category: 'whatsapp'
            },
            {
                key: 'whatsapp_api_key',
                value: '',
                type: 'text',
                description: 'مفتاح API للواتساب (اختياري - للاستخدام مع خدمات API)',
                category: 'whatsapp'
            },
            {
                key: 'whatsapp_api_url',
                value: '',
                type: 'text',
                description: 'رابط API للواتساب (اختياري)',
                category: 'whatsapp'
            },
            {
                key: 'whatsapp_enabled',
                value: '1',
                type: 'boolean',
                description: 'تفعيل/تعطيل إرسال رسائل الواتساب',
                category: 'whatsapp'
            }
        ];
        
        for (const setting of defaultSettings) {
            await connection.query(`
                INSERT INTO settings (setting_key, setting_value, setting_type, description, category)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    setting_type = VALUES(setting_type),
                    description = VALUES(description),
                    category = VALUES(category)
            `, [setting.key, setting.value, setting.type, setting.description, setting.category]);
        }
        
        console.log('✅ تم إضافة الإعدادات الافتراضية');
        
        console.log('✅ تم إنشاء جدول الإعدادات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء جدول الإعدادات:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ تم إغلاق الاتصال');
        }
    }
}

// تشغيل Migration
if (require.main === module) {
    createSettingsTable()
        .then(() => {
            console.log('✅ تم تنفيذ Migration بنجاح');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ فشل تنفيذ Migration:', error);
            process.exit(1);
        });
}

module.exports = { createSettingsTable };

