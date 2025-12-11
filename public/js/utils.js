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

// Make function available globally
window.formatTimeDuration = formatTimeDuration;

