// Time Picker with 12-hour format (AM/PM)

function createTimePicker(containerId, defaultValue = null, required = false) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'time-picker-wrapper';
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = '1fr 1fr 1fr';
    wrapper.style.gap = '10px';
    wrapper.style.marginTop = '5px';
    
    // Get current time or use provided default
    let hour = 12;
    let minute = 0;
    let ampm = 'AM';
    
    if (defaultValue) {
        const date = new Date(defaultValue);
        hour = date.getHours();
        minute = date.getMinutes();
        if (hour >= 12) {
            ampm = 'PM';
            if (hour > 12) hour -= 12;
        } else {
            ampm = 'AM';
            if (hour === 0) hour = 12;
        }
    } else {
        const now = new Date();
        hour = now.getHours();
        minute = now.getMinutes();
        if (hour >= 12) {
            ampm = 'PM';
            if (hour > 12) hour -= 12;
        } else {
            ampm = 'AM';
            if (hour === 0) hour = 12;
        }
    }
    
    // Create manual input fields for hour and minute
    const hourInput = createTimeInput('hour', hour, 1, 12, required);
    const minuteInput = createTimeInput('minute', minute, 0, 59, false);
    const ampmSelect = createTimeSelect('ampm', [
        { value: 'AM', label: 'صباحاً' },
        { value: 'PM', label: 'مساءً' }
    ], ampm, false);
    
    wrapper.appendChild(hourInput);
    wrapper.appendChild(minuteInput);
    wrapper.appendChild(ampmSelect);
    
    container.appendChild(wrapper);
    
    // Hidden input to store the actual time value (24-hour format)
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = containerId + '_value';
    hiddenInput.required = required;
    container.appendChild(hiddenInput);
    
    // Function to update hidden input value
    function updateValue() {
        let h = parseInt(hourInput.value) || 12;
        const m = parseInt(minuteInput.value) || 0;
        const ap = ampmSelect.value;
        
        // Validate hour (1-12)
        if (h < 1) h = 1;
        if (h > 12) h = 12;
        
        // Validate minute (0-59)
        if (m < 0) m = 0;
        if (m > 59) m = 59;
        
        // Update input values if they were corrected
        hourInput.value = h;
        minuteInput.value = m.toString().padStart(2, '0');
        
        // Convert to 24-hour format
        if (ap === 'PM' && h !== 12) {
            h += 12;
        } else if (ap === 'AM' && h === 12) {
            h = 0;
        }
        
        const hourStr = h.toString().padStart(2, '0');
        const minuteStr = m.toString().padStart(2, '0');
        hiddenInput.value = `${hourStr}:${minuteStr}`;
    }
    
    // Add change listeners
    [hourInput, minuteInput, ampmSelect].forEach(element => {
        element.addEventListener('change', updateValue);
        element.addEventListener('input', updateValue);
        if (element.tagName === 'INPUT') {
            element.addEventListener('blur', updateValue);
        }
    });
    
    // Set initial value
    updateValue();
    
    return {
        getValue: () => hiddenInput.value,
        setValue: (value) => {
            if (value) {
                const [h, m] = value.split(':').map(Number);
                let hour12 = h;
                let ampmVal = 'AM';
                
                if (h >= 12) {
                    ampmVal = 'PM';
                    if (h > 12) hour12 = h - 12;
                } else {
                    ampmVal = 'AM';
                    if (h === 0) hour12 = 12;
                }
                
                hourInput.value = hour12;
                minuteInput.value = m.toString().padStart(2, '0');
                ampmSelect.value = ampmVal;
                updateValue();
            }
        },
        reset: () => {
            const now = new Date();
            let h = now.getHours();
            const m = now.getMinutes();
            let ampmVal = 'AM';
            
            if (h >= 12) {
                ampmVal = 'PM';
                if (h > 12) h -= 12;
            } else {
                ampmVal = 'AM';
                if (h === 0) h = 12;
            }
            
            hourInput.value = h;
            minuteInput.value = m.toString().padStart(2, '0');
            ampmSelect.value = ampmVal;
            updateValue();
        }
    };
}

