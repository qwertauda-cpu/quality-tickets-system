/**
 * Migration: إضافة تفاصيل إضافية لنظام النقاط
 * - تقييم أداء الفريق (1-5)
 * - نقاط Checklist items (JSON)
 * - خصم التاسكات
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function addPointsDetails() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // إضافة عمود تقييم أداء الفريق
        try {
            await connection.query(`
                ALTER TABLE ticket_points 
                ADD COLUMN team_performance_rating TINYINT NULL 
                COMMENT 'تقييم أداء الفريق (1-5)' 
                AFTER manager_notes
            `);
            console.log('✅ تم إضافة عمود: team_performance_rating');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  عمود team_performance_rating موجود بالفعل');
            } else {
                throw error;
            }
        }
        
        // إضافة عمود نقاط Checklist items (JSON)
        try {
            await connection.query(`
                ALTER TABLE ticket_points 
                ADD COLUMN checklist_points_json TEXT NULL 
                COMMENT 'نقاط كل checklist item (JSON)' 
                AFTER quality_points
            `);
            console.log('✅ تم إضافة عمود: checklist_points_json');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  عمود checklist_points_json موجود بالفعل');
            } else {
                throw error;
            }
        }
        
        // إضافة عمود خصم التاسكات
        try {
            await connection.query(`
                ALTER TABLE ticket_points 
                ADD COLUMN tasks_penalty DECIMAL(10, 2) DEFAULT 0 
                COMMENT 'خصم التاسكات غير المكتملة' 
                AFTER quality_penalty
            `);
            console.log('✅ تم إضافة عمود: tasks_penalty');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  عمود tasks_penalty موجود بالفعل');
            } else {
                throw error;
            }
        }
        
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
    addPointsDetails()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addPointsDetails;

