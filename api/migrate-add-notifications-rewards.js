/**
 * Migration: Add notifications and rewards tables
 * إضافة جداول الإشعارات والمكافآت
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
        
        // ==================== جدول الإشعارات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NULL COMMENT 'المستخدم المستهدف (NULL = جميع المديرين)',
                type ENUM('ticket_delayed', 'ticket_completed', 'achievement', 'system') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_ticket_id INT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (related_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_type (type),
                INDEX idx_is_read (is_read),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء/التحقق من جدول: notifications');
        
        // ==================== جدول المكافآت ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rewards (
                id INT PRIMARY KEY AUTO_INCREMENT,
                team_id INT NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                connection_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الربط',
                maintenance_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الصيانة',
                quality_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الجودة',
                ranking_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الترتيب',
                total_points INT DEFAULT 0,
                total_reward DECIMAL(10,2) DEFAULT 0,
                status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                UNIQUE KEY unique_team_month (team_id, year, month),
                INDEX idx_year_month (year, month),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء/التحقق من جدول: rewards');
        
        // ==================== تحديث جدول users لإضافة دور accountant ====================
        try {
            await connection.query(`
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('admin', 'quality_staff', 'team_leader', 'technician', 'accountant') NOT NULL
            `);
            console.log('✅ تم تحديث جدول users لإضافة دور accountant');
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY' && !error.message.includes('Duplicate')) {
                console.log('⚠️  دور accountant موجود مسبقاً أو خطأ في التحديث:', error.message);
            }
        }
        
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

