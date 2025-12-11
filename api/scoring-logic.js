/**
 * منطق حساب النقاط - Scoring Logic (النظام الجديد)
 */

const db = require('./db-manager');

/**
 * حساب النقاط الإجمالية للتكت (النظام الجديد)
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
        
        let basePoints = 0;
        let speedScore = 0;
        let qualityScore = 0;
        let behaviorScore = 0;
        let upsellScore = 0;
        let penalties = 0;
        let adjustedTime = null;
        let slaStatus = 'late';
        
        // ==================== 1. نقاط نوع التكت (Base Points) ====================
        if (ticket.base_points > 0) {
            basePoints = ticket.base_points;
            await db.query(`
                INSERT INTO positive_scores (ticket_id, score_type, points, description)
                VALUES (?, 'ticket_type', ?, ?)
            `, [ticketId, basePoints, `نقاط نوع التكت: ${basePoints}`]);
        }
        
        // ==================== 2. حساب الوقت المعدل (Adjusted Time) ====================
        if (ticket.actual_time_minutes !== null) {
            // استخدام adjusted_time_minutes إذا كان موجوداً، وإلا actual_time_minutes
            adjustedTime = ticket.adjusted_time_minutes || ticket.actual_time_minutes;
            
            // إذا كان load_factor > 1، نستخدم adjusted_time
            if (ticket.load_factor && ticket.load_factor > 1) {
                adjustedTime = Math.round(ticket.actual_time_minutes / ticket.load_factor);
            }
        }
        
        // ==================== 3. نقاط السرعة حسب SLA (Speed Score) ====================
        if (adjustedTime !== null) {
            if (adjustedTime <= ticket.sla_min) {
                speedScore = 10;
                slaStatus = 'excellent';
            } else if (adjustedTime <= ticket.sla_max) {
                speedScore = 5;
                slaStatus = 'acceptable';
            } else {
                speedScore = 0;
                slaStatus = 'late';
            }
            
            if (speedScore > 0) {
                await db.query(`
                    INSERT INTO positive_scores (ticket_id, score_type, points, description)
                    VALUES (?, 'speed', ?, ?)
                `, [ticketId, speedScore, `نقاط السرعة (${slaStatus === 'excellent' ? 'ممتاز' : 'مقبول'}): ${speedScore}`]);
            }
        }
        
        // ==================== 4. نقاط الجودة (Quality Score) - النظام الجديد ====================
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
        const requiredImages = requiredPhotos.length;
        const imagesAttached = existingPhotos.length;
        
        // الصيغة الجديدة: qualityScore = 10 - (missingImages * 2)
        qualityScore = 10 - (missingPhotos.length * 2);
        if (qualityScore < 0) {
            qualityScore = 0;
        }
        
        if (qualityScore > 0) {
            await db.query(`
                INSERT INTO positive_scores (ticket_id, score_type, points, description)
                VALUES (?, 'quality', ?, ?)
            `, [ticketId, qualityScore, `نقاط الجودة: ${qualityScore} (${imagesAttached}/${requiredImages} صورة)`]);
        }
        
        // ==================== 5. نقاط السلوك (Behavior Score) - النظام الجديد ====================
        const qualityReview = await db.queryOne(`
            SELECT * FROM quality_reviews WHERE ticket_id = ?
        `, [ticketId]);
        
        if (qualityReview) {
            // استخدام behavior_rating إذا كان موجوداً (النظام الجديد)
            // وإلا استخدام team_rating (النظام القديم للتوافق)
            let behaviorRating = qualityReview.behavior_rating;
            
            if (!behaviorRating) {
                // تحويل team_rating إلى behavior_rating للتوافق
                if (qualityReview.team_rating >= 4) {
                    behaviorRating = 'excellent';
                } else if (qualityReview.team_rating >= 3) {
                    behaviorRating = 'good';
                } else if (qualityReview.team_rating >= 2) {
                    behaviorRating = 'normal';
                } else {
                    behaviorRating = 'bad';
                }
            }
            
            // حساب نقاط السلوك حسب النظام الجديد
            if (behaviorRating === 'excellent') {
                behaviorScore = 10;
            } else if (behaviorRating === 'good') {
                behaviorScore = 5;
            } else if (behaviorRating === 'normal') {
                behaviorScore = 0;
            } else if (behaviorRating === 'bad') {
                behaviorScore = -10;
            }
            
            if (behaviorScore > 0) {
                await db.query(`
                    INSERT INTO positive_scores (ticket_id, score_type, points, description)
                    VALUES (?, 'behavior', ?, ?)
                `, [ticketId, behaviorScore, `سلوك ${behaviorRating === 'excellent' ? 'ممتاز' : 'جيد'}: +${behaviorScore}`]);
            } else if (behaviorScore < 0) {
                await db.query(`
                    INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                    VALUES (?, 'bad_behavior', ?, ?)
                `, [ticketId, behaviorScore, `سلوك سيء: ${behaviorScore}`]);
                penalties += Math.abs(behaviorScore);
            }
        }
        
        // ==================== 6. نقاط البيع (Upsell Score) - النظام الجديد ====================
        if (qualityReview) {
            if (qualityReview.upsell_router) {
                upsellScore += 10;
            }
            if (qualityReview.upsell_onu) {
                upsellScore += 10;
            }
            if (qualityReview.upsell_ups) {
                upsellScore += 10;
            }
            
            if (upsellScore > 0) {
                await db.query(`
                    INSERT INTO positive_scores (ticket_id, score_type, points, description)
                    VALUES (?, 'upsell', ?, ?)
                `, [ticketId, upsellScore, `نقاط البيع: +${upsellScore}`]);
            }
        }
        
        // ==================== 7. العقوبات (Penalties) ====================
        // التأجيل
        if (ticket.status === 'postponed') {
            let penaltyPoints = 0;
            if (ticket.postponement_days === 1) {
                penaltyPoints = 5;
            } else if (ticket.postponement_days > 1) {
                penaltyPoints = 10;
            }
            
            if (!ticket.postponement_reason || ticket.postponement_reason.trim() === '') {
                penaltyPoints += 15;
            }
            
            if (penaltyPoints > 0) {
                await db.query(`
                    INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                    VALUES (?, 'postponed', ?, ?)
                `, [ticketId, -penaltyPoints, `تأجيل: -${penaltyPoints}`]);
                penalties += penaltyPoints;
            }
        }
        
        // الإغلاق بدون إكمال
        if (ticket.status === 'closed' && ticket.actual_time_minutes === null) {
            await db.query(`
                INSERT INTO negative_scores (ticket_id, penalty_type, points, description)
                VALUES (?, 'closed_incomplete', -15, 'إغلاق بدون إكمال: -15')
            `, [ticketId]);
            penalties += 15;
        }
        
        // ==================== 8. حساب النقاط الإجمالية ====================
        const totalPositive = basePoints + speedScore + qualityScore + (behaviorScore > 0 ? behaviorScore : 0) + upsellScore;
        const totalNegative = penalties + (behaviorScore < 0 ? Math.abs(behaviorScore) : 0);
        const netScore = totalPositive - totalNegative;
        
        return {
            totalScore: netScore,
            basePoints,
            speedScore,
            qualityScore,
            behaviorScore,
            upsellScore,
            penalties,
            adjustedTime,
            slaStatus,
            totalPositive,
            totalNegative,
            netScore
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

/**
 * تحديث daily_summaries للفريق في تاريخ معين
 */
