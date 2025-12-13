/**
 * Migration: إنشاء جدول scoring_rules
 * قواعد النقاط العامة التي تطبق تلقائياً على جميع التكتات
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function createScoringRulesTable() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // إنشاء جدول scoring_rules
        await connection.query(`
            CREATE TABLE IF NOT EXISTS scoring_rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rule_type ENUM(
                    'ticket_type_base_points', 
                    'speed_points_excellent',
                    'speed_points_acceptable',
                    'speed_points_late',
                    'speed_sla_multiplier',
                    'checklist_item_points',
                    'performance_rating_excellent',
                    'performance_rating_good',
                    'performance_rating_average',
                    'upsell_router',
                    'upsell_onu',
                    'upsell_ups',
                    'time_penalty_per_minute',
                    'tasks_penalty_per_item'
                ) NOT NULL,
                rule_key VARCHAR(255) NULL COMMENT 'مفتاح القاعدة (مثل: ticket_type_id, rating_level)',
                rule_value DECIMAL(10, 2) NOT NULL COMMENT 'قيمة القاعدة',
                description TEXT NULL COMMENT 'وصف القاعدة',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_rule (rule_type, rule_key),
                INDEX idx_rule_type (rule_type),
                INDEX idx_rule_key (rule_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء/التحقق من جدول: scoring_rules');
        
        // إدراج القواعد الافتراضية
        const defaultRules = [
            // نقاط الوقت (Speed Points)
            { type: 'speed_points_excellent', key: null, value: 10, desc: 'نقاط الوقت للمثالي (ضمن SLA)' },
            { type: 'speed_points_acceptable', key: null, value: 5, desc: 'نقاط الوقت للمقبول (تجاوز بسيط)' },
            { type: 'speed_points_late', key: null, value: 0, desc: 'نقاط الوقت للمتأخر' },
            { type: 'speed_sla_multiplier', key: null, value: 1.5, desc: 'معامل تجاوز SLA (للتجاوز البسيط)' },
            
            // نقاط Checklist (الصور)
            { type: 'checklist_item_points', key: null, value: 1, desc: 'نقاط كل صورة/تاسك مكتمل' },
            
            // خصم تقييم أداء الفريق (قيم سالبة)
            { type: 'performance_rating_excellent', key: '5', value: 0, desc: 'تقييم ممتاز (5) - لا خصم' },
            { type: 'performance_rating_good', key: '4', value: 0, desc: 'تقييم جيد (4) - لا خصم' },
            { type: 'performance_rating_average', key: '3', value: -1, desc: 'تقييم عادي (3) - خصم نقطة واحدة' },
            { type: 'performance_rating_poor', key: '2', value: -2, desc: 'تقييم ضعيف (2) - خصم نقطتين' },
            { type: 'performance_rating_very_poor', key: '1', value: -3, desc: 'تقييم ضعيف جداً (1) - خصم 3 نقاط' },
            
            // نقاط البيع
            { type: 'upsell_router', key: null, value: 10, desc: 'نقاط بيع Router' },
            { type: 'upsell_onu', key: null, value: 10, desc: 'نقاط بيع ONU' },
            { type: 'upsell_ups', key: null, value: 10, desc: 'نقاط بيع UPS' }
        ];
        
        for (const rule of defaultRules) {
            await connection.query(`
                INSERT INTO scoring_rules (rule_type, rule_key, rule_value, description)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    rule_value = VALUES(rule_value),
                    description = VALUES(description),
                    updated_at = NOW()
            `, [rule.type, rule.key, rule.value, rule.desc]);
        }
        console.log('✅ تم إدراج القواعد الافتراضية');
        
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
    createScoringRulesTable()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = createScoringRulesTable;

