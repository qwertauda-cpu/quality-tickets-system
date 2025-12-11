/**
 * Migration Script: إضافة حقول Upsell و behavior_rating إلى جدول quality_reviews
 * يجب تشغيل هذا السكريبت مرة واحدة لإضافة الحقول الجديدة للجداول الموجودة
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
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // إضافة الحقول الجديدة
        console.log('🔄 جاري إضافة الحقول الجديدة...');
        
        // إضافة حقل upsell_router
        try {
            await connection.query(`
                ALTER TABLE quality_reviews 
                ADD COLUMN upsell_router TINYINT(1) DEFAULT 0 COMMENT 'بيع راوتر' 
                AFTER followup_reason
            `);
            console.log('✅ تم إضافة حقل: upsell_router');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELD_NAME') {
                console.log('⚠️  حقل upsell_router موجود بالفعل');
            } else {
                throw error;
            }
        }
        
        // إضافة حقل upsell_onu
        try {
            await connection.query(`
                ALTER TABLE quality_reviews 
                ADD COLUMN upsell_onu TINYINT(1) DEFAULT 0 COMMENT 'بيع ONU' 
                AFTER upsell_router
            `);
            console.log('✅ تم إضافة حقل: upsell_onu');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELD_NAME') {
                console.log('⚠️  حقل upsell_onu موجود بالفعل');
            } else {
                throw error;
            }
        }
        
        // إضافة حقل upsell_ups
        try {
            await connection.query(`
                ALTER TABLE quality_reviews 
                ADD COLUMN upsell_ups TINYINT(1) DEFAULT 0 COMMENT 'بيع UPS' 
                AFTER upsell_onu
            `);
            console.log('✅ تم إضافة حقل: upsell_ups');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELD_NAME') {
                console.log('⚠️  حقل upsell_ups موجود بالفعل');
            } else {
                throw error;
            }
        }
        
        // إضافة حقل behavior_rating
        try {
            await connection.query(`
                ALTER TABLE quality_reviews 
                ADD COLUMN behavior_rating ENUM('excellent', 'good', 'normal', 'bad') NULL COMMENT 'تقييم السلوك' 
                AFTER team_rating
            `);
            console.log('✅ تم إضافة حقل: behavior_rating');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELD_NAME') {
                console.log('⚠️  حقل behavior_rating موجود بالفعل');
            } else {
                throw error;
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

