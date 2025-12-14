/**
 * سكريبت إفراغ قاعدة البيانات بالكامل
 * Clear Database Script - Removes all data from all tables
 * 
 * ⚠️ تحذير: هذا السكريبت سيحذف جميع البيانات من قاعدة البيانات!
 * Warning: This script will delete ALL data from the database!
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

// قائمة جميع الجداول في النظام (مرتبة حسب الاعتماديات)
const tables = [
    // جداول تعتمد على جداول أخرى (يجب حذفها أولاً)
    'ticket_photos',
    'quality_reviews',
    'positive_scores',
    'negative_scores',
    'followup_reports',
    'daily_summaries',
    'monthly_summaries',
    'notifications',
    'rewards',
    'team_members',
    'tickets',
    'invoices',
    'purchase_requests',
    
    // جداول مستقلة نسبياً
    'scoring_rules',
    'message_templates',
    'ticket_types',
    'teams',
    'companies',
    'users'
];

async function clearDatabase() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بقاعدة البيانات...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بنجاح');
        
        // تعطيل فحص Foreign Keys مؤقتاً
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('✅ تم تعطيل فحص Foreign Keys');
        
        console.log('\n🗑️  بدء إفراغ الجداول...\n');
        
        let totalDeleted = 0;
        
        for (const table of tables) {
            try {
                // التحقق من وجود الجدول
                const [tables] = await connection.query(
                    `SELECT COUNT(*) as count FROM information_schema.tables 
                     WHERE table_schema = ? AND table_name = ?`,
                    [config.database, table]
                );
                
                if (tables[0].count === 0) {
                    console.log(`⏭️  الجدول ${table} غير موجود - تم التخطي`);
                    continue;
                }
                
                // حساب عدد الصفوف قبل الحذف
                const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
                const rowCount = countResult[0].count;
                
                if (rowCount === 0) {
                    console.log(`✅ ${table}: فارغ بالفعل (0 صف)`);
                    continue;
                }
                
                // حذف جميع البيانات
                await connection.query(`TRUNCATE TABLE \`${table}\``);
                totalDeleted += rowCount;
                console.log(`✅ ${table}: تم حذف ${rowCount} صف`);
                
            } catch (error) {
                console.error(`❌ خطأ في حذف ${table}:`, error.message);
            }
        }
        
        // إعادة تفعيل فحص Foreign Keys
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('\n✅ تم إعادة تفعيل فحص Foreign Keys');
        
        console.log('\n' + '='.repeat(50));
        console.log(`✅ تم إفراغ قاعدة البيانات بنجاح!`);
        console.log(`📊 إجمالي الصفوف المحذوفة: ${totalDeleted}`);
        console.log('='.repeat(50));
        
        await connection.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ خطأ في إفراغ قاعدة البيانات:', error);
        
        if (connection) {
            try {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
                await connection.end();
            } catch (e) {
                console.error('خطأ في إغلاق الاتصال:', e);
            }
        }
        
        process.exit(1);
    }
}

// تشغيل السكريبت
if (require.main === module) {
    console.log('⚠️  تحذير: هذا السكريبت سيحذف جميع البيانات من قاعدة البيانات!');
    console.log('⚠️  Warning: This script will delete ALL data from the database!');
    console.log('\nجاري التنفيذ في 3 ثوانٍ...\n');
    
    setTimeout(() => {
        clearDatabase();
    }, 3000);
}

module.exports = { clearDatabase };


