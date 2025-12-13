/**
 * Migration: إضافة أنواع تقييم أداء الفريق الجديدة إلى ENUM
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function addPerformanceRatingTypes() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // تحديث ENUM لإضافة القيمتين الجديدتين
        await connection.query(`
            ALTER TABLE scoring_rules 
            MODIFY COLUMN rule_type ENUM(
                'ticket_type_base_points', 
                'speed_points_excellent',
                'speed_points_acceptable',
                'speed_points_late',
                'speed_sla_multiplier',
                'checklist_item_points',
                'performance_rating_excellent',
                'performance_rating_good',
                'performance_rating_average',
                'performance_rating_poor',
                'performance_rating_very_poor',
                'upsell_router',
                'upsell_onu',
                'upsell_ups',
                'time_penalty_per_minute',
                'tasks_penalty_per_item'
            ) NOT NULL
        `);
        console.log('✅ تم تحديث ENUM بنجاح');
        
        // إضافة القواعد الجديدة
        const newRules = [
            { type: 'performance_rating_poor', key: '2', value: -2, desc: 'تقييم ضعيف (2) - خصم نقطتين' },
            { type: 'performance_rating_very_poor', key: '1', value: -3, desc: 'تقييم ضعيف جداً (1) - خصم 3 نقاط' }
        ];
        
        for (const rule of newRules) {
            await connection.query(`
                INSERT INTO scoring_rules (rule_type, rule_key, rule_value, description)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    rule_value = VALUES(rule_value),
                    description = VALUES(description),
                    updated_at = NOW()
            `, [rule.type, rule.key, rule.value, rule.desc]);
        }
        console.log('✅ تم إضافة قواعد التقييم الجديدة');
        
        // تحديث القواعد الموجودة
        await connection.query(`
            UPDATE scoring_rules 
            SET rule_value = 0, description = 'تقييم ممتاز (5) - لا خصم'
            WHERE rule_type = 'performance_rating_excellent' AND rule_key = '5'
        `);
        
        await connection.query(`
            UPDATE scoring_rules 
            SET rule_value = 0, description = 'تقييم جيد (4) - لا خصم'
            WHERE rule_type = 'performance_rating_good' AND rule_key = '4'
        `);
        
        await connection.query(`
            UPDATE scoring_rules 
            SET rule_value = -1, description = 'تقييم عادي (3) - خصم نقطة واحدة'
            WHERE rule_type = 'performance_rating_average' AND rule_key = '3'
        `);
        
        console.log('✅ تم تحديث القواعد الموجودة');
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
    addPerformanceRatingTypes()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addPerformanceRatingTypes;

