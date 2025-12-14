// Shared Notifications Settings (Settings page)
// - Injects a notifications settings form if missing
// - Saves to localStorage (and optionally to API if available later)

(function () {
  const STORAGE_KEY = 'notifications_settings_v1';

  function getDefaults() {
    return {
      enabled: true,
      notify_new_tickets: true,
      notify_completed_tickets: true,
      notify_pending_tickets: true,
      notify_team_updates: true,
      notify_user_activities: true,
      notify_system_alerts: true,
      sound: 'default',
      duration: 5,
      auto_close: true
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaults();
      const parsed = JSON.parse(raw);
      return { ...getDefaults(), ...(parsed || {}) };
    } catch {
      return getDefaults();
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function ensureSettingsPage() {
    let settingsPage = document.getElementById('settings-page');
    if (settingsPage) return settingsPage;

    const main = document.querySelector('main.main-content');
    if (!main) return null;

    settingsPage = document.createElement('div');
    settingsPage.id = 'settings-page';
    settingsPage.className = 'page-content';
    settingsPage.style.display = 'none';
    main.appendChild(settingsPage);
    return settingsPage;
  }

  function ensureNotificationsSettingsUI() {
    const settingsPage = ensureSettingsPage();
    if (!settingsPage) return;

    // Don’t duplicate
    if (document.getElementById('notificationsSettingsForm')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.innerHTML = `
      <div class="card-header">
        <h2>🔔 إعدادات الإشعارات</h2>
        <p style="color: var(--text-muted); margin-top: 10px;">تحكم بشكل الإشعارات والتنبيهات</p>
      </div>
      <div class="card-body">
        <form id="notificationsSettingsForm">
          <div class="form-group">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
              <input type="checkbox" id="notifications_enabled" style="width:auto;" />
              <span>تفعيل الإشعارات</span>
            </label>
          </div>

          <div class="form-group" style="margin-top: 18px;">
            <label style="margin-bottom: 10px; display:block; font-weight:600;">أنواع الإشعارات</label>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; padding: 14px; background: var(--bg-secondary); border-radius: 10px;">
              <label class="checkbox-group" style="display:flex; align-items:center; gap:10px; padding:10px; background: var(--card-bg); border-radius: 8px;">
                <input type="checkbox" id="notify_new_tickets" />
                <span>التذاكر الجديدة</span>
              </label>
              <label class="checkbox-group" style="display:flex; align-items:center; gap:10px; padding:10px; background: var(--card-bg); border-radius: 8px;">
                <input type="checkbox" id="notify_completed_tickets" />
                <span>التذاكر المكتملة</span>
              </label>
              <label class="checkbox-group" style="display:flex; align-items:center; gap:10px; padding:10px; background: var(--card-bg); border-radius: 8px;">
                <input type="checkbox" id="notify_pending_tickets" />
                <span>التذاكر المعلقة</span>
              </label>
              <label class="checkbox-group" style="display:flex; align-items:center; gap:10px; padding:10px; background: var(--card-bg); border-radius: 8px;">
                <input type="checkbox" id="notify_team_updates" />
                <span>تحديثات الفرق</span>
              </label>
              <label class="checkbox-group" style="display:flex; align-items:center; gap:10px; padding:10px; background: var(--card-bg); border-radius: 8px;">
                <input type="checkbox" id="notify_user_activities" />
                <span>أنشطة المستخدمين</span>
              </label>
              <label class="checkbox-group" style="display:flex; align-items:center; gap:10px; padding:10px; background: var(--card-bg); border-radius: 8px;">
                <input type="checkbox" id="notify_system_alerts" />
                <span>تنبيهات النظام</span>
              </label>
            </div>
          </div>

          <div class="form-grid" style="margin-top: 18px;">
            <div class="form-group">
              <label for="notification_sound">صوت الإشعارات</label>
              <select id="notification_sound">
                <option value="default">افتراضي</option>
                <option value="none">بدون صوت</option>
              </select>
            </div>
            <div class="form-group">
              <label for="notification_duration">مدة العرض (ثانية)</label>
              <input type="number" id="notification_duration" min="3" max="30" value="5" />
            </div>
          </div>

          <div class="form-group" style="margin-top: 12px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
              <input type="checkbox" id="notification_auto_close" style="width:auto;" />
              <span>إغلاق تلقائي</span>
            </label>
          </div>

          <div class="btn-group" style="margin-top: 18px;">
            <button type="submit" class="btn btn-primary">💾 حفظ</button>
            <button type="button" class="btn btn-secondary" id="testNotificationBtn">🔔 اختبار</button>
          </div>
        </form>
      </div>
    `;

    const mount = document.getElementById('settingsNotificationsMount') || settingsPage;
    mount.appendChild(wrapper);

    const settings = loadSettings();
    applyToForm(settings);

    const form = document.getElementById('notificationsSettingsForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = readFromForm();
      saveSettings(next);
      if (window.showAlertModal) {
        window.showAlertModal('نجح', 'تم حفظ إعدادات الإشعارات', 'success');
      }
    });

    const testBtn = document.getElementById('testNotificationBtn');
    testBtn.addEventListener('click', () => {
      const s = readFromForm();
      if (!s.enabled) {
        if (window.showAlertModal) window.showAlertModal('تنبيه', 'فعّل الإشعارات أولاً', 'warning');
        return;
      }
      showTestToast(s);
    });
  }

  function applyToForm(s) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    };

    set('notifications_enabled', s.enabled);
    set('notify_new_tickets', s.notify_new_tickets);
    set('notify_completed_tickets', s.notify_completed_tickets);
    set('notify_pending_tickets', s.notify_pending_tickets);
    set('notify_team_updates', s.notify_team_updates);
    set('notify_user_activities', s.notify_user_activities);
    set('notify_system_alerts', s.notify_system_alerts);
    set('notification_sound', s.sound);
    set('notification_duration', s.duration);
    set('notification_auto_close', s.auto_close);
  }

  function readFromForm() {
    const get = (id) => document.getElementById(id);
    return {
      enabled: !!get('notifications_enabled')?.checked,
      notify_new_tickets: !!get('notify_new_tickets')?.checked,
      notify_completed_tickets: !!get('notify_completed_tickets')?.checked,
      notify_pending_tickets: !!get('notify_pending_tickets')?.checked,
      notify_team_updates: !!get('notify_team_updates')?.checked,
      notify_user_activities: !!get('notify_user_activities')?.checked,
      notify_system_alerts: !!get('notify_system_alerts')?.checked,
      sound: get('notification_sound')?.value || 'default',
      duration: parseInt(get('notification_duration')?.value || '5', 10),
      auto_close: !!get('notification_auto_close')?.checked
    };
  }

  function showTestToast(settings) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 18px;
      left: 18px;
      z-index: 99999;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg);
      border-radius: 12px;
      padding: 14px 16px;
      min-width: 280px;
      max-width: 360px;
    `;

    toast.innerHTML = `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div style="font-size:22px;">🔔</div>
        <div style="flex:1;">
          <div style="font-weight:600; color: var(--text-primary);">إشعار تجريبي</div>
          <div style="font-size:13px; color: var(--text-secondary); margin-top: 2px;">هذا اختبار لإعدادات الإشعارات</div>
        </div>
        <button type="button" style="background:none;border:none;color:var(--text-secondary);font-size:20px;line-height:1;cursor:pointer;">×</button>
      </div>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => toast.remove());

    document.body.appendChild(toast);

    if (settings.auto_close) {
      setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, Math.max(3, Math.min(30, settings.duration)) * 1000);
    }
  }

  window.NotificationSettings = {
    ensureNotificationsSettingsUI,
    loadSettings,
    saveSettings
  };
})();
