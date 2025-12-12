/**
 * نظام إدارة التكتات والجودة - تهيئة قاعدة البيانات
 * Quality & Tickets Management System - Database Initialization
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function initDatabase() {
    let connection;
    
    try {
        console.log('🔄 جاري الاتصال بـ MySQL...');
        
        // Connect without database first to create it
        connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password
        });
        
        console.log('✅ تم الاتصال بـ MySQL بنجاح');
        
        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ تم إنشاء قاعدة البيانات: ${config.database}`);
        
        // Use the database
        await connection.query(`USE \`${config.database}\``);
        
        // ==================== 1. جدول المستخدمين ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role ENUM('admin', 'quality_staff', 'team_leader', 'technician', 'accountant', 'call_center', 'agent') NOT NULL,
                team_id INT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role),
                INDEX idx_team_id (team_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: users');
        
        // ==================== 2. جدول الفرق ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS teams (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                shift ENUM('morning', 'evening') NOT NULL,
                max_connection_limit INT DEFAULT 7 COMMENT 'حد الربط اليومي',
                max_maintenance_limit INT DEFAULT 15 COMMENT 'حد الصيانة اليومي',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_shift (shift)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: teams');
        
        // ==================== 3. جدول أعضاء الفرق ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS team_members (
                id INT PRIMARY KEY AUTO_INCREMENT,
                team_id INT NOT NULL,
                user_id INT NOT NULL,
                is_leader TINYINT(1) DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_team_member (team_id, user_id),
                INDEX idx_team_id (team_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: team_members');
        
        // ==================== 4. جدول أنواع التكتات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ticket_types (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name_ar VARCHAR(255) NOT NULL,
                name_en VARCHAR(255) NOT NULL,
                sla_min INT NOT NULL COMMENT 'الحد الأدنى للـ SLA بالدقائق',
                sla_max INT NOT NULL COMMENT 'الحد الأقصى للـ SLA بالدقائق',
                base_points INT DEFAULT 0 COMMENT 'النقاط الأساسية',
                category ENUM('connection', 'activation', 'maintenance', 'visit', 'other') NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: ticket_types');
        
        // ==================== 5. جدول التكتات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'رقم التكت',
                ticket_type_id INT NOT NULL,
                team_id INT NOT NULL,
                quality_staff_id INT NOT NULL COMMENT 'موظف الجودة الذي أدخل التكت',
                
                -- الأوقات (يدخلها موظف الجودة يدوياً)
                time_received TIMESTAMP NULL COMMENT 'T0 - وقت استلام التكت',
                time_first_contact TIMESTAMP NULL COMMENT 'T1 - وقت أول اتصال',
                time_completed TIMESTAMP NULL COMMENT 'T3 - وقت رسالة التفعيل',
                
                -- الحسابات التلقائية
                actual_time_minutes INT NULL COMMENT 'الوقت الفعلي بالدقائق (T3 - T0)',
                adjusted_time_minutes INT NULL COMMENT 'الوقت المعدل (بعد Load Factor)',
                load_factor DECIMAL(5,2) DEFAULT 1.00 COMMENT 'معامل التحميل',
                
                -- حالة التكت
                status ENUM('pending', 'in_progress', 'completed', 'postponed', 'transferred', 'closed') DEFAULT 'pending',
                postponement_reason TEXT NULL COMMENT 'سبب التأجيل',
                postponement_days INT DEFAULT 0 COMMENT 'عدد أيام التأجيل',
                
                -- معلومات إضافية
                subscriber_name VARCHAR(255) NULL,
                subscriber_phone VARCHAR(50) NULL,
                subscriber_address TEXT NULL,
                notes TEXT NULL,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
                FOREIGN KEY (quality_staff_id) REFERENCES users(id) ON DELETE RESTRICT,
                
                INDEX idx_ticket_number (ticket_number),
                INDEX idx_ticket_type (ticket_type_id),
                INDEX idx_team (team_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                INDEX idx_time_received (time_received),
                INDEX idx_quality_staff (quality_staff_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: tickets');
        
        // ==================== 6. جدول صور التكتات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ticket_photos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                photo_type ENUM(
                    'pole_before', 'pole_after', 'pppoe', 'equipment_location',
                    'subscriber_power', 'dhcp_status', 'speed_test', 'google_bank',
                    'activation_message', 'rx_power'
                ) NOT NULL,
                photo_path VARCHAR(500) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_photo_type (photo_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: ticket_photos');
        
        // ==================== 7. جدول تقييمات الجودة ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quality_reviews (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                quality_staff_id INT NOT NULL,
                
                -- معلومات الاتصال
                contact_status ENUM('answered', 'no_answer', 'closed') NOT NULL,
                service_status ENUM('excellent', 'good', 'poor') NOT NULL,
                team_rating INT NOT NULL COMMENT 'تقييم الفريق من 1-5',
                
                -- الخدمات المشروحة
                explained_sinmana TINYINT(1) DEFAULT 0,
                explained_platform TINYINT(1) DEFAULT 0,
                explained_mytv_plus TINYINT(1) DEFAULT 0,
                explained_shahid_plus TINYINT(1) DEFAULT 0,
                
                -- معلومات إضافية
                whatsapp_group_interest TINYINT(1) DEFAULT 0,
                subscription_amount DECIMAL(10,2) NULL,
                needs_followup TINYINT(1) DEFAULT 0,
                followup_reason TEXT NULL,
                
                -- نقاط البيع (Upsell)
                upsell_router TINYINT(1) DEFAULT 0 COMMENT 'بيع راوتر',
                upsell_onu TINYINT(1) DEFAULT 0 COMMENT 'بيع ONU',
                upsell_ups TINYINT(1) DEFAULT 0 COMMENT 'بيع UPS',
                
                -- تقييم السلوك (للنظام الجديد)
                behavior_rating ENUM('excellent', 'good', 'normal', 'bad') NULL COMMENT 'تقييم السلوك',
                
                review_notes TEXT NULL,
                reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (quality_staff_id) REFERENCES users(id) ON DELETE RESTRICT,
                
                UNIQUE KEY unique_ticket_review (ticket_id),
                INDEX idx_quality_staff (quality_staff_id),
                INDEX idx_needs_followup (needs_followup),
                INDEX idx_reviewed_at (reviewed_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: quality_reviews');
        
        // ==================== 8. جدول النقاط الموجبة ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS positive_scores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                score_type ENUM(
                    'ticket_type', 'speed', 'quality', 'behavior', 'upsell',
                    'daily_bonus', 'monthly_bonus'
                ) NOT NULL,
                points INT NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_score_type (score_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: positive_scores');
        
        // ==================== 9. جدول النقاط السالبة ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS negative_scores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                penalty_type ENUM(
                    'missing_photo', 'closed_incomplete', 'bad_behavior',
                    'postponed', 'no_response', 'late_response'
                ) NOT NULL,
                points INT NOT NULL COMMENT 'القيمة سالبة (مثل -2, -10)',
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_penalty_type (penalty_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: negative_scores');
        
        // ==================== 10. جدول تقارير المتابعة ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS followup_reports (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                quality_staff_id INT NOT NULL,
                followup_type ENUM(
                    'amount_mismatch', 'technical_issue', 'violation',
                    'complaint', 'poor_service'
                ) NOT NULL,
                message_template TEXT NOT NULL,
                notes TEXT NULL,
                status ENUM('pending', 'resolved', 'closed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (quality_staff_id) REFERENCES users(id) ON DELETE RESTRICT,
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: followup_reports');
        
        // ==================== 11. جدول الملخص اليومي ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS daily_summaries (
                id INT PRIMARY KEY AUTO_INCREMENT,
                date DATE NOT NULL,
                team_id INT NOT NULL,
                total_tickets INT DEFAULT 0,
                completed_tickets INT DEFAULT 0,
                total_positive_points INT DEFAULT 0,
                total_negative_points INT DEFAULT 0,
                net_points INT DEFAULT 0,
                connection_count INT DEFAULT 0,
                maintenance_count INT DEFAULT 0,
                daily_bonus_points INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                UNIQUE KEY unique_daily_team (date, team_id),
                INDEX idx_date (date),
                INDEX idx_team_id (team_id),
                INDEX idx_net_points (net_points)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: daily_summaries');
        
        // ==================== 12. جدول الملخص الشهري ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS monthly_summaries (
                id INT PRIMARY KEY AUTO_INCREMENT,
                year INT NOT NULL,
                month INT NOT NULL,
                team_id INT NOT NULL,
                total_tickets INT DEFAULT 0,
                total_positive_points INT DEFAULT 0,
                total_negative_points INT DEFAULT 0,
                net_points INT DEFAULT 0,
                working_days INT DEFAULT 0,
                monthly_bonus_points INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                UNIQUE KEY unique_monthly_team (year, month, team_id),
                INDEX idx_year_month (year, month),
                INDEX idx_team_id (team_id),
                INDEX idx_net_points (net_points)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: monthly_summaries');
        
        // ==================== 13. جدول قوالب الرسائل ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS message_templates (
                id INT PRIMARY KEY AUTO_INCREMENT,
                template_type ENUM(
                    'connection', 'maintenance', 'postponed', 'followup'
                ) NOT NULL,
                title VARCHAR(255) NOT NULL,
                template_text TEXT NOT NULL,
                variables JSON NULL COMMENT 'قائمة المتغيرات المستخدمة في القالب',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_template_type (template_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: message_templates');
        
        // ==================== 14. جدول الإشعارات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NULL COMMENT 'المستخدم المستهدف (NULL = جميع المديرين)',
                type ENUM('ticket_delayed', 'ticket_completed', 'achievement', 'system') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_ticket_id INT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (related_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_type (type),
                INDEX idx_is_read (is_read),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: notifications');
        
        // ==================== 15. جدول المكافآت ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rewards (
                id INT PRIMARY KEY AUTO_INCREMENT,
                team_id INT NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                connection_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الربط',
                maintenance_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الصيانة',
                quality_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الجودة',
                ranking_bonus DECIMAL(10,2) DEFAULT 0 COMMENT 'مكافأة الترتيب',
                total_points INT DEFAULT 0,
                total_reward DECIMAL(10,2) DEFAULT 0,
                status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                UNIQUE KEY unique_team_month (team_id, year, month),
                INDEX idx_year_month (year, month),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: rewards');
        
        // ==================== 16. جدول توزيع التكتات ====================
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ticket_assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ticket_id INT NOT NULL,
                assigned_by INT NOT NULL COMMENT 'من قام بالتوزيع (كول سنتر أو مدير)',
                assigned_to INT NULL COMMENT 'المندوب المستهدف (NULL = عام للجميع)',
                assigned_to_team INT NULL COMMENT 'الفريق المستهدف (NULL = عام)',
                assignment_type ENUM('general', 'agent', 'team') NOT NULL DEFAULT 'general',
                status ENUM('pending', 'accepted', 'waiting', 'postponed', 'rejected') DEFAULT 'pending',
                accepted_at TIMESTAMP NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (assigned_to_team) REFERENCES teams(id) ON DELETE SET NULL,
                INDEX idx_ticket_id (ticket_id),
                INDEX idx_assigned_to (assigned_to),
                INDEX idx_assigned_to_team (assigned_to_team),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ تم إنشاء جدول: ticket_assignments');
        
        // ==================== 17. تحديث جدول التكتات ====================
        // إضافة حقول جديدة للتكتات
        try {
            await connection.query(`
                ALTER TABLE tickets 
                ADD COLUMN IF NOT EXISTS call_center_id INT NULL COMMENT 'موظف الكول سنتر الذي أنشأ التكت',
                ADD COLUMN IF NOT EXISTS agent_id INT NULL COMMENT 'المندوب المسؤول',
                ADD COLUMN IF NOT EXISTS assignment_status ENUM('pending', 'accepted', 'waiting', 'postponed') DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS time_accepted TIMESTAMP NULL COMMENT 'وقت قبول التكت من المندوب',
                ADD COLUMN IF NOT EXISTS time_first_contact_by_agent TIMESTAMP NULL COMMENT 'T1 - وقت أول اتصال من المندوب',
                ADD COLUMN IF NOT EXISTS time_activation_by_agent TIMESTAMP NULL COMMENT 'T3 - وقت رسالة التفعيل من المندوب',
                ADD COLUMN IF NOT EXISTS is_public TINYINT(1) DEFAULT 0 COMMENT 'تذكرة عامة (للجميع)',
                ADD FOREIGN KEY (call_center_id) REFERENCES users(id) ON DELETE SET NULL,
                ADD FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('✅ تم تحديث جدول tickets');
        } catch (error) {
            if (!error.message.includes('Duplicate column')) {
                console.log('⚠️  بعض الحقول موجودة مسبقاً في جدول tickets');
            }
        }
        
        // ==================== 18. إدراج البيانات الأولية ====================
        
        // إدراج أنواع التكتات
        const ticketTypes = [
            { name_ar: 'ربط جديد FTTH', name_en: 'New FTTH Connection', sla_min: 45, sla_max: 60, base_points: 10, category: 'connection' },
            { name_ar: 'تفعيل بدون سحب كيبل', name_en: 'Activation Without Cable', sla_min: 20, sla_max: 30, base_points: 8, category: 'activation' },
            { name_ar: 'تبديل راوتر/ONU', name_en: 'Router/ONU Replacement', sla_min: 20, sla_max: 35, base_points: 5, category: 'maintenance' },
            { name_ar: 'قطع فايبر', name_en: 'Fiber Cut', sla_min: 30, sla_max: 45, base_points: 7, category: 'maintenance' },
            { name_ar: 'ضعف إشارة RX', name_en: 'Weak RX Signal', sla_min: 25, sla_max: 40, base_points: 5, category: 'maintenance' },
            { name_ar: 'إعداد PPPoE/DHCP', name_en: 'PPPoE/DHCP Setup', sla_min: 15, sla_max: 25, base_points: 4, category: 'maintenance' },
            { name_ar: 'WiFi بدون تمديد', name_en: 'WiFi Without Extension', sla_min: 15, sla_max: 30, base_points: 4, category: 'maintenance' },
            { name_ar: 'عبث مشترك / كهرباء', name_en: 'Subscriber Tampering / Power', sla_min: 15, sla_max: 20, base_points: 3, category: 'maintenance' },
            { name_ar: 'صيانة خارجية / فات', name_en: 'External Maintenance / Pole', sla_min: 30, sla_max: 45, base_points: 6, category: 'maintenance' },
            { name_ar: 'فحص فقط', name_en: 'Inspection Only', sla_min: 10, sla_max: 15, base_points: 2, category: 'visit' },
            { name_ar: 'إعادة ربط', name_en: 'Reconnection', sla_min: 30, sla_max: 60, base_points: 6, category: 'connection' },
            { name_ar: 'زيارة تسويقية', name_en: 'Marketing Visit', sla_min: 10, sla_max: 15, base_points: 2, category: 'visit' }
        ];
        
        for (const type of ticketTypes) {
            await connection.query(`
                INSERT IGNORE INTO ticket_types (name_ar, name_en, sla_min, sla_max, base_points, category)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [type.name_ar, type.name_en, type.sla_min, type.sla_max, type.base_points, type.category]);
        }
        console.log('✅ تم إدراج أنواع التكتات');
        
        // إدراج الفرق
        const teams = [
            { name: 'الفريق الصباحي', shift: 'morning' },
            { name: 'الفريق المسائي 1', shift: 'evening' },
            { name: 'الفريق المسائي 2', shift: 'evening' },
            { name: 'الفريق المسائي 3', shift: 'evening' }
        ];
        
        for (const team of teams) {
            await connection.query(`
                INSERT IGNORE INTO teams (name, shift)
                VALUES (?, ?)
            `, [team.name, team.shift]);
        }
        console.log('✅ تم إدراج الفرق');
        
        // إدراج قوالب الرسائل
        const templates = [
            {
                template_type: 'connection',
                title: 'رسالة الربط',
                template_text: `مرحباً،
تم ربط خدمة الإنترنت بنجاح.
الوقت الفعلي: {actual_time} دقيقة
تقييم الجودة: {service_status}
تقييم الفريق: {team_rating}/5
شكراً لكم.`
            },
            {
                template_type: 'maintenance',
                title: 'رسالة الصيانة',
                template_text: `مرحباً،
تم إصلاح المشكلة بنجاح.
الوقت الفعلي: {actual_time} دقيقة
تقييم الجودة: {service_status}
شكراً لصبركم.`
            },
            {
                template_type: 'postponed',
                title: 'رسالة التأجيل',
                template_text: `مرحباً،
نعتذر عن التأجيل.
السبب: {postponement_reason}
سيتم المتابعة في أقرب وقت.
شكراً لتفهمكم.`
            },
            {
                template_type: 'followup',
                title: 'رسالة المتابعة',
                template_text: `مرحباً،
هذه رسالة متابعة للتكت رقم {ticket_number}.
المشكلة: {followup_reason}
سيتم حل المشكلة قريباً.
شكراً.`
            }
        ];
        
        for (const template of templates) {
            await connection.query(`
                INSERT IGNORE INTO message_templates (template_type, title, template_text)
                VALUES (?, ?, ?)
            `, [template.template_type, template.title, template.template_text]);
        }
        console.log('✅ تم إدراج قوالب الرسائل');
        
        // إدراج حساب المدير الافتراضي
        const bcrypt = require('bcrypt');
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        await connection.query(`
            INSERT IGNORE INTO users (username, password_hash, full_name, role)
            VALUES (?, ?, ?, ?)
        `, ['admin', adminPassword, 'مدير النظام', 'admin']);
        console.log('✅ تم إدراج حساب المدير الافتراضي (admin/admin123)');
        
        // إدراج حساب موظف جودة افتراضي
        const qualityPassword = await bcrypt.hash('quality123', 10);
        await connection.query(`
            INSERT IGNORE INTO users (username, password_hash, full_name, role)
            VALUES (?, ?, ?, ?)
        `, ['quality', qualityPassword, 'موظف الجودة', 'quality_staff']);
        console.log('✅ تم إدراج حساب موظف الجودة الافتراضي (quality/quality123)');
        
        // إدراج حساب محاسب افتراضي
        const accountantPassword = await bcrypt.hash('accountant123', 10);
        await connection.query(`
            INSERT IGNORE INTO users (username, password_hash, full_name, role)
            VALUES (?, ?, ?, ?)
        `, ['accountant', accountantPassword, 'المحاسب', 'accountant']);
        console.log('✅ تم إدراج حساب المحاسب الافتراضي (accountant/accountant123)');
        
        await connection.end();
        console.log('');
        console.log('==========================================');
        console.log('✅ تم إنشاء قاعدة البيانات بنجاح!');
        console.log('==========================================');
        console.log('');
        console.log('📝 الحسابات الافتراضية:');
        console.log('   المدير: admin / admin123');
        console.log('   موظف الجودة: quality / quality123');
        console.log('   المحاسب: accountant / accountant123');
        console.log('');
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء قاعدة البيانات:', error);
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
}

// Run initialization
initDatabase();

