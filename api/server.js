/**
 * Quality & Tickets Management System - Main Server
 * نظام إدارة التكتات والجودة
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');

const db = require('./db-manager');
const config = require('./config');
const scoring = require('./scoring-logic');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Note: Static files are served after API routes to avoid conflicts
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ticket-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: config.upload.limits
});

// ==================== Authentication Middleware ====================
async function authenticate(req, res, next) {
    try {
        const token = req.headers.authorization || req.query.token;
        if (!token) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        // Simple token-based auth (in production, use JWT)
        const userData = await db.queryOne(`
            SELECT u.*, c.is_active as company_is_active, c.owner_user_id
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = ? AND u.is_active = 1
        `, [token]);
        
        if (!userData) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        // التحقق من حالة الشركة ومديرها
        if (userData.company_id) {
            // التحقق من حالة الشركة
            if (userData.company_is_active === 0) {
                return res.status(403).json({ 
                    error: 'يرجى التواصل مع المبيعات',
                    contact_sales: true 
                });
            }
            
            // التحقق من حالة مدير الشركة
            if (userData.owner_user_id) {
                const companyAdmin = await db.queryOne(
                    'SELECT is_active FROM users WHERE id = ?',
                    [userData.owner_user_id]
                );
                
                if (companyAdmin && companyAdmin.is_active === 0) {
                    return res.status(403).json({ 
                        error: 'يرجى التواصل مع المبيعات',
                        contact_sales: true 
                    });
                }
            }
        }
        
        req.user = userData;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'خطأ في المصادقة' });
    }
}

// ==================== Login ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // البحث عن المستخدم (يدعم username@domain أو username فقط)
        let user;
        if (username.includes('@')) {
            // username@domain - البحث المباشر
            user = await db.queryOne(`
                SELECT u.*, c.domain, c.name as company_name, c.id as company_id, 
                       c.is_active as company_is_active, c.owner_user_id
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                WHERE u.username = ? AND u.is_active = 1
            `, [username]);
        } else {
            // username فقط - البحث في حسابات owner/admin بدون domain أو البحث في جميع الشركات
            user = await db.queryOne(`
                SELECT u.*, c.domain, c.name as company_name, c.id as company_id,
                       c.is_active as company_is_active, c.owner_user_id
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                WHERE u.username = ? AND (u.role = 'owner' OR u.company_id IS NULL) AND u.is_active = 1
                LIMIT 1
            `, [username]);
        }
        
        if (!user) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        
        // التحقق من حالة الشركة ومديرها
        if (user.company_id) {
            // التحقق من حالة الشركة
            if (user.company_is_active === 0) {
                return res.status(403).json({ 
                    error: 'يرجى التواصل مع المبيعات',
                    contact_sales: true 
                });
            }
            
            // التحقق من حالة مدير الشركة (owner_user_id)
            if (user.owner_user_id) {
                const companyAdmin = await db.queryOne(
                    'SELECT is_active FROM users WHERE id = ?',
                    [user.owner_user_id]
                );
                
                if (companyAdmin && companyAdmin.is_active === 0) {
                    return res.status(403).json({ 
                        error: 'يرجى التواصل مع المبيعات',
                        contact_sales: true 
                    });
                }
            }
        }
        
        // إضافة display_username مع domain إذا كان موجوداً
        if (user.company_id && user.domain) {
            user.display_username = `${user.username.split('@')[0]}@${user.domain}`;
        } else {
            user.display_username = user.username;
        }
        
        // Remove password from response
        delete user.password_hash;
        
        res.json({
            success: true,
            user: user,
            token: user.id.toString() // Simple token (use JWT in production)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
    }
});

// ==================== Dashboard - Get Statistics ====================
app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const month = moment().format('YYYY-MM');
        
        // إحصائيات اليوم
        const todayStats = await db.query(`
            SELECT 
                t.team_id,
                tm.name as team_name,
                COUNT(DISTINCT t.id) as total_tickets,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tickets,
                SUM(COALESCE(ps.total_positive, 0)) as positive_points,
                SUM(COALESCE(ns.total_negative, 0)) as negative_points
            FROM tickets t
            JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN (
                SELECT ticket_id, SUM(points) as total_positive
                FROM positive_scores
                GROUP BY ticket_id
            ) ps ON t.id = ps.ticket_id
            LEFT JOIN (
                SELECT ticket_id, SUM(ABS(points)) as total_negative
                FROM negative_scores
                GROUP BY ticket_id
            ) ns ON t.id = ns.ticket_id
            WHERE DATE(t.created_at) = ?
            GROUP BY t.team_id, tm.name
        `, [today]);
        
        // ترتيب الفرق
        const teamRankings = await db.query(`
            SELECT 
                t.id,
                t.name,
                t.shift,
                COALESCE(SUM(ds.net_points), 0) as total_points,
                COALESCE(SUM(ds.total_tickets), 0) as total_tickets
            FROM teams t
            LEFT JOIN daily_summaries ds ON t.id = ds.team_id AND ds.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            WHERE t.is_active = 1
            GROUP BY t.id, t.name, t.shift
            ORDER BY total_points DESC
        `);
        
        res.json({
            success: true,
            todayStats,
            teamRankings
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'خطأ في جلب البيانات' });
    }
});

// ==================== Teams - Get All Teams ====================
app.get('/api/teams', authenticate, async (req, res) => {
    try {
        const teams = await db.query(`
            SELECT t.*, 
                   COUNT(DISTINCT tm.user_id) as member_count
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE t.is_active = 1
            GROUP BY t.id
            ORDER BY t.name
        `);
        
        // إضافة أسماء العمال لكل فريق
        for (let team of teams) {
            // جلب العمال من جدول users (team_id) و team_members
            const membersFromUsers = await db.query(`
                SELECT u.full_name
                FROM users u
                WHERE u.team_id = ? AND u.is_active = 1 AND u.role IN ('technician', 'team_leader')
                ORDER BY u.full_name
            `, [team.id]);
            
            const membersFromTeamMembers = await db.query(`
                SELECT u.full_name
                FROM users u
                JOIN team_members tm ON u.id = tm.user_id
                WHERE tm.team_id = ? AND u.is_active = 1
                ORDER BY u.full_name
            `, [team.id]);
            
            // دمج القائمتين وإزالة التكرار
            const allMembers = [...membersFromUsers, ...membersFromTeamMembers];
            const uniqueMembers = Array.from(new Set(allMembers.map(m => m.full_name)));
            
            team.members = uniqueMembers;
            team.members_names = uniqueMembers.length > 0 ? uniqueMembers.join(', ') : '';
        }
        
        res.json({ success: true, teams });
    } catch (error) {
        console.error('Teams error:', error);
        res.status(500).json({ error: 'خطأ في جلب الفرق' });
    }
});

// ==================== Get Technicians by Team ====================
app.get('/api/teams/:teamId/technicians', authenticate, async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        
        const technicians = await db.query(`
            SELECT u.id, u.full_name, u.username, u.role
            FROM users u
            WHERE u.team_id = ? AND u.role = 'technician' AND u.is_active = 1
            ORDER BY u.full_name
        `, [teamId]);
        
        res.json({ success: true, technicians });
    } catch (error) {
        console.error('Get technicians error:', error);
        res.status(500).json({ error: 'خطأ في جلب الفنيين' });
    }
});

// ==================== Ticket Types ====================
app.get('/api/ticket-types', authenticate, async (req, res) => {
    try {
        const types = await db.query('SELECT * FROM ticket_types WHERE is_active = 1 ORDER BY name_ar');
        res.json({ success: true, types });
    } catch (error) {
        console.error('Ticket types error:', error);
        res.status(500).json({ error: 'خطأ في جلب أنواع التكتات' });
    }
});

// ==================== Create Ticket (Manual Entry) ====================
app.post('/api/tickets', authenticate, async (req, res) => {
    try {
        // التحقق من الصلاحيات - فقط admin و call_center يمكنهم إنشاء التكتات
        if (req.user.role !== 'admin' && req.user.role !== 'call_center') {
            return res.status(403).json({ error: 'غير مصرح لك بإنشاء التكتات' });
        }
        
        console.log('Create ticket request body:', JSON.stringify(req.body, null, 2));
        
        const {
            ticket_number,
            ticket_type_id,
            team_id,
            assigned_technician_id,
            time_received,
            time_first_contact,
            time_completed,
            subscriber_name,
            subscriber_phone,
            subscriber_address,
            region,
            notes
        } = req.body;
        
        // توليد رقم التكت تلقائياً إذا لم يتم إرساله
        let finalTicketNumber = ticket_number;
        if (!finalTicketNumber || !finalTicketNumber.trim()) {
            // توليد رقم تكت فريد: TKT-YYYYMMDD-HHMMSS-XXX
            const now = moment();
            const dateStr = now.format('YYYYMMDD');
            const timeStr = now.format('HHmmss');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            finalTicketNumber = `TKT-${dateStr}-${timeStr}-${random}`;
            
            // التحقق من عدم التكرار
            let exists = true;
            let attempts = 0;
            while (exists && attempts < 10) {
                const check = await db.queryOne(
                    'SELECT id FROM tickets WHERE ticket_number = ?',
                    [finalTicketNumber]
                );
                if (!check) {
                    exists = false;
                } else {
                    const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    finalTicketNumber = `TKT-${dateStr}-${timeStr}-${newRandom}`;
                    attempts++;
                }
            }
        }
        
        console.log('Step 1: Checking for existing ticket...');
        // التحقق من وجود التكت بنفس الرقم
        const existing = await db.queryOne(
            'SELECT id FROM tickets WHERE ticket_number = ?',
            [finalTicketNumber]
        );
        
        if (existing) {
            console.log('Validation error: Ticket number already exists:', finalTicketNumber);
            return res.status(400).json({ error: 'رقم التكت موجود مسبقاً' });
        }
        
        // إذا كان المستخدم call_center أو admin وليس لديه time_received، نستخدم الوقت الحالي
        // وإلا نتحقق من وجود time_received
        let cleanedTimeReceived = time_received;
        if (!cleanedTimeReceived || !cleanedTimeReceived.trim()) {
            // إذا كان call_center أو admin، نستخدم الوقت الحالي
            cleanedTimeReceived = moment().format('YYYY-MM-DDTHH:mm');
            console.log('Using current time for time_received:', cleanedTimeReceived);
        }
        
        console.log('Step 3: Cleaning dates...');
        
        // تنظيف وتنسيق التواريخ
        let cleanedTimeFirstContact = time_first_contact;
        let cleanedTimeCompleted = time_completed;
        
        // إصلاح تنسيق التاريخ
        function cleanDateTime(dt) {
            if (!dt) return null;
            
            // إزالة أي T مكررة
            dt = dt.replace(/T+/g, 'T');
            
            // إصلاح التنسيق: يجب أن يكون YYYY-MM-DDTHH:MM
            // إذا كان التنسيق خاطئاً، نحاول إصلاحه
            const match = dt.match(/^(\d{4}-\d{2}-\d{2})T?(\d{2}):?(\d{2})/);
            if (match) {
                return `${match[1]}T${match[2]}:${match[3]}`;
            }
            
            // إذا كان التنسيق صحيحاً، نعيده كما هو
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt)) {
                return dt;
            }
            
            return null;
        }
        
        cleanedTimeReceived = cleanDateTime(cleanedTimeReceived);
        cleanedTimeFirstContact = cleanDateTime(cleanedTimeFirstContact);
        cleanedTimeCompleted = cleanDateTime(cleanedTimeCompleted);
        
        console.log('Cleaned dates - time_received:', cleanedTimeReceived, 'time_first_contact:', cleanedTimeFirstContact, 'time_completed:', cleanedTimeCompleted);
        
        // التحقق من صحة time_received بعد التنظيف
        if (!cleanedTimeReceived) {
            console.log('Validation error: cleanedTimeReceived is null');
            return res.status(400).json({ error: 'تنسيق تاريخ ووقت استلام التكت غير صحيح. يجب أن يكون YYYY-MM-DDTHH:MM' });
        }
        
        // التحقق من صحة التاريخ باستخدام moment
        if (!moment(cleanedTimeReceived).isValid()) {
            console.log('Validation error: cleanedTimeReceived is not valid moment:', cleanedTimeReceived);
            return res.status(400).json({ error: 'تاريخ ووقت استلام التكت غير صحيح' });
        }
        
        console.log('Date validation passed');
        
        // حساب الوقت الفعلي
        let actual_time_minutes = null;
        if (cleanedTimeReceived && cleanedTimeCompleted) {
            const t0 = moment(cleanedTimeReceived);
            const t3 = moment(cleanedTimeCompleted);
            if (t0.isValid() && t3.isValid()) {
                actual_time_minutes = t3.diff(t0, 'minutes');
            }
        }
        
        // التحقق من التأجيل: إذا كان T1 أو T3 بعد يوم كامل من T0
        // لا نضع status افتراضي - فقط إذا كان مؤجل نضعه postponed
        let ticketStatus = null; // سيستخدم القيمة الافتراضية من قاعدة البيانات
        if (cleanedTimeReceived) {
            const t0 = moment(cleanedTimeReceived);
            if (t0.isValid()) {
                const t0Date = t0.format('YYYY-MM-DD');
                
                // التحقق من T1
                if (cleanedTimeFirstContact) {
                    const t1 = moment(cleanedTimeFirstContact);
                    if (t1.isValid()) {
                        const t1Date = t1.format('YYYY-MM-DD');
                        const daysDiff = moment(t1Date).diff(moment(t0Date), 'days');
                        if (daysDiff >= 1) {
                            ticketStatus = 'postponed';
                        }
                    }
                }
                
                // التحقق من T3
                if (cleanedTimeCompleted) {
                    const t3 = moment(cleanedTimeCompleted);
                    if (t3.isValid()) {
                        const t3Date = t3.format('YYYY-MM-DD');
                        const daysDiff = moment(t3Date).diff(moment(t0Date), 'days');
                        if (daysDiff >= 1) {
                            ticketStatus = 'postponed';
                        }
                    }
                }
            }
        }
        
        // التحقق من الحقول المطلوبة
        // ticket_number يتم توليده تلقائياً، لا حاجة للتحقق منه
        
        if (!ticket_type_id || isNaN(parseInt(ticket_type_id))) {
            console.log('Validation error: ticket_type_id is invalid:', ticket_type_id, typeof ticket_type_id);
            return res.status(400).json({ error: 'نوع التكت مطلوب' });
        }
        
        // تحويل إلى أرقام
        const ticketTypeId = parseInt(ticket_type_id);
        
        console.log('Parsed values - ticketTypeId:', ticketTypeId);
        
        if (isNaN(ticketTypeId) || ticketTypeId <= 0) {
            console.log('Validation error: ticketTypeId is invalid:', ticketTypeId);
            return res.status(400).json({ error: 'نوع التكت غير صحيح' });
        }
        
        // التحقق من وجود ticket_type_id في قاعدة البيانات
        const ticketTypeExists = await db.queryOne(
            'SELECT id FROM ticket_types WHERE id = ? AND is_active = 1',
            [ticketTypeId]
        );
        
        if (!ticketTypeExists) {
            console.log('Validation error: ticket_type_id does not exist:', ticketTypeId);
            return res.status(400).json({ error: 'نوع التكت غير موجود أو غير نشط' });
        }
        
        // team_id اختياري الآن - إذا لم يتم إرساله، سيتم تعيينه لاحقاً
        let teamId = null;
        if (team_id && !isNaN(parseInt(team_id))) {
            teamId = parseInt(team_id);
            // التحقق من وجود team_id في قاعدة البيانات
            const teamExists = await db.queryOne(
                'SELECT id FROM teams WHERE id = ? AND is_active = 1',
                [teamId]
            );
            
            if (!teamExists) {
                console.log('Validation error: team_id does not exist:', teamId);
                return res.status(400).json({ error: 'الفريق غير موجود أو غير نشط' });
            }
        }
        
        console.log('All validations passed. Proceeding with ticket creation...');
        
        // تحديد quality_staff_id حسب دور المستخدم
        let quality_staff_id = null; // للدعم الفني، سيتم تعيينه لاحقاً من موظف الجودة
        if (req.user.role === 'admin') {
            quality_staff_id = req.user.id;
        }
        
        // تحديد status - دائماً NEW للدعم الفني (يتم التوزيع لاحقاً)
        let finalTicketStatus = 'NEW';
        if (assigned_technician_id) {
            finalTicketStatus = 'ASSIGNED';
        }
        
        // حساب Load Factor (فقط إذا كان هناك teamId)
        let loadFactor = 1;
        let adjusted_time_minutes = null;
        if (teamId) {
            const ticketDate = cleanedTimeReceived ? moment(cleanedTimeReceived).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
            loadFactor = await scoring.calculateLoadFactor(teamId, ticketDate);
            adjusted_time_minutes = actual_time_minutes ? Math.round(actual_time_minutes / loadFactor) : null;
        }
        
        // إدراج التكت - فقط الحقول الأساسية للدعم الفني
        let insertFields = `
            ticket_number, ticket_type_id, team_id, quality_staff_id,
            assigned_technician_id,
            time_received, time_first_contact, time_completed,
            actual_time_minutes, adjusted_time_minutes, load_factor,
            subscriber_name, subscriber_phone, subscriber_address, region, notes,
            call_center_id, status`;
        let insertValues = `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?`;
        let insertParams = [
            finalTicketNumber.trim(), 
            ticketTypeId, 
            teamId, 
            quality_staff_id,
            assigned_technician_id || null,
            cleanedTimeReceived || null, 
            cleanedTimeFirstContact || null, 
            cleanedTimeCompleted || null,
            actual_time_minutes, 
            adjusted_time_minutes, 
            loadFactor,
            subscriber_name ? subscriber_name.trim() : null, 
            subscriber_phone ? subscriber_phone.trim() : null, 
            subscriber_address ? subscriber_address.trim() : null, 
            region ? region.trim() : null,
            notes ? notes.trim() : null,
            req.user.role === 'call_center' ? req.user.id : null,
            finalTicketStatus
        ];
        
        const result = await db.query(`
            INSERT INTO tickets (${insertFields})
            VALUES (${insertValues})
        `, insertParams);
        
        const ticketId = result.insertId;
        
        // إرجاع رقم التكت المُولّد في الاستجابة
        console.log('Ticket created successfully. ID:', ticketId, 'Ticket Number:', finalTicketNumber);
        res.json({
            success: true,
            message: 'تم إنشاء التكت بنجاح',
            ticket: {
                id: ticketId,
                ticket_number: finalTicketNumber
            }
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'خطأ في إدخال التكت',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==================== Update Ticket ====================
app.put('/api/tickets/:id', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { subscriber_name, subscriber_phone, ticket_type_id, team_id } = req.body;
        
        // Check if user is team_leader or admin
        if (req.user.role !== 'team_leader' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح لك بتعديل التكت' });
        }
        
        // Check if ticket exists
        const ticket = await db.queryOne('SELECT id FROM tickets WHERE id = ?', [ticketId]);
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود' });
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        if (subscriber_name !== undefined) {
            updates.push('subscriber_name = ?');
            params.push(subscriber_name);
        }
        if (subscriber_phone !== undefined) {
            updates.push('subscriber_phone = ?');
            params.push(subscriber_phone);
        }
        if (ticket_type_id !== undefined) {
            updates.push('ticket_type_id = ?');
            params.push(ticket_type_id);
        }
        if (team_id !== undefined) {
            updates.push('team_id = ?');
            params.push(team_id);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
        }
        
        updates.push('updated_at = NOW()');
        params.push(ticketId);
        
        await db.query(
            `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({
            success: true,
            message: 'تم تحديث التكت بنجاح'
        });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ error: 'خطأ في تحديث التكت' });
    }
});

// ==================== Get Assigned Tickets ====================
app.get('/api/tickets/assigned', authenticate, async (req, res) => {
    try {
        const { status, assigned_to_me } = req.query;
        let query = `
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   ta.status as assignment_status,
                   ta.assignment_type,
                   ta.accepted_at
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN ticket_assignments ta ON t.id = ta.ticket_id
            WHERE 1=1
        `;
        const params = [];
        
        if (assigned_to_me === 'true' && req.user.role === 'agent') {
            query += ` AND (
                (ta.assigned_to = ? AND ta.status IN ('pending', 'accepted', 'in_progress'))
                OR (ta.assignment_type = 'general' AND ta.status = 'pending')
                OR (ta.assigned_to_team = (SELECT team_id FROM users WHERE id = ?) AND ta.assignment_type = 'team' AND ta.status = 'pending')
            )`;
            params.push(req.user.id, req.user.id);
        }
        
        if (status) {
            query += ` AND (t.status = ? OR ta.status = ?)`;
            params.push(status, status);
        }
        
        query += ` ORDER BY t.created_at DESC`;
        
        const tickets = await db.query(query, params);
        
        res.json({
            success: true,
            tickets: tickets
        });
    } catch (error) {
        console.error('Get assigned tickets error:', error);
        res.status(500).json({ error: 'خطأ في جلب التكتات' });
    }
});

// ==================== Update Ticket Assignment ====================
app.put('/api/tickets/:id/assignment', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { status, notes } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'حالة التوزيع مطلوبة' });
        }
        
        // التحقق من أن المستخدم هو المندوب المخصص له
        const assignment = await db.queryOne(`
            SELECT ta.*, t.ticket_number
            FROM ticket_assignments ta
            JOIN tickets t ON ta.ticket_id = t.id
            WHERE ta.ticket_id = ? AND ta.assigned_to = ?
        `, [ticketId, req.user.id]);
        
        if (!assignment && req.user.role === 'agent') {
            // التحقق من التوزيع العام
            const generalAssignment = await db.queryOne(`
                SELECT ta.*, t.ticket_number
                FROM ticket_assignments ta
                JOIN tickets t ON ta.ticket_id = t.id
                WHERE ta.ticket_id = ? AND ta.assignment_type = 'general' AND ta.status = 'pending'
            `, [ticketId]);
            
            if (!generalAssignment) {
                return res.status(403).json({ error: 'غير مصرح لك بتحديث هذه التذكرة' });
            }
        }
        
        // تحديث حالة التوزيع
        await db.query(`
            UPDATE ticket_assignments 
            SET status = ?, 
                notes = ?,
                accepted_at = CASE WHEN ? = 'accepted' THEN NOW() ELSE accepted_at END,
                updated_at = NOW()
            WHERE ticket_id = ? AND (assigned_to = ? OR assignment_type = 'general')
        `, [status, notes || null, status, ticketId, req.user.id]);
        
        // تحديث حالة التكت
        if (status === 'accepted') {
            await db.query(`
                UPDATE tickets 
                SET assignment_status = 'accepted',
                    agent_id = ?,
                    time_accepted = NOW(),
                    status = 'in_progress'
                WHERE id = ?
            `, [req.user.id, ticketId]);
            
            // إرسال إشعار للكول سنتر والمدير
            await db.query(`
                INSERT INTO notifications (user_id, type, title, message, related_ticket_id)
                SELECT id, 'ticket_accepted', 'تم قبول التذكرة', 
                       CONCAT('تم قبول التذكرة رقم: ', ?), ?
                FROM users
                WHERE role IN ('call_center', 'admin') AND is_active = 1
            `, [assignment?.ticket_number || 'N/A', ticketId]);
        } else if (status === 'completed') {
            await db.query(`
                UPDATE tickets 
                SET status = 'completed',
                    assignment_status = 'completed'
                WHERE id = ?
            `, [ticketId]);
            
            // إرسال إشعار للكول سنتر والمدير
            await db.query(`
                INSERT INTO notifications (user_id, type, title, message, related_ticket_id)
                SELECT id, 'ticket_completed', 'تم إكمال التذكرة', 
                       CONCAT('تم إكمال التذكرة رقم: ', ?), ?
                FROM users
                WHERE role IN ('call_center', 'admin') AND is_active = 1
            `, [assignment?.ticket_number || 'N/A', ticketId]);
        }
        
        res.json({
            success: true,
            message: 'تم تحديث حالة التوزيع بنجاح'
        });
    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({ error: 'خطأ في تحديث حالة التوزيع' });
    }
});

// ==================== Upload Photos ====================
app.post('/api/tickets/:id/photos', authenticate, upload.array('photos', 10), async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { photo_type } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'لم يتم رفع أي صور' });
        }
        
        const photoRecords = [];
        for (const file of req.files) {
            const result = await db.query(`
                INSERT INTO ticket_photos (ticket_id, photo_type, photo_path)
                VALUES (?, ?, ?)
            `, [ticketId, photo_type, `/uploads/${file.filename}`]);
            
            photoRecords.push({
                id: result.insertId,
                photo_type: photo_type,
                photo_path: `/uploads/${file.filename}`
            });
        }
        
        // إعادة حساب النقاط بعد رفع الصور
        await scoring.calculateTicketScores(ticketId);
        
        // تحديث daily_summary
        const ticket = await db.queryOne('SELECT team_id, DATE(created_at) as ticket_date FROM tickets WHERE id = ?', [ticketId]);
        if (ticket && ticket.team_id && ticket.ticket_date) {
            await scoring.updateDailySummary(ticket.team_id, ticket.ticket_date);
        }
        
        res.json({
            success: true,
            photos: photoRecords
        });
    } catch (error) {
        console.error('Upload photos error:', error);
        res.status(500).json({ error: 'خطأ في رفع الصور' });
    }
});

// ==================== Quality Review ====================
app.post('/api/tickets/:id/quality-review', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const {
            contact_status,
            service_status,
            team_rating,
            behavior_rating,
            explained_sinmana,
            explained_platform,
            explained_mytv_plus,
            explained_shahid_plus,
            whatsapp_group_interest,
            subscription_amount,
            needs_followup,
            followup_reason,
            review_notes,
            upsell_router,
            upsell_onu,
            upsell_ups
        } = req.body;
        
        // التحقق من وجود تقييم سابق
        const existing = await db.queryOne(
            'SELECT id FROM quality_reviews WHERE ticket_id = ?',
            [ticketId]
        );
        
        if (existing) {
            // تحديث التقييم
            await db.query(`
                UPDATE quality_reviews SET
                    contact_status = ?,
                    service_status = ?,
                    team_rating = ?,
                    behavior_rating = ?,
                    explained_sinmana = ?,
                    explained_platform = ?,
                    explained_mytv_plus = ?,
                    explained_shahid_plus = ?,
                    whatsapp_group_interest = ?,
                    subscription_amount = ?,
                    needs_followup = ?,
                    followup_reason = ?,
                    review_notes = ?,
                    upsell_router = ?,
                    upsell_onu = ?,
                    upsell_ups = ?
                WHERE ticket_id = ?
            `, [
                contact_status, service_status, team_rating, behavior_rating || null,
                explained_sinmana || 0, explained_platform || 0,
                explained_mytv_plus || 0, explained_shahid_plus || 0,
                whatsapp_group_interest || 0, subscription_amount || null,
                needs_followup || 0, followup_reason || null, review_notes || null,
                upsell_router || 0, upsell_onu || 0, upsell_ups || 0,
                ticketId
            ]);
        } else {
            // إدراج تقييم جديد
            await db.query(`
                INSERT INTO quality_reviews (
                    ticket_id, quality_staff_id, contact_status, service_status,
                    team_rating, behavior_rating, explained_sinmana, explained_platform,
                    explained_mytv_plus, explained_shahid_plus,
                    whatsapp_group_interest, subscription_amount,
                    needs_followup, followup_reason, review_notes,
                    upsell_router, upsell_onu, upsell_ups
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticketId, req.user.id, contact_status, service_status, team_rating,
                behavior_rating || null,
                explained_sinmana || 0, explained_platform || 0,
                explained_mytv_plus || 0, explained_shahid_plus || 0,
                whatsapp_group_interest || 0, subscription_amount || null,
                needs_followup || 0, followup_reason || null, review_notes || null,
                upsell_router || 0, upsell_onu || 0, upsell_ups || 0
            ]);
        }
        
        // إعادة حساب النقاط
        await scoring.calculateTicketScores(ticketId);
        
        // تحديث daily_summary
        const ticketForSummary = await db.queryOne('SELECT team_id, DATE(created_at) as ticket_date FROM tickets WHERE id = ?', [ticketId]);
        if (ticketForSummary && ticketForSummary.team_id && ticketForSummary.ticket_date) {
            await scoring.updateDailySummary(ticketForSummary.team_id, ticketForSummary.ticket_date);
        }
        
        // إذا كان يحتاج متابعة، إنشاء تقرير متابعة
        if (needs_followup) {
            const ticket = await db.queryOne(`
                SELECT t.*, tt.name_ar as ticket_type_name
                FROM tickets t
                JOIN ticket_types tt ON t.ticket_type_id = tt.id
                WHERE t.id = ?
            `, [ticketId]);
            
            const template = await db.queryOne(`
                SELECT * FROM message_templates WHERE template_type = 'followup' AND is_active = 1 LIMIT 1
            `);
            
            let message = template ? template.template_text : '';
            message = message
                .replace('{ticket_number}', ticket.ticket_number)
                .replace('{followup_reason}', followup_reason || '');
            
            await db.query(`
                INSERT INTO followup_reports (ticket_id, quality_staff_id, followup_type, message_template, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [ticketId, req.user.id, 'technical_issue', message, followup_reason]);
        }
        
        res.json({
            success: true,
            message: 'تم حفظ تقييم الجودة بنجاح'
        });
    } catch (error) {
        console.error('Quality review error:', error);
        res.status(500).json({ error: 'خطأ في حفظ تقييم الجودة' });
    }
});

// ==================== Get Ticket Details ====================
app.get('/api/tickets/:id', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        
        const ticket = await db.queryOne(`
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   u.full_name as quality_staff_name
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            JOIN users u ON t.quality_staff_id = u.id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود' });
        }
        
        // جلب الصور
        const photos = await db.query('SELECT * FROM ticket_photos WHERE ticket_id = ?', [ticketId]);
        
        // جلب تقييم الجودة
        const qualityReview = await db.queryOne('SELECT * FROM quality_reviews WHERE ticket_id = ?', [ticketId]);
        
        // جلب النقاط
        const positiveScores = await db.query('SELECT * FROM positive_scores WHERE ticket_id = ?', [ticketId]);
        const negativeScores = await db.query('SELECT * FROM negative_scores WHERE ticket_id = ?', [ticketId]);
        
        // جلب نقاط ticket_points (إدارة النقاط اليدوية)
        const ticketPoints = await db.queryOne('SELECT * FROM ticket_points WHERE ticket_id = ?', [ticketId]);
        if (ticketPoints) {
            ticket.points = ticketPoints.final_points;
            ticket.manager_points = ticketPoints;
        }
        
        const totalPositive = positiveScores.reduce((sum, s) => sum + s.points, 0);
        const totalNegative = negativeScores.reduce((sum, s) => sum + Math.abs(s.points), 0);
        
        // حساب تفاصيل النقاط حسب النظام الجديد
        const basePoints = positiveScores.filter(s => s.score_type === 'ticket_type').reduce((sum, s) => sum + s.points, 0);
        const speedScore = positiveScores.filter(s => s.score_type === 'speed').reduce((sum, s) => sum + s.points, 0);
        const qualityScore = positiveScores.filter(s => s.score_type === 'quality').reduce((sum, s) => sum + s.points, 0);
        const behaviorScore = positiveScores.filter(s => s.score_type === 'behavior').reduce((sum, s) => sum + s.points, 0) 
                            - negativeScores.filter(s => s.penalty_type === 'bad_behavior').reduce((sum, s) => sum + Math.abs(s.points), 0);
        const upsellScore = positiveScores.filter(s => s.score_type === 'upsell').reduce((sum, s) => sum + s.points, 0);
        
        // حساب adjusted time و SLA status
        let adjustedTime = ticket.adjusted_time_minutes || ticket.actual_time_minutes;
        let slaStatus = 'late';
        if (adjustedTime !== null) {
            if (adjustedTime <= ticket.sla_min) {
                slaStatus = 'excellent';
            } else if (adjustedTime <= ticket.sla_max) {
                slaStatus = 'acceptable';
            }
        }
        
        res.json({
            success: true,
            ticket: {
                ...ticket,
                photos,
                qualityReview,
                scores: {
                    positive: positiveScores,
                    negative: negativeScores,
                    totalPositive,
                    totalNegative,
                    netScore: totalPositive - totalNegative,
                    // تفاصيل النقاط حسب النظام الجديد
                    breakdown: {
                        basePoints,
                        speedScore,
                        qualityScore,
                        behaviorScore,
                        upsellScore,
                        penalties: totalNegative,
                        totalScore: totalPositive - totalNegative,
                        adjustedTime,
                        slaStatus
                    }
                }
            }
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ error: 'خطأ في جلب بيانات التكت' });
    }
});

// ==================== Get Tickets List ====================
app.get('/api/tickets', authenticate, async (req, res) => {
    try {
        const { team_id, status, date, page = 1, limit = 50, created_by_me } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        // إذا كان المستخدم موظف جودة، اعرض التكتات المكتملة من الفني افتراضياً
        if (req.user.role === 'quality_staff' && !status) {
            // عرض التكتات المكتملة من الفني (جاهزة للمراجعة)
            // أو التكتات الجديدة التي لم يتم إرسالها للفني بعد
            whereClause += ` AND (
                t.status IN ('COMPLETED', 'UNDER_REVIEW') 
                OR (t.status = 'NEW' AND t.assigned_technician_id IS NULL)
            )`;
        }
        
        if (created_by_me === 'true') {
            if (req.user.role === 'call_center') {
                whereClause += ' AND t.call_center_id = ?';
                params.push(req.user.id);
            } else {
                whereClause += ' AND t.quality_staff_id = ?';
                params.push(req.user.id);
            }
        }
        
        if (team_id) {
            whereClause += ' AND t.team_id = ?';
            params.push(team_id);
        }
        
        if (status) {
            whereClause += ' AND t.status = ?';
            params.push(status);
        }
        
        if (date) {
            whereClause += ' AND DATE(t.created_at) = ?';
            params.push(date);
        }
        
        const offset = (page - 1) * limit;
        const limitParams = [...params, parseInt(limit), offset];
        
        const tickets = await db.query(`
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   u.full_name as quality_staff_name,
                   COALESCE(tp.final_points, 0) as points,
                   tp.manager_id,
                   u2.full_name as manager_name,
                   (SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id) as positive_points,
                   (SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id) as negative_points,
                   ta.status as assignment_status,
                   ta.assignment_type
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            JOIN users u ON t.quality_staff_id = u.id
            LEFT JOIN ticket_assignments ta ON t.id = ta.ticket_id
            LEFT JOIN ticket_points tp ON t.id = tp.ticket_id
            LEFT JOIN users u2 ON tp.manager_id = u2.id
            WHERE ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `, limitParams);
        
        const total = await db.queryOne(`
            SELECT COUNT(*) as count FROM tickets t WHERE ${whereClause}
        `, params);
        
        res.json({
            success: true,
            tickets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ error: 'خطأ في جلب التكتات' });
    }
});

// ==================== Generate Message ====================
app.get('/api/tickets/:id/generate-message', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { message_type } = req.query;
        
        const ticket = await db.queryOne(`
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   qr.*,
                   u.full_name as quality_staff_name
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            LEFT JOIN quality_reviews qr ON t.id = qr.ticket_id
            JOIN users u ON t.quality_staff_id = u.id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود' });
        }
        
        // تحديد نوع الرسالة
        let templateType = message_type || 'connection';
        if (ticket.status === 'postponed') {
            templateType = 'postponed';
        } else if (ticket.needs_followup) {
            templateType = 'followup';
        } else if (ticket.ticket_type_name.includes('صيانة') || ticket.ticket_type_name.includes('قطع')) {
            templateType = 'maintenance';
        }
        
        const template = await db.queryOne(`
            SELECT * FROM message_templates WHERE template_type = ? AND is_active = 1 LIMIT 1
        `, [templateType]);
        
        if (!template) {
            return res.status(404).json({ error: 'قالب الرسالة غير موجود' });
        }
        
        // استبدال المتغيرات
        let message = template.template_text;
        message = message.replace(/{actual_time}/g, ticket.actual_time_minutes || 'غير محدد');
        message = message.replace(/{service_status}/g, ticket.service_status === 'excellent' ? 'ممتاز' : 
                                                      ticket.service_status === 'good' ? 'جيد' : 'رديء');
        message = message.replace(/{team_rating}/g, ticket.team_rating || 'غير محدد');
        message = message.replace(/{ticket_number}/g, ticket.ticket_number);
        message = message.replace(/{postponement_reason}/g, ticket.postponement_reason || 'غير محدد');
        message = message.replace(/{followup_reason}/g, ticket.followup_reason || 'غير محدد');
        message = message.replace(/{quality_staff_name}/g, ticket.quality_staff_name || '');
        
        res.json({
            success: true,
            message: message,
            template_type: templateType
        });
    } catch (error) {
        console.error('Generate message error:', error);
        res.status(500).json({ error: 'خطأ في توليد الرسالة' });
    }
});

// ==================== Generate Daily PDF Report ====================
app.get('/api/reports/daily-pdf', authenticate, async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date || moment().format('YYYY-MM-DD');
        
        // جلب بيانات اليوم
        const tickets = await db.query(`
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   u.full_name as quality_staff_name,
                   (SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id) as positive_points,
                   (SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id) as negative_points,
                   qr.needs_followup,
                   qr.followup_reason,
                   qr.contact_status,
                   qr.service_status
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            JOIN users u ON t.quality_staff_id = u.id
            LEFT JOIN quality_reviews qr ON t.id = qr.ticket_id
            WHERE DATE(t.created_at) = ?
            ORDER BY tm.name, t.created_at
        `, [reportDate]);
        
        const teamStats = await db.query(`
            SELECT 
                tm.id,
                tm.name,
                COUNT(DISTINCT t.id) as total_tickets,
                COALESCE(SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id)), 0) as total_positive,
                COALESCE(SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id)), 0) as total_negative,
                COALESCE(SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id)), 0) - 
                COALESCE(SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id)), 0) as net_points
            FROM teams tm
            LEFT JOIN tickets t ON tm.id = t.team_id AND DATE(t.created_at) = ?
            WHERE tm.is_active = 1
            GROUP BY tm.id, tm.name
            ORDER BY net_points DESC
        `, [reportDate]);
        
        // جلب حالات المتابعة
        const followupTickets = tickets.filter(t => t.needs_followup === 1);
        
        // حساب إحصائيات اليوم
        const totalTickets = tickets.length;
        const completedTickets = tickets.filter(t => t.status === 'completed').length;
        const postponedTickets = tickets.filter(t => t.status === 'postponed').length;
        const totalPositivePoints = tickets.reduce((sum, t) => sum + (t.positive_points || 0), 0);
        const totalNegativePoints = tickets.reduce((sum, t) => sum + (t.negative_points || 0), 0);
        const totalNetPoints = totalPositivePoints - totalNegativePoints;
        
        // التأكد من وجود مجلد uploads
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // مسارات الخطوط العربية
        const fontsDir = path.join(__dirname, 'fonts');
        const arabicFontRegular = path.join(fontsDir, 'Cairo-Regular.ttf');
        const arabicFontBold = path.join(fontsDir, 'Cairo-Bold.ttf');
        
        // دالة مساعدة لكتابة النص العربي
        const writeArabicText = (doc, text, options = {}) => {
            try {
                // استخدام مسار الملف مباشرة (أفضل طريقة مع PDFKit)
                if (options.bold && fs.existsSync(arabicFontBold)) {
                    try {
                        doc.font(arabicFontBold);
                    } catch (e) {
                        doc.font('Helvetica-Bold');
                    }
                } else if (fs.existsSync(arabicFontRegular)) {
                    try {
                        doc.font(arabicFontRegular);
                    } catch (e) {
                        doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica');
                    }
                } else {
                    doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica');
                }
                
                // كتابة النص
                if (options.x !== undefined && options.y !== undefined) {
                    doc.text(text, options.x, options.y, options);
                } else {
                    doc.text(text, options);
                }
            } catch (error) {
                doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica');
                if (options.x !== undefined && options.y !== undefined) {
                    doc.text(text, options.x, options.y, options);
                } else {
                    doc.text(text, options);
                }
            }
        };
        
        // دالة لرسم صندوق ملون
        const drawBox = (doc, x, y, width, height, color, fillColor) => {
            if (fillColor) {
                doc.rect(x, y, width, height).fillColor(fillColor).fill();
            }
            if (color) {
                doc.rect(x, y, width, height).strokeColor(color).lineWidth(1).stroke();
            }
        };
        
        // دالة لرسم جدول
        const drawTable = (doc, startX, startY, columns, rows, cellWidth, cellHeight) => {
            let currentY = startY;
            
            // رسم الخطوط الأفقية
            for (let i = 0; i <= rows.length; i++) {
                doc.moveTo(startX, currentY)
                   .lineTo(startX + (columns.length * cellWidth), currentY)
                   .stroke();
                currentY += cellHeight;
            }
            
            // رسم الخطوط العمودية
            let currentX = startX;
            for (let i = 0; i <= columns.length; i++) {
                doc.moveTo(currentX, startY)
                   .lineTo(currentX, startY + (rows.length * cellHeight))
                   .stroke();
                currentX += cellWidth;
            }
        };
        
        // إنشاء PDF
        const filename = `daily-report-${reportDate}.pdf`;
        const filepath = path.join(uploadsDir, filename);
        
        // إنشاء Promise لانتظار انتهاء الكتابة
        const pdfPromise = new Promise((resolve, reject) => {
            const doc = new PDFDocument({ 
                margin: 50, 
                size: 'A4',
                autoFirstPage: true
            });
            const stream = fs.createWriteStream(filepath);
            
            doc.pipe(stream);
            
            // تسجيل الخطوط العربية إذا كانت موجودة
            let hasArabicFont = false;
            if (fs.existsSync(arabicFontRegular)) {
                try {
                    doc.registerFont('Arabic', arabicFontRegular);
                    hasArabicFont = true;
                } catch (e) {
                    console.error('Error registering Arabic font:', e);
                }
            }
            if (fs.existsSync(arabicFontBold)) {
                try {
                    doc.registerFont('ArabicBold', arabicFontBold);
                } catch (e) {
                    console.error('Error registering Arabic Bold font:', e);
                }
            }
            
            // ========== Header ==========
            // خلفية ملونة للعنوان
            doc.rect(50, 50, 495, 60)
               .fillColor('#1e3a8a')
               .fill()
               .strokeColor('#1e40af')
               .lineWidth(2)
               .stroke();
            
            // العنوان الرئيسي
            doc.fontSize(26);
            if (fs.existsSync(arabicFontBold)) {
                doc.font(arabicFontBold);
            } else {
                doc.font('Helvetica-Bold');
            }
            doc.fillColor('#ffffff')
               .text('Daily Report - Quality & Tickets Management', { 
                   x: 297.5, 
                   y: 65, 
                   align: 'center',
                   width: 490
               });
            
            doc.fontSize(22);
            doc.text('تقرير يومي - إدارة التكتات والجودة', { 
                x: 297.5, 
                y: 85, 
                align: 'center',
                width: 490
            });
            
            // التاريخ
            doc.fontSize(14);
            if (fs.existsSync(arabicFontRegular)) {
                doc.font(arabicFontRegular);
            } else {
                doc.font('Helvetica');
            }
            doc.text(`Date: ${moment(reportDate).format('YYYY-MM-DD')} | التاريخ: ${moment(reportDate).format('YYYY-MM-DD')}`, { 
                x: 297.5, 
                y: 100, 
                align: 'center',
                width: 490
            });
            
            doc.fillColor('#000000'); // إعادة تعيين اللون
            doc.y = 130;
            doc.moveDown();
            
            // ========== ملخص اليوم (Summary) ==========
            const summaryY = doc.y;
            
            // عنوان القسم
            doc.fontSize(18);
            if (fs.existsSync(arabicFontBold)) {
                doc.font(arabicFontBold);
            } else {
                doc.font('Helvetica-Bold');
            }
            doc.fillColor('#1e40af');
            writeArabicText(doc, 'ملخص اليوم | Daily Summary', { align: 'right', bold: true });
            doc.fillColor('#000000');
            doc.moveDown(0.5);
            
            // صندوق ملون للخلفية
            const summaryBoxY = doc.y;
            doc.rect(50, summaryBoxY - 5, 495, 100)
               .fillColor('#f0f9ff')
               .fill()
               .strokeColor('#3b82f6')
               .lineWidth(1.5)
               .stroke();
            
            // جدول الملخص
            doc.fontSize(11);
            if (fs.existsSync(arabicFontRegular)) {
                doc.font(arabicFontRegular);
            } else {
                doc.font('Helvetica');
            }
            
            const summaryData = [
                { ar: 'إجمالي التكتات', en: 'Total Tickets', value: totalTickets, color: '#3b82f6' },
                { ar: 'التكتات المكتملة', en: 'Completed', value: completedTickets, color: '#10b981' },
                { ar: 'التكتات المؤجلة', en: 'Postponed', value: postponedTickets, color: '#f59e0b' },
                { ar: 'النقاط الإيجابية', en: 'Positive Points', value: totalPositivePoints, color: '#10b981' },
                { ar: 'النقاط السالبة', en: 'Negative Points', value: totalNegativePoints, color: '#ef4444' },
                { ar: 'النقاط الصافية', en: 'Net Points', value: totalNetPoints, color: '#6366f1', bold: true }
            ];
            
            let currentSummaryY = summaryBoxY + 10;
            summaryData.forEach((item, index) => {
                const boxHeight = 15;
                const boxY = currentSummaryY + (index * boxHeight);
                
                // خلفية ملونة للصف
                doc.rect(55, boxY - 2, 485, boxHeight - 2)
                   .fillColor(index % 2 === 0 ? '#ffffff' : '#f8fafc')
                   .fill();
                
                // النص العربي
                doc.fontSize(10);
                if (item.bold) {
                    writeArabicText(doc, item.ar, { 
                        x: 60, 
                        y: boxY, 
                        width: 200, 
                        align: 'right',
                        bold: true
                    });
                } else {
                    writeArabicText(doc, item.ar, { 
                        x: 60, 
                        y: boxY, 
                        width: 200, 
                        align: 'right'
                    });
                }
                
                // النص الإنجليزي
                doc.font('Helvetica');
                if (item.bold) {
                    doc.font('Helvetica-Bold');
                }
                doc.fillColor('#1e293b');
                doc.text(item.en, 270, boxY, { width: 150 });
                
                // القيمة
                doc.font('Helvetica-Bold');
                doc.fillColor(item.color);
                doc.text(item.value.toString(), 430, boxY, { width: 100, align: 'right' });
                doc.fillColor('#000000');
            });
            
            doc.y = summaryBoxY + 110;
            doc.moveDown();
            
            // ========== ترتيب الفرق (Team Rankings) ==========
            // عنوان القسم
            doc.fontSize(18);
            if (fs.existsSync(arabicFontBold)) {
                doc.font(arabicFontBold);
            } else {
                doc.font('Helvetica-Bold');
            }
            doc.fillColor('#1e40af');
            writeArabicText(doc, 'ترتيب الفرق | Team Rankings', { align: 'right', bold: true });
            doc.fillColor('#000000');
            doc.moveDown(0.5);
            
            // جدول الترتيب
            const tableStartY = doc.y;
            const tableStartX = 50;
            const colWidths = [50, 200, 80, 80, 80, 85]; // Rank, Team, Tickets, Positive, Negative, Net
            const headerHeight = 25;
            const rowHeight = 20;
            
            // رأس الجدول
            doc.rect(tableStartX, tableStartY, 495, headerHeight)
               .fillColor('#1e40af')
               .fill();
            
            doc.fontSize(10);
            doc.font('Helvetica-Bold');
            doc.fillColor('#ffffff');
            const headers = [
                { text: 'Rank', ar: 'الترتيب', x: tableStartX + 10 },
                { text: 'Team | الفريق', x: tableStartX + 60 },
                { text: 'Tickets', ar: 'التكتات', x: tableStartX + 260 },
                { text: 'Positive', ar: 'إيجابية', x: tableStartX + 340 },
                { text: 'Negative', ar: 'سالبة', x: tableStartX + 420 },
                { text: 'Net', ar: 'صافية', x: tableStartX + 500 }
            ];
            
            headers.forEach(header => {
                doc.text(header.text, header.x, tableStartY + 8, { width: colWidths[headers.indexOf(header)] - 10 });
            });
            
            doc.fillColor('#000000');
            doc.y = tableStartY + headerHeight;
            
            // بيانات الفرق
            teamStats.forEach((team, index) => {
                const netScore = (team.total_positive || 0) - (team.total_negative || 0);
                const rank = index + 1;
                const rowY = doc.y;
                
                // خلفية متناوبة
                doc.rect(tableStartX, rowY, 495, rowHeight)
                   .fillColor(index % 2 === 0 ? '#ffffff' : '#f8fafc')
                   .fill()
                   .strokeColor('#e2e8f0')
                   .lineWidth(0.5)
                   .stroke();
                
                // الترتيب
                doc.fontSize(12);
                doc.font('Helvetica-Bold');
                if (rank === 1) doc.fillColor('#fbbf24');
                else if (rank === 2) doc.fillColor('#94a3b8');
                else if (rank === 3) doc.fillColor('#f59e0b');
                else doc.fillColor('#64748b');
                doc.text(`#${rank}`, tableStartX + 15, rowY + 5, { width: 30, align: 'center' });
                doc.fillColor('#000000');
                
                // اسم الفريق
                doc.fontSize(11);
                writeArabicText(doc, team.name, { 
                    x: tableStartX + 60, 
                    y: rowY + 5, 
                    width: 190,
                    bold: true
                });
                
                // البيانات
                doc.font('Helvetica');
                doc.fontSize(10);
                doc.text((team.total_tickets || 0).toString(), tableStartX + 260, rowY + 5, { width: 70, align: 'center' });
                doc.fillColor('#10b981');
                doc.text((team.total_positive || 0).toString(), tableStartX + 340, rowY + 5, { width: 70, align: 'center' });
                doc.fillColor('#ef4444');
                doc.text((team.total_negative || 0).toString(), tableStartX + 420, rowY + 5, { width: 70, align: 'center' });
                doc.fillColor('#6366f1');
                doc.font('Helvetica-Bold');
                doc.text(netScore.toString(), tableStartX + 500, rowY + 5, { width: 75, align: 'center' });
                doc.fillColor('#000000');
                
                doc.y = rowY + rowHeight;
            });
            
            // خط فاصل أسفل الجدول
            doc.moveTo(tableStartX, doc.y).lineTo(tableStartX + 495, doc.y).stroke();
            doc.moveDown();
            
            // ========== تفاصيل التكتات (Ticket Details) ==========
            // عنوان القسم
            doc.fontSize(18);
            if (fs.existsSync(arabicFontBold)) {
                doc.font(arabicFontBold);
            } else {
                doc.font('Helvetica-Bold');
            }
            doc.fillColor('#1e40af');
            writeArabicText(doc, 'تفاصيل التكتات | Ticket Details', { align: 'right', bold: true });
            doc.fillColor('#000000');
            doc.moveDown(0.5);
            
            // تجميع التكتات حسب الفريق
            const ticketsByTeam = {};
            tickets.forEach(ticket => {
                if (!ticketsByTeam[ticket.team_name]) {
                    ticketsByTeam[ticket.team_name] = [];
                }
                ticketsByTeam[ticket.team_name].push(ticket);
            });
            
            Object.keys(ticketsByTeam).forEach(teamName => {
                // عنوان الفريق
                doc.fontSize(14);
                if (fs.existsSync(arabicFontBold)) {
                    doc.font(arabicFontBold);
                } else {
                    doc.font('Helvetica-Bold');
                }
                doc.fillColor('#1e40af');
                doc.rect(50, doc.y - 3, 495, 20)
                   .fillColor('#eff6ff')
                   .fill()
                   .strokeColor('#3b82f6')
                   .lineWidth(1)
                   .stroke();
                writeArabicText(doc, `Team: ${teamName} | فريق: ${teamName}`, { 
                    x: 545, 
                    y: doc.y - 15, 
                    width: 485,
                    align: 'right',
                    bold: true 
                });
                doc.fillColor('#000000');
                doc.moveDown(1);
                
                // جدول التكتات
                const ticketTableY = doc.y;
                const ticketColWidths = [40, 80, 150, 60, 60, 60, 55]; // #, Ticket#, Type, Status, Time, Points, Net
                
                // رأس الجدول
                doc.rect(50, ticketTableY, 495, 20)
                   .fillColor('#64748b')
                   .fill();
                
                doc.fontSize(9);
                doc.font('Helvetica-Bold');
                doc.fillColor('#ffffff');
                const ticketHeaders = [
                    { text: '#', x: 55 },
                    { text: 'Ticket#', ar: 'رقم', x: 95 },
                    { text: 'Type | النوع', x: 175 },
                    { text: 'Status', ar: 'الحالة', x: 325 },
                    { text: 'Time', ar: 'الوقت', x: 385 },
                    { text: 'Points', ar: 'النقاط', x: 445 },
                    { text: 'Net', ar: 'صافي', x: 505 }
                ];
                
                ticketHeaders.forEach(header => {
                    doc.text(header.text, header.x, ticketTableY + 6, { width: ticketColWidths[ticketHeaders.indexOf(header)] - 5 });
                });
                
                doc.fillColor('#000000');
                doc.y = ticketTableY + 20;
                
                ticketsByTeam[teamName].forEach((ticket, index) => {
                    const netScore = (ticket.positive_points || 0) - (ticket.negative_points || 0);
                    const rowY = doc.y;
                    const isPostponed = ticket.status === 'postponed';
                    
                    // خلفية الصف
                    let bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    if (isPostponed) bgColor = '#fef2f2';
                    
                    doc.rect(50, rowY, 495, 18)
                       .fillColor(bgColor)
                       .fill()
                       .strokeColor(isPostponed ? '#ef4444' : '#e2e8f0')
                       .lineWidth(isPostponed ? 1 : 0.5)
                       .stroke();
                    
                    // رقم التسلسل
                    doc.fontSize(9);
                    doc.font('Helvetica');
                    doc.text((index + 1).toString(), 55, rowY + 5, { width: 35, align: 'center' });
                    
                    // رقم التكت
                    doc.font('Helvetica-Bold');
                    doc.text(ticket.ticket_number, 95, rowY + 5, { width: 75 });
                    
                    // النوع
                    doc.fontSize(8);
                    writeArabicText(doc, ticket.ticket_type_name || '', { 
                        x: 175, 
                        y: rowY + 5, 
                        width: 145 
                    });
                    
                    // الحالة
                    doc.fontSize(8);
                    let statusText = '';
                    let statusTextAr = '';
                    let statusColor = '#64748b';
                    if (ticket.status === 'completed') {
                        statusText = 'Completed';
                        statusTextAr = 'مكتمل';
                        statusColor = '#10b981';
                    } else if (ticket.status === 'postponed') {
                        statusText = 'Postponed';
                        statusTextAr = 'مؤجل';
                        statusColor = '#ef4444';
                    } else if (ticket.status === 'in_progress') {
                        statusText = 'In Progress';
                        statusTextAr = 'قيد التنفيذ';
                        statusColor = '#3b82f6';
                    } else {
                        statusText = 'Pending';
                        statusTextAr = 'معلق';
                        statusColor = '#f59e0b';
                    }
                    doc.fillColor(statusColor);
                    doc.font('Helvetica');
                    doc.fontSize(7);
                    doc.text(statusText, 325, rowY + 2, { width: 55, align: 'center' });
                    writeArabicText(doc, statusTextAr, { 
                        x: 325, 
                        y: rowY + 9, 
                        width: 55,
                        align: 'center'
                    });
                    doc.fillColor('#000000');
                    
                    // الوقت
                    if (ticket.actual_time_minutes && ticket.actual_time_minutes > 0) {
                        const hours = Math.floor(ticket.actual_time_minutes / 60);
                        const minutes = ticket.actual_time_minutes % 60;
                        doc.fontSize(8);
                        doc.font('Helvetica');
                        doc.text(`${hours}h ${minutes}m`, 385, rowY + 5, { width: 55, align: 'center' });
                    } else {
                        doc.font('Helvetica');
                        doc.text('-', 385, rowY + 5, { width: 55, align: 'center' });
                    }
                    
                    // النقاط
                    doc.fontSize(8);
                    doc.font('Helvetica');
                    doc.text(`${ticket.positive_points || 0} / ${ticket.negative_points || 0}`, 445, rowY + 5, { width: 55, align: 'center' });
                    
                    // النقاط الصافية
                    doc.font('Helvetica-Bold');
                    doc.fontSize(9);
                    if (netScore >= 0) {
                        doc.fillColor('#10b981');
                    } else {
                        doc.fillColor('#ef4444');
                    }
                    doc.text(netScore.toString(), 505, rowY + 5, { width: 50, align: 'center' });
                    doc.fillColor('#000000');
                    
                    doc.y = rowY + 18;
                });
                
                doc.moveDown(0.5);
            });
            
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown();
            
            // ========== حالات المتابعة (Follow-up Cases) ==========
            if (followupTickets.length > 0) {
                // عنوان القسم
                doc.fontSize(18);
                if (fs.existsSync(arabicFontBold)) {
                    doc.font(arabicFontBold);
                } else {
                    doc.font('Helvetica-Bold');
                }
                doc.fillColor('#dc2626');
                writeArabicText(doc, 'حالات المتابعة | Follow-up Cases', { align: 'right', bold: true });
                doc.fillColor('#000000');
                doc.moveDown(0.5);
                
                followupTickets.forEach((ticket, index) => {
                    const boxY = doc.y;
                    
                    // صندوق ملون
                    doc.rect(50, boxY - 3, 495, 50)
                       .fillColor('#fef2f2')
                       .fill()
                       .strokeColor('#ef4444')
                       .lineWidth(1.5)
                       .stroke();
                    
                    doc.fontSize(11);
                    if (fs.existsSync(arabicFontBold)) {
                        doc.font(arabicFontBold);
                    } else {
                        doc.font('Helvetica-Bold');
                    }
                    doc.fillColor('#dc2626');
                    writeArabicText(doc, `${index + 1}. Ticket# ${ticket.ticket_number} | التكت رقم: ${ticket.ticket_number}`, { 
                        x: 55, 
                        y: boxY + 5, 
                        width: 485,
                        align: 'right'
                    });
                    
                    doc.fontSize(9);
                    if (fs.existsSync(arabicFontRegular)) {
                        doc.font(arabicFontRegular);
                    } else {
                        doc.font('Helvetica');
                    }
                    doc.fillColor('#000000');
                    doc.text(`Team: ${ticket.team_name} | الفريق: ${ticket.team_name}`, 55, boxY + 18, { width: 240 });
                    doc.text(`Type: ${ticket.ticket_type_name} | النوع: ${ticket.ticket_type_name}`, 300, boxY + 18, { width: 240 });
                    
                    if (ticket.followup_reason) {
                        doc.text(`Reason: ${ticket.followup_reason} | السبب: ${ticket.followup_reason}`, 55, boxY + 32, { width: 485 });
                    }
                    
                    doc.y = boxY + 55;
                    doc.moveDown(0.3);
                });
                
                doc.moveDown();
            }
            
            // ========== توقيع موظف الجودة (Quality Staff Signature) ==========
            doc.moveDown(2);
            doc.rect(350, doc.y, 195, 60)
               .strokeColor('#3b82f6')
               .lineWidth(1)
               .stroke();
            
            doc.fontSize(11);
            if (fs.existsSync(arabicFontRegular)) {
                doc.font(arabicFontRegular);
            } else {
                doc.font('Helvetica');
            }
            doc.text('Quality Staff Signature | توقيع موظف الجودة:', 355, doc.y + 5, { width: 185, align: 'right' });
            doc.moveDown(3);
            doc.moveTo(360, doc.y).lineTo(535, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(9);
            doc.text('Name & Signature | الاسم والتوقيع', 355, doc.y, { width: 185, align: 'right' });
            
            // ========== تذييل الصفحة (Footer) ==========
            const pageHeight = doc.page.height;
            const pageWidth = doc.page.width;
            
            // خط فاصل
            doc.moveTo(50, pageHeight - 40).lineTo(545, pageHeight - 40).stroke();
            
            doc.fontSize(8);
            doc.font('Helvetica');
            doc.fillColor('#64748b');
            doc.text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')} | تم الإنشاء: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, 
                50, pageHeight - 30, { width: 200, align: 'left' });
            doc.text(`Page ${doc.bufferedPageRange().start + 1} | الصفحة ${doc.bufferedPageRange().start + 1}`, 
                pageWidth - 100, pageHeight - 30, { width: 95, align: 'right' });
            doc.fillColor('#000000');
            
            // معالجة الأحداث
            stream.on('finish', () => {
                resolve();
            });
            
            stream.on('error', (err) => {
                reject(err);
            });
            
            doc.end();
        });
        
        // انتظار انتهاء الكتابة
        await pdfPromise;
        
        // التحقق من وجود الملف
        if (!fs.existsSync(filepath)) {
            throw new Error('فشل في إنشاء ملف PDF');
        }
        
        res.json({
            success: true,
            filename: filename,
            url: `/uploads/${filename}`
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'خطأ في توليد التقرير' });
    }
});

// ==================== Get Team Scores ====================
app.get('/api/teams/:id/scores', authenticate, async (req, res) => {
    try {
        const teamId = req.params.id;
        const { period = 'daily', date } = req.query;
        
        let scores;
        if (period === 'daily') {
            const targetDate = date || moment().format('YYYY-MM-DD');
            scores = await db.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as ticket_count,
                    SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = tickets.id)) as positive_points,
                    SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = tickets.id)) as negative_points
                FROM tickets
                WHERE team_id = ? AND DATE(created_at) = ?
                GROUP BY DATE(created_at)
            `, [teamId, targetDate]);
        } else if (period === 'monthly') {
            const targetMonth = date || moment().format('YYYY-MM');
            scores = await db.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as ticket_count,
                    SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = tickets.id)) as positive_points,
                    SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = tickets.id)) as negative_points
                FROM tickets
                WHERE team_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            `, [teamId, targetMonth]);
        }
        
        res.json({ success: true, scores });
    } catch (error) {
        console.error('Get team scores error:', error);
        res.status(500).json({ error: 'خطأ في جلب النقاط' });
    }
});

// ==================== Users Management (Admin Only) ====================
// Get all users
app.get('/api/users', authenticate, async (req, res) => {
    try {
        console.log('GET /api/users - User role:', req.user?.role);
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const users = await db.query(`
            SELECT u.id, u.username, u.full_name, u.role, u.team_id, u.is_active, u.created_at,
                   t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.created_at DESC
        `);
        
        console.log('Users found:', users.length);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'خطأ في جلب المستخدمين', details: error.message });
    }
});

// Create new user - يدعم @domain تلقائياً
app.post('/api/users', authenticate, async (req, res) => {
    try {
        // Owner يمكنه إنشاء موظفين لأي شركة
        // Admin يمكنه إنشاء موظفين لشركته فقط
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { username, password, full_name, role, team_id, company_id } = req.body;
        
        // تحديد company_id
        let finalCompanyId = company_id;
        if (req.user.role === 'admin') {
            if (!req.user.company_id) {
                return res.status(403).json({ error: 'المدير غير مرتبط بشركة' });
            }
            finalCompanyId = req.user.company_id; // Admin يمكنه إنشاء موظفين لشركته فقط
        }
        
        // جلب domain الشركة
        let domain = null;
        let finalUsername = username;
        
        if (finalCompanyId) {
            const company = await db.queryOne('SELECT domain FROM companies WHERE id = ?', [finalCompanyId]);
            if (!company) {
                return res.status(400).json({ error: 'الشركة غير موجودة' });
            }
            domain = company.domain;
            
            // إضافة @domain إذا لم يكن موجوداً
            if (!username.includes('@')) {
                finalUsername = `${username}@${domain}`;
            } else {
                // التحقق من أن @domain صحيح
                const usernameParts = username.split('@');
                if (usernameParts.length !== 2) {
                    return res.status(400).json({ error: 'صيغة اسم المستخدم غير صحيحة' });
                }
                const usernameDomain = usernameParts[1];
                if (usernameDomain !== domain) {
                    return res.status(400).json({ error: `اسم المستخدم يجب أن ينتهي بـ @${domain}` });
                }
            }
        } else {
            // حساب بدون شركة (owner فقط)
            if (req.user.role !== 'owner') {
                return res.status(403).json({ error: 'فقط مالك الموقع يمكنه إنشاء حسابات بدون شركة' });
            }
            // إذا كان owner يريد إنشاء حساب بدون شركة، نستخدم username كما هو
            finalUsername = username;
        }
        
        // التحقق من عدم وجود username
        const existingUser = await db.queryOne('SELECT id FROM users WHERE username = ?', [finalUsername]);
        if (existingUser) {
            return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
        }
        
        // تحديد role افتراضي
        const finalRole = role || 'technician';
        
        // التحقق من الحقول المطلوبة
        if (!finalUsername || !password || !full_name) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.query(`
            INSERT INTO users (username, password_hash, full_name, role, company_id, team_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [finalUsername, passwordHash, full_name, finalRole, finalCompanyId, team_id || null]);
        
        const userId = result.insertId;
        
        // Add to team_members إذا كان team_id موجود
        if (team_id) {
            await db.query(`
                INSERT INTO team_members (team_id, user_id)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE team_id = VALUES(team_id)
            `, [team_id, userId]);
        }
        
        // تحديث عدد الموظفين في الشركة
        if (finalCompanyId) {
            await db.query(`
                UPDATE companies 
                SET current_employees = (
                    SELECT COUNT(*) 
                    FROM users 
                    WHERE company_id = ? AND role != 'admin' AND role != 'owner'
                )
                WHERE id = ?
            `, [finalCompanyId, finalCompanyId]);
        }
        
        res.json({
            success: true,
            userId: userId,
            username: finalUsername,
            message: 'تم إنشاء الحساب بنجاح'
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'خطأ في إنشاء الحساب', details: error.message });
    }
});

// Update user
app.put('/api/users/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const userId = req.params.id;
        const { username, password, full_name, team_id, is_active } = req.body;
        
        // Don't allow updating admin users
        const user = await db.queryOne('SELECT role FROM users WHERE id = ?', [userId]);
        if (user && user.role === 'admin' && userId != req.user.id) {
            return res.status(403).json({ error: 'لا يمكن تعديل حساب المدير' });
        }
        
        let updateQuery = 'UPDATE users SET full_name = ?, team_id = ?';
        let updateParams = [full_name, team_id];
        
        if (username) {
            // Check if username exists for other users
            const existingUser = await db.queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existingUser) {
                return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
            }
            updateQuery += ', username = ?';
            updateParams.push(username);
        }
        
        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            updateQuery += ', password_hash = ?';
            updateParams.push(passwordHash);
        }
        
        if (is_active !== undefined) {
            updateQuery += ', is_active = ?';
            updateParams.push(is_active ? 1 : 0);
        }
        
        updateQuery += ' WHERE id = ?';
        updateParams.push(userId);
        
        await db.query(updateQuery, updateParams);
        
        // Update team_members
        if (team_id) {
            await db.query(`
                INSERT INTO team_members (team_id, user_id)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE team_id = VALUES(team_id)
            `, [team_id, userId]);
        }
        
        res.json({ success: true, message: 'تم تحديث الحساب بنجاح' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'خطأ في تحديث الحساب' });
    }
});

// Delete user (soft delete - freeze account)
app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const userId = req.params.id;
        
        // Don't allow deleting admin users or self
        const user = await db.queryOne('SELECT role FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        if (user.role === 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'لا يمكن حذف حساب المدير' });
        }
        
        if (user.role === 'owner') {
            return res.status(403).json({ error: 'لا يمكن حذف حساب المالك' });
        }
        
        if (userId == req.user.id) {
            return res.status(403).json({ error: 'لا يمكن حذف حسابك الخاص' });
        }
        
        // Soft delete (set is_active = 0) - تجميد الحساب
        await db.query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
        
        res.json({ success: true, message: 'تم تجميد الحساب بنجاح' });
    } catch (error) {
        console.error('Freeze user error:', error);
        res.status(500).json({ error: 'خطأ في تجميد الحساب' });
    }
});

// Permanently delete user (hard delete)
app.delete('/api/users/:id/permanent', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const userId = req.params.id;
        
        // Don't allow deleting admin users or self
        const user = await db.queryOne('SELECT role FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        if (user.role === 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'لا يمكن حذف حساب المدير نهائياً' });
        }
        
        if (user.role === 'owner') {
            return res.status(403).json({ error: 'لا يمكن حذف حساب المالك' });
        }
        
        if (userId == req.user.id) {
            return res.status(403).json({ error: 'لا يمكن حذف حسابك الخاص' });
        }
        
        // Get company_id before deletion
        const userToDelete = await db.queryOne('SELECT company_id FROM users WHERE id = ?', [userId]);
        const companyId = userToDelete ? userToDelete.company_id : null;
        
        // Hard delete - حذف نهائي من قاعدة البيانات
        // First, remove from team_members
        await db.query('DELETE FROM team_members WHERE user_id = ?', [userId]);
        
        // Delete user
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        
        // Update company employee count if user had company_id
        if (companyId) {
            await db.query(`
                UPDATE companies 
                SET current_employees = (
                    SELECT COUNT(*) 
                    FROM users 
                    WHERE company_id = ? AND role != 'admin' AND role != 'owner'
                )
                WHERE id = ?
            `, [companyId, companyId]);
        }
        
        res.json({ success: true, message: 'تم حذف الحساب نهائياً بنجاح' });
    } catch (error) {
        console.error('Permanent delete user error:', error);
        res.status(500).json({ error: 'خطأ في حذف الحساب' });
    }
});

// Freeze/Unfreeze user account
app.put('/api/users/:id/freeze', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const userId = req.params.id;
        const { is_frozen } = req.body; // true to freeze, false to unfreeze
        
        // Don't allow freezing admin users or self
        const user = await db.queryOne('SELECT role, company_id FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        if (user.role === 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'لا يمكن تجميد حساب المدير' });
        }
        
        if (user.role === 'owner') {
            return res.status(403).json({ error: 'لا يمكن تجميد حساب المالك' });
        }
        
        if (userId == req.user.id) {
            return res.status(403).json({ error: 'لا يمكن تجميد حسابك الخاص' });
        }
        
        // Freeze/Unfreeze user
        await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_frozen ? 0 : 1, userId]);
        
        // إذا كان المستخدم هو مدير شركة (admin role مع company_id)، قم بتجميد/إلغاء تجميد جميع موظفي الشركة
        if (user.role === 'admin' && user.company_id) {
            if (is_frozen) {
                // تجميد جميع موظفي الشركة
                await db.query(
                    'UPDATE users SET is_active = 0 WHERE company_id = ? AND id != ?',
                    [user.company_id, userId]
                );
                
                // تجميد الشركة أيضاً
                await db.query(
                    'UPDATE companies SET is_active = 0 WHERE id = ?',
                    [user.company_id]
                );
            } else {
                // إلغاء تجميد جميع موظفي الشركة
                await db.query(
                    'UPDATE users SET is_active = 1 WHERE company_id = ?',
                    [user.company_id]
                );
                
                // إلغاء تجميد الشركة
                await db.query(
                    'UPDATE companies SET is_active = 1 WHERE id = ?',
                    [user.company_id]
                );
            }
        }
        
        res.json({ 
            success: true, 
            message: is_frozen 
                ? (user.role === 'admin' && user.company_id 
                    ? 'تم تجميد حساب المدير وجميع موظفي الشركة بنجاح' 
                    : 'تم تجميد الحساب بنجاح')
                : (user.role === 'admin' && user.company_id 
                    ? 'تم إلغاء تجميد حساب المدير وجميع موظفي الشركة بنجاح' 
                    : 'تم إلغاء تجميد الحساب بنجاح')
        });
    } catch (error) {
        console.error('Freeze/Unfreeze user error:', error);
        res.status(500).json({ error: 'خطأ في تجميد/إلغاء تجميد الحساب' });
    }
});

// Get team rankings for technicians (transparent view)
app.get('/api/team-rankings', authenticate, async (req, res) => {
    try {
        const period = req.query.period || 'daily'; // daily, weekly, monthly
        const date = req.query.date || moment().format('YYYY-MM-DD');
        
        let dateCondition = '';
        if (period === 'daily') {
            dateCondition = `AND DATE(ds.date) = '${date}'`;
        } else if (period === 'weekly') {
            dateCondition = `AND ds.date >= DATE_SUB('${date}', INTERVAL 7 DAY) AND ds.date <= '${date}'`;
        } else if (period === 'monthly') {
            dateCondition = `AND DATE_FORMAT(ds.date, '%Y-%m') = DATE_FORMAT('${date}', '%Y-%m')`;
        }
        
        // Move date condition to LEFT JOIN to ensure all teams appear even with 0 points
        const rankings = await db.query(`
            SELECT 
                t.id,
                t.name,
                t.shift,
                COALESCE(SUM(ds.net_points), 0) as total_points,
                COALESCE(SUM(ds.total_tickets), 0) as total_tickets,
                COALESCE(SUM(ds.total_positive_points), 0) as positive_points,
                COALESCE(SUM(ds.total_negative_points), 0) as negative_points
            FROM teams t
            LEFT JOIN daily_summaries ds ON t.id = ds.team_id ${dateCondition}
            WHERE t.is_active = 1
            GROUP BY t.id, t.name, t.shift
            ORDER BY total_points DESC
        `);
        
        res.json({ success: true, rankings, period, date });
    } catch (error) {
        console.error('Get team rankings error:', error);
        res.status(500).json({ error: 'خطأ في جلب التصنيف' });
    }
});

// ==================== Technician Endpoints ====================

// Get tickets assigned to technician
app.get('/api/technician/tickets', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'technician') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { status } = req.query; // 'active' or 'completed'
        const technicianId = req.user.id;
        
        let whereClause = 't.assigned_technician_id = ?';
        const params = [technicianId];
        
        if (status === 'active') {
            // عرض التكتات المخصصة أو قيد العمل
            whereClause += ' AND t.status IN (?, ?)';
            params.push('ASSIGNED', 'IN_PROGRESS');
        } else if (status === 'completed') {
            // عرض التكتات المكتملة
            whereClause += ' AND t.status = ?';
            params.push('COMPLETED');
        }
        
        const tickets = await db.query(`
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   u.full_name as quality_staff_name
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            JOIN users u ON t.quality_staff_id = u.id
            WHERE ${whereClause}
            ORDER BY t.created_at DESC
        `, params);
        
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Get technician tickets error:', error);
        res.status(500).json({ error: 'خطأ في جلب التكتات' });
    }
});

// Start work on ticket (technician starts working)
app.post('/api/technician/tickets/:id/start-work', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'technician') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const ticketId = parseInt(req.params.id);
        const technicianId = req.user.id;
        
        // التحقق من أن التكت مخصص لهذا الفني
        const ticket = await db.queryOne(`
            SELECT * FROM tickets 
            WHERE id = ? AND assigned_technician_id = ? AND status = 'ASSIGNED'
        `, [ticketId, technicianId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود أو غير مخصص لك' });
        }
        
        // تحديث الحالة إلى IN_PROGRESS
        await db.query(`
            UPDATE tickets 
            SET status = 'IN_PROGRESS',
                time_received = COALESCE(time_received, NOW()),
                updated_at = NOW()
            WHERE id = ?
        `, [ticketId]);
        
        res.json({ success: true, message: 'تم بدء العمل على التكت' });
    } catch (error) {
        console.error('Start work error:', error);
        res.status(500).json({ error: 'خطأ في بدء العمل' });
    }
});

// Complete ticket (technician marks ticket as completed)
app.post('/api/technician/tickets/:id/complete', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'technician') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const ticketId = parseInt(req.params.id);
        const technicianId = req.user.id;
        
        // التحقق من أن التكت قيد العمل
        const ticket = await db.queryOne(`
            SELECT t.*, 
                   TIMESTAMPDIFF(MINUTE, COALESCE(t.time_received, t.created_at), NOW()) as current_time_minutes
            FROM tickets t
            WHERE t.id = ? AND t.assigned_technician_id = ? 
            AND t.status IN ('ASSIGNED', 'IN_PROGRESS')
        `, [ticketId, technicianId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود أو لم يبدأ العمل عليه' });
        }
        
        // حساب الوقت المستغرق
        const timeReceived = ticket.time_received || ticket.created_at;
        const currentTimeMinutes = ticket.current_time_minutes || 0;
        
        // تحديث التكت: تغيير الحالة إلى COMPLETED (جاهز للمراجعة)
        await db.query(`
            UPDATE tickets 
            SET status = 'COMPLETED',
                technician_completed_at = NOW(),
                actual_time_minutes = ?,
                time_received = COALESCE(time_received, NOW()),
                updated_at = NOW()
            WHERE id = ?
        `, [currentTimeMinutes, ticketId]);
        
        // إنشاء إشعار لموظف الجودة
        const qualityStaffId = ticket.quality_staff_id;
        await db.query(`
            INSERT INTO notifications (user_id, type, title, message, related_ticket_id)
            VALUES (?, 'ticket_completed', 'تكت منتهي', 
                   CONCAT('تم إنهاء التكت رقم ', ?, ' من الفني. جاهز للمراجعة والتحقق'), ?)
        `, [qualityStaffId, ticket.ticket_number, ticketId]);
        
        res.json({ 
            success: true, 
            message: 'تم إنهاء التكت بنجاح. سيتم إرسال إشعار لموظف الجودة للمراجعة' 
        });
    } catch (error) {
        console.error('Complete ticket error:', error);
        res.status(500).json({ error: 'خطأ في إنهاء التكت' });
    }
});

// ==================== Assign Ticket to Technician ====================
app.post('/api/tickets/:id/assign-to-technician', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'quality_staff') {
            return res.status(403).json({ error: 'غير مصرح - فقط موظف الجودة يمكنه إرسال التكتات' });
        }
        
        const ticketId = parseInt(req.params.id);
        const { technician_id } = req.body;
        
        if (!technician_id) {
            return res.status(400).json({ error: 'معرف الفني مطلوب' });
        }
        
        // التحقق من أن التكت موجود وحالته NEW
        const ticket = await db.queryOne(`
            SELECT * FROM tickets WHERE id = ? AND status = 'NEW'
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود أو تم إرساله مسبقاً' });
        }
        
        // التحقق من أن الفني موجود
        const technician = await db.queryOne(`
            SELECT id, full_name FROM users WHERE id = ? AND role = 'technician' AND is_active = 1
        `, [technician_id]);
        
        if (!technician) {
            return res.status(404).json({ error: 'الفني غير موجود' });
        }
        
        // تحديث التكت
        await db.query(`
            UPDATE tickets 
            SET status = 'ASSIGNED',
                assigned_technician_id = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [technician_id, ticketId]);
        
        // إنشاء إشعار للفني
        await db.query(`
            INSERT INTO notifications (user_id, type, title, message, related_ticket_id)
            VALUES (?, 'ticket_assigned', 'تكت جديد', 
                   CONCAT('تم تخصيص تكت جديد لك رقم: ', ?), ?)
        `, [technician_id, ticket.ticket_number, ticketId]);
        
        res.json({ 
            success: true, 
            message: 'تم إرسال التكت للفني بنجاح' 
        });
    } catch (error) {
        console.error('Assign ticket error:', error);
        res.status(500).json({ error: 'خطأ في إرسال التكت' });
    }
});

// ==================== Review Ticket (Quality Staff) ====================
app.post('/api/tickets/:id/review', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'quality_staff') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const ticketId = parseInt(req.params.id);
        const { decision, followup_reason } = req.body; // decision: 'approve' or 'followup'
        
        if (!decision) {
            return res.status(400).json({ error: 'قرار المراجعة مطلوب' });
        }
        
        // التحقق من أن التكت موجود وحالته COMPLETED
        const ticket = await db.queryOne(`
            SELECT * FROM tickets WHERE id = ? AND status = 'COMPLETED'
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'التكت غير موجود أو لم يكتمل بعد' });
        }
        
        let newStatus = 'CLOSED';
        if (decision === 'followup') {
            newStatus = 'FOLLOW_UP';
        } else if (decision === 'approve') {
            newStatus = 'CLOSED';
        }
        
        // تحديث التكت
        await db.query(`
            UPDATE tickets 
            SET status = ?,
                notes = CONCAT(COALESCE(notes, ''), 
                    CASE WHEN ? IS NOT NULL THEN CONCAT(' | سبب المتابعة: ', ?) ELSE '' END),
                updated_at = NOW()
            WHERE id = ?
        `, [newStatus, followup_reason, followup_reason, ticketId]);
        
        res.json({ 
            success: true, 
            message: decision === 'approve' ? 'تم إغلاق التكت بنجاح' : 'تم وضع التكت في المتابعة' 
        });
    } catch (error) {
        console.error('Review ticket error:', error);
        res.status(500).json({ error: 'خطأ في مراجعة التكت' });
    }
});

// Get technician's team details
app.get('/api/my-team', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'technician' && req.user.role !== 'team_leader') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const teamId = req.user.team_id;
        if (!teamId) {
            return res.json({ success: true, team: null, message: 'لم يتم تعيينك في فريق' });
        }
        
        const team = await db.queryOne(`
            SELECT t.*, 
                   COUNT(DISTINCT tm.user_id) as member_count
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE t.id = ?
            GROUP BY t.id
        `, [teamId]);
        
        // Get team members
        const members = await db.query(`
            SELECT u.id, u.full_name, u.role
            FROM users u
            JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = ? AND u.is_active = 1
        `, [teamId]);
        
        // Get team scores
        const today = moment().format('YYYY-MM-DD');
        const teamScores = await db.queryOne(`
            SELECT 
                COALESCE(SUM(net_points), 0) as today_points,
                COALESCE(SUM(total_tickets), 0) as today_tickets,
                COALESCE(SUM(total_positive_points), 0) as today_positive,
                COALESCE(SUM(total_negative_points), 0) as today_negative
            FROM daily_summaries
            WHERE team_id = ? AND date = ?
        `, [teamId, today]);
        
        res.json({
            success: true,
            team,
            members,
            scores: teamScores || { today_points: 0, today_tickets: 0, today_positive: 0, today_negative: 0 }
        });
    } catch (error) {
        console.error('Get my team error:', error);
        res.status(500).json({ error: 'خطأ في جلب بيانات الفريق' });
    }
});

// ==================== Scoring Rules Management (Admin Only) ====================

// جلب جميع قواعد النقاط
app.get('/api/admin/scoring-rules', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        
        const rules = await db.query(`
            SELECT sr.*, 
                   CASE 
                       WHEN sr.rule_type = 'ticket_type_base_points' THEN tt.name_ar
                       ELSE NULL
                   END as ticket_type_name
            FROM scoring_rules sr
            LEFT JOIN ticket_types tt ON sr.rule_type = 'ticket_type_base_points' AND sr.rule_key = tt.id
            WHERE sr.is_active = 1
            ORDER BY sr.rule_type, sr.rule_key
        `);
        
        res.json({ success: true, rules });
    } catch (error) {
        console.error('Error fetching scoring rules:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب قواعد النقاط: ' + error.message });
    }
});

// تحديث قاعدة نقاط
app.put('/api/admin/scoring-rules/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        
        const { id } = req.params;
        const { rule_value, description } = req.body;
        
        // التحقق من وجود القاعدة
        const existingRule = await db.queryOne('SELECT id FROM scoring_rules WHERE id = ?', [id]);
        if (!existingRule) {
            return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
        }
        
        // تحديث القاعدة - إذا كان description غير موجود، نتركه كما هو
        if (description !== undefined && description !== null) {
            await db.query(`
                UPDATE scoring_rules 
                SET rule_value = ?, 
                    description = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [rule_value, description, id]);
        } else {
            await db.query(`
                UPDATE scoring_rules 
                SET rule_value = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [rule_value, id]);
        }
        
        res.json({ success: true, message: 'تم تحديث القاعدة بنجاح' });
    } catch (error) {
        console.error('Error updating scoring rule:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث القاعدة: ' + error.message });
    }
});

// إنشاء قاعدة نقاط جديدة (لنوع تكت جديد)
app.post('/api/admin/scoring-rules', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        
        const { rule_type, rule_key, rule_value, description } = req.body;
        
        await db.query(`
            INSERT INTO scoring_rules (rule_type, rule_key, rule_value, description)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                rule_value = VALUES(rule_value),
                description = VALUES(description),
                updated_at = NOW()
        `, [rule_type, rule_key, rule_value, description]);
        
        res.json({ success: true, message: 'تم حفظ القاعدة بنجاح' });
    } catch (error) {
        console.error('Error creating scoring rule:', error);
        res.status(500).json({ success: false, message: 'خطأ في حفظ القاعدة: ' + error.message });
    }
});

// جلب قواعد النقاط للاستخدام في الحسابات (لجميع المستخدمين)
app.get('/api/scoring-rules', authenticate, async (req, res) => {
    try {
        const rules = await db.query(`
            SELECT rule_type, rule_key, rule_value
            FROM scoring_rules
            WHERE is_active = 1
        `);
        
        // تحويل إلى object سهل الاستخدام
        const rulesObj = {};
        rules.forEach(rule => {
            if (!rulesObj[rule.rule_type]) {
                rulesObj[rule.rule_type] = {};
            }
            rulesObj[rule.rule_type][rule.rule_key || 'default'] = parseFloat(rule.rule_value);
        });
        
        res.json({ success: true, rules: rulesObj });
    } catch (error) {
        console.error('Error fetching scoring rules:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب قواعد النقاط: ' + error.message });
    }
});

// ==================== Ticket Points Management (Admin Only) - DEPRECATED ====================

// إدخال/تحديث نقاط التكت (المدير فقط) - DEPRECATED: سيتم حذفه بعد التحديث
app.post('/api/admin/tickets/:ticketId/points', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        
        const { ticketId } = req.params;
        const managerId = req.user.id;
        
        const {
            base_points = 0,
            time_points = 0,
            quality_points = 0,
            checklist_points_json = null,
            upsell_points = 0,
            bonus_points = 0,
            time_penalty = 0,
            tasks_penalty = 0,
            quality_penalty = 0,
            behavior_penalty = 0,
            other_penalty = 0,
            team_performance_rating = null,
            manager_notes = ''
        } = req.body;
        
        // الحصول على معلومات التكت
        const ticket = await db.queryOne(
            'SELECT id, ticket_type_id, time_received, time_first_contact, time_completed FROM tickets WHERE id = ?',
            [ticketId]
        );
        
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'التكت غير موجود' });
        }
        
        // حساب الوقت الفعلي
        let actual_completion_time = null;
        if (ticket.time_received && ticket.time_completed) {
            const start = new Date(ticket.time_received);
            const end = new Date(ticket.time_completed);
            actual_completion_time = (end - start) / (1000 * 60 * 60); // بالساعات
        }
        
        // حساب الإجماليات
        const total_earned = parseFloat(base_points || 0) + 
                            parseFloat(time_points || 0) + 
                            parseFloat(quality_points || 0) + 
                            parseFloat(upsell_points || 0) + 
                            parseFloat(bonus_points || 0);
        
        const total_penalty = parseFloat(time_penalty || 0) + 
                             parseFloat(tasks_penalty || 0) +
                             parseFloat(quality_penalty || 0) + 
                             parseFloat(behavior_penalty || 0) + 
                             parseFloat(other_penalty || 0);
        
        const final_points = total_earned - total_penalty;
        
        // التحقق من وجود نقاط سابقة
        const existingPoints = await db.queryOne(
            'SELECT id FROM ticket_points WHERE ticket_id = ?',
            [ticketId]
        );
        
        if (existingPoints) {
            // تحديث النقاط الموجودة
            await db.query(`
                UPDATE ticket_points SET
                    ticket_type_id = ?,
                    base_points = ?,
                    time_points = ?,
                    quality_points = ?,
                    checklist_points_json = ?,
                    upsell_points = ?,
                    bonus_points = ?,
                    time_penalty = ?,
                    tasks_penalty = ?,
                    quality_penalty = ?,
                    behavior_penalty = ?,
                    other_penalty = ?,
                    team_performance_rating = ?,
                    total_earned = ?,
                    total_penalty = ?,
                    final_points = ?,
                    time_received = ?,
                    time_first_contact = ?,
                    time_completed = ?,
                    actual_completion_time = ?,
                    manager_id = ?,
                    manager_notes = ?,
                    updated_at = NOW()
                WHERE ticket_id = ?
            `, [
                ticket.ticket_type_id,
                base_points,
                time_points,
                quality_points,
                checklist_points_json,
                upsell_points,
                bonus_points,
                time_penalty,
                tasks_penalty,
                quality_penalty,
                behavior_penalty,
                other_penalty,
                team_performance_rating,
                total_earned,
                total_penalty,
                final_points,
                ticket.time_received,
                ticket.time_first_contact,
                ticket.time_completed,
                actual_completion_time,
                managerId,
                manager_notes,
                ticketId
            ]);
        } else {
            // إدراج نقاط جديدة
            await db.query(`
                INSERT INTO ticket_points (
                    ticket_id, ticket_type_id,
                    base_points, time_points, quality_points, checklist_points_json,
                    upsell_points, bonus_points,
                    time_penalty, tasks_penalty, quality_penalty, behavior_penalty, other_penalty,
                    team_performance_rating,
                    total_earned, total_penalty, final_points,
                    time_received, time_first_contact, time_completed, actual_completion_time,
                    manager_id, manager_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticketId,
                ticket.ticket_type_id,
                base_points,
                time_points,
                quality_points,
                checklist_points_json,
                upsell_points,
                bonus_points,
                time_penalty,
                tasks_penalty,
                quality_penalty,
                behavior_penalty,
                other_penalty,
                team_performance_rating,
                total_earned,
                total_penalty,
                final_points,
                ticket.time_received,
                ticket.time_first_contact,
                ticket.time_completed,
                actual_completion_time,
                managerId,
                manager_notes
            ]);
        }
        
        // تحديث النقاط في جدول التكتات
        await db.query(
            'UPDATE tickets SET points = ? WHERE id = ?',
            [final_points, ticketId]
        );
        
        res.json({ 
            success: true, 
            message: 'تم حفظ النقاط بنجاح',
            points: {
                total_earned,
                total_penalty,
                final_points
            }
        });
    } catch (error) {
        console.error('Error saving points:', error);
        res.status(500).json({ success: false, message: 'خطأ في حفظ النقاط: ' + error.message });
    }
});

// حساب Daily Load Factor و Adjusted Time و Speed Points المقترحة
app.get('/api/admin/tickets/:ticketId/calculate-time-points', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        
        const { ticketId } = req.params;
        
        // جلب معلومات التكت
        const ticket = await db.queryOne(`
            SELECT t.id, t.team_id, t.ticket_type_id, t.time_received, t.time_completed,
                   tt.sla_max
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket || !ticket.time_received || !ticket.time_completed) {
            return res.json({ 
                success: true, 
                dailyLoad: 1,
                actualMinutes: 0,
                adjustedMinutes: 0,
                suggestedSpeedPoints: 0
            });
        }
        
        // حساب تاريخ T0 (YYYY-MM-DD)
        const t0Date = new Date(ticket.time_received);
        const dateKey = t0Date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // حساب Daily Load Factor (عدد التكتات لنفس الفريق في نفس اليوم)
        const dailyLoadResult = await db.queryOne(`
            SELECT COUNT(*) as count
            FROM tickets
            WHERE team_id = ? 
            AND DATE(time_received) = ?
        `, [ticket.team_id, dateKey]);
        
        const dailyLoad = dailyLoadResult.count || 1;
        
        // حساب actualMinutes
        const t0Time = new Date(ticket.time_received).getTime();
        const t3Time = new Date(ticket.time_completed).getTime();
        const actualMinutes = Math.max(0, Math.round((t3Time - t0Time) / 60000));
        
        // حساب adjustedMinutes
        const adjustedMinutes = actualMinutes / dailyLoad;
        
        // حساب Speed Points المقترحة
        const slaMax = ticket.sla_max || 120; // افتراضي 120 دقيقة
        let suggestedSpeedPoints = 0;
        if (adjustedMinutes <= slaMax) {
            suggestedSpeedPoints = 10;
        } else if (adjustedMinutes <= slaMax * 1.5) {
            suggestedSpeedPoints = 5;
        } else {
            suggestedSpeedPoints = 0;
        }
        
        res.json({
            success: true,
            dailyLoad: dailyLoad,
            actualMinutes: actualMinutes,
            adjustedMinutes: Math.round(adjustedMinutes * 100) / 100, // تقريب لرقمين عشريين
            suggestedSpeedPoints: suggestedSpeedPoints,
            slaMax: slaMax
        });
    } catch (error) {
        console.error('Error calculating time points:', error);
        res.status(500).json({ success: false, message: 'خطأ في حساب النقاط: ' + error.message });
    }
});

// الحصول على نقاط التكت
app.get('/api/tickets/:ticketId/points', authenticate, async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        const points = await db.queryOne(`
            SELECT 
                tp.*,
                u.username as manager_name,
                u.full_name as manager_full_name
            FROM ticket_points tp
            LEFT JOIN users u ON tp.manager_id = u.id
            WHERE tp.ticket_id = ?
        `, [ticketId]);
        
        if (!points) {
            return res.json({ success: true, points: null });
        }
        
        res.json({ success: true, points });
    } catch (error) {
        console.error('Error fetching points:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب النقاط: ' + error.message });
    }
});

// حذف نقاط التكت (المدير فقط)
app.delete('/api/admin/tickets/:ticketId/points', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        
        const { ticketId } = req.params;
        
        await db.query('DELETE FROM ticket_points WHERE ticket_id = ?', [ticketId]);
        await db.query('UPDATE tickets SET points = NULL WHERE id = ?', [ticketId]);
        
        res.json({ success: true, message: 'تم حذف النقاط بنجاح' });
    } catch (error) {
        console.error('Error deleting points:', error);
        res.status(500).json({ success: false, message: 'خطأ في حذف النقاط: ' + error.message });
    }
});

// Serve static files AFTER API routes to avoid conflicts
app.use(express.static(path.join(__dirname, '../public')));

// ==================== Start Server ====================
const PORT = config.server.port;
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==========================================');
    console.log('🚀 Quality & Tickets Management System');
    console.log('==========================================');
    console.log(`✅ Server running on port ${PORT}`);
    // ==================== Start Background Jobs ====================
    // فحص التكتات المتأخرة كل 5 دقائق
    setInterval(checkDelayedTickets, 5 * 60 * 1000); // 5 minutes
    checkDelayedTickets(); // Run immediately on startup
    
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log('');
});

// ==================== Background Job: Check Delayed Tickets ====================
async function checkDelayedTickets() {
    try {
        // البحث عن تكتات متأخرة أكثر من 3 ساعات
        const delayedTickets = await db.query(`
            SELECT t.*, tm.name as team_name, tt.name_ar as ticket_type_name
            FROM tickets t
            JOIN teams tm ON t.team_id = tm.id
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.status IN ('in_progress', 'pending')
            AND t.time_received IS NOT NULL
            AND TIMESTAMPDIFF(MINUTE, t.time_received, NOW()) > 180
            AND NOT EXISTS (
                SELECT 1 FROM notifications n 
                WHERE n.related_ticket_id = t.id 
                AND n.type = 'ticket_delayed' 
                AND n.is_read = 0
                AND DATE(n.created_at) = CURDATE()
            )
        `);
        
        // إنشاء إشعارات للمديرين
        if (delayedTickets.length > 0) {
            const admins = await db.query('SELECT id FROM users WHERE role = "admin" AND is_active = 1');
            
            for (const ticket of delayedTickets) {
                for (const admin of admins) {
                    await db.query(`
                        INSERT INTO notifications (user_id, type, title, message, related_ticket_id)
                        VALUES (?, 'ticket_delayed', ?, ?, ?)
                    `, [
                        admin.id,
                        `تأخر التكت رقم ${ticket.ticket_number}`,
                        `التكت رقم ${ticket.ticket_number} (${ticket.ticket_type_name}) للفريق ${ticket.team_name} متأخر أكثر من 3 ساعات. الوقت المنقضي: ${Math.floor((Date.now() - new Date(ticket.time_received).getTime()) / 60000)} دقيقة`,
                        ticket.id
                    ]);
                }
            }
            
            console.log(`📢 تم إنشاء ${delayedTickets.length} إشعار للتكتات المتأخرة`);
        }
    } catch (error) {
        console.error('Error checking delayed tickets:', error);
    }
}

// ==================== Notifications API ====================
// Get notifications for current user
app.get('/api/notifications', authenticate, async (req, res) => {
    try {
        const { unread_only = false } = req.query;
        
        let query = `
            SELECT n.*, t.ticket_number, t.status as ticket_status
            FROM notifications n
            LEFT JOIN tickets t ON n.related_ticket_id = t.id
            WHERE (n.user_id = ? OR n.user_id IS NULL)
        `;
        
        const params = [req.user.id];
        
        if (unread_only === 'true') {
            query += ' AND n.is_read = 0';
        }
        
        query += ' ORDER BY n.created_at DESC LIMIT 100';
        
        const notifications = await db.query(query, params);
        
        res.json({
            success: true,
            notifications: notifications,
            unread_count: notifications.filter(n => !n.is_read).length
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
    try {
        await db.query(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `, [req.params.id, req.user.id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'خطأ في تحديث الإشعار' });
    }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', authenticate, async (req, res) => {
    try {
        await db.query(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
        `, [req.user.id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ error: 'خطأ في تحديث الإشعارات' });
    }
});

// ==================== Rewards API (Accountant Only) ====================
// Get rewards for accountant
app.get('/api/rewards', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { year, month, team_id, status } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (year) {
            whereClause += ' AND r.year = ?';
            params.push(year);
        }
        
        if (month) {
            whereClause += ' AND r.month = ?';
            params.push(month);
        }
        
        if (team_id) {
            whereClause += ' AND r.team_id = ?';
            params.push(team_id);
        }
        
        if (status) {
            whereClause += ' AND r.status = ?';
            params.push(status);
        }
        
        const rewards = await db.query(`
            SELECT r.*, tm.name as team_name
            FROM rewards r
            JOIN teams tm ON r.team_id = tm.id
            WHERE ${whereClause}
            ORDER BY r.year DESC, r.month DESC, r.team_id
        `, params);
        
        res.json({ success: true, rewards });
    } catch (error) {
        console.error('Get rewards error:', error);
        res.status(500).json({ error: 'خطأ في جلب المكافآت' });
    }
});

// Calculate and create rewards for a month
app.post('/api/rewards/calculate', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { year, month } = req.body;
        
        if (!year || !month) {
            return res.status(400).json({ error: 'السنة والشهر مطلوبان' });
        }
        
        // جلب بيانات الفرق للشهر المحدد
        const teamStats = await db.query(`
            SELECT 
                tm.id as team_id,
                tm.name as team_name,
                COUNT(DISTINCT t.id) as total_tickets,
                SUM(CASE WHEN tt.category = 'connection' THEN 1 ELSE 0 END) as connection_count,
                SUM(CASE WHEN tt.category = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count,
                COALESCE(SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id)), 0) as total_positive,
                COALESCE(SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id)), 0) as total_negative
            FROM teams tm
            LEFT JOIN tickets t ON tm.id = t.team_id 
                AND YEAR(t.created_at) = ? 
                AND MONTH(t.created_at) = ?
            LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE tm.is_active = 1
            GROUP BY tm.id, tm.name
        `, [year, month]);
        
        // جلب ترتيب الفرق
        const rankings = await db.query(`
            SELECT 
                team_id,
                net_points,
                RANK() OVER (ORDER BY net_points DESC) as rank_position
            FROM (
                SELECT 
                    tm.id as team_id,
                    COALESCE(SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id)), 0) - 
                    COALESCE(SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id)), 0) as net_points
                FROM teams tm
                LEFT JOIN tickets t ON tm.id = t.team_id 
                    AND YEAR(t.created_at) = ? 
                    AND MONTH(t.created_at) = ?
                WHERE tm.is_active = 1
                GROUP BY tm.id
            ) as team_scores
            ORDER BY net_points DESC
        `, [year, month]);
        
        const rankingMap = {};
        rankings.forEach((r, index) => {
            rankingMap[r.team_id] = r.rank_position;
        });
        
        // إعدادات المكافآت (يمكن نقلها إلى جدول إعدادات)
        const CONNECTION_BONUS = 5000; // 5000 دينار لكل تكت ربط
        const MAINTENANCE_BONUS = 3000; // 3000 دينار لكل تكت صيانة
        const QUALITY_BONUS_RATE = 100; // 100 دينار لكل 10 نقاط
        const RANKING_BONUS = {
            1: 50000, // المركز الأول
            2: 30000, // المركز الثاني
            3: 20000  // المركز الثالث
        };
        
        const createdRewards = [];
        
        for (const team of teamStats) {
            const connectionBonus = (team.connection_count || 0) * CONNECTION_BONUS;
            const maintenanceBonus = (team.maintenance_count || 0) * MAINTENANCE_BONUS;
            const qualityBonus = Math.floor((team.total_positive || 0) / 10) * QUALITY_BONUS_RATE;
            const rankingBonus = RANKING_BONUS[rankingMap[team.team_id]] || 0;
            
            const totalReward = connectionBonus + maintenanceBonus + qualityBonus + rankingBonus;
            const totalPoints = (team.total_positive || 0) - (team.total_negative || 0);
            
            // إدراج أو تحديث المكافأة
            await db.query(`
                INSERT INTO rewards (
                    team_id, year, month, connection_bonus, maintenance_bonus,
                    quality_bonus, ranking_bonus, total_points, total_reward, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                ON DUPLICATE KEY UPDATE
                    connection_bonus = VALUES(connection_bonus),
                    maintenance_bonus = VALUES(maintenance_bonus),
                    quality_bonus = VALUES(quality_bonus),
                    ranking_bonus = VALUES(ranking_bonus),
                    total_points = VALUES(total_points),
                    total_reward = VALUES(total_reward),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                team.team_id, year, month, connectionBonus, maintenanceBonus,
                qualityBonus, rankingBonus, totalPoints, totalReward
            ]);
            
            createdRewards.push({
                team_id: team.team_id,
                team_name: team.team_name,
                connection_bonus: connectionBonus,
                maintenance_bonus: maintenanceBonus,
                quality_bonus: qualityBonus,
                ranking_bonus: rankingBonus,
                total_reward: totalReward
            });
        }
        
        res.json({
            success: true,
            message: `تم حساب المكافآت لـ ${createdRewards.length} فريق`,
            rewards: createdRewards
        });
    } catch (error) {
        console.error('Calculate rewards error:', error);
        res.status(500).json({ error: 'خطأ في حساب المكافآت' });
    }
});

// Update reward status
app.put('/api/rewards/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { status, notes } = req.body;
        
        await db.query(`
            UPDATE rewards 
            SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, notes, req.params.id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update reward error:', error);
        res.status(500).json({ error: 'خطأ في تحديث المكافأة' });
    }
});

// ==================== Database Export API ====================
app.get('/api/export/database', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { tables } = req.query;
        const selectedTables = tables ? tables.split(',') : null;
        
        // قائمة الجداول المتاحة
        const allTables = [
            'users', 'teams', 'team_members', 'ticket_types', 'tickets',
            'ticket_photos', 'quality_reviews', 'positive_scores', 'negative_scores',
            'followup_reports', 'daily_summaries', 'monthly_summaries',
            'message_templates', 'notifications', 'rewards',
            'companies', 'invoices', 'purchase_requests'
        ];
        
        const tablesToExport = selectedTables && selectedTables.length > 0
            ? allTables.filter(t => selectedTables.includes(t))
            : allTables;
        
        if (tablesToExport.length === 0) {
            return res.status(400).json({ error: 'لم يتم اختيار أي جداول' });
        }
        
        // إنشاء ملف SQL
        const mysql = require('mysql2/promise');
        const config = require('./config');
        const connection = await mysql.createConnection({
            host: config.db.host,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database
        });
        
        let sqlContent = `-- Database Export\n`;
        sqlContent += `-- Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
        sqlContent += `-- Tables: ${tablesToExport.join(', ')}\n\n`;
        sqlContent += `SET FOREIGN_KEY_CHECKS=0;\n\n`;
        
        for (const tableName of tablesToExport) {
            // جلب البيانات
            const [rows] = await connection.query(`SELECT * FROM ??`, [tableName]);
            
            if (rows.length > 0) {
                sqlContent += `-- Table: ${tableName}\n`;
                sqlContent += `TRUNCATE TABLE \`${tableName}\`;\n\n`;
                
                // إنشاء INSERT statements
                const columns = Object.keys(rows[0]);
                sqlContent += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n`;
                
                const values = rows.map(row => {
                    const rowValues = columns.map(col => {
                        const value = row[col];
                        if (value === null) return 'NULL';
                        if (typeof value === 'string') {
                            return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                        }
                        return value;
                    });
                    return `(${rowValues.join(', ')})`;
                });
                
                sqlContent += values.join(',\n') + ';\n\n';
            }
        }
        
        sqlContent += `SET FOREIGN_KEY_CHECKS=1;\n`;
        
        await connection.end();
        
        // إرسال الملف
        const filename = `database-export-${moment().format('YYYY-MM-DD-HHmmss')}.sql`;
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(sqlContent);
    } catch (error) {
        console.error('Database export error:', error);
        res.status(500).json({ error: 'خطأ في تصدير قاعدة البيانات' });
    }
});

// Get list of available tables
app.get('/api/export/tables', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const tables = [
            { name: 'users', description: 'المستخدمين' },
            { name: 'teams', description: 'الفرق' },
            { name: 'team_members', description: 'أعضاء الفرق' },
            { name: 'ticket_types', description: 'أنواع التكتات' },
            { name: 'tickets', description: 'التكتات' },
            { name: 'ticket_photos', description: 'صور التكتات' },
            { name: 'quality_reviews', description: 'تقييمات الجودة' },
            { name: 'positive_scores', description: 'النقاط الإيجابية' },
            { name: 'negative_scores', description: 'النقاط السالبة' },
            { name: 'followup_reports', description: 'تقارير المتابعة' },
            { name: 'daily_summaries', description: 'الملخصات اليومية' },
            { name: 'monthly_summaries', description: 'الملخصات الشهرية' },
            { name: 'message_templates', description: 'قوالب الرسائل' },
            { name: 'notifications', description: 'الإشعارات' },
            { name: 'rewards', description: 'المكافآت' },
            { name: 'companies', description: 'الشركات' },
            { name: 'invoices', description: 'الفواتير' },
            { name: 'purchase_requests', description: 'طلبات الشراء' }
        ];
        
        res.json({ success: true, tables });
    } catch (error) {
        console.error('Get tables error:', error);
        res.status(500).json({ error: 'خطأ في جلب قائمة الجداول' });
    }
});

// ==================== Owner Dashboard APIs ====================

// Get all companies (Owner only)
app.get('/api/owner/companies', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const companies = await db.query(`
            SELECT c.*, 
                   u.username as admin_username,
                   u.full_name as admin_name,
                   (SELECT COUNT(*) FROM users WHERE company_id = c.id AND role != 'admin' AND role != 'owner') as employee_count
            FROM companies c
            LEFT JOIN users u ON c.owner_user_id = u.id
            ORDER BY c.created_at DESC
        `);
        
        res.json({ success: true, companies });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'خطأ في جلب الشركات' });
    }
});

// Create new company with admin@domain
app.post('/api/owner/companies', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const {
            name,
            domain,
            contact_name,
            contact_email,
            contact_phone,
            address,
            max_employees,
            price_per_employee,
            admin_password
        } = req.body;
        
        // التحقق من الحقول المطلوبة
        if (!name || !domain || !contact_name || !contact_email || !admin_password) {
            return res.status(400).json({ error: 'جميع الحقول المطلوبة يجب ملؤها' });
        }
        
        // التحقق من price_per_employee
        const finalPricePerEmployee = parseFloat(price_per_employee) || 0;
        if (finalPricePerEmployee < 0) {
            return res.status(400).json({ error: 'السعر لكل موظف يجب أن يكون أكبر من أو يساوي صفر' });
        }
        
        // التحقق من domain فريد
        const existingDomain = await db.queryOne(
            'SELECT id FROM companies WHERE domain = ?',
            [domain]
        );
        if (existingDomain) {
            return res.status(400).json({ error: 'المجال مستخدم بالفعل' });
        }
        
        // التحقق من username admin@domain غير موجود
        const adminUsername = `admin@${domain}`;
        const existingUser = await db.queryOne(
            'SELECT id FROM users WHERE username = ?',
            [adminUsername]
        );
        if (existingUser) {
            return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
        }
        
        // إنشاء حساب admin@domain أولاً (بدون company_id مؤقتاً)
        const passwordHash = await bcrypt.hash(admin_password, 10);
        const adminResult = await db.query(`
            INSERT INTO users (username, password_hash, full_name, role, company_id)
            VALUES (?, ?, ?, 'admin', NULL)
        `, [adminUsername, passwordHash, `مدير ${name}`]);
        
        const adminUserId = adminResult.insertId;
        
        // إنشاء الشركة مع owner_user_id
        const companyResult = await db.query(`
            INSERT INTO companies (name, domain, contact_name, contact_email, contact_phone, address, 
                                 max_employees, price_per_employee, subscription_start_date, owner_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
        `, [name, domain, contact_name, contact_email, contact_phone || null, address || null, max_employees || 0, finalPricePerEmployee, adminUserId]);
        
        const companyId = companyResult.insertId;
        
        // تحديث حساب admin@domain بـ company_id
        await db.query('UPDATE users SET company_id = ? WHERE id = ?', [companyId, adminUserId]);
        
        res.json({
            success: true,
            company: {
                id: companyId,
                name,
                domain,
                admin_username: adminUsername
            },
            message: 'تم إنشاء الشركة بنجاح'
        });
    } catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ error: 'خطأ في إنشاء الشركة', details: error.message });
    }
});

// Update company
app.put('/api/owner/companies/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const companyId = req.params.id;
        const {
            name,
            contact_name,
            contact_email,
            contact_phone,
            address,
            max_employees,
            price_per_employee,
            is_active
        } = req.body;
        
        await db.query(`
            UPDATE companies 
            SET name = ?, contact_name = ?, contact_email = ?, contact_phone = ?, 
                address = ?, max_employees = ?, price_per_employee = ?, is_active = ?
            WHERE id = ?
        `, [name, contact_name, contact_email, contact_phone || null, address || null, 
            max_employees || 0, price_per_employee, is_active !== undefined ? is_active : 1, companyId]);
        
        res.json({ success: true, message: 'تم تحديث الشركة بنجاح' });
    } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'خطأ في تحديث الشركة' });
    }
});

// Get all employees across all companies (Owner only)
app.get('/api/owner/employees', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const { company_id } = req.query;
        
        let query = `
            SELECT u.id, u.username, u.full_name, u.role, u.company_id, u.is_active, u.created_at,
                   c.name as company_name, c.domain,
                   t.name as team_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE u.role != 'owner'
        `;
        
        const params = [];
        if (company_id) {
            query += ' AND u.company_id = ?';
            params.push(company_id);
        }
        
        query += ' ORDER BY u.created_at DESC';
        
        const employees = await db.query(query, params);
        
        res.json({ success: true, employees });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'خطأ في جلب الموظفين' });
    }
});

// Get all invoices
app.get('/api/owner/invoices', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const { company_id, status } = req.query;
        
        let query = `
            SELECT i.*, c.name as company_name, c.domain
            FROM invoices i
            LEFT JOIN companies c ON i.company_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        if (company_id) {
            query += ' AND i.company_id = ?';
            params.push(company_id);
        }
        if (status) {
            query += ' AND i.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY i.created_at DESC';
        
        const invoices = await db.query(query, params);
        
        res.json({ success: true, invoices });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: 'خطأ في جلب الفواتير' });
    }
});

// Create invoice
app.post('/api/owner/invoices', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const {
            company_id,
            period_start,
            period_end,
            employee_count,
            price_per_employee,
            tax,
            due_date,
            notes
        } = req.body;
        
        if (!company_id || !period_start || !period_end || !employee_count || !price_per_employee) {
            return res.status(400).json({ error: 'جميع الحقول المطلوبة يجب ملؤها' });
        }
        
        // حساب المبالغ
        const subtotal = employee_count * price_per_employee;
        const taxAmount = tax || 0;
        const total = subtotal + taxAmount;
        
        // توليد رقم الفاتورة
        const invoiceNumber = `INV-${Date.now()}-${company_id}`;
        
        const result = await db.query(`
            INSERT INTO invoices (company_id, invoice_number, period_start, period_end, 
                                employee_count, price_per_employee, subtotal, tax, total, 
                                due_date, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        `, [company_id, invoiceNumber, period_start, period_end, employee_count, 
            price_per_employee, subtotal, taxAmount, total, due_date || null, notes || null]);
        
        res.json({
            success: true,
            invoice: {
                id: result.insertId,
                invoice_number: invoiceNumber
            },
            message: 'تم إنشاء الفاتورة بنجاح'
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: 'خطأ في إنشاء الفاتورة', details: error.message });
    }
});

// Update invoice status
app.put('/api/owner/invoices/:id/status', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const invoiceId = req.params.id;
        const { status, paid_date } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'حالة الفاتورة مطلوبة' });
        }
        
        let query = 'UPDATE invoices SET status = ?';
        const params = [status];
        
        if (status === 'paid' && paid_date) {
            query += ', paid_date = ?';
            params.push(paid_date);
        }
        
        query += ' WHERE id = ?';
        params.push(invoiceId);
        
        await db.query(query, params);
        
        res.json({ success: true, message: 'تم تحديث حالة الفاتورة بنجاح' });
    } catch (error) {
        console.error('Update invoice status error:', error);
        res.status(500).json({ error: 'خطأ في تحديث حالة الفاتورة' });
    }
});

// Get all purchase requests
app.get('/api/owner/purchase-requests', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const { status } = req.query;
        
        let query = `
            SELECT pr.*, c.name as converted_company_name, c.domain as converted_domain
            FROM purchase_requests pr
            LEFT JOIN companies c ON pr.converted_to_company_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        if (status) {
            query += ' AND pr.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY pr.created_at DESC';
        
        const requests = await db.query(query, params);
        
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Get purchase requests error:', error);
        res.status(500).json({ error: 'خطأ في جلب طلبات الشراء' });
    }
});

// Update purchase request status
app.put('/api/owner/purchase-requests/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const requestId = req.params.id;
        const { status, admin_notes, converted_to_company_id } = req.body;
        
        await db.query(`
            UPDATE purchase_requests 
            SET status = ?, admin_notes = ?, converted_to_company_id = ?
            WHERE id = ?
        `, [status || 'pending', admin_notes || null, converted_to_company_id || null, requestId]);
        
        res.json({ success: true, message: 'تم تحديث الطلب بنجاح' });
    } catch (error) {
        console.error('Update purchase request error:', error);
        res.status(500).json({ error: 'خطأ في تحديث الطلب' });
    }
});

// Get owner dashboard statistics
app.get('/api/owner/dashboard', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'غير مصرح - فقط مالك الموقع' });
        }
        
        const stats = {
            total_companies: await db.queryOne('SELECT COUNT(*) as count FROM companies WHERE is_active = 1'),
            total_employees: await db.queryOne('SELECT COUNT(*) as count FROM users WHERE role != "owner" AND role != "admin" AND company_id IS NOT NULL'),
            pending_invoices: await db.queryOne('SELECT COUNT(*) as count FROM invoices WHERE status IN ("draft", "sent", "overdue")'),
            pending_requests: await db.queryOne('SELECT COUNT(*) as count FROM purchase_requests WHERE status = "pending"'),
            total_revenue: await db.queryOne('SELECT SUM(total) as total FROM invoices WHERE status = "paid"')
        };
        
        res.json({
            success: true,
            stats: {
                total_companies: stats.total_companies?.count || 0,
                total_employees: stats.total_employees?.count || 0,
                pending_invoices: stats.pending_invoices?.count || 0,
                pending_requests: stats.pending_requests?.count || 0,
                total_revenue: parseFloat(stats.total_revenue?.total || 0)
            }
        });
    } catch (error) {
        console.error('Get owner dashboard error:', error);
        res.status(500).json({ error: 'خطأ في جلب إحصائيات لوحة التحكم' });
    }
});

// Public endpoint: Submit purchase request
app.post('/api/purchase-request', async (req, res) => {
    try {
        const {
            company_name,
            contact_name,
            contact_email,
            contact_phone,
            company_address,
            expected_employees,
            message
        } = req.body;
        
        if (!company_name || !contact_name || !contact_email || !contact_phone || !expected_employees) {
            return res.status(400).json({ error: 'جميع الحقول المطلوبة يجب ملؤها' });
        }
        
        const result = await db.query(`
            INSERT INTO purchase_requests (company_name, contact_name, contact_email, contact_phone, 
                                         company_address, expected_employees, message, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [company_name, contact_name, contact_email, contact_phone, 
            company_address || null, expected_employees, message || null]);
        
        res.json({
            success: true,
            message: 'تم إرسال طلبك بنجاح. سنتواصل معك قريباً.'
        });
    } catch (error) {
        console.error('Submit purchase request error:', error);
        res.status(500).json({ error: 'خطأ في إرسال الطلب' });
    }
});

