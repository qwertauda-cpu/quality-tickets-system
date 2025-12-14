// Central menu + titles config (shared across all roles)
// Edit labels here once → reflected everywhere.

(function () {
  const titles = {
    // Common
    dashboard: 'لوحة التحكم',
    tickets: 'التذاكر',
    reports: 'التقارير',
    settings: 'الإعدادات',

    // Admin
    'add-ticket': 'إضافة تذكرة',
    users: 'إدارة المستخدمين',
    teams: 'الفرق',
    'scoring-rules': 'قواعد النقاط',

    // Owner
    companies: 'إدارة الشركات',
    employees: 'إدارة الموظفين',
    invoices: 'إدارة الفواتير',
    'purchase-requests': 'استلام الطلبات',
    database: 'قاعدة البيانات',

    // Call center
    followup: 'المتابعة اليومية',

    // Quality staff
    'tickets-management': 'إدارة التذاكر',
    'tickets-management-new': 'إدارة التذاكر (جديد)',
    'tickets-list': 'إدارة الجودة',
    'daily-report': 'التقرير اليومي',

    // Technician
    'active-tickets': 'لوحة التذاكر',
    'completed-tickets': 'لوحة التذاكر المنجزة',
    rankings: 'التصنيف',
    'my-team': 'فريقي',

    // Team dashboard
    'my-scores': 'نقاطي',
    'all-teams': 'ترتيب الفرق',
    'my-tickets': 'تذاكراتي',

    // Accountant
    rewards: 'المكافآت',
    calculate: 'حساب المكافآت'
  };

  // Menu item definitions (icon kept simple + consistent)
  const items = {
    dashboard: { icon: '📊', label: titles.dashboard },
    tickets: { icon: '🎫', label: titles.tickets },
    reports: { icon: '📄', label: titles.reports },
    settings: { icon: '⚙️', label: titles.settings },

    'add-ticket': { icon: '➕', label: titles['add-ticket'] },
    users: { icon: '👤', label: titles.users },
    teams: { icon: '👥', label: titles.teams },
    'scoring-rules': { icon: '⚙️', label: titles['scoring-rules'] },

    companies: { icon: '🏢', label: titles.companies },
    employees: { icon: '👥', label: titles.employees },
    invoices: { icon: '💰', label: titles.invoices },
    'purchase-requests': { icon: '📥', label: titles['purchase-requests'] },
    database: { icon: '🗄️', label: titles.database },

    followup: { icon: '📋', label: titles.followup },

    'tickets-management': { icon: '📝', label: titles['tickets-management'] },
    'tickets-management-new': { icon: '📋', label: titles['tickets-management-new'] },
    'tickets-list': { icon: '✅', label: titles['tickets-list'] },
    'daily-report': { icon: '📄', label: titles['daily-report'] },

    'active-tickets': { icon: '📋', label: titles['active-tickets'] },
    'completed-tickets': { icon: '✅', label: titles['completed-tickets'] },
    rankings: { icon: '🏆', label: titles.rankings },
    'my-team': { icon: '👥', label: titles['my-team'] },

    'my-scores': { icon: '📊', label: titles['my-scores'] },
    'all-teams': { icon: '🏆', label: titles['all-teams'] },
    'my-tickets': { icon: '🎫', label: titles['my-tickets'] },

    rewards: { icon: '💰', label: titles.rewards },
    calculate: { icon: '🧮', label: titles.calculate }
  };

  // Base sections shown across all roles (if they exist on the page)
  const baseMenu = ['dashboard', 'tickets', 'reports', 'settings'];

  // Role extras (can expand in future for owner/admin)
  const roleExtras = {
    owner: ['companies', 'employees', 'invoices', 'purchase-requests', 'database'],
    admin: ['add-ticket', 'users', 'teams', 'scoring-rules'],
    quality_staff: ['tickets-management', 'tickets-management-new', 'tickets-list', 'followup', 'daily-report'],
    call_center: ['tickets', 'followup'],
    technician: ['active-tickets', 'completed-tickets', 'dashboard', 'rankings', 'my-team'],
    team_leader: ['active-tickets', 'completed-tickets', 'dashboard', 'rankings', 'my-team'],
    team: ['my-scores', 'all-teams', 'my-tickets'],
    agent: ['tickets'],
    accountant: ['rewards', 'calculate']
  };

  window.MenuConfig = {
    titles,
    items,
    baseMenu,
    roleExtras
  };
})();
