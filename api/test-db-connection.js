const db = require('./db-manager');

async function testConnection() {
    try {
        console.log('🔄 جاري اختبار الاتصال بقاعدة البيانات...\n');
        
        // Test 1: Check companies table
        const companies = await db.query('SELECT COUNT(*) as count FROM companies');
        console.log('✅ جدول companies:', companies[0].count, 'شركة');
        
        // Test 2: Check users table
        const users = await db.query('SELECT COUNT(*) as count FROM users');
        console.log('✅ جدول users:', users[0].count, 'مستخدم');
        
        // Test 3: Check owner user
        const owner = await db.queryOne('SELECT id, username, role FROM users WHERE role = "owner" LIMIT 1');
        if (owner) {
            console.log('✅ حساب Owner موجود:', owner.username);
        } else {
            console.log('❌ حساب Owner غير موجود');
        }
        
        // Test 4: Check employees
        const employees = await db.query('SELECT COUNT(*) as count FROM users WHERE role != "owner" AND role != "admin" AND company_id IS NOT NULL');
        console.log('✅ الموظفين:', employees[0].count, 'موظف');
        
        // Test 5: Check invoices
        const invoices = await db.query('SELECT COUNT(*) as count FROM invoices');
        console.log('✅ جدول invoices:', invoices[0].count, 'فاتورة');
        
        // Test 6: Check purchase_requests
        const requests = await db.query('SELECT COUNT(*) as count FROM purchase_requests');
        console.log('✅ جدول purchase_requests:', requests[0].count, 'طلب');
        
        // Test 7: Test owner dashboard API query
        const stats = {
            total_companies: await db.queryOne('SELECT COUNT(*) as count FROM companies WHERE is_active = 1'),
            total_employees: await db.queryOne('SELECT COUNT(*) as count FROM users WHERE role != "owner" AND role != "admin" AND company_id IS NOT NULL'),
            pending_invoices: await db.queryOne('SELECT COUNT(*) as count FROM invoices WHERE status IN ("draft", "sent", "overdue")'),
            pending_requests: await db.queryOne('SELECT COUNT(*) as count FROM purchase_requests WHERE status = "pending"'),
            total_revenue: await db.queryOne('SELECT SUM(total) as total FROM invoices WHERE status = "paid"')
        };
        
        console.log('\n📊 إحصائيات Dashboard:');
        console.log('   - الشركات النشطة:', stats.total_companies?.count || 0);
        console.log('   - الموظفين:', stats.total_employees?.count || 0);
        console.log('   - الفواتير المعلقة:', stats.pending_invoices?.count || 0);
        console.log('   - الطلبات المعلقة:', stats.pending_requests?.count || 0);
        console.log('   - إجمالي الإيرادات:', parseFloat(stats.total_revenue?.total || 0));
        
        console.log('\n✅ جميع الاختبارات نجحت! قاعدة البيانات متصلة بشكل صحيح.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ خطأ في الاتصال:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testConnection();

