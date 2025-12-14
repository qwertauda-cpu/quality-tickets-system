// Shared dashboard navigation + unified menu rendering

(function () {
  function getRole() {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    return user?.role || null;
  }

  function setUserLabels() {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!user) return;

    const userName = document.getElementById('userName');
    if (userName) userName.textContent = user.full_name || user.username || '';

    const currentUser = document.getElementById('currentUser');
    if (currentUser) currentUser.textContent = user.full_name || user.username || '';
  }

  function ensurePlaceholderPage(pageKey) {
    if (document.getElementById(`${pageKey}-page`)) return;
    const main = document.querySelector('main.main-content');
    if (!main) return;

    const title = window.MenuConfig?.titles?.[pageKey] || pageKey;
    const page = document.createElement('div');
    page.id = `${pageKey}-page`;
    page.className = 'page-content';
    page.style.display = 'none';
    page.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>${title}</h2>
        </div>
        <div class="card-body">
          <p style="color: var(--text-secondary);">
            هذا القسم موحد بين جميع الحسابات. في هذا الحساب قد لا تتوفر بيانات أو صلاحيات لهذا القسم.
          </p>
        </div>
      </div>
    `;
    main.appendChild(page);
  }

  function elementExistsForPageKey(pageKey) {
    // Default convention: <div id="${key}-page" class="page-content">
    const el = document.getElementById(`${pageKey}-page`);
    return !!el;
  }

  function defaultShowPage(pageKey) {
    // hide all
    document.querySelectorAll('.page-content').forEach((p) => {
      p.style.display = 'none';
    });

    const target = document.getElementById(`${pageKey}-page`);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.sidebar-menu a[data-page]').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-page') === pageKey);
    });

    const titleEl = document.getElementById('pageTitle');
    const t = window.MenuConfig?.titles?.[pageKey];
    if (titleEl) titleEl.textContent = t || pageKey;
  }

  function buildMenuKeys(role) {
    const cfg = window.MenuConfig;
    if (!cfg) return [];

    const base = cfg.baseMenu || [];
    const extras = (cfg.roleExtras && cfg.roleExtras[role]) ? cfg.roleExtras[role] : [];

    // Keep order stable: base first, then extras (dedup)
    const result = [];
    const push = (k) => {
      if (!k) return;
      if (result.includes(k)) return;
      result.push(k);
    };

    base.forEach(push);
    extras.forEach(push);

    return result;
  }

  function renderMenu(role) {
    const menu = document.getElementById('sidebarMenu') || document.querySelector('.sidebar-menu');
    if (!menu) return;

    const cfg = window.MenuConfig;
    const keys = buildMenuKeys(role);

    // Clear existing static items (keep container)
    menu.innerHTML = '';

    const callShowPage = (key) => {
      // Settings is guaranteed by our injector, and must work for every role.
      if (key === 'settings') {
        if (window.NotificationSettings?.ensureNotificationsSettingsUI) {
          window.NotificationSettings.ensureNotificationsSettingsUI();
        }
        defaultShowPage('settings');
        return;
      }

      const fn = typeof window.showPage === 'function' ? window.showPage : null;
      if (fn) fn(key);
      else defaultShowPage(key);
    };

    keys.forEach((key) => {
      const item = cfg?.items?.[key] || { icon: '', label: cfg?.titles?.[key] || key };
      const exists = elementExistsForPageKey(key) || key === 'settings';

      // If the page doesn't exist (except settings we can inject), show disabled item
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.setAttribute('data-page', key);
      a.innerHTML = item.icon ? `<i>${item.icon}</i> ${item.label}` : item.label;

      if (!exists) {
        a.style.opacity = '0.5';
        a.style.pointerEvents = 'none';
      } else {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          callShowPage(key);
          if (window.innerWidth <= 768 && typeof window.toggleMobileMenu === 'function') {
            window.toggleMobileMenu();
          }
        });
      }

      li.appendChild(a);
      menu.appendChild(li);
    });

    // Logout always at bottom
    const liLogout = document.createElement('li');
    const aLogout = document.createElement('a');
    aLogout.href = '#';
    aLogout.innerHTML = 'تسجيل الخروج';
    aLogout.style.color = 'var(--danger-color)';
    aLogout.style.fontWeight = '600';
    aLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.logout === 'function') window.logout();
    });
    liLogout.appendChild(aLogout);
    menu.appendChild(liLogout);

    // Mark first available as active
    const first = keys.find((k) => elementExistsForPageKey(k) || k === 'settings');
    if (first) {
      // Ensure settings UI exists when needed
      callShowPage(first);
    }
  }

  function init() {
    // Auth guard
    if (typeof window.isAuthenticated === 'function' && !window.isAuthenticated()) {
      window.location.href = '/index.html';
      return;
    }

    setUserLabels();

    // Ensure base unified sections exist everywhere (even if as placeholders)
    const base = window.MenuConfig?.baseMenu || [];
    base.forEach((k) => {
      if (k !== 'settings') ensurePlaceholderPage(k);
    });

    // Ensure settings UI exists everywhere
    if (window.NotificationSettings?.ensureNotificationsSettingsUI) {
      window.NotificationSettings.ensureNotificationsSettingsUI();
    }

    const role = getRole();
    renderMenu(role);
  }

  window.DashboardNav = { init };

  // Auto-init on any dashboard page that includes this file.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
