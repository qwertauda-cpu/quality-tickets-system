/**
 * Migration: Add company_id to settings table
 * This allows each company (admin) to have their own WhatsApp settings
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function addCompanyIdToSettings() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // التحقق من وجود العمود
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'settings' 
            AND COLUMN_NAME = 'company_id'
        `, [config.database]);
        
        if (columns.length === 0) {
            console.log('🔄 إضافة company_id إلى جدول settings...');
            await connection.query(`
                ALTER TABLE settings
                ADD COLUMN company_id INT NULL COMMENT 'معرف الشركة (NULL للإعدادات العامة)',
                ADD INDEX idx_company_id (company_id),
                ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            `);
            console.log('✅ تم إضافة company_id إلى جدول settings');
        } else {
            console.log('✅ العمود company_id موجود بالفعل');
        }
        
        // تعديل UNIQUE constraint ليدعم company_id
        // إزالة UNIQUE من setting_key إذا كان موجوداً
        try {
            await connection.query(`
                ALTER TABLE settings
                DROP INDEX setting_key
            `);
            console.log('✅ تم إزالة UNIQUE constraint من setting_key');
        } catch (error) {
            if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                throw error;
            }
            console.log('ℹ️ UNIQUE constraint غير موجود أو تم إزالته مسبقاً');
        }
        
        // إضافة UNIQUE constraint جديد لـ (setting_key, company_id)
        try {
            await connection.query(`
                ALTER TABLE settings
                ADD UNIQUE KEY unique_setting_company (setting_key, company_id)
            `);
            console.log('✅ تم إضافة UNIQUE constraint لـ (setting_key, company_id)');
        } catch (error) {
            if (error.code !== 'ER_DUP_KEYNAME') {
                throw error;
            }
            console.log('ℹ️ UNIQUE constraint موجود بالفعل');
        }
        
        console.log('✅ تم تحديث جدول settings بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ تم إغلاق الاتصال');
        }
    }
}

// Run migration
addCompanyIdToSettings()
    .then(() => {
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });

