/**
 * Migration: إضافة نقاط أساسية لكل نوع تكت في جدول ticket_types
 * ثم نسخها إلى scoring_rules
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function syncTicketTypeBasePoints() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // جلب جميع أنواع التكتات
        const ticketTypes = await connection.query(`
            SELECT id, name_ar, base_points
            FROM ticket_types
            WHERE is_active = 1
        `);
        
        console.log(`✅ تم جلب ${ticketTypes.length} نوع تكت`);
        
        // نسخ نقاط كل نوع إلى scoring_rules
        for (const tt of ticketTypes) {
            if (tt && tt.id) {
                await connection.query(`
                    INSERT INTO scoring_rules (rule_type, rule_key, rule_value, description)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        rule_value = VALUES(rule_value),
                        description = VALUES(description),
                        updated_at = NOW()
                `, [
                    'ticket_type_base_points',
                    tt.id.toString(),
                    tt.base_points || 0,
                    `النقاط الأساسية لـ ${tt.name_ar || 'نوع غير معروف'}`
                ]);
            }
        }
        
        console.log('✅ تم نسخ نقاط أنواع التكتات إلى scoring_rules');
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
    syncTicketTypeBasePoints()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = syncTicketTypeBasePoints;

