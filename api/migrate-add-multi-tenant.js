/**
 * Migration: Add Multi-Tenant System
 * إضافة نظام متعدد المستأجرين
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function migrateMultiTenant() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ تم الاتصال بنجاح');
        
        await connection.query(`USE \`${config.database}\``);
        
        // ==================== 1. إضافة role 'owner' ====================
        console.log('🔄 تحديث جدول users لإضافة role owner...');
        try {
            await connection.query(`
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('owner', 'admin', 'quality_staff', 'team_leader', 'technician', 'accountant', 'call_center', 'agent') NOT NULL
            `);
            console.log('✅ تم تحديث role');
        } catch (error) {
            if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
                console.log('⚠️  role owner موجود مسبقاً');
            } else {
                throw error;
            }
        }
        
        // ==================== 2. جدول الشركات ====================
        console.log('🔄 إنشاء جدول companies...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                domain VARCHAR(50) UNIQUE NOT NULL COMMENT 'المجال الفريد مثل: tec',
                contact_name VARCHAR(255) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50),
                address TEXT,
                max_employees INT DEFAULT 0 COMMENT 'الحد الأقصى للموظفين',
                current_employees INT DEFAULT 0 COMMENT 'عدد الموظفين الحالي',
                price_per_employee DECIMAL(10,2) NOT NULL COMMENT 'السعر لكل موظف',
                subscription_start_date DATE,
                subscription_end_date DATE,
                is_active TINYINT(1) DEFAULT 1,
                owner_user_id INT NOT NULL COMMENT 'المدير: admin@domain',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_domain (domain),
                INDEX idx_owner (owner_user_id),
                INDEX idx_is_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول companies');
        
        // ==================== 3. إضافة company_id لجدول users ====================
        console.log('🔄 إضافة company_id لجدول users...');
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN company_id INT NULL COMMENT 'الشركة التابعة لها'
            `);
            console.log('✅ تم إضافة company_id');
        } catch (error) {
            if (error.message.includes('Duplicate column')) {
                console.log('⚠️  company_id موجود مسبقاً');
            } else {
                throw error;
            }
        }
        
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
            `);
            console.log('✅ تم إضافة Foreign Key');
        } catch (error) {
            if (error.message.includes('Duplicate foreign key')) {
                console.log('⚠️  Foreign Key موجود مسبقاً');
            } else {
                throw error;
            }
        }
        
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD INDEX idx_company_id (company_id)
            `);
            console.log('✅ تم إضافة Index');
        } catch (error) {
            if (error.message.includes('Duplicate key')) {
                console.log('⚠️  Index موجود مسبقاً');
            } else {
                throw error;
            }
        }
        
        // ==================== 4. جدول الفواتير ====================
        console.log('🔄 إنشاء جدول invoices...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INT PRIMARY KEY AUTO_INCREMENT,
                company_id INT NOT NULL,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                employee_count INT NOT NULL,
                price_per_employee DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                tax DECIMAL(10,2) DEFAULT 0,
                total DECIMAL(10,2) NOT NULL,
                status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
                due_date DATE,
                paid_date DATE NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                INDEX idx_company (company_id),
                INDEX idx_status (status),
                INDEX idx_due_date (due_date),
                INDEX idx_invoice_number (invoice_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول invoices');
        
        // ==================== 5. جدول طلبات الشراء ====================
        console.log('🔄 إنشاء جدول purchase_requests...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS purchase_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                company_name VARCHAR(255) NOT NULL,
                contact_name VARCHAR(255) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50) NOT NULL,
                company_address TEXT,
                expected_employees INT NOT NULL COMMENT 'عدد الموظفين المتوقع',
                message TEXT,
                status ENUM('pending', 'contacted', 'approved', 'rejected', 'converted') DEFAULT 'pending',
                admin_notes TEXT,
                converted_to_company_id INT NULL COMMENT 'إذا تم تحويله لشركة',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                INDEX idx_converted (converted_to_company_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول purchase_requests');
        
        // ==================== 6. إنشاء حساب owner افتراضي ====================
        console.log('🔄 إنشاء حساب owner افتراضي...');
        const bcrypt = require('bcrypt');
        const ownerPassword = await bcrypt.hash('owner123', 10);
        
        await connection.query(`
            INSERT IGNORE INTO users (username, password_hash, full_name, role, company_id)
            VALUES (?, ?, ?, 'owner', NULL)
        `, ['owner', ownerPassword, 'مالك الموقع']);
        console.log('✅ تم إنشاء حساب owner (owner/owner123)');
        
        await connection.end();
        console.log('');
        console.log('==========================================');
        console.log('✅ تم إضافة نظام Multi-Tenant بنجاح!');
        console.log('==========================================');
        console.log('');
        console.log('📝 حساب Owner الافتراضي:');
        console.log('   Username: owner');
        console.log('   Password: owner123');
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
migrateMultiTenant();

