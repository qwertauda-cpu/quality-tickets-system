/**
 * Migration: إضافة جدول ticket_points
 * نظام إدارة النقاط اليدوي للمدير
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function addTicketPointsTable() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // إنشاء جدول ticket_points
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ticket_points (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                ticket_type_id INT NOT NULL,
                
                -- النقاط الأساسية
                base_points DECIMAL(10, 2) DEFAULT 0 COMMENT 'النقاط الأساسية',
                time_points DECIMAL(10, 2) DEFAULT 0 COMMENT 'نقاط الوقت',
                quality_points DECIMAL(10, 2) DEFAULT 0 COMMENT 'نقاط الجودة (Checklist)',
                upsell_points DECIMAL(10, 2) DEFAULT 0 COMMENT 'نقاط البيع',
                bonus_points DECIMAL(10, 2) DEFAULT 0 COMMENT 'نقاط إضافية',
                
                -- النقاط المخصومة
                time_penalty DECIMAL(10, 2) DEFAULT 0 COMMENT 'خصم الوقت',
                quality_penalty DECIMAL(10, 2) DEFAULT 0 COMMENT 'خصم الجودة',
                behavior_penalty DECIMAL(10, 2) DEFAULT 0 COMMENT 'خصم السلوك',
                other_penalty DECIMAL(10, 2) DEFAULT 0 COMMENT 'خصومات أخرى',
                
                -- الإجماليات
                total_earned DECIMAL(10, 2) DEFAULT 0 COMMENT 'إجمالي النقاط المكتسبة',
                total_penalty DECIMAL(10, 2) DEFAULT 0 COMMENT 'إجمالي النقاط المخصومة',
                final_points DECIMAL(10, 2) DEFAULT 0 COMMENT 'النقاط النهائية',
                
                -- معلومات التوقيت
                time_received DATETIME NULL COMMENT 'تاريخ استلام التكت (T0)',
                time_first_contact DATETIME NULL COMMENT 'تاريخ أول رد (T1)',
                time_completed DATETIME NULL COMMENT 'تاريخ إكمال التكت (T2)',
                actual_completion_time DECIMAL(10, 2) NULL COMMENT 'الوقت الفعلي بالإنجاز (بالساعات)',
                
                -- معلومات المدير
                manager_id INT NOT NULL COMMENT 'معرف المدير الذي أدخل النقاط',
                manager_notes TEXT NULL COMMENT 'ملاحظات المدير',
                
                -- التوقيتات
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
                FOREIGN KEY (manager_id) REFERENCES users(id),
                
                UNIQUE KEY unique_ticket_points (ticket_id),
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_ticket_type_id (ticket_type_id),
                INDEX idx_manager_id (manager_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء/التحقق من جدول: ticket_points');
        
        console.log('✅ تم إكمال Migration بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration
if (require.main === module) {
    addTicketPointsTable()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addTicketPointsTable;