async function updateDailySummary(teamId, date) {
    try {
        // حساب النقاط الإجمالية للفريق في اليوم
        const scores = await db.query(`
            SELECT 
                COUNT(DISTINCT t.id) as total_tickets,
                COALESCE(SUM((SELECT SUM(points) FROM positive_scores WHERE ticket_id = t.id)), 0) as total_positive_points,
                COALESCE(SUM((SELECT SUM(ABS(points)) FROM negative_scores WHERE ticket_id = t.id)), 0) as total_negative_points
            FROM tickets t
            WHERE t.team_id = ? AND DATE(t.created_at) = ?
        `, [teamId, date]);
        
        const stats = scores[0] || { total_tickets: 0, total_positive_points: 0, total_negative_points: 0 };
        
        // حساب البونص اليومي
        const dailyBonus = await calculateDailyBonus(teamId, date);
        const totalPositive = stats.total_positive_points + dailyBonus;
        const netPoints = totalPositive - stats.total_negative_points;
        
        // تحديث أو إدراج daily_summary
        await db.query(`
            INSERT INTO daily_summaries (
                team_id, date, total_tickets, 
                total_positive_points, total_negative_points, net_points
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_tickets = VALUES(total_tickets),
                total_positive_points = VALUES(total_positive_points),
                total_negative_points = VALUES(total_negative_points),
                net_points = VALUES(net_points),
                updated_at = NOW()
        `, [
            teamId, date, stats.total_tickets,
            totalPositive, stats.total_negative_points, netPoints
        ]);
        
        return {
            total_tickets: stats.total_tickets,
            total_positive_points: totalPositive,
            total_negative_points: stats.total_negative_points,
            net_points: netPoints,
            daily_bonus: dailyBonus
        };
        
    } catch (error) {
        console.error('Error updating daily summary:', error);
        throw error;
    }
}

module.exports = {
    calculateTicketScores,
    calculateLoadFactor,
    calculateDailyBonus,
    calculateMonthlyBonus,
    updateDailySummary
};
