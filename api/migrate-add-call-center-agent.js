/**
 * Migration: Add call_center and agent roles, ticket assignments
 * إضافة أدوار كول سنتر ومندوب، ونظام توزيع التكتات
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function migrate() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        
        connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });
        
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // ==================== تحديث جدول users ====================
        try {
            await connection.query(`
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('admin', 'quality_staff', 'team_leader', 'technician', 'accountant', 'call_center', 'agent') NOT NULL
            `);
            console.log('✅ تم تحديث جدول users لإضافة أدوار call_center و agent');
        } catch (error) {
            if (!error.message.includes('Duplicate') && !error.message.includes('already exists')) {
                console.log('⚠️  خطأ في تحديث جدول users:', error.message);
            }
        }
        
        // ==================== جدول توزيع التكتات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ticket_assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                assigned_by INT NOT NULL COMMENT 'من قام بالتوزيع (كول سنتر أو مدير)',
                assigned_to INT NULL COMMENT 'المندوب المستهدف (NULL = عام للجميع)',
                assigned_to_team INT NULL COMMENT 'الفريق المستهدف (NULL = عام)',
                assignment_type ENUM('general', 'agent', 'team') NOT NULL DEFAULT 'general',
                status ENUM('pending', 'accepted', 'waiting', 'postponed', 'rejected') DEFAULT 'pending',
                accepted_at TIMESTAMP NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (assigned_to_team) REFERENCES teams(id) ON DELETE SET NULL,
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_assigned_to (assigned_to),
                INDEX idx_assigned_to_team (assigned_to_team),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء/التحقق من جدول: ticket_assignments');
        
        // ==================== تحديث جدول التكتات ====================
        const alterQueries = [
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS call_center_id INT NULL COMMENT 'موظف الكول سنتر الذي أنشأ التكت'`,
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS agent_id INT NULL COMMENT 'المندوب المسؤول'`,
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignment_status ENUM('pending', 'accepted', 'waiting', 'postponed') DEFAULT 'pending'`,
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS time_accepted TIMESTAMP NULL COMMENT 'وقت قبول التكت من المندوب'`,
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS time_first_contact_by_agent TIMESTAMP NULL COMMENT 'T1 - وقت أول اتصال من المندوب'`,
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS time_activation_by_agent TIMESTAMP NULL COMMENT 'T3 - وقت رسالة التفعيل من المندوب'`,
            `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_public TINYINT(1) DEFAULT 0 COMMENT 'تذكرة عامة (للجميع)'`
        ];
        
        for (const query of alterQueries) {
            try {
                await connection.query(query.replace('IF NOT EXISTS', ''));
            } catch (error) {
                if (!error.message.includes('Duplicate column')) {
                    console.log('⚠️  خطأ في إضافة عمود:', error.message);
                }
            }
        }
        
        // إضافة Foreign Keys
        try {
            await connection.query(`
                ALTER TABLE tickets 
                ADD FOREIGN KEY IF NOT EXISTS (call_center_id) REFERENCES users(id) ON DELETE SET NULL
            `);
        } catch (error) {
            // قد يكون موجود مسبقاً
        }
        
        try {
            await connection.query(`
                ALTER TABLE tickets 
                ADD FOREIGN KEY IF NOT EXISTS (agent_id) REFERENCES users(id) ON DELETE SET NULL
            `);
        } catch (error) {
            // قد يكون موجود مسبقاً
        }
        
        console.log('✅ تم تحديث جدول tickets');
        
        await connection.end();
        console.log('');
        console.log('==========================================');
        console.log('✅ تم إكمال Migration بنجاح!');
        console.log('==========================================');
        console.log('');
        
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
}

// Run migration
migrate();

