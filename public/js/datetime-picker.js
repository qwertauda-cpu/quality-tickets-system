// Enhanced DateTime Picker with Dropdowns

function createDateTimePicker(containerId, defaultValue = null, required = false) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'datetime-picker-wrapper';
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = 'repeat(3, 1fr) 1fr 1fr';
    wrapper.style.gap = '10px';
    wrapper.style.marginTop = '5px';
    
    // Get current date/time or use provided default
    const now = defaultValue ? new Date(defaultValue) : new Date();
    
    // Date pickers
    const yearSelect = createSelect('year', generateYears(), now.getFullYear(), required);
    const monthSelect = createSelect('month', generateMonths(), now.getMonth() + 1, required);
    const daySelect = createSelect('day', generateDays(now.getFullYear(), now.getMonth() + 1), now.getDate(), required);
    
    // Time pickers
    const hourSelect = createSelect('hour', generateHours(), now.getHours(), false);
    const minuteSelect = createSelect('minute', generateMinutes(), now.getMinutes(), false);
    
    // Update days when year or month changes
    yearSelect.addEventListener('change', () => updateDays(yearSelect, monthSelect, daySelect));
    monthSelect.addEventListener('change', () => updateDays(yearSelect, monthSelect, daySelect));
    
    wrapper.appendChild(yearSelect);
    wrapper.appendChild(monthSelect);
    wrapper.appendChild(daySelect);
    wrapper.appendChild(hourSelect);
    wrapper.appendChild(minuteSelect);
    
    container.appendChild(wrapper);
    
    // Hidden input to store the actual datetime value
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = containerId + '_value';
    hiddenInput.required = required;
    container.appendChild(hiddenInput);
    
    // Function to update hidden input value
    function updateValue() {
        const year = yearSelect.value;
        const month = monthSelect.value.padStart(2, '0');
        const day = daySelect.value.padStart(2, '0');
        const hour = hourSelect.value.padStart(2, '0');
        const minute = minuteSelect.value.padStart(2, '0');
        
        if (year && month && day) {
            const datetimeString = `${year}-${month}-${day}T${hour}:${minute}`;
            hiddenInput.value = datetimeString;
        } else {
            hiddenInput.value = '';
        }
    }
    
    // Add change listeners
    [yearSelect, monthSelect, daySelect, hourSelect, minuteSelect].forEach(select => {
        select.addEventListener('change', updateValue);
    });
    
    // Set initial value
    updateValue();
    
    return {
        getValue: () => hiddenInput.value,
        setValue: (value) => {
            if (value) {
                const date = new Date(value);
                yearSelect.value = date.getFullYear();
                monthSelect.value = date.getMonth() + 1;
                updateDays(yearSelect, monthSelect, daySelect);
                daySelect.value = date.getDate();
                hourSelect.value = date.getHours();
                minuteSelect.value = date.getMinutes();
                updateValue();
            }
        },
        reset: () => {
            const now = new Date();
            yearSelect.value = now.getFullYear();
            monthSelect.value = now.getMonth() + 1;
            updateDays(yearSelect, monthSelect, daySelect);
            daySelect.value = now.getDate();
            hourSelect.value = now.getHours();
            minuteSelect.value = now.getMinutes();
            updateValue();
        }
    };
}

function createSelect(name, options, defaultValue, required) {
    const select = document.createElement('select');
    select.id = name;
    select.className = 'datetime-select';
    select.required = required;
    select.style.padding = '12px';
    select.style.background = 'var(--bg-tertiary)';
    select.style.border = '1px solid var(--border-color)';
    select.style.borderRadius = '8px';
    select.style.fontSize = '14px';
    select.style.fontFamily = 'Cairo, sans-serif';
    select.style.color = 'var(--text-primary)';
    select.style.cursor = 'pointer';
    select.style.transition = 'all 0.3s ease';
    
    select.addEventListener('focus', () => {
        select.style.borderColor = 'var(--primary-color)';
        select.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
    });
    
    select.addEventListener('blur', () => {
        select.style.borderColor = 'var(--border-color)';
        select.style.boxShadow = 'none';
    });
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.value == defaultValue) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
    
    return select;
}

function generateYears() {
    const years = [];
    const currentYear = new Date().getFullYear();
    // From 5 years ago to 1 year ahead
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        years.push({ value: i, label: i.toString() });
    }
    return years;
}

function generateMonths() {
    const months = [
        { value: 1, label: 'يناير' },
        { value: 2, label: 'فبراير' },
        { value: 3, label: 'مارس' },
        { value: 4, label: 'أبريل' },
        { value: 5, label: 'مايو' },
        { value: 6, label: 'يونيو' },
        { value: 7, label: 'يوليو' },
        { value: 8, label: 'أغسطس' },
        { value: 9, label: 'سبتمبر' },
        { value: 10, label: 'أكتوبر' },
        { value: 11, label: 'نوفمبر' },
        { value: 12, label: 'ديسمبر' }
    ];
    return months;
}

function generateDays(year, month) {
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ value: i, label: i.toString() });
    }
    return days;
}

function generateHours() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        hours.push({ value: i, label: i.toString().padStart(2, '0') });
    }
    return hours;
}

function generateMinutes() {
    const minutes = [];
    for (let i = 0; i < 60; i += 5) {
        minutes.push({ value: i, label: i.toString().padStart(2, '0') });
    }
    return minutes;
}

function updateDays(yearSelect, monthSelect, daySelect) {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    const currentDay = parseInt(daySelect.value);
    
    const days = generateDays(year, month);
    daySelect.innerHTML = '';
    days.forEach(day => {
        const option = document.createElement('option');
        option.value = day.value;
        option.textContent = day.label;
        if (day.value === currentDay || (currentDay > days.length && day.value === days.length)) {
            option.selected = true;
        }
        daySelect.appendChild(option);
    });
}

// Initialize all datetime pickers on page load
function initDateTimePickers() {
    // Quality Staff Page
    const timeReceivedContainer = document.getElementById('time_received_container');
    const timeFirstContactContainer = document.getElementById('time_first_contact_container');
    const timeCompletedContainer = document.getElementById('time_completed_container');
    
    if (timeReceivedContainer) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        window.timeReceivedPicker = createDateTimePicker('time_received_container', now.toISOString().slice(0, 16), true);
    }
    
    if (timeFirstContactContainer) {
        window.timeFirstContactPicker = createDateTimePicker('time_first_contact_container', null, false);
    }
    
    if (timeCompletedContainer) {
        window.timeCompletedPicker = createDateTimePicker('time_completed_container', null, false);
    }
    
    // Admin Dashboard Page
    const adminTimeReceivedContainer = document.getElementById('admin_time_received_container');
    const adminTimeFirstContactContainer = document.getElementById('admin_time_first_contact_container');
    const adminTimeCompletedContainer = document.getElementById('admin_time_completed_container');
    
    if (adminTimeReceivedContainer) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        window.adminTimeReceivedPicker = createDateTimePicker('admin_time_received_container', now.toISOString().slice(0, 16), true);
    }
    
    if (adminTimeFirstContactContainer) {
        window.adminTimeFirstContactPicker = createDateTimePicker('admin_time_first_contact_container', null, false);
    }
    
    if (adminTimeCompletedContainer) {
        window.adminTimeCompletedPicker = createDateTimePicker('admin_time_completed_container', null, false);
    }
}

// Helper function to get datetime value from picker
function getDateTimeValue(containerId) {
    const hiddenInput = document.getElementById(containerId + '_value');
    return hiddenInput ? hiddenInput.value : '';
}

// Make functions available globally
window.createDateTimePicker = createDateTimePicker;
window.getDateTimeValue = getDateTimeValue;
window.initDateTimePickers = initDateTimePickers;

