/**
 * Migration: Add technician assignment fields to tickets table
 * إضافة حقول تخصيص الفني لجدول التكتات
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function addTechnicianAssignmentFields() {
    let connection;
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');

        // تحديث ENUM status لإضافة الحالات الجديدة
        await connection.query(`
            ALTER TABLE tickets 
            MODIFY COLUMN status ENUM(
                'pending', 
                'in_progress', 
                'assigned_to_technician',
                'technician_completed',
                'ready_for_quality_review',
                'completed', 
                'postponed', 
                'transferred', 
                'closed'
            ) DEFAULT 'pending'
        `);
        console.log('✅ تم تحديث status ENUM');

        // إضافة assigned_technician_id
        try {
            await connection.query(`
                ALTER TABLE tickets 
                ADD COLUMN assigned_technician_id INT NULL COMMENT 'الفني المكلف بالعمل على التكت'
                AFTER quality_staff_id
            `);
            console.log('✅ تم إضافة assigned_technician_id');
        } catch (error) {
            if (error.message.includes('Duplicate column')) {
                console.log('⚠️  assigned_technician_id موجود بالفعل');
            } else {
                throw error;
            }
        }

        // إضافة Foreign Key لـ assigned_technician_id
        try {
            await connection.query(`
                ALTER TABLE tickets 
                ADD CONSTRAINT fk_assigned_technician 
                FOREIGN KEY (assigned_technician_id) 
                REFERENCES users(id) 
                ON DELETE SET NULL
            `);
            console.log('✅ تم إضافة Foreign Key لـ assigned_technician_id');
        } catch (error) {
            if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
                console.log('⚠️  Foreign Key موجود بالفعل');
            } else {
                throw error;
            }
        }

        // إضافة technician_completed_at
        try {
            await connection.query(`
                ALTER TABLE tickets 
                ADD COLUMN technician_completed_at TIMESTAMP NULL COMMENT 'وقت إنهاء التكت من الفني'
                AFTER time_completed
            `);
            console.log('✅ تم إضافة technician_completed_at');
        } catch (error) {
            if (error.message.includes('Duplicate column')) {
                console.log('⚠️  technician_completed_at موجود بالفعل');
            } else {
                throw error;
            }
        }

        // إضافة index لـ assigned_technician_id
        try {
            await connection.query(`
                CREATE INDEX idx_assigned_technician ON tickets(assigned_technician_id)
            `);
            console.log('✅ تم إضافة index لـ assigned_technician_id');
        } catch (error) {
            if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
                console.log('⚠️  Index موجود بالفعل');
            } else {
                throw error;
            }
        }

        console.log('✅ تم إكمال Migration بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في Migration:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

addTechnicianAssignmentFields();





