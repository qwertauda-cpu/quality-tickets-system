// Utility Functions

// Convert minutes to hours and minutes format
function formatTimeDuration(minutes) {
    if (!minutes || minutes === 0) {
        return '-';
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
        return `${mins} دقيقة`;
    } else if (mins === 0) {
        return `${hours} ساعة`;
    } else {
        return `${hours} ساعة و ${mins} دقيقة`;
    }
}

// Format date as Gregorian (Miladi) only
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    // Format as YYYY-MM-DD (Gregorian)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Format date with time as Gregorian (Miladi) only
function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    // Format as YYYY-MM-DD HH:MM (Gregorian)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Make functions available globally
window.formatTimeDuration = formatTimeDuration;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;

