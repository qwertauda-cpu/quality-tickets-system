/**
 * Migration: Add WhatsApp Templates System
 * - Update message_templates table
 * - Add permissions to users table
 * - Create subscribers table
 * - Update tickets table
 */

const db = require('./db-manager');

async function migrateWhatsAppTemplatesSystem() {
    try {
        console.log('🔄 بدء Migration: نظام قوالب الواتساب...');
        
        // ==================== 1. تحديث جدول message_templates ====================
        console.log('🔄 تحديث جدول message_templates...');
        
        // التحقق من وجود الأعمدة قبل إضافتها
        const templateColumns = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'message_templates'
        `);
        
        const existingColumns = templateColumns.map(col => col.COLUMN_NAME);
        
        // إضافة company_id
        if (!existingColumns.includes('company_id')) {
            await db.query(`
                ALTER TABLE message_templates
                ADD COLUMN company_id INT NULL COMMENT 'NULL = للمالك، أو company_id = للمدير'
            `);
            console.log('✅ تم إضافة company_id إلى message_templates');
        }
        
        // إضافة template_category
        if (!existingColumns.includes('template_category')) {
            await db.query(`
                ALTER TABLE message_templates
                ADD COLUMN template_category ENUM(
                    'subscription_expiry',
                    'subscriber_expiry',
                    'ticket_notification',
                    'custom'
                ) NOT NULL DEFAULT 'custom' COMMENT 'فئة القالب'
            `);
            console.log('✅ تم إضافة template_category إلى message_templates');
        }
        
        // إضافة available_variables
        if (!existingColumns.includes('available_variables')) {
            await db.query(`
                ALTER TABLE message_templates
                ADD COLUMN available_variables JSON NULL COMMENT 'قائمة المتغيرات المتاحة'
            `);
            console.log('✅ تم إضافة available_variables إلى message_templates');
        }
        
        // إضافة created_by
        if (!existingColumns.includes('created_by')) {
            await db.query(`
                ALTER TABLE message_templates
                ADD COLUMN created_by INT NULL COMMENT 'المستخدم الذي أنشأ القالب'
            `);
            console.log('✅ تم إضافة created_by إلى message_templates');
        }
        
        // إضافة description
        if (!existingColumns.includes('description')) {
            await db.query(`
                ALTER TABLE message_templates
                ADD COLUMN description TEXT NULL COMMENT 'وصف القالب'
            `);
            console.log('✅ تم إضافة description إلى message_templates');
        }
        
        // تحديث template_type ليدعم أنواع جديدة
        try {
            await db.query(`
                ALTER TABLE message_templates
                MODIFY COLUMN template_type ENUM(
                    'connection',
                    'maintenance',
                    'postponed',
                    'followup',
                    'subscription_expiry',
                    'subscriber_expiry',
                    'ticket_notification',
                    'custom'
                ) NOT NULL
            `);
            console.log('✅ تم تحديث template_type في message_templates');
        } catch (error) {
            console.log('⚠️ تحذير: template_type قد يكون محدثاً بالفعل:', error.message);
        }
        
        // إضافة Foreign Keys
        try {
            // التحقق من وجود Foreign Key
            const fkCheck = await db.query(`
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'message_templates'
                AND COLUMN_NAME = 'company_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            
            if (fkCheck.length === 0) {
                await db.query(`
                    ALTER TABLE message_templates
                    ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
                `);
                console.log('✅ تم إضافة Foreign Key لـ company_id');
            }
        } catch (error) {
            console.log('⚠️ تحذير: Foreign Key لـ company_id قد يكون موجوداً:', error.message);
        }
        
        try {
            const fkCheck2 = await db.query(`
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'message_templates'
                AND COLUMN_NAME = 'created_by'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `);
            
            if (fkCheck2.length === 0) {
                await db.query(`
                    ALTER TABLE message_templates
                    ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                `);
                console.log('✅ تم إضافة Foreign Key لـ created_by');
            }
        } catch (error) {
            console.log('⚠️ تحذير: Foreign Key لـ created_by قد يكون موجوداً:', error.message);
        }
        
        // إضافة Indexes
        try {
            await db.query(`CREATE INDEX IF NOT EXISTS idx_company_id ON message_templates(company_id)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_template_category ON message_templates(template_category)`);
            console.log('✅ تم إضافة Indexes لـ message_templates');
        } catch (error) {
            console.log('⚠️ تحذير: Indexes قد تكون موجودة:', error.message);
        }
        
        // ==================== 2. إضافة صلاحيات جديدة لجدول users ====================
        console.log('🔄 إضافة صلاحيات جديدة لجدول users...');
        
        const userColumns = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
        `);
        
        const existingUserColumns = userColumns.map(col => col.COLUMN_NAME);
        
        // إضافة can_notify_subscribers
        if (!existingUserColumns.includes('can_notify_subscribers')) {
            await db.query(`
                ALTER TABLE users
                ADD COLUMN can_notify_subscribers TINYINT(1) DEFAULT 0 COMMENT 'صلاحية إرسال رسائل للمشتركين'
            `);
            console.log('✅ تم إضافة can_notify_subscribers إلى users');
        }
        
        // إضافة can_send_messages
        if (!existingUserColumns.includes('can_send_messages')) {
            await db.query(`
                ALTER TABLE users
                ADD COLUMN can_send_messages TINYINT(1) DEFAULT 0 COMMENT 'صلاحية عامة لإرسال الرسائل'
            `);
            console.log('✅ تم إضافة can_send_messages إلى users');
        }
        
        // إعطاء صلاحيات افتراضية للمدراء
        try {
            await db.query(`
                UPDATE users 
                SET can_notify_subscribers = 1, 
                    can_send_messages = 1 
                WHERE role = 'admin'
            `);
            console.log('✅ تم إعطاء صلاحيات افتراضية للمدراء');
        } catch (error) {
            console.log('⚠️ تحذير: لم يتم تحديث الصلاحيات الافتراضية:', error.message);
        }
        
        // ==================== 3. إنشاء جدول subscribers ====================
        console.log('🔄 إنشاء جدول subscribers...');
        
        const tables = await db.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'subscribers'
        `);
        
        if (tables.length === 0) {
            await db.query(`
                CREATE TABLE subscribers (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(100) UNIQUE NOT NULL COMMENT 'مثل: subscriber1@tec',
                    full_name VARCHAR(255) NOT NULL COMMENT 'الاسم الكامل',
                    phone VARCHAR(50),
                    subscription_type VARCHAR(100) COMMENT 'نوع الاشتراك',
                    subscription_start_date DATE,
                    subscription_end_date DATE,
                    amount DECIMAL(10,2) COMMENT 'مبلغ الاشتراك',
                    company_id INT NOT NULL COMMENT 'الشركة التابع لها',
                    is_active TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    INDEX idx_username (username),
                    INDEX idx_company_id (company_id),
                    INDEX idx_subscription_end_date (subscription_end_date),
                    INDEX idx_is_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ تم إنشاء جدول subscribers');
        } else {
            console.log('✅ جدول subscribers موجود بالفعل');
        }
        
        // ==================== 4. تحديث جدول tickets ====================
        console.log('🔄 تحديث جدول tickets...');
        
        const ticketColumns = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tickets'
        `);
        
        const existingTicketColumns = ticketColumns.map(col => col.COLUMN_NAME);
        
        // إضافة subscriber_id
        if (!existingTicketColumns.includes('subscriber_id')) {
            await db.query(`
                ALTER TABLE tickets
                ADD COLUMN subscriber_id INT NULL COMMENT 'مرجع لجدول subscribers'
            `);
            console.log('✅ تم إضافة subscriber_id إلى tickets');
            
            // إضافة Foreign Key
            try {
                await db.query(`
                    ALTER TABLE tickets
                    ADD FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE SET NULL
                `);
                await db.query(`CREATE INDEX IF NOT EXISTS idx_subscriber_id ON tickets(subscriber_id)`);
                console.log('✅ تم إضافة Foreign Key و Index لـ subscriber_id');
            } catch (error) {
                console.log('⚠️ تحذير: Foreign Key لـ subscriber_id قد يكون موجوداً:', error.message);
            }
        }
        
        // ==================== 5. تحديث role في users ====================
        console.log('🔄 تحديث role في users...');
        
        try {
            await db.query(`
                ALTER TABLE users
                MODIFY COLUMN role ENUM(
                    'admin',
                    'quality_staff',
                    'team_leader',
                    'technician',
                    'accountant',
                    'call_center',
                    'agent',
                    'subscriber',
                    'owner'
                ) NOT NULL
            `);
            console.log('✅ تم تحديث role في users');
        } catch (error) {
            console.log('⚠️ تحذير: role قد يكون محدثاً بالفعل:', error.message);
        }
        
        console.log('');
        console.log('==========================================');
        console.log('✅ تم إكمال Migration بنجاح!');
        console.log('==========================================');
        console.log('');
        console.log('📋 ملخص التعديلات:');
        console.log('  ✅ تحديث جدول message_templates');
        console.log('  ✅ إضافة صلاحيات جديدة لجدول users');
        console.log('  ✅ إنشاء جدول subscribers');
        console.log('  ✅ تحديث جدول tickets');
        console.log('  ✅ تحديث role في users');
        console.log('');
        
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    migrateWhatsAppTemplatesSystem()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = migrateWhatsAppTemplatesSystem;

