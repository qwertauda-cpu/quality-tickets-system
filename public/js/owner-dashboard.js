// Owner Dashboard JavaScript

// Wait for scripts to load
function initOwnerDashboard() {
    // Check if required functions are available
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initOwnerDashboard, 100);
        return;
    }
    
    // Wait for api to be available
    if (typeof window.api === 'undefined') {
        setTimeout(initOwnerDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.role !== 'owner') {
        showAlertModal('خطأ', 'غير مصرح لك بالوصول إلى هذه الصفحة');
        window.location.href = '/index.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.full_name || user.display_username || user.username;
    document.getElementById('currentUser').textContent = user.full_name || user.display_username || user.username;
    
    // Setup navigation
    setupNavigation();
    
    loadDashboard();
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
        });
    });
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Remove active class from all links
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    document.querySelector(`.sidebar-menu a[data-page="${pageName}"]`)?.classList.add('active');
    
    // Show selected page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update page title
    const titles = {
        'dashboard': 'لوحة التحكم',
        'companies': 'إدارة الشركات',
        'employees': 'إدارة الموظفين',
        'invoices': 'إدارة الفواتير',
        'purchase-requests': 'استلام الطلبات',
        'database': 'قاعدة البيانات'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || 'لوحة التحكم';
    
    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'companies':
            loadCompanies();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'purchase-requests':
            loadPurchaseRequests();
            break;
        case 'database':
            loadDatabaseTables();
            break;
    }
}

