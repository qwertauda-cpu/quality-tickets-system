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
        const [user] = await db.query('SELECT * FROM users WHERE id = ? AND is_active = 1', [token]);
        if (!user) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'خطأ في المصادقة' });
    }
}

// ==================== Login ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await db.queryOne(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username]
        );
        
        if (!user) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
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
        
        res.json({ success: true, teams });
    } catch (error) {
        console.error('Teams error:', error);
        res.status(500).json({ error: 'خطأ في جلب الفرق' });
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
        const {
            ticket_number,
            ticket_type_id,
            team_id,
            time_received,
            time_first_contact,
            time_completed,
            subscriber_name,
            subscriber_phone,
            subscriber_address,
            notes
        } = req.body;
        
        // التحقق من وجود التكت بنفس الرقم
        const existing = await db.queryOne(
            'SELECT id FROM tickets WHERE ticket_number = ?',
            [ticket_number]
        );
        
        if (existing) {
            return res.status(400).json({ error: 'رقم التكت موجود مسبقاً' });
        }
        
        // تنظيف وتنسيق التواريخ
        let cleanedTimeReceived = time_received;
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
        let ticketStatus = 'pending';
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
        
        // حساب Load Factor
        const ticketDate = cleanedTimeReceived ? moment(cleanedTimeReceived).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
        const loadFactor = await scoring.calculateLoadFactor(team_id, ticketDate);
        const adjusted_time_minutes = actual_time_minutes ? Math.round(actual_time_minutes / loadFactor) : null;
        
        // إدراج التكت
        const result = await db.query(`
            INSERT INTO tickets (
                ticket_number, ticket_type_id, team_id, quality_staff_id,
                time_received, time_first_contact, time_completed,
                actual_time_minutes, adjusted_time_minutes, load_factor,
                subscriber_name, subscriber_phone, subscriber_address, notes,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ticket_number, ticket_type_id, team_id, req.user.id,
            cleanedTimeReceived || null, cleanedTimeFirstContact || null, cleanedTimeCompleted || null,
            actual_time_minutes, adjusted_time_minutes, loadFactor,
            subscriber_name || null, subscriber_phone || null, subscriber_address || null, notes || null,
            ticketStatus
        ]);
        
        const ticketId = result.insertId;
        
        // حساب النقاط
        await scoring.calculateTicketScores(ticketId);
        
        // تحديث daily_summary
        await scoring.updateDailySummary(team_id, ticketDate);
        
        res.json({
            success: true,
            ticketId: ticketId,
            message: 'تم إدخال التكت بنجاح'
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ error: 'خطأ في إدخال التكت' });
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
        const { team_id, status, date, page = 1, limit = 50 } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
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
        params.push(parseInt(limit), offset);
        
        const tickets = await db.query(`
            SELECT t.*, 
                   tt.name_ar as ticket_type_name,
                   tm.name as team_name,
                   u.full_name as quality_staff_name,
                   (SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id) as positive_points,
                   (SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id) as negative_points
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            JOIN teams tm ON t.team_id = tm.id
            JOIN users u ON t.quality_staff_id = u.id
            WHERE ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `, params);
        
        const total = await db.queryOne(`
            SELECT COUNT(*) as count FROM tickets t WHERE ${whereClause}
        `, params.slice(0, -2));
        
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
        
        // إنشاء PDF
        const filename = `daily-report-${reportDate}.pdf`;
        const filepath = path.join(uploadsDir, filename);
        
        // إنشاء Promise لانتظار انتهاء الكتابة
        const pdfPromise = new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(filepath);
            
            doc.pipe(stream);
            
            // العنوان الرئيسي
            doc.fontSize(24).font('Helvetica-Bold').text('تقرير يومي - إدارة التكتات والجودة', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).font('Helvetica').text(`التاريخ: ${moment(reportDate).format('YYYY-MM-DD')}`, { align: 'center' });
            doc.moveDown(2);
            
            // خط فاصل
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown();
            
            // ========== ملخص اليوم ==========
            doc.fontSize(18).font('Helvetica-Bold').text('ملخص اليوم', { align: 'right' });
            doc.moveDown();
            doc.fontSize(12).font('Helvetica');
            doc.text(`إجمالي التكتات: ${totalTickets}`, { align: 'right' });
            doc.text(`التكتات المكتملة: ${completedTickets}`, { align: 'right' });
            doc.text(`التكتات المؤجلة: ${postponedTickets}`, { align: 'right' });
            doc.text(`إجمالي النقاط الإيجابية: ${totalPositivePoints}`, { align: 'right' });
            doc.text(`إجمالي النقاط السالبة: ${totalNegativePoints}`, { align: 'right' });
            doc.font('Helvetica-Bold').text(`النقاط الصافية الإجمالية: ${totalNetPoints}`, { align: 'right' });
            doc.font('Helvetica');
            doc.moveDown(2);
            
            // ========== ترتيب الفرق ==========
            doc.fontSize(18).font('Helvetica-Bold').text('ترتيب الفرق', { align: 'right' });
            doc.moveDown();
            
            teamStats.forEach((team, index) => {
                const netScore = (team.total_positive || 0) - (team.total_negative || 0);
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                
                doc.fontSize(14).font('Helvetica-Bold')
                   .text(`${medal} المرتبة ${rank}: ${team.name}`, { align: 'right' });
                doc.fontSize(11).font('Helvetica')
                   .text(`   عدد التكتات: ${team.total_tickets || 0}`, { align: 'right' })
                   .text(`   النقاط الإيجابية: ${team.total_positive || 0}`, { align: 'right' })
                   .text(`   النقاط السالبة: ${team.total_negative || 0}`, { align: 'right' })
                   .font('Helvetica-Bold')
                   .text(`   النقاط الصافية: ${netScore}`, { align: 'right' });
                doc.font('Helvetica');
                doc.moveDown();
            });
            
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown();
            
            // ========== تفاصيل التكتات ==========
            doc.fontSize(18).font('Helvetica-Bold').text('تفاصيل التكتات', { align: 'right' });
            doc.moveDown();
            
            // تجميع التكتات حسب الفريق
            const ticketsByTeam = {};
            tickets.forEach(ticket => {
                if (!ticketsByTeam[ticket.team_name]) {
                    ticketsByTeam[ticket.team_name] = [];
                }
                ticketsByTeam[ticket.team_name].push(ticket);
            });
            
            Object.keys(ticketsByTeam).forEach(teamName => {
                doc.fontSize(14).font('Helvetica-Bold').text(`فريق: ${teamName}`, { align: 'right' });
                doc.moveDown(0.5);
                
                ticketsByTeam[teamName].forEach((ticket, index) => {
                    const netScore = (ticket.positive_points || 0) - (ticket.negative_points || 0);
                    const statusText = ticket.status === 'completed' ? '✅ مكتمل' : 
                                      ticket.status === 'postponed' ? '⏸️ مؤجل' : 
                                      ticket.status === 'in_progress' ? '🔄 قيد التنفيذ' : '⏳ معلق';
                    const followupText = ticket.needs_followup === 1 ? ' ⚠️ يحتاج متابعة' : '';
                    
                    doc.fontSize(10).font('Helvetica')
                       .text(`${index + 1}. التكت رقم: ${ticket.ticket_number} ${statusText}${followupText}`, { align: 'right' })
                       .text(`   النوع: ${ticket.ticket_type_name}`, { align: 'right' })
                       .text(`   النقاط الإيجابية: ${ticket.positive_points || 0}`, { align: 'right' })
                       .text(`   النقاط السالبة: ${ticket.negative_points || 0}`, { align: 'right' })
                       .font('Helvetica-Bold')
                       .text(`   النقاط الصافية: ${netScore}`, { align: 'right' });
                    
                    if (ticket.actual_time_minutes) {
                        const hours = Math.floor(ticket.actual_time_minutes / 60);
                        const minutes = ticket.actual_time_minutes % 60;
                        doc.font('Helvetica').text(`   الوقت الفعلي: ${hours} ساعة و ${minutes} دقيقة`, { align: 'right' });
                    }
                    
                    if (ticket.needs_followup === 1 && ticket.followup_reason) {
                        doc.font('Helvetica').text(`   سبب المتابعة: ${ticket.followup_reason}`, { align: 'right' });
                    }
                    
                    doc.font('Helvetica');
                    doc.moveDown(0.3);
                });
                
                doc.moveDown();
            });
            
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown();
            
            // ========== حالات المتابعة ==========
            if (followupTickets.length > 0) {
                doc.fontSize(18).font('Helvetica-Bold').text('حالات المتابعة', { align: 'right' });
                doc.moveDown();
                
                followupTickets.forEach((ticket, index) => {
                    doc.fontSize(11).font('Helvetica-Bold')
                       .text(`${index + 1}. التكت رقم: ${ticket.ticket_number}`, { align: 'right' });
                    doc.fontSize(10).font('Helvetica')
                       .text(`   الفريق: ${ticket.team_name}`, { align: 'right' })
                       .text(`   النوع: ${ticket.ticket_type_name}`, { align: 'right' });
                    
                    if (ticket.followup_reason) {
                        doc.text(`   سبب المتابعة: ${ticket.followup_reason}`, { align: 'right' });
                    }
                    
                    if (ticket.contact_status) {
                        const contactStatusText = ticket.contact_status === 'answered' ? 'تم الرد' : 
                                                  ticket.contact_status === 'no_answer' ? 'لم يرد' : 'مغلق';
                        doc.text(`   حالة الاتصال: ${contactStatusText}`, { align: 'right' });
                    }
                    
                    if (ticket.service_status) {
                        const serviceStatusText = ticket.service_status === 'excellent' ? 'ممتاز' : 
                                                  ticket.service_status === 'good' ? 'جيد' : 'رديء';
                        doc.text(`   حالة الخدمة: ${serviceStatusText}`, { align: 'right' });
                    }
                    
                    doc.moveDown();
                });
                
                doc.moveDown();
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown();
            }
            
            // ========== توقيع موظف الجودة ==========
            doc.moveDown(3);
            doc.fontSize(12).font('Helvetica').text('توقيع موظف الجودة:', { align: 'right' });
            doc.moveDown(2);
            doc.moveTo(400, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(10).text('الاسم والتوقيع', { align: 'right', continued: false });
            
            // ========== تذييل الصفحة ==========
            const pageHeight = doc.page.height;
            const pageWidth = doc.page.width;
            doc.fontSize(8).font('Helvetica')
               .text(`تم إنشاء التقرير في: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, 50, pageHeight - 50, { align: 'left' })
               .text(`الصفحة ${doc.bufferedPageRange().start + 1}`, pageWidth - 50, pageHeight - 50, { align: 'right' });
            
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

// Create new user (technician)
app.post('/api/users', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const { username, password, full_name, team_id } = req.body;
        
        if (!username || !password || !full_name || !team_id) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }
        
        // Check if username exists
        const existingUser = await db.queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.query(`
            INSERT INTO users (username, password_hash, full_name, role, team_id)
            VALUES (?, ?, ?, 'technician', ?)
        `, [username, passwordHash, full_name, team_id]);
        
        const userId = result.insertId;
        
        // Add to team_members
        await db.query(`
            INSERT INTO team_members (team_id, user_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE team_id = VALUES(team_id)
        `, [team_id, userId]);
        
        res.json({ success: true, userId, message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
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

// Delete user
app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'غير مصرح' });
        }
        
        const userId = req.params.id;
        
        // Don't allow deleting admin users or self
        const user = await db.queryOne('SELECT role FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        if (user.role === 'admin') {
            return res.status(403).json({ error: 'لا يمكن حذف حساب المدير' });
        }
        
        if (userId == req.user.id) {
            return res.status(403).json({ error: 'لا يمكن حذف حسابك الخاص' });
        }
        
        // Soft delete (set is_active = 0)
        await db.query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
        
        res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'خطأ في حذف الحساب' });
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
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log('');
});

