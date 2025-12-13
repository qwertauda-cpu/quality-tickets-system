/**
 * Migration: Add company_id to settings table
 * This allows each company (admin) to have their own WhatsApp settings
 */

const db = require('./db-manager');

async function addCompanyIdToSettings() {
    try {
        console.log('🔄 جاري التحقق من جدول settings...');
        
        // التحقق من وجود العمود
        const columns = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'settings' 
            AND COLUMN_NAME = 'company_id'
        `);
        
        if (columns.length === 0) {
            console.log('🔄 إضافة company_id إلى جدول settings...');
            await db.query(`
                ALTER TABLE settings
                ADD COLUMN company_id INT NULL COMMENT 'معرف الشركة (NULL للإعدادات العامة)',
                ADD INDEX idx_company_id (company_id)
            `);
            
            // إضافة Foreign Key إذا كان جدول companies موجود
            try {
                await db.query(`
                    ALTER TABLE settings
                    ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
                `);
                console.log('✅ تم إضافة Foreign Key');
            } catch (error) {
                if (error.code !== 'ER_CANNOT_ADD_FOREIGN') {
                    console.log('⚠️ تحذير: لم يتم إضافة Foreign Key:', error.message);
                }
            }
            
            console.log('✅ تم إضافة company_id إلى جدول settings');
        } else {
            console.log('✅ العمود company_id موجود بالفعل');
        }
        
        // تعديل UNIQUE constraint ليدعم company_id
        // إزالة UNIQUE من setting_key إذا كان موجوداً
        try {
            await db.query(`
                ALTER TABLE settings
                DROP INDEX setting_key
            `);
            console.log('✅ تم إزالة UNIQUE constraint من setting_key');
        } catch (error) {
            if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && !error.message.includes('Unknown key')) {
                throw error;
            }
            console.log('ℹ️ UNIQUE constraint غير موجود أو تم إزالته مسبقاً');
        }
        
        // إضافة UNIQUE constraint جديد لـ (setting_key, company_id)
        try {
            await db.query(`
                ALTER TABLE settings
                ADD UNIQUE KEY unique_setting_company (setting_key, company_id)
            `);
            console.log('✅ تم إضافة UNIQUE constraint لـ (setting_key, company_id)');
        } catch (error) {
            if (error.code !== 'ER_DUP_KEYNAME' && !error.message.includes('Duplicate key name')) {
                throw error;
            }
            console.log('ℹ️ UNIQUE constraint موجود بالفعل');
        }
        
        console.log('✅ تم تحديث جدول settings بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
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

