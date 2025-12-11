/**
 * منطق حساب النقاط - Scoring Logic
 */

const db = require('./db-manager');

/**
 * حساب النقاط الإجمالية للتكت
 */
async function calculateTicketScores(ticketId) {
    try {
        // الحصول على معلومات التكت
        const ticket = await db.queryOne(`
            SELECT t.*, tt.sla_min, tt.sla_max, tt.base_points, tt.category
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket) {
            throw new Error('التكت غير موجود');
        }
        
        // حذف النقاط القديمة
        await db.query('DELETE FROM positive_scores WHERE ticket_id = ?', [ticketId]);
        await db.query('DELETE FROM negative_scores WHERE ticket_id = ?', [ticketId]);
        
        let totalPositive = 0;
        let totalNegative = 0;
        
        // ==================== 1. نقاط نوع التكت ====================
        if (ticket.base_points > 0) {
            await db.query(`
                INSERT INTO positive_scores (ticket_id, score_type, points, description)
                VALUES (?, 'ticket_type', ?, ?)
            `, [ticketId, ticket.base_points, `نقاط نوع التكت: ${ticket.base_points}`]);
            totalPositive += ticket.base_points;
        }
        
        // ==================== 2. نقاط السرعة حسب SLA ====================
        if (ticket.actual_time_minutes !== null) {
            let speedPoints = 0;
            let speedStatus = '';
            
            if (ticket.actual_time_minutes <= ticket.sla_min) {
                speedPoints = 10;
                speedStatus = 'ممتاز';
            } else if (ticket.actual_time_minutes <= ticket.sla_max) {
                speedPoints = 5;
                speedStatus = 'مقبول';
            } else {
                speedPoints = 0;
                speedStatus = 'متأخر';
            }
            
            if (speedPoints > 0) {
                await db.query(`
                    INSERT INTO positive_scores (ticket_id, score_type, points, description)
                    VALUES (?, 'speed', ?, ?)
                `, [ticketId, speedPoints, `نقاط السرعة (${speedStatus}): ${speedPoints}`]);
                totalPositive += speedPoints;
            }
        }
        
        // ==================== 3. نقاط الجودة (الصور) ====================
        const requiredPhotos = [
            'pole_before', 'pole_after', 'pppoe', 'equipment_location',
            'subscriber_power', 'dhcp_status', 'speed_test', 'google_bank',
            'activation_message', 'rx_power'
        ];
        
        const existingPhotos = await db.query(`
            SELECT photo_type FROM ticket_photos WHERE ticket_id = ?
        `, [ticketId]);
        
        const existingTypes = existingPhotos.map(p => p.photo_type);
        const missingPhotos = requiredPhotos.filter(type => !existingTypes.includes(type));
        
        // نقص الصور (-2 لكل صورة)
        if (missingPhotos.length > 0) {
            const penaltyPoints = missingPhotos.length * 2;
            await db.query(`
                INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                VALUES (?, 'missing_photo', ?, ?)
            `, [ticketId, -penaltyPoints, `نقص ${missingPhotos.length} صورة: -${penaltyPoints} نقطة`]);
            totalNegative += penaltyPoints;
        }
        
        // التكت كامل بالصور (+10)
        if (missingPhotos.length === 0 && existingPhotos.length >= 8) {
            await db.query(`
                INSERT INTO positive_scores (ticket_id, score_type, points, description)
                VALUES (?, 'quality', 10, 'التكت كامل بالصور: +10')
            `, [ticketId]);
            totalPositive += 10;
        }
        
        // ==================== 4. نقاط السلوك والجودة ====================
        const qualityReview = await db.queryOne(`
            SELECT * FROM quality_reviews WHERE ticket_id = ?
        `, [ticketId]);
        
        if (qualityReview) {
            // نقاط السلوك
            if (qualityReview.team_rating >= 4) {
                await db.query(`
                    INSERT INTO positive_scores (ticket_id, score_type, points, description)
                    VALUES (?, 'behavior', 10, 'سلوك ممتاز: +10')
                `, [ticketId]);
                totalPositive += 10;
            } else if (qualityReview.team_rating >= 3) {
                await db.query(`
                    INSERT INTO positive_scores (ticket_id, score_type, points, description)
                    VALUES (?, 'behavior', 5, 'سلوك جيد: +5')
                `, [ticketId]);
                totalPositive += 5;
            }
            
            // نقاط البيع (Upsell) - سيتم إضافتها لاحقاً من واجهة موظف الجودة
        }
        
        // ==================== 5. معالجة التأجيل ====================
        if (ticket.status === 'postponed') {
            let penaltyPoints = 0;
            if (ticket.postponement_days === 1) {
                penaltyPoints = 5;
                await db.query(`
                    INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                    VALUES (?, 'postponed', ?, 'مؤجل يوم واحد: -5')
                `, [ticketId, -penaltyPoints]);
            } else if (ticket.postponement_days > 1) {
                penaltyPoints = 10;
                await db.query(`
                    INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                    VALUES (?, 'postponed', ?, 'مؤجل أكثر من يوم: -10')
                `, [ticketId, -penaltyPoints]);
            }
            
            if (!ticket.postponement_reason || ticket.postponement_reason.trim() === '') {
                await db.query(`
                    INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                    VALUES (?, 'postponed', -15, 'تأجيل بدون سبب: -15')
                `, [ticketId]);
                penaltyPoints += 15;
            }
            
            totalNegative += penaltyPoints;
        }
        
        // ==================== 6. معالجة الإغلاق/التحويل بدون إكمال ====================
        if (ticket.status === 'closed' && ticket.actual_time_minutes === null) {
            await db.query(`
                INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                VALUES (?, 'closed_incomplete', -15, 'إغلاق بدون إكمال: -15')
            `, [ticketId]);
            totalNegative += 15;
        }
        
        return {
            totalPositive,
            totalNegative,
            netScore: totalPositive - totalNegative
        };
        
    } catch (error) {
        console.error('Error calculating scores:', error);
        throw error;
    }
}

/**
 * حساب Load Factor للفريق
 */
async function calculateLoadFactor(teamId, date) {
    try {
        const team = await db.queryOne('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team) return 1.0;
        
        // حساب عدد ربط والصيانة في اليوم
        const tickets = await db.query(`
            SELECT tt.category, COUNT(*) as count
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.team_id = ? 
            AND DATE(t.created_at) = ?
            AND t.status = 'completed'
            GROUP BY tt.category
        `, [teamId, date]);
        
        let connectionCount = 0;
        let maintenanceCount = 0;
        
        tickets.forEach(t => {
            if (t.category === 'connection') {
                connectionCount = t.count;
            } else if (t.category === 'maintenance') {
                maintenanceCount = t.count;
            }
        });
        
        let loadFactor = 1.0;
        
        // إذا تجاوز حد الربط
        if (connectionCount > team.max_connection_limit) {
            loadFactor = team.max_connection_limit / connectionCount;
        }
        
        // إذا تجاوز حد الصيانة
        if (maintenanceCount > team.max_maintenance_limit) {
            const maintenanceFactor = team.max_maintenance_limit / maintenanceCount;
            loadFactor = Math.min(loadFactor, maintenanceFactor);
        }
        
        return loadFactor;
        
    } catch (error) {
        console.error('Error calculating load factor:', error);
        return 1.0;
    }
}

/**
 * حساب البونص اليومي
 */
async function calculateDailyBonus(teamId, date) {
    try {
        const tickets = await db.query(`
            SELECT tt.category, COUNT(*) as count
            FROM tickets t
            JOIN ticket_types tt ON t.ticket_type_id = tt.id
            WHERE t.team_id = ? 
            AND DATE(t.created_at) = ?
            AND t.status = 'completed'
            GROUP BY tt.category
        `, [teamId, date]);
        
        let connectionCount = 0;
        let maintenanceCount = 0;
        
        tickets.forEach(t => {
            if (t.category === 'connection') {
                connectionCount = t.count;
            } else if (t.category === 'maintenance') {
                maintenanceCount = t.count;
            }
        });
        
        let bonusPoints = 0;
        
        // 7 ربط → +15
        if (connectionCount >= 7) {
            bonusPoints += 15;
        }
        
        // 15 صيانة → +15
        if (maintenanceCount >= 15) {
            bonusPoints += 15;
        }
        
        // الاثنين معاً → +30
        if (connectionCount >= 7 && maintenanceCount >= 15) {
            bonusPoints = 30; // إجمالي 30 وليس 30+15+15
        }
        
        return bonusPoints;
        
    } catch (error) {
        console.error('Error calculating daily bonus:', error);
        return 0;
    }
}

/**
 * حساب البونص الشهري
 */
async function calculateMonthlyBonus(teamId, year, month) {
    try {
        const workingDays = await db.query(`
            SELECT COUNT(DISTINCT DATE(created_at)) as days
            FROM tickets
            WHERE team_id = ?
            AND YEAR(created_at) = ?
            AND MONTH(created_at) = ?
            AND status = 'completed'
        `, [teamId, year, month]);
        
        const days = workingDays[0]?.days || 0;
        
        // تحقيق 20 يوم → +100
        if (days >= 20) {
            return 100;
        }
        
        return 0;
        
    } catch (error) {
        console.error('Error calculating monthly bonus:', error);
        return 0;
    }
}

module.exports = {
    calculateTicketScores,
    calculateLoadFactor,
    calculateDailyBonus,
    calculateMonthlyBonus
};

