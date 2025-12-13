/**
 * سكريبت إنشاء حساب Owner (مالك الموقع)
 * Create Owner Account Script
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

const bcrypt = require('bcrypt');

async function createOwnerAccount() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بقاعدة البيانات...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بنجاح');
        
        // بيانات حساب Owner
        const username = 'owner';
        const password = 'owner123456'; // كلمة مرور قوية
        const fullName = 'مالك الموقع';
        
        // تشفير كلمة المرور
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // التحقق من وجود حساب owner مسبقاً
        const [existing] = await connection.query(
            'SELECT id, username FROM users WHERE role = ? OR username = ?',
            ['owner', username]
        );
        
        if (existing.length > 0) {
            console.log('⚠️  يوجد حساب owner مسبقاً!');
            console.log(`📋 اسم المستخدم: ${existing[0].username}`);
            console.log('🔄 جاري تحديث كلمة المرور...');
            
            // تحديث كلمة المرور
            await connection.query(
                'UPDATE users SET password_hash = ?, full_name = ? WHERE role = ? OR username = ?',
                [passwordHash, fullName, 'owner', username]
            );
            
            console.log('✅ تم تحديث كلمة المرور بنجاح!');
        } else {
            // إنشاء حساب owner جديد
            console.log('🔄 جاري إنشاء حساب owner جديد...');
            
            await connection.query(`
                INSERT INTO users (username, password_hash, full_name, role, is_active, company_id)
                VALUES (?, ?, ?, 'owner', 1, NULL)
            `, [username, passwordHash, fullName]);
            
            console.log('✅ تم إنشاء حساب owner بنجاح!');
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ معلومات حساب Owner:');
        console.log('='.repeat(50));
        console.log(`👤 اسم المستخدم: ${username}`);
        console.log(`🔑 كلمة المرور: ${password}`);
        console.log(`📛 الاسم الكامل: ${fullName}`);
        console.log(`🔐 الدور: owner (مالك الموقع)`);
        console.log('='.repeat(50));
        console.log('\n⚠️  تحذير: احفظ هذه المعلومات في مكان آمن!');
        console.log('⚠️  Warning: Save these credentials in a safe place!');
        
        await connection.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء حساب owner:', error);
        
        if (connection) {
            try {
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
    createOwnerAccount();
}

module.exports = { createOwnerAccount };