function createTimeInput(name, defaultValue, min, max, required) {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = name;
    input.className = 'datetime-select';
    input.required = required;
    input.min = min;
    input.max = max;
    input.value = defaultValue.toString().padStart(2, '0');
    input.style.padding = '12px';
    input.style.background = 'var(--bg-tertiary)';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '8px';
    input.style.fontSize = '14px';
    input.style.fontFamily = 'Cairo, sans-serif';
    input.style.color = 'var(--text-primary)';
    input.style.textAlign = 'center';
    input.style.transition = 'all 0.3s ease';
    
    // Validation on input
    input.addEventListener('input', (e) => {
        let value = parseInt(e.target.value) || 0;
        if (value < min) value = min;
        if (value > max) value = max;
        if (name === 'minute') {
            e.target.value = value.toString().padStart(2, '0');
        } else {
            e.target.value = value;
        }
    });
    
    input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--primary-color)';
        input.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
    });
    
    input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--border-color)';
        input.style.boxShadow = 'none';
        // Ensure value is properly formatted
        let value = parseInt(input.value) || min;
        if (value < min) value = min;
        if (value > max) value = max;
        if (name === 'minute') {
            input.value = value.toString().padStart(2, '0');
        } else {
            input.value = value;
        }
    });
    
    return input;
}

function createTimeSelect(name, options, defaultValue, required) {
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

function generateHours12() {
    const hours = [];
    for (let i = 1; i <= 12; i++) {
        hours.push({ value: i, label: i.toString() });
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

// Initialize all time pickers on page load
function initTimePickers() {
    // Quality Staff Page
    const timeReceivedTimeContainer = document.getElementById('time_received_time_container');
    const timeFirstContactTimeContainer = document.getElementById('time_first_contact_time_container');
    const timeCompletedTimeContainer = document.getElementById('time_completed_time_container');
    
    if (timeReceivedTimeContainer) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        window.timeReceivedTimePicker = createTimePicker('time_received_time_container', now.toISOString(), true);
    }
    
    if (timeFirstContactTimeContainer) {
        window.timeFirstContactTimePicker = createTimePicker('time_first_contact_time_container', null, false);
    }
    
    if (timeCompletedTimeContainer) {
        window.timeCompletedTimePicker = createTimePicker('time_completed_time_container', null, false);
    }
    
    // Admin Dashboard Page
    const adminTimeReceivedTimeContainer = document.getElementById('admin_time_received_time_container');
    const adminTimeFirstContactTimeContainer = document.getElementById('admin_time_first_contact_time_container');
    const adminTimeCompletedTimeContainer = document.getElementById('admin_time_completed_time_container');
    
    if (adminTimeReceivedTimeContainer) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        window.adminTimeReceivedTimePicker = createTimePicker('admin_time_received_time_container', now.toISOString(), true);
    }
    
    if (adminTimeFirstContactTimeContainer) {
        window.adminTimeFirstContactTimePicker = createTimePicker('admin_time_first_contact_time_container', null, false);
    }
    
    if (adminTimeCompletedTimeContainer) {
        window.adminTimeCompletedTimePicker = createTimePicker('admin_time_completed_time_container', null, false);
    }
}

// Helper function to get time value from picker
function getTimeValue(containerId) {
    const hiddenInput = document.getElementById(containerId + '_value');
    return hiddenInput ? hiddenInput.value : '';
}

// Helper function to combine date and time
function combineDateTime(dateValue, timeValue) {
    if (!dateValue || !timeValue) return null;
    
    // Remove any existing time part from dateValue (format: YYYY-MM-DD or YYYY-MM-DDTHH:MM)
    const dateOnly = dateValue.split('T')[0];
    
    // Ensure timeValue is in correct format (HH:MM)
    let timeOnly = timeValue;
    if (timeValue.includes('T')) {
        // If timeValue contains T, extract the time part
        timeOnly = timeValue.split('T')[1] || timeValue.split('T')[0];
    }
    
    // Validate time format (should be HH:MM)
    if (!/^\d{2}:\d{2}$/.test(timeOnly)) {
        console.error('Invalid time format:', timeOnly);
        return null;
    }
    
    // Combine date and time
    return `${dateOnly}T${timeOnly}`;
}

// Make functions available globally
window.createTimePicker = createTimePicker;
window.getTimeValue = getTimeValue;
window.combineDateTime = combineDateTime;
window.initTimePickers = initTimePickers;

