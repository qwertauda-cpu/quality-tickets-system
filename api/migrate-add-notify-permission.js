/**
 * Migration: Add can_notify_technicians permission to users table
 * This allows admins to control which quality staff can send notifications to technicians
 */

const db = require('./db-manager');

async function addNotifyPermission() {
    try {
        console.log('🔄 جاري التحقق من جدول users...');
        
        // التحقق من وجود العمود
        const columns = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'can_notify_technicians'
        `);
        
        if (columns.length === 0) {
            console.log('🔄 إضافة can_notify_technicians إلى جدول users...');
            await db.query(`
                ALTER TABLE users
                ADD COLUMN can_notify_technicians TINYINT(1) DEFAULT 0 COMMENT 'صلاحية إرسال تنبيهات للفنيين عبر الواتساب'
            `);
            console.log('✅ تم إضافة can_notify_technicians إلى جدول users');
        } else {
            console.log('✅ العمود can_notify_technicians موجود بالفعل');
        }
        
        // إعطاء صلاحية افتراضية للمدراء
        try {
            await db.query(`
                UPDATE users 
                SET can_notify_technicians = 1 
                WHERE role = 'admin'
            `);
            console.log('✅ تم إعطاء صلاحية افتراضية للمدراء');
        } catch (error) {
            console.log('⚠️ تحذير: لم يتم تحديث الصلاحيات الافتراضية:', error.message);
        }
        
        console.log('✅ تم تحديث جدول users بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
    }
}

// Run migration
addNotifyPermission()
    .then(() => {
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });

