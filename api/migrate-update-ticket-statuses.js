/**
 * Migration: Update ticket statuses to new workflow
 * تحديث حالات التكت لنظام العمل الجديد
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function updateTicketStatuses() {
    let connection;
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');

        // أولاً: تغيير العمود إلى VARCHAR مؤقتاً لتحديث البيانات
        await connection.query(`
            ALTER TABLE tickets 
            MODIFY COLUMN status VARCHAR(50) DEFAULT 'NEW'
        `);
        console.log('✅ تم تغيير status إلى VARCHAR مؤقتاً');

        // ثم تحديث التكتات الموجودة:
        await connection.query(`
            UPDATE tickets 
            SET status = CASE
                WHEN status = 'pending' THEN 'NEW'
                WHEN status = 'assigned_to_technician' THEN 'ASSIGNED'
                WHEN status = 'in_progress' THEN 'IN_PROGRESS'
                WHEN status IN ('technician_completed', 'ready_for_quality_review') THEN 'COMPLETED'
                WHEN status = 'postponed' THEN 'FOLLOW_UP'
                WHEN status = 'closed' THEN 'CLOSED'
                WHEN status = 'completed' THEN 'CLOSED'
                ELSE 'NEW'
            END
        `);
        console.log('✅ تم تحديث حالات التكتات الموجودة');

        // أخيراً: تحديث ENUM ليشمل فقط الحالات الجديدة
        await connection.query(`
            ALTER TABLE tickets 
            MODIFY COLUMN status ENUM(
                'NEW',
                'ASSIGNED',
                'IN_PROGRESS',
                'COMPLETED',
                'UNDER_REVIEW',
                'FOLLOW_UP',
                'CLOSED'
            ) DEFAULT 'NEW'
        `);
        console.log('✅ تم تحديث status ENUM للحالات الجديدة فقط');

        console.log('✅ تم إكمال Migration بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

updateTicketStatuses();