// ==================== Dashboard ====================
async function loadDashboard() {
    try {
        const data = await window.api.getOwnerDashboard();
        if (data && data.success) {
            const stats = data.stats;
            document.getElementById('totalCompanies').textContent = stats.total_companies || 0;
            document.getElementById('totalEmployees').textContent = stats.total_employees || 0;
            document.getElementById('pendingInvoices').textContent = stats.pending_invoices || 0;
            document.getElementById('pendingRequests').textContent = stats.pending_requests || 0;
            document.getElementById('totalRevenue').textContent = formatCurrency(stats.total_revenue || 0);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ==================== Companies Management ====================
async function loadCompanies() {
    try {
        const data = await window.api.getOwnerCompanies();
        if (data && data.success) {
            const tbody = document.getElementById('companiesTableBody');
            tbody.innerHTML = '';
            
            if (data.companies.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد شركات</td></tr>';
                return;
            }
            
            data.companies.forEach(company => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${company.name}</td>
                    <td><strong>@${company.domain}</strong></td>
                    <td>${company.admin_name || company.admin_username || '-'}</td>
                    <td>${company.current_employees || 0} / ${company.max_employees || '∞'}</td>
                    <td>${formatCurrency(company.price_per_employee)}</td>
                    <td><span class="badge ${company.is_active ? 'badge-success' : 'badge-danger'}">${company.is_active ? 'نشطة' : 'غير نشطة'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editCompany(${company.id})">تعديل</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        document.getElementById('companiesTableBody').innerHTML = '<tr><td colspan="7" class="text-center error">خطأ في تحميل البيانات</td></tr>';
    }
}

function openAddCompanyModal() {
    const modal = document.getElementById('addCompanyModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('addCompanyForm').reset();
}

function closeAddCompanyModal() {
    const modal = document.getElementById('addCompanyModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('company_name').value,
        domain: document.getElementById('company_domain').value,
        contact_name: document.getElementById('company_contact_name').value,
        contact_email: document.getElementById('company_contact_email').value,
        contact_phone: document.getElementById('company_contact_phone').value,
        address: document.getElementById('company_address').value,
        max_employees: parseInt(document.getElementById('company_max_employees').value) || 0,
        price_per_employee: parseFloat(document.getElementById('company_price_per_employee').value),
        admin_password: document.getElementById('company_admin_password').value
    };
    
    try {
        const data = await window.api.createCompany(formData);
        if (data && data.success) {
            showAlertModal('نجح', `تم إنشاء الشركة بنجاح!\nاسم المستخدم: ${data.company.admin_username}`);
            closeAddCompanyModal();
            loadCompanies();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في إنشاء الشركة');
    }
});

// ==================== Employees Management ====================
async function loadEmployees() {
    try {
        const companyId = document.getElementById('filterCompanyEmployees').value;
        const params = companyId ? { company_id: companyId } : {};
        
        const data = await window.api.getOwnerEmployees(params);
        if (data && data.success) {
            const tbody = document.getElementById('employeesTableBody');
            tbody.innerHTML = '';
            
            if (data.employees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد موظفين</td></tr>';
                return;
            }
            
            data.employees.forEach(emp => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${emp.username}</td>
                    <td>${emp.full_name}</td>
                    <td>${getRoleName(emp.role)}</td>
                    <td>${emp.company_name ? `${emp.company_name} (@${emp.domain})` : '-'}</td>
                    <td>${emp.team_name || '-'}</td>
                    <td><span class="badge ${emp.is_active ? 'badge-success' : 'badge-danger'}">${emp.is_active ? 'نشط' : 'غير نشط'}</span></td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Load companies for filter
        await loadCompaniesForFilter('filterCompanyEmployees');
    } catch (error) {
        console.error('Error loading employees:', error);
        document.getElementById('employeesTableBody').innerHTML = '<tr><td colspan="6" class="text-center error">خطأ في تحميل البيانات</td></tr>';
    }
}

async function loadCompaniesForFilter(selectId) {
    try {
        const data = await window.api.getOwnerCompanies();
        if (data && data.success) {
            const select = document.getElementById(selectId);
            const currentValue = select.value;
            select.innerHTML = '<option value="">جميع الشركات</option>';
            
            data.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = `${company.name} (@${company.domain})`;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading companies for filter:', error);
    }
}

// ==================== Invoices Management ====================
async function loadInvoices() {
    try {
        const companyId = document.getElementById('filterCompanyInvoices').value;
        const status = document.getElementById('filterStatusInvoices').value;
        
        const params = {};
        if (companyId) params.company_id = companyId;
        if (status) params.status = status;
        
        const data = await window.api.getOwnerInvoices(params);
        if (data && data.success) {
            const tbody = document.getElementById('invoicesTableBody');
            tbody.innerHTML = '';
            
            if (data.invoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد فواتير</td></tr>';
                return;
            }
            
            data.invoices.forEach(invoice => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${invoice.invoice_number}</td>
                    <td>${invoice.company_name} (@${invoice.domain})</td>
                    <td>${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}</td>
                    <td>${invoice.employee_count}</td>
                    <td>${formatCurrency(invoice.total)}</td>
                    <td>${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                    <td><span class="badge badge-${getInvoiceStatusClass(invoice.status)}">${getInvoiceStatusName(invoice.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewInvoice(${invoice.id})">عرض</button>
                        <button class="btn btn-sm btn-secondary" onclick="updateInvoiceStatus(${invoice.id})">تحديث الحالة</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Load companies for filter
        await loadCompaniesForFilter('filterCompanyInvoices');
    } catch (error) {
        console.error('Error loading invoices:', error);
        document.getElementById('invoicesTableBody').innerHTML = '<tr><td colspan="8" class="text-center error">خطأ في تحميل البيانات</td></tr>';
    }
}

function openCreateInvoiceModal() {
    const modal = document.getElementById('createInvoiceModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('createInvoiceForm').reset();
    loadCompaniesForInvoice();
}

function closeCreateInvoiceModal() {
    const modal = document.getElementById('createInvoiceModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

async function loadCompaniesForInvoice() {
    try {
        const data = await window.api.getOwnerCompanies();
        if (data && data.success) {
            const select = document.getElementById('invoice_company_id');
            select.innerHTML = '<option value="">اختر الشركة</option>';
            
            data.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = `${company.name} (@${company.domain})`;
                option.dataset.pricePerEmployee = company.price_per_employee;
                select.appendChild(option);
            });
            
            // Auto-fill price when company is selected
            select.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                if (selectedOption.dataset.pricePerEmployee) {
                    document.getElementById('invoice_price_per_employee').value = selectedOption.dataset.pricePerEmployee;
                }
            });
        }
    } catch (error) {
        console.error('Error loading companies for invoice:', error);
    }
}

document.getElementById('createInvoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        company_id: parseInt(document.getElementById('invoice_company_id').value),
        period_start: document.getElementById('invoice_period_start').value,
        period_end: document.getElementById('invoice_period_end').value,
        employee_count: parseInt(document.getElementById('invoice_employee_count').value),
        price_per_employee: parseFloat(document.getElementById('invoice_price_per_employee').value),
        tax: parseFloat(document.getElementById('invoice_tax').value) || 0,
        due_date: document.getElementById('invoice_due_date').value || null,
        notes: document.getElementById('invoice_notes').value || null
    };
    
    try {
        const data = await window.api.createInvoice(formData);
        if (data && data.success) {
            showAlertModal('نجح', 'تم إنشاء الفاتورة بنجاح!');
            closeCreateInvoiceModal();
            loadInvoices();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في إنشاء الفاتورة');
    }
});

// ==================== Purchase Requests ====================
async function loadPurchaseRequests() {
    try {
        const status = document.getElementById('filterStatusRequests').value;
        const params = status ? { status } : {};
        
        const data = await window.api.getOwnerPurchaseRequests(params);
        if (data && data.success) {
            const tbody = document.getElementById('purchaseRequestsTableBody');
            tbody.innerHTML = '';
            
            if (data.requests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد طلبات</td></tr>';
                return;
            }
            
            data.requests.forEach(request => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.company_name}</td>
                    <td>${request.contact_name}</td>
                    <td>${request.contact_email}</td>
                    <td>${request.contact_phone}</td>
                    <td>${request.expected_employees}</td>
                    <td>${formatDateTime(request.created_at)}</td>
                    <td><span class="badge badge-${getRequestStatusClass(request.status)}">${getRequestStatusName(request.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewPurchaseRequest(${request.id})">عرض</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading purchase requests:', error);
        document.getElementById('purchaseRequestsTableBody').innerHTML = '<tr><td colspan="8" class="text-center error">خطأ في تحميل البيانات</td></tr>';
    }
}

async function viewPurchaseRequest(id) {
    try {
        const data = await window.api.getOwnerPurchaseRequests();
        if (data && data.success) {
            const request = data.requests.find(r => r.id === id);
            if (request) {
                const details = document.getElementById('purchaseRequestDetails');
                details.innerHTML = `
                    <div class="form-group">
                        <label>اسم الشركة:</label>
                        <p>${request.company_name}</p>
                    </div>
                    <div class="form-group">
                        <label>اسم المسؤول:</label>
                        <p>${request.contact_name}</p>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني:</label>
                        <p>${request.contact_email}</p>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف:</label>
                        <p>${request.contact_phone}</p>
                    </div>
                    <div class="form-group">
                        <label>العنوان:</label>
                        <p>${request.company_address || '-'}</p>
                    </div>
                    <div class="form-group">
                        <label>عدد الموظفين المتوقع:</label>
                        <p>${request.expected_employees}</p>
                    </div>
                    <div class="form-group">
                        <label>الرسالة:</label>
                        <p>${request.message || '-'}</p>
                    </div>
                    <div class="form-group">
                        <label>الحالة:</label>
                        <p><span class="badge badge-${getRequestStatusClass(request.status)}">${getRequestStatusName(request.status)}</span></p>
                    </div>
                    ${request.admin_notes ? `
                    <div class="form-group">
                        <label>ملاحظات الإدارة:</label>
                        <p>${request.admin_notes}</p>
                    </div>
                    ` : ''}
                    ${request.converted_company_name ? `
                    <div class="form-group">
                        <label>تم التحويل إلى:</label>
                        <p>${request.converted_company_name} (@${request.converted_domain})</p>
                    </div>
                    ` : ''}
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="updatePurchaseRequestStatus(${request.id})">تحديث الحالة</button>
                        <button class="btn btn-secondary" onclick="closePurchaseRequestModal()">إغلاق</button>
                    </div>
                `;
                const modal = document.getElementById('purchaseRequestModal');
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);
            }
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تحميل تفاصيل الطلب');
    }
}

function closePurchaseRequestModal() {
    const modal = document.getElementById('purchaseRequestModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

async function updatePurchaseRequestStatus(id) {
    const status = prompt('اختر الحالة:\n1. pending - معلقة\n2. contacted - تم التواصل\n3. approved - موافق عليها\n4. rejected - مرفوضة\n5. converted - محولة');
    if (!status) return;
    
    const adminNotes = prompt('ملاحظات الإدارة (اختياري):') || null;
    
    try {
        const data = await window.api.updatePurchaseRequest(id, { status, admin_notes: adminNotes });
        if (data && data.success) {
            showAlertModal('نجح', 'تم تحديث حالة الطلب بنجاح!');
            closePurchaseRequestModal();
            loadPurchaseRequests();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تحديث حالة الطلب');
    }
}

async function viewInvoice(id) {
    // TODO: Implement invoice view modal
    showAlertModal('معلومة', 'ميزة عرض الفاتورة قيد التطوير');
}

async function updateInvoiceStatus(id) {
    const status = prompt('اختر الحالة:\n1. draft - مسودة\n2. sent - مرسلة\n3. paid - مدفوعة\n4. overdue - متأخرة\n5. cancelled - ملغاة');
    if (!status) return;
    
    let paidDate = null;
    if (status === 'paid') {
        paidDate = prompt('تاريخ الدفع (YYYY-MM-DD):') || null;
    }
    
    try {
        const data = await window.api.updateInvoiceStatus(id, { status, paid_date: paidDate });
        if (data && data.success) {
            showAlertModal('نجح', 'تم تحديث حالة الفاتورة بنجاح!');
            loadInvoices();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تحديث حالة الفاتورة');
    }
}

async function editCompany(id) {
    // TODO: Implement company edit modal
    showAlertModal('معلومة', 'ميزة تعديل الشركة قيد التطوير');
}

function exportTable(tableName) {
    window.api.exportDatabase([tableName]).then(result => {
        if (result && result.success) {
            showAlertModal('نجح', 'تم تصدير الجدول بنجاح!');
        }
    }).catch(error => {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تصدير الجدول');
    });
}

// ==================== Database Management ====================
async function loadDatabaseTables() {
    try {
        const data = await window.api.getExportTables();
        if (data && data.success) {
            const tbody = document.getElementById('databaseTablesTableBody');
            tbody.innerHTML = '';
            
            if (data.tables.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">لا توجد جداول</td></tr>';
                return;
            }
            
            data.tables.forEach(table => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${table.name}</td>
                    <td>${table.description}</td>
                    <td>-</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="exportTable('${table.name}')">تصدير</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading database tables:', error);
        document.getElementById('databaseTablesTableBody').innerHTML = '<tr><td colspan="4" class="text-center error">خطأ في تحميل البيانات</td></tr>';
    }
}

// ==================== Helper Functions ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA');
}

function getRoleName(role) {
    const roles = {
        'owner': 'مالك الموقع',
        'admin': 'مدير',
        'quality_staff': 'موظف جودة',
        'team_leader': 'قائد فريق',
        'technician': 'فني',
        'accountant': 'محاسب',
        'call_center': 'مركز اتصال',
        'agent': 'وكيل'
    };
    return roles[role] || role;
}

function getInvoiceStatusName(status) {
    const statuses = {
        'draft': 'مسودة',
        'sent': 'مرسلة',
        'paid': 'مدفوعة',
        'overdue': 'متأخرة',
        'cancelled': 'ملغاة'
    };
    return statuses[status] || status;
}

function getInvoiceStatusClass(status) {
    const classes = {
        'draft': 'secondary',
        'sent': 'info',
        'paid': 'success',
        'overdue': 'danger',
        'cancelled': 'secondary'
    };
    return classes[status] || 'secondary';
}

function getRequestStatusName(status) {
    const statuses = {
        'pending': 'معلقة',
        'contacted': 'تم التواصل',
        'approved': 'موافق عليها',
        'rejected': 'مرفوضة',
        'converted': 'محولة'
    };
    return statuses[status] || status;
}

function getRequestStatusClass(status) {
    const classes = {
        'pending': 'warning',
        'contacted': 'info',
        'approved': 'success',
        'rejected': 'danger',
        'converted': 'success'
    };
    return classes[status] || 'secondary';
}

function showAlertModal(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    const modal = document.getElementById('alertModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Mobile menu toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    });
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOwnerDashboard);
} else {
    initOwnerDashboard();
}

