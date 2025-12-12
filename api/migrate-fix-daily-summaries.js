/**
 * Migration: Fix daily_summaries table - add updated_at if missing
 * إصلاح جدول daily_summaries - إضافة updated_at إذا كان مفقوداً
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
        
        // التحقق من وجود العمود updated_at
        const columns = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'daily_summaries' 
            AND COLUMN_NAME = 'updated_at'
        `, [config.database]);
        
        if (columns[0].length === 0) {
            console.log('⚠️  عمود updated_at غير موجود، جاري إضافته...');
            await connection.query(`
                ALTER TABLE daily_summaries 
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ تم إضافة عمود updated_at');
        } else {
            console.log('✅ عمود updated_at موجود بالفعل');
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

