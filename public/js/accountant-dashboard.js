// Accountant Dashboard JavaScript

function initAccountantDashboard() {
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initAccountantDashboard, 100);
        return;
    }
    
    if (typeof window.api === 'undefined') {
        setTimeout(initAccountantDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.role !== 'accountant') {
        alert('غير مصرح لك بالوصول إلى هذه الصفحة');
        window.location.href = '/index.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('currentUser').textContent = user.full_name;
    
    // Setup navigation
    setupNavigation();
    
    // Set current year/month
    const now = new Date();
    document.getElementById('calcYear').value = now.getFullYear();
    document.getElementById('calcMonth').value = now.getMonth() + 1;
    
    // Load years for filter
    loadYears();
    
    loadRewards();
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
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    const titles = {
        'rewards': 'المكافآت',
        'calculate': 'حساب المكافآت'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        titleEl.textContent = titles[pageName] || 'لوحة المحاسب';
    }
    
    if (pageName === 'rewards') {
        loadRewards();
    }
}

function loadYears() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('filterYear');
    for (let year = currentYear; year >= 2020; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

async function loadRewards() {
    try {
        const year = document.getElementById('filterYear').value;
        const month = document.getElementById('filterMonth').value;
        const status = document.getElementById('filterStatus').value;
        
        const params = {};
        if (year) params.year = year;
        if (month) params.month = month;
        if (status) params.status = status;
        
        const response = await window.api.getRewards(params);
        
        if (response.success) {
            displayRewards(response.rewards);
        } else {
            document.getElementById('rewardsList').innerHTML = '<p>خطأ في جلب المكافآت</p>';
        }
    } catch (error) {
        console.error('Load rewards error:', error);
        document.getElementById('rewardsList').innerHTML = '<p>خطأ في جلب المكافآت</p>';
    }
}

function displayRewards(rewards) {
    const container = document.getElementById('rewardsList');
    
    if (rewards.length === 0) {
        container.innerHTML = '<p>لا توجد مكافآت</p>';
        return;
    }
    
    let html = '<table class="data-table">';
    html += '<thead><tr>';
    html += '<th>الفريق</th>';
    html += '<th>السنة</th>';
    html += '<th>الشهر</th>';
    html += '<th>مكافأة الربط</th>';
    html += '<th>مكافأة الصيانة</th>';
    html += '<th>مكافأة الجودة</th>';
    html += '<th>مكافأة الترتيب</th>';
    html += '<th>إجمالي النقاط</th>';
    html += '<th>إجمالي المكافأة</th>';
    html += '<th>الحالة</th>';
    html += '<th>الإجراءات</th>';
    html += '</tr></thead><tbody>';
    
    rewards.forEach(reward => {
        const statusText = {
            'pending': 'معلق',
            'approved': 'معتمد',
            'paid': 'مدفوع'
        };
        
        const statusClass = {
            'pending': 'warning',
            'approved': 'info',
            'paid': 'success'
        };
        
        html += '<tr>';
        html += `<td>${reward.team_name}</td>`;
        html += `<td>${reward.year}</td>`;
        html += `<td>${reward.month}</td>`;
        html += `<td>${formatCurrency(reward.connection_bonus)}</td>`;
        html += `<td>${formatCurrency(reward.maintenance_bonus)}</td>`;
        html += `<td>${formatCurrency(reward.quality_bonus)}</td>`;
        html += `<td>${formatCurrency(reward.ranking_bonus)}</td>`;
        html += `<td>${reward.total_points}</td>`;
        html += `<td><strong>${formatCurrency(reward.total_reward)}</strong></td>`;
        html += `<td><span class="badge ${statusClass[reward.status]}">${statusText[reward.status]}</span></td>`;
        html += '<td>';
        html += `<button class="btn btn-sm btn-primary" onclick="updateRewardStatus(${reward.id}, 'approved')">اعتماد</button> `;
        html += `<button class="btn btn-sm btn-success" onclick="updateRewardStatus(${reward.id}, 'paid')">دفع</button>`;
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    // إجمالي
    const totalReward = rewards.reduce((sum, r) => sum + parseFloat(r.total_reward || 0), 0);
    html += `<div style="margin-top: 20px; text-align: left; font-size: 18px; font-weight: bold;">`;
    html += `إجمالي المكافآت: ${formatCurrency(totalReward)}`;
    html += `</div>`;
    
    container.innerHTML = html;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-IQ', {
        style: 'currency',
        currency: 'IQD',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

async function calculateRewards() {
    try {
        const year = parseInt(document.getElementById('calcYear').value);
        const month = parseInt(document.getElementById('calcMonth').value);
        
        if (!year || !month) {
            alert('الرجاء اختيار السنة والشهر');
            return;
        }
        
        const resultDiv = document.getElementById('calculateResult');
        resultDiv.innerHTML = '<p>جاري حساب المكافآت...</p>';
        
        const response = await window.api.calculateRewards({ year, month });
        
        if (response.success) {
            let html = '<div class="alert alert-success">';
            html += `<p>${response.message}</p>`;
            html += '<ul>';
            response.rewards.forEach(r => {
                html += `<li>${r.team_name}: ${formatCurrency(r.total_reward)}</li>`;
            });
            html += '</ul>';
            html += '</div>';
            resultDiv.innerHTML = html;
            
            // إعادة تحميل قائمة المكافآت
            setTimeout(() => {
                showPage('rewards');
            }, 2000);
        } else {
            resultDiv.innerHTML = `<div class="alert alert-error">${response.error || 'خطأ في حساب المكافآت'}</div>`;
        }
    } catch (error) {
        console.error('Calculate rewards error:', error);
        document.getElementById('calculateResult').innerHTML = '<div class="alert alert-error">خطأ في حساب المكافآت</div>';
    }
}

async function updateRewardStatus(rewardId, status) {
    try {
        if (!confirm('هل أنت متأكد من تغيير حالة المكافأة؟')) {
            return;
        }
        
        const response = await window.api.updateReward(rewardId, { status });
        
        if (response.success) {
            loadRewards();
        } else {
            alert(response.error || 'خطأ في تحديث المكافأة');
        }
    } catch (error) {
        console.error('Update reward status error:', error);
        alert('خطأ في تحديث المكافأة');
    }
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountantDashboard);
} else {
    initAccountantDashboard();
}

