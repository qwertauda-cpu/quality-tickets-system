// Quality Staff Interface JavaScript

// Prevent duplicate declarations
(function() {
    'use strict';
    
let currentTicketId = null;
let ticketTypes = [];
let teams = [];

// Ticket Checklists Configuration
const ticketChecklists = {
    FTTH_NEW: [
        "صورة الفات قبل العمل",
        "صورة الفات بعد الربط",
        "صورة الفات مغلق",
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    ONU_CHANGE: [
        "صورة للجهاز القديم",
        "صورة للجهاز الجديد",
        "القدرة المستلمه RX (الباور)",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    RX_ISSUE: [
        "القدرة المستلمه RX (الباور) قبل",
        "القدرة المستلمه RX (الباور) بعد",
        "الفات / الكيبل",
        "Speed Test",
        "WiFi",
        "البنك",
        "الأجهزة"
    ],
    PPPOE: [
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "حالة الاتصال",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    WIFI_SIMPLE: [
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    REACTIVATE_SERVICE: [
        "صورة الفات قبل العمل",
        "صورة الفات بعد الربط",
        "صورة الفات مغلق",
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    CHECK_ONLY: [
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    EXTERNAL_MAINTENANCE: [
        "صورة الفات قبل العمل",
        "صورة الفات بعد العمل",
        "صورة السبليتر"
    ],
    FIBER_CUT: [
        "صورة للقطع",
        "صورة لصلاح القطع",
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    ACTIVATION_NO_CABLE: [
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ],
    SUBSCRIBER_TAMPERING: [
        "القدرة المستلمه RX (الباور)",
        "Broadband",
        "Network",
        "WiFi",
        "البنك",
        "Speed Test",
        "الأجهزة"
    ]
};

// Mapping between Arabic ticket type names and English keys
const ticketTypeMapping = {
    'ربط مشترك جديد FTTH': 'FTTH_NEW',
    'ربط جديد FTTH': 'FTTH_NEW',
    'تبديل او صيانه راوتر/ONU': 'ONU_CHANGE',
    'تبديل راوتر/ONU': 'ONU_CHANGE',
    'ضعف إشارة البور RX': 'RX_ISSUE',
    'ضعف إشارة RX': 'RX_ISSUE',
    'إعداد PPPoE / DHCP': 'PPPOE',
    'إعداد PPPoE/DHCP': 'PPPOE',
    'PPPoE / DHCP': 'PPPOE',
    'PPPoE/DHCP': 'PPPOE',
    'PPPoE': 'PPPOE',
    'PPPOE': 'PPPOE',
    'WiFi بدون تمديد': 'WIFI_SIMPLE',
    'إعادة مشترك إلى الخدمة': 'REACTIVATE_SERVICE',
    'إعادة ربط': 'REACTIVATE_SERVICE',
    'فحص فقط': 'CHECK_ONLY',
    'صيانة خارجية': 'EXTERNAL_MAINTENANCE',
    'صيانة خارجية / فات': 'EXTERNAL_MAINTENANCE',
    'قطع فايبر': 'FIBER_CUT',
    'تفعيل بدون سحب كيبل': 'ACTIVATION_NO_CABLE',
    'عبث مشترك / كهرباء': 'SUBSCRIBER_TAMPERING'
};

// Store checklist state
let checklistState = {};

// متغير لتخزين قواعد النقاط
let cachedScoringRulesForQuality = null;

// تحميل قواعد النقاط مرة واحدة
async function loadScoringRulesForQuality() {
    try {
        const rulesResponse = await window.api.getScoringRules();
        if (rulesResponse && rulesResponse.success && rulesResponse.rules) {
            // API يرجع rules كـ object: { rule_type: { rule_key: value } }
            cachedScoringRulesForQuality = rulesResponse.rules;
        }
    } catch (error) {
        console.error('Error loading scoring rules:', error);
        cachedScoringRulesForQuality = null;
    }
}

// حساب خصم تقييم أداء الفريق
async function calculateTeamRatingPenalty(rating) {
    if (!rating) return 0;
    
    if (!cachedScoringRulesForQuality) {
        await loadScoringRulesForQuality();
    }
    
    if (!cachedScoringRulesForQuality || typeof cachedScoringRulesForQuality !== 'object') {
        return 0;
    }
    
    let ruleType = '';
    const ratingStr = String(rating);
    switch(ratingStr) {
        case '5':
            ruleType = 'performance_rating_excellent';
            break;
        case '4':
            ruleType = 'performance_rating_good';
            break;
        case '3':
            ruleType = 'performance_rating_average';
            break;
        case '2':
            ruleType = 'performance_rating_poor';
            break;
        case '1':
            ruleType = 'performance_rating_very_poor';
            break;
    }
    
    if (ruleType && cachedScoringRulesForQuality[ruleType]) {
        // الوصول للقيمة مباشرة من object: rules[ruleType][rule_key]
        const ruleValue = cachedScoringRulesForQuality[ruleType][ratingStr];
        if (ruleValue !== undefined && ruleValue !== null) {
            return Math.abs(parseFloat(ruleValue) || 0);
        }
    }
    
    return 0;
}

// تحديث خصم تقييم أداء الفريق في الواجهة
async function updateTeamRatingPenalty(rating) {
    const penalty = await calculateTeamRatingPenalty(rating);
    const penaltyDisplay = document.getElementById('team_rating_penalty_display');
    const penaltyValue = document.getElementById('team_rating_penalty_value');
    
    if (penaltyDisplay && penaltyValue) {
        if (penalty > 0) {
            penaltyValue.textContent = penalty;
            penaltyDisplay.style.display = 'block';
        } else {
            penaltyDisplay.style.display = 'none';
        }
    }
    
    // تحديث النقاط المخصومة في header
    calculateTotalPoints().catch(err => console.error('Error:', err));
}

// جعل الدوال متاحة بشكل عام
window.loadScoringRulesForQuality = loadScoringRulesForQuality;
window.calculateTeamRatingPenalty = calculateTeamRatingPenalty;
window.updateTeamRatingPenalty = updateTeamRatingPenalty;

// Declare functions early to make them available globally
// Make openNewTicketModal available immediately
window.openNewTicketModal = async function() {
    const modal = document.getElementById('new-ticket-modal');
    if (modal) {
        modal.classList.add('active');
        // Load ticket types and teams for modal
        loadTicketTypesForModal();
        loadTeamsForModal();
        // Initialize datetime pickers for modal
        initModalDateTimePickers();
        // Setup form submission for modal
        setupModalFormSubmission();
        // Setup ticket number validation for modal
        setupModalTicketNumberValidation();
        // Setup photo upload for new ticket (always visible now)
        setupPhotoUploadForNewTicket();
        // Setup quality review form submission
        const qualityReviewForm = document.getElementById('qualityReviewFormNewModal');
        if (qualityReviewForm) {
            qualityReviewForm.onsubmit = handleQualityReviewSubmitNewModal;
        }
        // Setup needs_followup checkbox
        const needsFollowupCheckbox = document.getElementById('needs_followup_new_modal');
        if (needsFollowupCheckbox) {
            needsFollowupCheckbox.addEventListener('change', (e) => {
                const followupGroup = document.getElementById('followupReasonGroupNewModal');
                if (followupGroup) {
                    followupGroup.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Setup upsell checkboxes to update total points
        const upsellCheckboxes = ['upsell_router_new_modal', 'upsell_onu_new_modal', 'upsell_ups_new_modal'];
        upsellCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => calculateTotalPoints().catch(err => console.error('Error:', err)));
            }
        });
        
        // Setup whatsapp group interest checkbox styling (already styled in HTML)
        
        // تحميل قواعد النقاط
        await loadScoringRulesForQuality();
        
        // Setup team rating change listener
        const teamRatingInput = document.getElementById('team_rating_new_modal');
        if (teamRatingInput) {
            // منع الكتابة اليدوية - فقط الأسهم
            teamRatingInput.addEventListener('keydown', function(e) {
                // السماح فقط بالأسهم والأزرار الخاصة
                if (!['ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Tab'].includes(e.key) && 
                    !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                }
            });
            
            teamRatingInput.addEventListener('change', async function() {
                // التأكد من أن القيمة بين 1-5
                if (this.value < 1) this.value = 1;
                if (this.value > 5) this.value = 5;
                await updateTeamRatingPenalty(this.value);
            });
            
            teamRatingInput.addEventListener('input', async function() {
                // تحديث القيمة لتكون بين 1-5 فقط
                if (this.value < 1) this.value = 1;
                if (this.value > 5) this.value = 5;
                await updateTeamRatingPenalty(this.value);
            });
        }
        
        // Initialize total points calculation
        calculateTotalPoints().catch(err => console.error('Error calculating total points:', err));
        
        // Initialize explained services (hide by default)
        const explainedServicesWrapper = document.getElementById('explainedServicesWrapper');
        if (explainedServicesWrapper) {
            explainedServicesWrapper.style.display = 'none';
        }
        
        // Setup subscriber phone validation (11 digits only)
        const subscriberPhoneInput = document.getElementById('subscriber_phone_modal');
        if (subscriberPhoneInput) {
            // Function to show error message
            function showPhoneError(message) {
                let errorDiv = document.getElementById('subscriber_phone_error_modal');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.id = 'subscriber_phone_error_modal';
                    errorDiv.className = 'error-message';
                    errorDiv.style.cssText = 'display: none; color: #dc3545; font-size: 0.875em; margin-top: 5px; padding: 8px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;';
                    subscriberPhoneInput.parentNode.appendChild(errorDiv);
                }
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
                subscriberPhoneInput.style.borderColor = '#dc3545';
                subscriberPhoneInput.style.backgroundColor = '#fff5f5';
            }
            
            function hidePhoneError() {
                const errorDiv = document.getElementById('subscriber_phone_error_modal');
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                    subscriberPhoneInput.style.borderColor = '';
                    subscriberPhoneInput.style.backgroundColor = '';
                }
            }
            
            // Block non-numeric input
            subscriberPhoneInput.addEventListener('keydown', function(e) {
                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                                    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                    'Home', 'End', 'PageUp', 'PageDown'];
                
                if (e.ctrlKey || e.metaKey) {
                    if (['a', 'c', 'x', 'z'].includes(e.key.toLowerCase())) {
                        return;
                    }
                    if (e.key.toLowerCase() === 'v') {
                        e.preventDefault();
                        return;
                    }
                }
                
                if (allowedKeys.includes(e.key)) {
                    return;
                }
                
                const charCode = e.key.charCodeAt ? e.key.charCodeAt(0) : e.keyCode;
                const isDigit = (charCode >= 48 && charCode <= 57);
                
                if (!isDigit) {
                    e.preventDefault();
                    showPhoneError('❌ رقم المشترك يقبل أرقام إنجليزية فقط (0-9)');
                    setTimeout(hidePhoneError, 3000);
                    return false;
                } else {
                    hidePhoneError();
                }
            }, true);
            
            // Clean input and limit to 11 digits
            subscriberPhoneInput.addEventListener('input', function(e) {
                const value = e.target.value;
                const cleaned = value.replace(/[^0-9]/g, '').substring(0, 11);
                
                if (value !== cleaned) {
                    e.target.value = cleaned;
                    const invalidChars = value.replace(/[0-9]/g, '');
                    if (invalidChars.length > 0) {
                        showPhoneError('❌ تم رفض القيم التالية: "' + invalidChars + '" - رقم المشترك يقبل أرقام إنجليزية فقط');
                        setTimeout(hidePhoneError, 3000);
                    }
                }
                
                // Update phone number field (only if 11 digits)
                if (cleaned.length === 11) {
                    updatePhoneNumber(cleaned);
                    hidePhoneError(); // Hide error if length is correct
                } else {
                    // Clear phone number if not 11 digits yet
                    const phoneNumberInput = document.getElementById('phone_number_modal');
                    if (phoneNumberInput) {
                        phoneNumberInput.value = '';
                    }
                }
            }, true);
            
            // Handle paste
            subscriberPhoneInput.addEventListener('paste', function(e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const numbersOnly = pastedText.replace(/[^0-9]/g, '').substring(0, 11);
                const invalidChars = pastedText.replace(/[0-9]/g, '');
                
                if (invalidChars.length > 0) {
                    showPhoneError('❌ تم رفض القيم المنسوخة: "' + invalidChars + '" - رقم المشترك يقبل أرقام إنجليزية فقط');
                    setTimeout(hidePhoneError, 3000);
                }
                
                const start = e.target.selectionStart || 0;
                const end = e.target.selectionEnd || 0;
                const currentValue = e.target.value || '';
                e.target.value = currentValue.substring(0, start) + numbersOnly + currentValue.substring(end);
                e.target.setSelectionRange(start + numbersOnly.length, start + numbersOnly.length);
                
                // Update phone number field (only if 11 digits)
                if (numbersOnly.length === 11) {
                    updatePhoneNumber(numbersOnly);
                    hidePhoneError();
                } else {
                    // Clear phone number if not 11 digits
                    const phoneNumberInput = document.getElementById('phone_number_modal');
                    if (phoneNumberInput) {
                        phoneNumberInput.value = '';
                    }
                }
                
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
            }, true);
            
            // Clean on blur and validate length
            subscriberPhoneInput.addEventListener('blur', function(e) {
                const value = e.target.value;
                const cleaned = value.replace(/[^0-9]/g, '').substring(0, 11);
                if (value !== cleaned) {
                    e.target.value = cleaned;
                }
                
                // Validate length only on blur (when user finishes typing)
                if (cleaned.length > 0 && cleaned.length !== 11) {
                    showPhoneError('❌ يجب أن يكون رقم المشترك 11 رقم بالضبط');
                } else if (cleaned.length === 11) {
                    updatePhoneNumber(cleaned);
                    hidePhoneError();
                } else {
                    // Empty field - clear phone number and hide error
                    const phoneNumberInput = document.getElementById('phone_number_modal');
                    if (phoneNumberInput) {
                        phoneNumberInput.value = '';
                    }
                    hidePhoneError();
                }
            }, true);
        }
        
        // Function to update phone number field (add 5 at the beginning)
        function updatePhoneNumber(subscriberPhone) {
            const phoneNumberInput = document.getElementById('phone_number_modal');
            if (phoneNumberInput) {
                if (subscriberPhone && subscriberPhone.length === 11) {
                    phoneNumberInput.value = '5' + subscriberPhone;
                } else {
                    phoneNumberInput.value = '';
                }
            }
        }
        
        // Function to copy phone number
        window.copyPhoneNumber = function() {
            const phoneNumberInput = document.getElementById('phone_number_modal');
            if (phoneNumberInput && phoneNumberInput.value) {
                phoneNumberInput.select();
                document.execCommand('copy');
                const copyBtn = document.getElementById('copyPhoneNumberBtn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'تم النسخ!';
                    copyBtn.style.backgroundColor = 'var(--success-color)';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.backgroundColor = '';
                    }, 2000);
                }
            }
        };
        
        // Setup subscription amount validation (only numbers, in thousands)
        const subscriptionAmountInput = document.getElementById('subscription_amount_new_modal');
        if (subscriptionAmountInput) {
            let timeoutId = null;
            
            // Convert value back to thousands for editing on focus
            subscriptionAmountInput.addEventListener('focus', function(e) {
                const currentValue = e.target.value;
                if (currentValue && !isNaN(currentValue)) {
                    const numValue = parseFloat(currentValue);
                    // If value is >= 1000, it's already converted, so convert back for editing
                    if (numValue >= 1000) {
                        e.target.value = (numValue / 1000).toString();
                    }
                }
            });
            
            // Only allow numbers
            subscriptionAmountInput.addEventListener('input', function(e) {
                const value = e.target.value;
                // Remove any non-numeric characters except decimal point
                const cleaned = value.replace(/[^0-9.]/g, '');
                // Only allow one decimal point
                const parts = cleaned.split('.');
                const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                
                if (value !== finalValue) {
                    e.target.value = finalValue;
                }
                
                // Clear previous timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                // Convert to thousands after user stops typing (500ms delay)
                timeoutId = setTimeout(function() {
                    const currentValue = e.target.value;
                    if (currentValue && currentValue.trim() !== '' && !isNaN(parseFloat(currentValue))) {
                        const numValue = parseFloat(currentValue);
                        if (numValue > 0) {
                            const convertedValue = (numValue * 1000).toString();
                            e.target.value = convertedValue;
                        }
                    }
                }, 500);
            });
            
            // Also convert on blur (when user leaves the field)
            subscriptionAmountInput.addEventListener('blur', function(e) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                
                const value = e.target.value;
                if (value && value.trim() !== '' && !isNaN(parseFloat(value))) {
                    const numValue = parseFloat(value);
                    if (numValue > 0 && numValue < 1000) {
                        // Only convert if it's still in thousands format (< 1000)
                        const convertedValue = (numValue * 1000).toString();
                        e.target.value = convertedValue;
                    }
                }
            });
            
            // Prevent non-numeric input on keydown
            subscriptionAmountInput.addEventListener('keydown', function(e) {
                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                                    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                    'Home', 'End', 'PageUp', 'PageDown'];
                
                if (e.ctrlKey || e.metaKey) {
                    if (['a', 'c', 'x', 'z'].includes(e.key.toLowerCase())) {
                        return;
                    }
                    if (e.key.toLowerCase() === 'v') {
                        return; // Allow paste, will be cleaned in paste event
                    }
                }
                
                if (allowedKeys.includes(e.key)) {
                    return;
                }
                
                // Allow decimal point only once
                if (e.key === '.' && e.target.value.includes('.')) {
                    e.preventDefault();
                    return;
                }
                
                // Allow numbers and decimal point
                if (!/^[0-9.]$/.test(e.key)) {
                    e.preventDefault();
                    return;
                }
            });
            
            // Clean pasted content
            subscriptionAmountInput.addEventListener('paste', function(e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const numbersOnly = pastedText.replace(/[^0-9.]/g, '');
                const parts = numbersOnly.split('.');
                const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numbersOnly;
                
                const start = e.target.selectionStart || 0;
                const end = e.target.selectionEnd || 0;
                const currentValue = e.target.value || '';
                e.target.value = currentValue.substring(0, start) + finalValue + currentValue.substring(end);
                e.target.setSelectionRange(start + finalValue.length, start + finalValue.length);
            });
        }
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('currentUser').textContent = user.full_name;
    
    // Function to hide elements based on role
    function hideElementsForRole() {
        // Hide "إدارة تذكرةات" section for technicians and quality_staff (only admin and call_center can access)
        if (user.role === 'technician' || user.role === 'quality_staff') {
            // Hide menu item
            const ticketsManagementMenuItem = document.querySelector('a[data-page="tickets-management-new"]');
            if (ticketsManagementMenuItem) {
                const listItem = ticketsManagementMenuItem.closest('li');
                if (listItem) {
                    listItem.style.display = 'none';
                }
            }
            // Hide page content
            const ticketsManagementPage = document.getElementById('tickets-management-new-page');
            if (ticketsManagementPage) {
                ticketsManagementPage.style.display = 'none';
            }
        }
        
        // Keep "إنشاء تذكرة" button visible for all users, but permissions are checked in openCreateTicketModal()
        // The button will be visible but only admin and call_center can actually use it
    }
    
    // Run immediately
    hideElementsForRole();
    
    // Also run after a short delay to ensure DOM is fully loaded
    setTimeout(hideElementsForRole, 100);
    
    // Load initial data
    await loadTicketTypes();
    await loadTeams();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize datetime pickers
    if (typeof initDateTimePickers === 'function') {
        initDateTimePickers();
    }
    
    // Initialize time pickers
    if (typeof initTimePickers === 'function') {
        initTimePickers();
    }
    
    // Show tickets list page by default
    showPage('tickets-management');
});

async function loadTicketTypes() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTicketTypes();
        if (data.success) {
            ticketTypes = data.types;
            const select = document.getElementById('ticket_type_id');
            
            // Skip if select element doesn't exist (page was removed)
            if (!select) {
                return;
            }
            
            // خريطة لتحديد الأسماء الجديدة والترتيب المطلوب
            const typeMapping = {
                'ربط جديد FTTH': { name: 'ربط مشترك جديد FTTH', order: 1 },
                'إعادة ربط': { name: 'إعادة مشترك إلى الخدمة', order: 2 },
                'قطع فايبر': { name: 'قطع فايبر', order: 3 },
                'ضعف إشارة RX': { name: 'ضعف إشارة البور RX', order: 4 },
                'تبديل راوتر/ONU': { name: 'تبديل او صيانه راوتر/ONU', order: 999 }
            };
            
            // تصفية وحذف "زيارة تسويقية" و "WiFi بدون تمديد"
            let filteredTypes = data.types.filter(type => 
                type.name_ar !== 'زيارة تسويقية' && 
                type.name_ar !== 'WiFi بدون تمديد'
            );
            
            // إعادة ترتيب الأنواع: الأربعة الأولى بالترتيب المطلوب، ثم الباقي
            const priorityTypes = [];
            const otherTypes = [];
            
            filteredTypes.forEach(type => {
                if (typeMapping[type.name_ar]) {
                    priorityTypes.push({
                        ...type,
                        displayName: typeMapping[type.name_ar].name,
                        order: typeMapping[type.name_ar].order
                    });
                } else {
                    otherTypes.push({
                        ...type,
                        displayName: type.name_ar,
                        order: 999
                    });
                }
            });
            
            // ترتيب الأنواع ذات الأولوية
            priorityTypes.sort((a, b) => a.order - b.order);
            
            // دمج القوائم: الأولويات أولاً، ثم الباقي
            const sortedTypes = [...priorityTypes, ...otherTypes];
            
            // إضافة الخيارات للقائمة المنسدلة
            sortedTypes.forEach((type, index) => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = `${index + 1} - ${type.displayName}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading ticket types:', error);
    }
}

async function loadTeams() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTeams();
        if (data.success) {
            teams = data.teams;
            const select = document.getElementById('team_id');
            
            // Skip if select element doesn't exist (page was removed)
            if (!select) {
                return;
            }
            
            data.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                
                // استخراج الاسم الأول من كل عامل
                let membersText = '';
                if (team.members && team.members.length > 0) {
                    const firstNames = team.members.map(fullName => {
                        // استخراج الاسم الأول فقط (قبل أول مسافة)
                        return fullName.split(' ')[0];
                    });
                    membersText = ` (${firstNames.join('/')})`;
                } else if (team.members_names) {
                    // إذا كان members_names موجوداً (من API القديم)
                    const firstNames = team.members_names.split(', ').map(fullName => {
                        return fullName.split(' ')[0];
                    });
                    membersText = ` (${firstNames.join('/')})`;
                }
                
                // عرض اسم الفريق مع أسماء العمال بين قوسين
                // استخدام Unicode للخط الفاتح (Mathematical Alphanumeric Symbols)
                // أو يمكن استخدام CSS class
                if (membersText) {
                    // إضافة class للخيارات التي تحتوي على أسماء العمال
                    option.className = 'team-with-members';
                    // استخدام font-weight أخف في CSS
                }
                option.textContent = team.name + membersText;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });
    
    // Ticket number input - STRICTLY only allow English numbers (0-9)
    // Skip if element doesn't exist (page was removed)
    const ticketNumberInput = document.getElementById('ticket_number');
    if (!ticketNumberInput) {
        // Skip ticket form setup if page was removed
        return;
    }
    
    // Set attribute to prevent any non-numeric input
    ticketNumberInput.setAttribute('inputmode', 'numeric');
    ticketNumberInput.setAttribute('pattern', '[0-9]*');
    
    // STRICT: Block ALL non-numeric input at keydown level
    ticketNumberInput.addEventListener('keydown', (e) => {
        // Allow navigation and control keys
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                            'Home', 'End', 'PageUp', 'PageDown'];
        
        // Allow Ctrl/Cmd combinations (but we'll filter paste separately)
        if (e.ctrlKey || e.metaKey) {
            // Allow select all, copy, cut, undo
            if (['a', 'c', 'x', 'z'].includes(e.key.toLowerCase())) {
                return; // Allow
            }
            // Block paste here, handle it separately
            if (e.key.toLowerCase() === 'v') {
                e.preventDefault();
                return;
            }
        }
        
        // Allow navigation keys
        if (allowedKeys.includes(e.key)) {
            return; // Allow
        }
        
        // STRICT: Only allow English digits 0-9
        const charCode = e.key.charCodeAt ? e.key.charCodeAt(0) : e.keyCode;
        const isDigit = (charCode >= 48 && charCode <= 57); // 0-9
        
        if (!isDigit) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Show error message
            showTicketNumberError(`❌ تم رفض الحرف/الرمز: "${e.key}" - رقم التذكرة يقبل أرقام إنجليزية فقط (0-9)`);
            // Hide error after 3 seconds
            setTimeout(() => {
                hideTicketNumberError();
            }, 3000);
            return false;
        } else {
            hideTicketNumberError();
        }
    });
    
    // Function to show error message
    function showTicketNumberError(message) {
        const errorDiv = document.getElementById('ticket_number_error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            ticketNumberInput.style.borderColor = '#dc3545';
            ticketNumberInput.style.backgroundColor = '#fff5f5';
        }
    }
    
    // Function to hide error message
    function hideTicketNumberError() {
        const errorDiv = document.getElementById('ticket_number_error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            ticketNumberInput.style.borderColor = '';
            ticketNumberInput.style.backgroundColor = '';
        }
    }
    
    // STRICT: Clean input on every input event and show error if invalid
    ticketNumberInput.addEventListener('input', (e) => {
        const value = e.target.value;
        // Remove ANY character that is NOT 0-9
        const cleaned = value.replace(/[^0-9]/g, '');
        if (value !== cleaned) {
            e.target.value = cleaned;
            // Show error message
            const invalidChars = value.replace(/[0-9]/g, '');
            showTicketNumberError(`❌ تم رفض القيم التالية: "${invalidChars}" - رقم التذكرة يقبل أرقام إنجليزية فقط (0-9)`);
            // Hide error after 5 seconds
            setTimeout(() => {
                hideTicketNumberError();
            }, 5000);
        } else {
            hideTicketNumberError();
        }
    });
    
    // STRICT: Handle paste - extract only digits and show error if invalid
    ticketNumberInput.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        // Extract ONLY English digits 0-9
        const numbersOnly = pastedText.replace(/[^0-9]/g, '');
        const invalidChars = pastedText.replace(/[0-9]/g, '');
        
        // Show error if there were invalid characters
        if (invalidChars.length > 0) {
            showTicketNumberError(`❌ تم رفض القيم المنسوخة: "${invalidChars}" - رقم التذكرة يقبل أرقام إنجليزية فقط (0-9)`);
            setTimeout(() => {
                hideTicketNumberError();
            }, 5000);
        }
        
        const start = e.target.selectionStart || 0;
        const end = e.target.selectionEnd || 0;
        const currentValue = e.target.value || '';
        e.target.value = currentValue.substring(0, start) + numbersOnly + currentValue.substring(end);
        e.target.setSelectionRange(start + numbersOnly.length, start + numbersOnly.length);
        // Trigger input event to ensure consistency
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    // STRICT: Clean on blur and validate
    ticketNumberInput.addEventListener('blur', (e) => {
        const value = e.target.value;
        const cleaned = value.replace(/[^0-9]/g, '');
        if (value !== cleaned) {
            e.target.value = cleaned;
            const invalidChars = value.replace(/[0-9]/g, '');
            showTicketNumberError(`❌ تم رفض القيم: "${invalidChars}" - رقم التذكرة يقبل أرقام إنجليزية فقط (0-9)`);
        } else {
            hideTicketNumberError();
        }
    });
    
    // STRICT: Prevent context menu paste
    ticketNumberInput.addEventListener('contextmenu', (e) => {
        // Allow context menu but we'll handle paste separately
    });
    
    // STRICT: Additional check on focus to ensure clean value
    ticketNumberInput.addEventListener('focus', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    
    // Ticket form submission
    const ticketForm = document.getElementById('ticketForm');
    if (ticketForm) {
        ticketForm.addEventListener('submit', handleTicketSubmit);
    }
    
    // Quality review form
    const qualityReviewForm = document.getElementById('qualityReviewForm');
    if (qualityReviewForm) {
        qualityReviewForm.addEventListener('submit', handleQualityReviewSubmit);
    }
    
    // Followup checkbox
    const needsFollowup = document.getElementById('needs_followup');
    if (needsFollowup) {
        needsFollowup.addEventListener('change', (e) => {
            const followupGroup = document.getElementById('followupReasonGroup');
            if (followupGroup) {
                followupGroup.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
    
    // Photo upload
    const photoUploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    
    if (!photoUploadArea || !photoInput) {
        return;
    }
    
    photoUploadArea.addEventListener('click', () => photoInput.click());
    photoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoUploadArea.classList.add('dragover');
    });
    photoUploadArea.addEventListener('dragleave', () => {
        photoUploadArea.classList.remove('dragover');
    });
    photoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        photoUploadArea.classList.remove('dragover');
        handlePhotoUpload(e.dataTransfer.files);
    });
    
    photoInput.addEventListener('change', (e) => {
        handlePhotoUpload(e.target.files);
    });
}

async function handleTicketSubmit(e) {
    e.preventDefault();
    
    // STRICT Validate ticket number - must be English numbers only (0-9)
    const ticketNumberInput = document.getElementById('ticket_number');
    let ticketNumber = ticketNumberInput.value.trim();
    const originalValue = ticketNumber;
    
    // Remove ANY character that is NOT 0-9
    ticketNumber = ticketNumber.replace(/[^0-9]/g, '');
    
    // Check if there were invalid characters
    const invalidChars = originalValue.replace(/[0-9]/g, '');
    
    // Final validation - must be only digits and not empty
    if (!ticketNumber || ticketNumber.length === 0 || !/^[0-9]+$/.test(ticketNumber)) {
        let errorMessage = '❌ رقم التذكرة غير صحيح. ';
        if (invalidChars.length > 0) {
            errorMessage += `تم رفض القيم: "${invalidChars}". `;
        }
        errorMessage += 'رقم التذكرة يجب أن يحتوي على أرقام إنجليزية فقط (0-9)';
        
        // Show error in page
        const errorDiv = document.getElementById('ticket_number_error');
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            ticketNumberInput.style.borderColor = '#dc3545';
            ticketNumberInput.style.backgroundColor = '#fff5f5';
        }
        
        // Also show alert
        alert(errorMessage);
        ticketNumberInput.value = '';
        ticketNumberInput.focus();
        return;
    }
    
    // Update the input value to ensure it's clean
    ticketNumberInput.value = ticketNumber;
    
    // Hide any error messages
    const errorDiv = document.getElementById('ticket_number_error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        ticketNumberInput.style.borderColor = '';
        ticketNumberInput.style.backgroundColor = '';
    }
    
    if (!currentTicketId) {
        // Create new ticket
        // Combine date and time
        const dateReceived = getDateTimeValue('time_received_container');
        const timeReceived = getTimeValue('time_received_time_container');
        const timeReceivedFull = combineDateTime(dateReceived, timeReceived);
        
        const dateFirstContact = getDateTimeValue('time_first_contact_container');
        const timeFirstContact = getTimeValue('time_first_contact_time_container');
        const timeFirstContactFull = dateFirstContact && timeFirstContact ? combineDateTime(dateFirstContact, timeFirstContact) : null;
        
        const dateCompleted = getDateTimeValue('time_completed_container');
        const timeCompleted = getTimeValue('time_completed_time_container');
        const timeCompletedFull = dateCompleted && timeCompleted ? combineDateTime(dateCompleted, timeCompleted) : null;
        
        const formData = {
            ticket_number: ticketNumber,
            ticket_type_id: parseInt(document.getElementById('ticket_type_id').value),
            team_id: parseInt(document.getElementById('team_id').value),
            time_received: timeReceivedFull,
            time_first_contact: timeFirstContactFull,
            time_completed: timeCompletedFull,
            subscriber_name: document.getElementById('subscriber_name').value || null,
            subscriber_phone: document.getElementById('subscriber_phone').value || null,
            subscriber_address: document.getElementById('subscriber_address').value || null,
            notes: document.getElementById('notes').value || null
        };
        
        try {
            if (!window.api) {
                alert('API not loaded');
                return;
            }
            const data = await window.api.createTicket(formData);
            if (data.success) {
                currentTicketId = data.ticketId;
                showTicketSuccessModal();
                // Don't automatically show ticket details, let user continue in modal
            }
        } catch (error) {
            alert('خطأ في إدخال التذكرة: ' + (error.message || 'خطأ غير معروف'));
        }
    }
}

async function showTicketDetails(ticketId) {
    currentTicketId = ticketId;
    showPage('ticket-details');
    
    try {
        const data = await window.api.getTicket(ticketId);
        if (data.success) {
            const ticket = data.ticket;
            document.getElementById('detail-ticket-number').textContent = ticket.ticket_number;
            
            // Load photos
            loadPhotos(ticket.photos || []);
            
            // Load quality review if exists
            if (ticket.qualityReview) {
                loadQualityReview(ticket.qualityReview);
            }
            
            // Load scores
            if (ticket.scores) {
                displayScores(ticket.scores);
            }
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
    }
}

function loadPhotos(photos) {
    const photoGrid = document.getElementById('photoGrid');
    photoGrid.innerHTML = '';
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.photo_path}" alt="${photo.photo_type}">
            <button class="remove-photo" onclick="removePhoto(${photo.id})">×</button>
        `;
        photoGrid.appendChild(photoItem);
    });
}

async function handlePhotoUpload(files) {
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    const photoType = document.getElementById('photo_type').value;
    if (!photoType) {
        alert('يرجى اختيار نوع الصورة');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo_type', photoType);
    Array.from(files).forEach(file => {
        formData.append('photos', file);
    });
    
    try {
        const data = await window.api.uploadPhotos(currentTicketId, formData);
        if (data.success) {
            alert('تم رفع الصور بنجاح');
            // Reload ticket to get updated photos
            showTicketDetails(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في رفع الصور: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function handleQualityReviewSubmit(e) {
    e.preventDefault();
    
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    const formData = {
        contact_status: document.getElementById('contact_status').value,
        service_status: document.getElementById('service_status').value,
        team_rating: parseInt(document.getElementById('team_rating').value),
        behavior_rating: document.getElementById('behavior_rating').value,
        explained_sinmana: document.getElementById('explained_sinmana').checked ? 1 : 0,
        explained_platform: document.getElementById('explained_platform').checked ? 1 : 0,
        explained_mytv_plus: document.getElementById('explained_mytv_plus').checked ? 1 : 0,
        explained_shahid_plus: document.getElementById('explained_shahid_plus').checked ? 1 : 0,
        whatsapp_group_interest: document.getElementById('whatsapp_group_interest').checked ? 1 : 0,
        subscription_amount: document.getElementById('subscription_amount').value || null,
        needs_followup: document.getElementById('needs_followup').checked ? 1 : 0,
        followup_reason: document.getElementById('followup_reason').value || null,
        review_notes: document.getElementById('review_notes').value || null,
        upsell_router: document.getElementById('upsell_router').checked ? 1 : 0,
        upsell_onu: document.getElementById('upsell_onu').checked ? 1 : 0,
        upsell_ups: document.getElementById('upsell_ups').checked ? 1 : 0
    };
    
    try {
        const data = await window.api.submitQualityReview(currentTicketId, formData);
        if (data.success) {
            alert('تم حفظ تقييم الجودة بنجاح');
            // Reload ticket
            showTicketDetails(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في حفظ التقييم: ' + (error.message || 'خطأ غير معروف'));
    }
}

function loadQualityReview(review) {
    document.getElementById('contact_status').value = review.contact_status;
    document.getElementById('service_status').value = review.service_status;
    document.getElementById('team_rating').value = review.team_rating;
    if (review.behavior_rating) {
        document.getElementById('behavior_rating').value = review.behavior_rating;
    }
    document.getElementById('explained_sinmana').checked = review.explained_sinmana === 1;
    document.getElementById('explained_platform').checked = review.explained_platform === 1;
    document.getElementById('explained_mytv_plus').checked = review.explained_mytv_plus === 1;
    document.getElementById('explained_shahid_plus').checked = review.explained_shahid_plus === 1;
    document.getElementById('whatsapp_group_interest').checked = review.whatsapp_group_interest === 1;
    document.getElementById('subscription_amount').value = review.subscription_amount || '';
    document.getElementById('needs_followup').checked = review.needs_followup === 1;
    document.getElementById('followup_reason').value = review.followup_reason || '';
    document.getElementById('review_notes').value = review.review_notes || '';
    
    // Upsell fields
    if (review.upsell_router !== undefined) {
        document.getElementById('upsell_router').checked = review.upsell_router === 1;
    }
    if (review.upsell_onu !== undefined) {
        document.getElementById('upsell_onu').checked = review.upsell_onu === 1;
    }
    if (review.upsell_ups !== undefined) {
        document.getElementById('upsell_ups').checked = review.upsell_ups === 1;
    }
    
    if (review.needs_followup === 1) {
        document.getElementById('followupReasonGroup').style.display = 'block';
    }
}

async function generateMessage() {
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    try {
        const data = await window.api.generateMessage(currentTicketId);
        if (data.success) {
            document.getElementById('generatedMessage').value = data.message;
            document.getElementById('messageSection').style.display = 'block';
        }
    } catch (error) {
        alert('خطأ في توليد الرسالة: ' + (error.message || 'خطأ غير معروف'));
    }
}

function copyMessage() {
    const messageText = document.getElementById('generatedMessage');
    messageText.select();
    document.execCommand('copy');
    alert('تم نسخ الرسالة!');
}

function displayScores(scores) {
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.innerHTML = `
        <div class="score-item positive">
            <div class="label">النقاط الموجبة</div>
            <div class="value">+${scores.totalPositive || 0}</div>
        </div>
        <div class="score-item negative">
            <div class="label">النقاط السالبة</div>
            <div class="value">-${scores.totalNegative || 0}</div>
        </div>
        <div class="score-item net">
            <div class="label">النقاط الصافية</div>
            <div class="value">${scores.netScore || 0}</div>
        </div>
    `;
}

function showPage(pageName) {
    // Check permissions for tickets-management-new (only admin and call_center)
    if (pageName === 'tickets-management-new') {
        const user = getCurrentUser();
        if (user.role !== 'admin' && user.role !== 'call_center') {
            alert('غير مصرح لك بالوصول إلى هذه الصفحة');
            showPage('tickets-management');
            return;
        }
    }
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update active menu item
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'tickets-management': 'إدارة التذاكر',
        'tickets-management-new': 'إدارة تذكرةات',
        'tickets-list': 'إدارة جودة',
        'followup': 'المتابعة',
        'daily-report': 'التقرير اليومي'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || '';
    
    // Load page data
    if (pageName === 'tickets-management') {
        loadTicketsManagement('NEW');
    } else if (pageName === 'tickets-management-new') {
        loadTicketsManagementNew('NEW');
    } else if (pageName === 'tickets-list') {
        loadTicketsList();
    }
}

// إدارة التذاكر - تحميل التذاكر مع الفلترة
let currentTicketFilter = 'NEW'; // Default: معلقة

async function loadTicketsManagement(filterStatus = 'NEW') {
    currentTicketFilter = filterStatus;
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        // جلب جميع التذاكر ثم فلترتها
        const data = await window.api.getTickets({ limit: 1000 });
        if (data && data.success) {
            const tbody = document.getElementById('ticketsManagementTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            // فلترة التذاكر حسب الحالة
            let filteredTickets = data.tickets || [];
            if (filterStatus !== 'all') {
                filteredTickets = filteredTickets.filter(ticket => ticket.status === filterStatus);
            }
            
            // تحديث الأزرار النشطة
            document.querySelectorAll('.btn-tab').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-status') === filterStatus) {
                    btn.classList.add('active');
                }
            });
            
            if (filteredTickets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 15px; font-weight: 500;">لا يوجد بيانات</td></tr>';
                return;
            }
            
            if (filteredTickets.length > 0) {
                filteredTickets.forEach(ticket => {
                    const statusBadge = {
                        'NEW': 'badge-warning',
                        'ASSIGNED': 'badge-info',
                        'IN_PROGRESS': 'badge-primary',
                        'COMPLETED': 'badge-success',
                        'UNDER_REVIEW': 'badge-info',
                        'FOLLOW_UP': 'badge-danger',
                        'CLOSED': 'badge-secondary'
                    }[ticket.status] || 'badge-info';
                    
                    const statusText = {
                        'NEW': 'معلق',
                        'ASSIGNED': 'مخصص للفني',
                        'IN_PROGRESS': 'قيد العمل',
                        'COMPLETED': 'منجز',
                        'UNDER_REVIEW': 'قيد المراجعة',
                        'FOLLOW_UP': 'مؤجل',
                        'CLOSED': 'منتهي'
                    }[ticket.status] || ticket.status;
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${ticket.ticket_number}</td>
                        <td>${ticket.subscriber_name || '-'}</td>
                        <td>${ticket.team_name || ''}</td>
                        <td><span class="badge ${statusBadge}">${statusText}</span></td>
                        <td>${ticket.ticket_type_name || ''}</td>
                        <td>${formatTimeDuration(ticket.actual_time_minutes)}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="openTicketDetailsModal(${ticket.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">عرض</button>
                            ${ticket.status === 'NEW' && !ticket.assigned_technician_id ? `
                                <button class="btn btn-primary" onclick="showAssignTicketModal(${ticket.id}, ${ticket.team_id})" style="padding: 6px 12px; font-size: 12px;">📤 إرسال تذكرة</button>
                            ` : ''}
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تذكرةات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading tickets management:', error);
        const tbody = document.getElementById('ticketsManagementTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

// دالة فلترة التذاكر
function filterTicketsByStatus(status) {
    loadTicketsManagement(status);
}

// إدارة التذاكر الجديدة - تحميل التذاكر مع الفلترة
let currentTicketFilterNew = 'NEW'; // Default: معلقة

async function loadTicketsManagementNew(filterStatus = 'NEW') {
    currentTicketFilterNew = filterStatus;
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        // جلب جميع التذاكر ثم فلترتها
        const data = await window.api.getTickets({ limit: 1000 });
        if (data && data.success) {
            const tbody = document.getElementById('ticketsManagementNewTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            // فلترة التذاكر حسب الحالة
            let filteredTickets = data.tickets || [];
            if (filterStatus !== 'all') {
                filteredTickets = filteredTickets.filter(ticket => ticket.status === filterStatus);
            }
            
            // تحديث الأزرار النشطة
            const pageContent = document.getElementById('tickets-management-new-page');
            if (pageContent) {
                pageContent.querySelectorAll('.btn-tab').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-status') === filterStatus) {
                        btn.classList.add('active');
                    }
                });
            }
            
            if (filteredTickets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 15px; font-weight: 500;">لا يوجد بيانات</td></tr>';
                return;
            }
            
            if (filteredTickets.length > 0) {
                filteredTickets.forEach(ticket => {
                    const statusBadge = {
                        'NEW': 'badge-warning',
                        'ASSIGNED': 'badge-info',
                        'IN_PROGRESS': 'badge-primary',
                        'COMPLETED': 'badge-success',
                        'UNDER_REVIEW': 'badge-info',
                        'FOLLOW_UP': 'badge-danger',
                        'CLOSED': 'badge-secondary'
                    }[ticket.status] || 'badge-info';
                    
                    const statusText = {
                        'NEW': 'معلق',
                        'ASSIGNED': 'مخصص للفني',
                        'IN_PROGRESS': 'قيد العمل',
                        'COMPLETED': 'منجز',
                        'UNDER_REVIEW': 'قيد المراجعة',
                        'FOLLOW_UP': 'مؤجل',
                        'CLOSED': 'منتهي'
                    }[ticket.status] || ticket.status;
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${ticket.ticket_number || '-'}</td>
                        <td>${ticket.subscriber_name || '-'}</td>
                        <td>${ticket.subscriber_phone || '-'}</td>
                        <td>${ticket.ticket_type_name || '-'}</td>
                        <td>${ticket.region || '-'}</td>
                        <td><span class="badge ${statusBadge}">${statusText}</span></td>
                        <td>${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('ar-SA') : '-'}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="showTicketDetails(${ticket.id})" style="padding: 6px 12px; font-size: 12px;">عرض</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="loading">لا توجد تذكرةات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading tickets management new:', error);
        const tbody = document.getElementById('ticketsManagementNewTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

// دالة فلترة التذاكر للصفحة الجديدة
function filterTicketsByStatusNew(status) {
    loadTicketsManagementNew(status);
}

async function loadTicketsList() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        // جلب التذاكر المكتملة من الفني (جاهزة للمراجعة) أو الجديدة
        const data = await window.api.getTickets();
        if (data && data.success) {
            const tbody = document.getElementById('ticketsTableBody');
            tbody.innerHTML = '';
            
            if (!data.tickets || data.tickets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 15px; font-weight: 500;">لا يوجد بيانات</td></tr>';
                return;
            }
            
            if (data.tickets && data.tickets.length > 0) {
                data.tickets.forEach(ticket => {
                    const netScore = (ticket.positive_points || 0) - (ticket.negative_points || 0);
                    const statusBadge = {
                        'NEW': 'badge-warning',
                        'ASSIGNED': 'badge-info',
                        'IN_PROGRESS': 'badge-primary',
                        'COMPLETED': 'badge-success',
                        'UNDER_REVIEW': 'badge-info',
                        'FOLLOW_UP': 'badge-danger',
                        'CLOSED': 'badge-secondary'
                    }[ticket.status] || 'badge-info';
                    
                    const statusText = {
                        'NEW': 'جديد',
                        'ASSIGNED': 'مخصص للفني',
                        'IN_PROGRESS': 'قيد العمل',
                        'COMPLETED': 'مكتمل - جاهز للمراجعة',
                        'UNDER_REVIEW': 'قيد المراجعة',
                        'FOLLOW_UP': 'متابعة',
                        'CLOSED': 'مغلق'
                    }[ticket.status] || ticket.status;
                    
                    const row = document.createElement('tr');
                    if (ticket.status === 'postponed') {
                        row.classList.add('postponed');
                    }
                    row.innerHTML = `
                        <td>${ticket.ticket_number}</td>
                        <td>${ticket.subscriber_name || '-'}</td>
                        <td>${ticket.team_name || ''}</td>
                        <td><span class="badge ${statusBadge}">${statusText}</span></td>
                        <td>${ticket.ticket_type_name || ''}</td>
                        <td>${formatTimeDuration(ticket.actual_time_minutes)}</td>
                        <td>${netScore}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="openTicketDetailsModal(${ticket.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">عرض</button>
                            ${ticket.status === 'COMPLETED' ? `
                                <button class="btn btn-success" onclick="reviewTicket(${ticket.id})" style="padding: 6px 12px; font-size: 12px;">مراجعة</button>
                            ` : ''}
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="loading">لا توجد تذكرةات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        const tbody = document.getElementById('ticketsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

function resetForm() {
    document.getElementById('ticketForm').reset();
    currentTicketId = null;
    if (window.timeReceivedPicker) {
        window.timeReceivedPicker.reset();
    }
    if (window.timeFirstContactPicker) {
        window.timeFirstContactPicker.setValue('');
    }
    if (window.timeCompletedPicker) {
        window.timeCompletedPicker.setValue('');
    }
    if (window.timeReceivedTimePicker) {
        window.timeReceivedTimePicker.reset();
    }
    if (window.timeFirstContactTimePicker) {
        window.timeFirstContactTimePicker.setValue('');
    }
    if (window.timeCompletedTimePicker) {
        window.timeCompletedTimePicker.setValue('');
    }
}

// Mobile Menu Toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
        if (overlay) {
            overlay.classList.toggle('active');
        }
    }
}

// Close mobile menu when clicking on a menu item
function setupMobileMenuClose() {
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleMobileMenu();
            }
        });
    });
}

// Make functions available globally
window.showPage = showPage;

// Modal Functions
// Note: openNewTicketModal is defined at the top of the file for immediate availability

function closeNewTicketModal() {
    const modal = document.getElementById('new-ticket-modal');
    if (modal) {
        modal.classList.remove('active');
        resetFormModal();
    }
}

async function openTicketDetailsModal(ticketId) {
    currentTicketId = ticketId;
    const modal = document.getElementById('ticket-details-modal');
    if (modal) {
        modal.classList.add('active');
        await loadTicketDetailsForModal(ticketId);
    }
}

function closeTicketDetailsModal() {
    const modal = document.getElementById('ticket-details-modal');
    if (modal) {
        modal.classList.remove('active');
        // Reload tickets list if we're on that page
        if (document.getElementById('tickets-management-page') && document.getElementById('tickets-management-page').style.display !== 'none') {
            loadTicketsManagement(currentTicketFilter);
        }
        if (document.getElementById('tickets-list-page') && document.getElementById('tickets-list-page').style.display !== 'none') {
            loadTicketsList();
        }
    }
}

// Close modal when clicking on overlay
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// Load ticket types for modal
async function loadTicketTypesForModal() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTicketTypes();
        if (data.success) {
            const select = document.getElementById('ticket_type_id_modal');
            if (!select) return;
            
            select.innerHTML = '<option value="">اختر النوع</option>';
            
            const typeMapping = {
                'ربط جديد FTTH': { name: 'ربط مشترك جديد FTTH', order: 1 },
                'إعادة ربط': { name: 'إعادة مشترك إلى الخدمة', order: 2 },
                'قطع فايبر': { name: 'قطع فايبر', order: 3 },
                'ضعف إشارة RX': { name: 'ضعف إشارة البور RX', order: 4 },
                'تبديل راوتر/ONU': { name: 'تبديل او صيانه راوتر/ONU', order: 999 }
            };
            
            let filteredTypes = data.types.filter(type => 
                type.name_ar !== 'زيارة تسويقية' && 
                type.name_ar !== 'WiFi بدون تمديد'
            );
            
            const priorityTypes = [];
            const otherTypes = [];
            
            filteredTypes.forEach(type => {
                if (typeMapping[type.name_ar]) {
                    priorityTypes.push({
                        ...type,
                        displayName: typeMapping[type.name_ar].name,
                        order: typeMapping[type.name_ar].order
                    });
                } else {
                    otherTypes.push({
                        ...type,
                        displayName: type.name_ar,
                        order: 999
                    });
                }
            });
            
            priorityTypes.sort((a, b) => a.order - b.order);
            const sortedTypes = [...priorityTypes, ...otherTypes];
            
            sortedTypes.forEach((type, index) => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = `${index + 1} - ${type.displayName}`;
                option.setAttribute('data-display-name', type.displayName);
                select.appendChild(option);
            });
            
            // Add event listener for ticket type change to show checklist
            select.addEventListener('change', (e) => {
                const selectedOption = select.options[select.selectedIndex];
                const ticketTypeName = selectedOption.getAttribute('data-display-name') || selectedOption.textContent.replace(/^\d+\s*-\s*/, '');
                console.log('Selected ticket type:', ticketTypeName); // Debug
                renderChecklist(ticketTypeName);
                
                // Toggle explained services based on ticket type
                const ticketTypeKey = ticketTypeMapping[ticketTypeName] || ticketTypeName;
                toggleExplainedServices(ticketTypeKey);
            });
        }
    } catch (error) {
        console.error('Error loading ticket types for modal:', error);
    }
}

// Load teams for modal
async function loadTeamsForModal() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTeams();
        if (data.success) {
            const select = document.getElementById('team_id_modal');
            if (!select) return;
            
            select.innerHTML = '<option value="">اختر الفريق</option>';
            
            data.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                
                let membersText = '';
                if (team.members && team.members.length > 0) {
                    const firstNames = team.members.map(fullName => fullName.split(' ')[0]);
                    membersText = ` (${firstNames.join('/')})`;
                } else if (team.members_names) {
                    const firstNames = team.members_names.split(', ').map(fullName => fullName.split(' ')[0]);
                    membersText = ` (${firstNames.join('/')})`;
                }
                
                if (membersText) {
                    option.className = 'team-with-members';
                }
                option.textContent = team.name + membersText;
                select.appendChild(option);
            });
            
            // Setup team change listener to load technicians
            select.addEventListener('change', async function() {
                await loadTechniciansForTeam(this.value);
            });
        }
    } catch (error) {
        console.error('Error loading teams for modal:', error);
    }
}

// Load technicians for selected team
async function loadTechniciansForTeam(teamId) {
    try {
        const technicianSelect = document.getElementById('assigned_technician_id_modal');
        if (!technicianSelect) return;
        
        technicianSelect.innerHTML = '<option value="">اختر الفني (اختياري)</option>';
        
        if (!teamId) {
            return;
        }
        
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        
        const data = await window.api.getTechniciansByTeam(teamId);
        if (data && data.success && data.technicians) {
            data.technicians.forEach(technician => {
                const option = document.createElement('option');
                option.value = technician.id;
                option.textContent = technician.full_name;
                technicianSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading technicians:', error);
    }
}

// Validate dates logic - ensure T1 >= T0 and T2 >= T1
function validateTicketDates() {
    const dateReceived = getDateTimeValue('time_received_container_modal');
    const timeReceived = getTimeValue('time_received_time_container_modal');
    const timeReceivedFull = dateReceived && timeReceived ? combineDateTime(dateReceived, timeReceived) : null;
    
    const dateFirstContact = getDateTimeValue('time_first_contact_container_modal');
    const timeFirstContact = getTimeValue('time_first_contact_time_container_modal');
    const timeFirstContactFull = dateFirstContact && timeFirstContact ? combineDateTime(dateFirstContact, timeFirstContact) : null;
    
    const dateCompleted = getDateTimeValue('time_completed_container_modal');
    const timeCompleted = getTimeValue('time_completed_time_container_modal');
    const timeCompletedFull = dateCompleted && timeCompleted ? combineDateTime(dateCompleted, timeCompleted) : null;
    
    const errors = [];
    
    // Check T0 (required)
    if (!timeReceivedFull) {
        return { valid: true }; // T0 is required but validation happens on submit
    }
    
    const t0Date = new Date(timeReceivedFull);
    
    // Check T1: must be >= T0
    if (timeFirstContactFull) {
        const t1Date = new Date(timeFirstContactFull);
        if (t1Date < t0Date) {
            errors.push({
                field: 'T1 (تاريخ اول رد)',
                message: 'تاريخ اول رد (T1) لا يمكن أن يكون قبل تاريخ استلام التذكرة (T0)',
                container: 'time_first_contact_container_modal'
            });
        }
    }
    
    // Check T2: must be >= T1 (if T1 exists), and must be >= T0
    if (timeCompletedFull) {
        const t2Date = new Date(timeCompletedFull);
        if (t2Date < t0Date) {
            errors.push({
                field: 'T2 (تاريخ اكمال التذكرة)',
                message: 'تاريخ اكمال التذكرة (T2) لا يمكن أن يكون قبل تاريخ استلام التذكرة (T0)',
                container: 'time_completed_container_modal'
            });
        }
        if (timeFirstContactFull) {
            const t1Date = new Date(timeFirstContactFull);
            if (t2Date < t1Date) {
                errors.push({
                    field: 'T2 (تاريخ اكمال التذكرة)',
                    message: 'تاريخ اكمال التذكرة (T2) لا يمكن أن يكون قبل تاريخ اول رد (T1)',
                    container: 'time_completed_container_modal'
                });
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Show date validation error popup
function showDateValidationError(errors) {
    const modal = document.getElementById('date-error-modal');
    const errorList = document.getElementById('date-error-list');
    
    if (!modal || !errorList) {
        // Fallback to alert if modal doesn't exist
        let errorMessage = '⚠️ خطأ في التواريخ:\n\n';
        errors.forEach((error, index) => {
            errorMessage += `${index + 1}. ${error.field}: ${error.message}\n`;
        });
        errorMessage += '\nيرجى تصحيح التواريخ والمحاولة مرة أخرى.';
        alert(errorMessage);
        return;
    }
    
    // Clear previous errors
    errorList.innerHTML = '';
    
    // Add errors to list
    errors.forEach((error, index) => {
        const listItem = document.createElement('li');
        listItem.style.cssText = 'padding: 15px; margin-bottom: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; border-right: 4px solid var(--danger-color);';
        
        const errorNumber = document.createElement('span');
        errorNumber.style.cssText = 'display: inline-block; width: 28px; height: 28px; background: var(--danger-color); color: white; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; font-size: 14px; margin-left: 12px;';
        errorNumber.textContent = index + 1;
        
        const errorContent = document.createElement('div');
        errorContent.style.cssText = 'display: inline-block; vertical-align: middle;';
        
        const errorField = document.createElement('div');
        errorField.style.cssText = 'font-weight: 600; color: var(--text-primary); margin-bottom: 5px; font-size: 15px;';
        errorField.textContent = error.field;
        
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = 'color: var(--text-secondary); font-size: 14px; line-height: 1.5;';
        errorMessage.textContent = error.message;
        
        errorContent.appendChild(errorField);
        errorContent.appendChild(errorMessage);
        
        listItem.appendChild(errorNumber);
        listItem.appendChild(errorContent);
        
        errorList.appendChild(listItem);
    });
    
    // Show modal
    modal.classList.add('active');
}

// Close date error modal
function closeDateErrorModal() {
    const modal = document.getElementById('date-error-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Show ticket success modal
function showTicketSuccessModal() {
    const modal = document.getElementById('ticket-success-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Close ticket success modal
window.closeTicketSuccessModal = function(scrollToPhotos = false) {
    const modal = document.getElementById('ticket-success-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    if (scrollToPhotos) {
        // Scroll to photos section
        setTimeout(() => {
            const photosSection = document.getElementById('photosSectionModal');
            if (photosSection) {
                photosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }
};

// Close modal when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
    const errorModal = document.getElementById('date-error-modal');
    if (errorModal) {
        errorModal.addEventListener('click', function(e) {
            if (e.target === errorModal) {
                closeDateErrorModal();
            }
        });
    }
    
    const successModal = document.getElementById('ticket-success-modal');
    if (successModal) {
        successModal.addEventListener('click', function(e) {
            if (e.target === successModal) {
                closeTicketSuccessModal(false);
            }
        });
    }
});

// Setup date validation listeners
function setupDateValidationListeners() {
    // Helper to add change listeners to date/time pickers
    function addChangeListener(containerId, timeContainerId, callback) {
        const container = document.getElementById(containerId);
        const timeContainer = document.getElementById(timeContainerId);
        
        if (container) {
            // Listen to changes in year, month, day selects
            const selects = container.querySelectorAll('select');
            selects.forEach(select => {
                select.addEventListener('change', () => {
                    setTimeout(callback, 100); // Delay to allow value update
                });
            });
        }
        
        if (timeContainer) {
            // Listen to changes in hour, minute selects and AM/PM
            const selects = timeContainer.querySelectorAll('select');
            selects.forEach(select => {
                select.addEventListener('change', () => {
                    setTimeout(callback, 100); // Delay to allow value update
                });
            });
        }
    }
    
    // Add listeners for T0
    addChangeListener('time_received_container_modal', 'time_received_time_container_modal', () => {
        const validation = validateTicketDates();
        if (!validation.valid) {
            showDateValidationError(validation.errors);
        }
    });
    
    // Add listeners for T1
    addChangeListener('time_first_contact_container_modal', 'time_first_contact_time_container_modal', () => {
        const validation = validateTicketDates();
        if (!validation.valid) {
            showDateValidationError(validation.errors);
        }
    });
    
    // Add listeners for T2
    addChangeListener('time_completed_container_modal', 'time_completed_time_container_modal', () => {
        const validation = validateTicketDates();
        if (!validation.valid) {
            showDateValidationError(validation.errors);
        }
    });
}

// Initialize datetime pickers for modal
function initModalDateTimePickers() {
    // Initialize date pickers
    if (typeof createDateTimePicker === 'function') {
        const receivedContainer = document.getElementById('time_received_container_modal');
        const firstContactContainer = document.getElementById('time_first_contact_container_modal');
        const completedContainer = document.getElementById('time_completed_container_modal');
        
        if (receivedContainer && !receivedContainer.hasChildNodes()) {
            createDateTimePicker('time_received_container_modal', null, true);
        }
        if (firstContactContainer && !firstContactContainer.hasChildNodes()) {
            createDateTimePicker('time_first_contact_container_modal', null, false);
        }
        if (completedContainer && !completedContainer.hasChildNodes()) {
            createDateTimePicker('time_completed_container_modal', null, false);
        }
    }
    
    // Initialize time pickers
    if (typeof createTimePicker === 'function') {
        const receivedTimeContainer = document.getElementById('time_received_time_container_modal');
        const firstContactTimeContainer = document.getElementById('time_first_contact_time_container_modal');
        const completedTimeContainer = document.getElementById('time_completed_time_container_modal');
        
        if (receivedTimeContainer && !receivedTimeContainer.hasChildNodes()) {
            window.timeReceivedTimePickerModal = createTimePicker('time_received_time_container_modal', null, true);
        }
        if (firstContactTimeContainer && !firstContactTimeContainer.hasChildNodes()) {
            window.timeFirstContactTimePickerModal = createTimePicker('time_first_contact_time_container_modal', null, false);
        }
        if (completedTimeContainer && !completedTimeContainer.hasChildNodes()) {
            window.timeCompletedTimePickerModal = createTimePicker('time_completed_time_container_modal', null, false);
        }
    }
    
    // Setup date validation listeners after a short delay to ensure pickers are initialized
    setTimeout(() => {
        setupDateValidationListeners();
    }, 200);
}

// Setup form submission for modal
function setupModalFormSubmission() {
    const form = document.getElementById('ticketFormModal');
    if (form) {
        form.onsubmit = handleTicketSubmitModal;
    }
}

// Handle ticket submit for modal
async function handleTicketSubmitModal(e) {
    e.preventDefault();
    
    const ticketNumberInput = document.getElementById('ticket_number_modal');
    let ticketNumber = ticketNumberInput.value.trim();
    const originalValue = ticketNumber;
    
    ticketNumber = ticketNumber.replace(/[^0-9]/g, '');
    const invalidChars = originalValue.replace(/[0-9]/g, '');
    
    if (!ticketNumber || ticketNumber.length === 0 || !/^[0-9]+$/.test(ticketNumber)) {
        let errorMessage = '❌ رقم التذكرة غير صحيح. ';
        if (invalidChars.length > 0) {
            errorMessage += `تم رفض القيم: "${invalidChars}". `;
        }
        errorMessage += 'رقم التذكرة يجب أن يحتوي على أرقام إنجليزية فقط (0-9)';
        
        const errorDiv = document.getElementById('ticket_number_error_modal');
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            ticketNumberInput.style.borderColor = '#dc3545';
            ticketNumberInput.style.backgroundColor = '#fff5f5';
        }
        
        alert(errorMessage);
        ticketNumberInput.value = '';
        ticketNumberInput.focus();
        return;
    }
    
    ticketNumberInput.value = ticketNumber;
    
    const errorDiv = document.getElementById('ticket_number_error_modal');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        ticketNumberInput.style.borderColor = '';
        ticketNumberInput.style.backgroundColor = '';
    }
    
    // Validate dates before submission
    const dateValidation = validateTicketDates();
    if (!dateValidation.valid) {
        showDateValidationError(dateValidation.errors);
        return;
    }
    
    // Combine date and time for modal
    const dateReceived = getDateTimeValue('time_received_container_modal');
    const timeReceived = getTimeValue('time_received_time_container_modal');
    const timeReceivedFull = combineDateTime(dateReceived, timeReceived);
    
    const dateFirstContact = getDateTimeValue('time_first_contact_container_modal');
    const timeFirstContact = getTimeValue('time_first_contact_time_container_modal');
    const timeFirstContactFull = dateFirstContact && timeFirstContact ? combineDateTime(dateFirstContact, timeFirstContact) : null;
    
    const dateCompleted = getDateTimeValue('time_completed_container_modal');
    const timeCompleted = getTimeValue('time_completed_time_container_modal');
    const timeCompletedFull = dateCompleted && timeCompleted ? combineDateTime(dateCompleted, timeCompleted) : null;
    
    // Final validation: T0 is required
    if (!timeReceivedFull) {
        alert('⚠️ خطأ في التواريخ:\n\nيرجى إدخال تاريخ استلام التذكرة (T0)');
        return;
    }
    
    const assignedTechnicianId = document.getElementById('assigned_technician_id_modal').value;
    
    const formData = {
        ticket_number: ticketNumber,
        ticket_type_id: parseInt(document.getElementById('ticket_type_id_modal').value),
        team_id: parseInt(document.getElementById('team_id_modal').value),
        assigned_technician_id: assignedTechnicianId ? parseInt(assignedTechnicianId) : null,
        time_received: timeReceivedFull,
        time_first_contact: timeFirstContactFull,
        time_completed: timeCompletedFull,
        subscriber_name: document.getElementById('subscriber_name_modal').value || null,
        subscriber_phone: document.getElementById('subscriber_phone_modal').value || null,
        subscriber_address: null,
        notes: null
    };
    
    try {
        if (!window.api) {
            alert('API not loaded');
            return;
        }
        const data = await window.api.createTicket(formData);
        if (data.success) {
            currentTicketId = data.ticketId;
            showTicketSuccessModal();
            
            // Reload tickets list
            if (document.getElementById('tickets-list-page').style.display !== 'none') {
                loadTicketsList();
            }
        }
    } catch (error) {
        alert('خطأ في إدخال التذكرة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Reset form for modal
function resetFormModal() {
    const form = document.getElementById('ticketFormModal');
    if (form) {
        form.reset();
        form.style.display = 'block';
    }
    
    // Reset technician dropdown
    const technicianSelect = document.getElementById('assigned_technician_id_modal');
    if (technicianSelect) {
        technicianSelect.innerHTML = '<option value="">اختر الفني (اختياري)</option>';
    }
    
    // Hide message section (photos and quality review stay visible)
    const messageSection = document.getElementById('messageSectionNewModal');
    if (messageSection) {
        messageSection.style.display = 'none';
    }
    
    // Clear photos grid
    const photoGrid = document.getElementById('photoGridNewModal');
    if (photoGrid) photoGrid.innerHTML = '';
    
    // Reset checklist
    const checklistWrapper = document.getElementById('checklistContainerWrapper');
    if (checklistWrapper) {
        checklistWrapper.style.display = 'none';
    }
    const checklistContainer = document.getElementById('checklistContainer');
    if (checklistContainer) {
        checklistContainer.innerHTML = '';
    }
    const qualityPointsEl = document.getElementById('qualityPoints');
    if (qualityPointsEl) {
        qualityPointsEl.textContent = '0';
    }
    
    // Reset header points display
    const headerQualityPointsEl = document.getElementById('headerQualityPoints');
    if (headerQualityPointsEl) {
        headerQualityPointsEl.textContent = '0';
    }
    const headerPenaltyPointsEl = document.getElementById('headerPenaltyPoints');
    if (headerPenaltyPointsEl) {
        headerPenaltyPointsEl.textContent = '0';
    }
    const headerTotalPointsEl = document.getElementById('headerTotalPoints');
    if (headerTotalPointsEl) {
        headerTotalPointsEl.textContent = '0';
    }
    
    checklistState = {};
    
    // Reset quality review form
    const qualityReviewForm = document.getElementById('qualityReviewFormNewModal');
    if (qualityReviewForm) {
        qualityReviewForm.reset();
    }
    
    // Reset phone number field
    const phoneNumberInput = document.getElementById('phone_number_modal');
    if (phoneNumberInput) {
        phoneNumberInput.value = '';
    }
    
    // Reset explained services
    const explainedServicesWrapper = document.getElementById('explainedServicesWrapper');
    if (explainedServicesWrapper) {
        explainedServicesWrapper.style.display = 'none';
    }
    const explainedServicesContainer = document.getElementById('explainedServicesContainer');
    if (explainedServicesContainer) {
        explainedServicesContainer.innerHTML = '';
    }
    // Reset all explained services checkboxes
    ['explained_sinmana_new_modal', 'explained_platform_new_modal', 'explained_mytv_plus_new_modal', 'explained_shahid_plus_new_modal', 'explained_health_app_new_modal'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
    
    // Reset total points
    calculateTotalPoints().catch(err => console.error('Error:', err));
    
    // Reset datetime pickers
    const receivedContainer = document.getElementById('time_received_container_modal');
    const firstContactContainer = document.getElementById('time_first_contact_container_modal');
    const completedContainer = document.getElementById('time_completed_container_modal');
    
    if (receivedContainer) receivedContainer.innerHTML = '';
    if (firstContactContainer) firstContactContainer.innerHTML = '';
    if (completedContainer) completedContainer.innerHTML = '';
    
    // Reset time pickers
    const receivedTimeContainer = document.getElementById('time_received_time_container_modal');
    const firstContactTimeContainer = document.getElementById('time_first_contact_time_container_modal');
    const completedTimeContainer = document.getElementById('time_completed_time_container_modal');
    
    if (receivedTimeContainer) receivedTimeContainer.innerHTML = '';
    if (firstContactTimeContainer) firstContactTimeContainer.innerHTML = '';
    if (completedTimeContainer) completedTimeContainer.innerHTML = '';
    
    // Reset current ticket ID
    currentTicketId = null;
    
    // Re-initialize pickers
    setTimeout(() => {
        initModalDateTimePickers();
    }, 100);
}

// Setup ticket number validation for modal
function setupModalTicketNumberValidation() {
    const ticketNumberInput = document.getElementById('ticket_number_modal');
    if (!ticketNumberInput) return;
    
    // Copy the same validation logic from the main form
    ticketNumberInput.addEventListener('keydown', (e) => {
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                            'Home', 'End', 'PageUp', 'PageDown'];
        
        if (e.ctrlKey || e.metaKey) {
            if (['a', 'c', 'x', 'z'].includes(e.key.toLowerCase())) {
                return;
            }
            if (e.key.toLowerCase() === 'v') {
                e.preventDefault();
                return;
            }
        }
        
        if (allowedKeys.includes(e.key)) {
            return;
        }
        
        const charCode = e.key.charCodeAt ? e.key.charCodeAt(0) : e.keyCode;
        const isDigit = (charCode >= 48 && charCode <= 57);
        
        if (!isDigit) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);
    
    ticketNumberInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const cleaned = value.replace(/[^0-9]/g, '');
        if (value !== cleaned) {
            e.target.value = cleaned;
        }
    }, true);
    
    ticketNumberInput.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbersOnly = pastedText.replace(/[^0-9]/g, '');
        
        const start = e.target.selectionStart || 0;
        const end = e.target.selectionEnd || 0;
        const currentValue = e.target.value || '';
        e.target.value = currentValue.substring(0, start) + numbersOnly + currentValue.substring(end);
        e.target.setSelectionRange(start + numbersOnly.length, start + numbersOnly.length);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
    }, true);
}

// Load ticket details for modal (Read-only view, with edit option for team_leader)
async function loadTicketDetailsForModal(ticketId) {
    currentTicketId = ticketId;
    
    // إخفاء قسم المراجعة افتراضياً
    const reviewSection = document.getElementById('reviewSection');
    if (reviewSection) {
        reviewSection.style.display = 'none';
    }
    
    try {
        const data = await window.api.getTicket(ticketId);
        if (data.success) {
            const ticket = data.ticket;
            const ticketNumberEl = document.getElementById('detail-ticket-number-modal');
            if (ticketNumberEl) {
                ticketNumberEl.textContent = ticket.ticket_number;
            }
            
            // Check user role
            const user = getCurrentUser();
            const isTeamLeader = user && user.role === 'team_leader';
            
            // Show/hide edit section based on role
            const editSection = document.getElementById('editSectionForTeamLeader');
            if (editSection) {
                editSection.style.display = isTeamLeader ? 'block' : 'none';
            }
            
            // Display basic ticket info (read-only)
            document.getElementById('view_subscriber_name').textContent = ticket.subscriber_name || '-';
            document.getElementById('view_subscriber_phone').textContent = ticket.subscriber_phone || '-';
            document.getElementById('view_ticket_type').textContent = ticket.ticket_type_name || '-';
            document.getElementById('view_team_name').textContent = ticket.team_name || '-';
            document.getElementById('view_time_received').textContent = ticket.time_received ? formatDateTime(ticket.time_received) : '-';
            document.getElementById('view_time_first_contact').textContent = ticket.time_first_contact ? formatDateTime(ticket.time_first_contact) : '-';
            document.getElementById('view_time_completed').textContent = ticket.time_completed ? formatDateTime(ticket.time_completed) : '-';
            
            const statusText = {
                'NEW': 'جديد',
                'ASSIGNED': 'مخصص للفني',
                'IN_PROGRESS': 'قيد العمل',
                'COMPLETED': 'مكتمل - جاهز للمراجعة',
                'UNDER_REVIEW': 'قيد المراجعة',
                'FOLLOW_UP': 'متابعة',
                'CLOSED': 'مغلق',
                'pending': 'معلقة',
                'in_progress': 'قيد التنفيذ',
                'completed': 'مكتملة',
                'postponed': 'مؤجلة',
                'closed': 'مغلقة'
            }[ticket.status] || ticket.status;
            document.getElementById('view_status').textContent = statusText;
            
            // If team leader, populate edit forms
            if (isTeamLeader) {
                // Populate edit ticket form
                document.getElementById('edit_subscriber_name').value = ticket.subscriber_name || '';
                document.getElementById('edit_subscriber_phone').value = ticket.subscriber_phone || '';
                
                // Load ticket types and teams for edit form
                await loadTicketTypesForEdit();
                await loadTeamsForEdit();
                
                // Set selected values
                if (ticket.ticket_type_id) {
                    document.getElementById('edit_ticket_type_id').value = ticket.ticket_type_id;
                }
                if (ticket.team_id) {
                    document.getElementById('edit_team_id').value = ticket.team_id;
                }
                
                // Populate edit quality review form if exists
                if (ticket.qualityReview) {
                    populateEditQualityReviewForm(ticket.qualityReview);
                }
                
                // Setup form submissions
                setupEditForms(ticketId);
            }
            
            // Display photos (read-only)
            loadPhotosForView(ticket.photos || []);
            
            // Display quality review (read-only)
            if (ticket.qualityReview) {
                loadQualityReviewForView(ticket.qualityReview);
            } else {
                document.getElementById('qualityReviewViewSection').style.display = 'none';
            }
            
            // Display scores
            if (ticket.scores) {
                displayScoresForView(ticket.scores);
            } else {
                document.getElementById('scoresViewSection').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading ticket details for modal:', error);
    }
}

// Load photos for modal
function loadPhotosForModal(photos) {
    const photoGrid = document.getElementById('photoGridModal');
    if (!photoGrid) return;
    
    photoGrid.innerHTML = '';
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.photo_path}" alt="${photo.photo_type}">
            <button class="remove-photo" onclick="removePhotoModal(${photo.id})">×</button>
        `;
        photoGrid.appendChild(photoItem);
    });
}

// Load quality review for modal
function loadQualityReviewForModal(review) {
    if (document.getElementById('contact_status_modal')) {
        document.getElementById('contact_status_modal').value = review.contact_status || '';
    }
    if (document.getElementById('service_status_modal')) {
        document.getElementById('service_status_modal').value = review.service_status || '';
    }
    if (document.getElementById('team_rating_modal')) {
        document.getElementById('team_rating_modal').value = review.team_rating || '';
    }
    if (document.getElementById('behavior_rating_modal')) {
        document.getElementById('behavior_rating_modal').value = review.behavior_rating || '';
    }
    if (document.getElementById('subscription_amount_modal')) {
        document.getElementById('subscription_amount_modal').value = review.subscription_amount || '';
    }
    if (document.getElementById('upsell_router_modal')) {
        document.getElementById('upsell_router_modal').checked = review.upsell_router || false;
    }
    if (document.getElementById('upsell_onu_modal')) {
        document.getElementById('upsell_onu_modal').checked = review.upsell_onu || false;
    }
    if (document.getElementById('upsell_ups_modal')) {
        document.getElementById('upsell_ups_modal').checked = review.upsell_ups || false;
    }
    if (document.getElementById('explained_sinmana_modal')) {
        document.getElementById('explained_sinmana_modal').checked = review.explained_sinmana || false;
    }
    if (document.getElementById('explained_platform_modal')) {
        document.getElementById('explained_platform_modal').checked = review.explained_platform || false;
    }
    if (document.getElementById('explained_mytv_plus_modal')) {
        document.getElementById('explained_mytv_plus_modal').checked = review.explained_mytv_plus || false;
    }
    if (document.getElementById('explained_shahid_plus_modal')) {
        document.getElementById('explained_shahid_plus_modal').checked = review.explained_shahid_plus || false;
    }
    if (document.getElementById('whatsapp_group_interest_modal')) {
        document.getElementById('whatsapp_group_interest_modal').checked = review.whatsapp_group_interest || false;
    }
    if (document.getElementById('needs_followup_modal')) {
        document.getElementById('needs_followup_modal').checked = review.needs_followup || false;
        if (review.needs_followup) {
            const followupGroup = document.getElementById('followupReasonGroupModal');
            if (followupGroup) followupGroup.style.display = 'block';
        }
    }
    if (document.getElementById('followup_reason_modal')) {
        document.getElementById('followup_reason_modal').value = review.followup_reason || '';
    }
    if (document.getElementById('review_notes_modal')) {
        document.getElementById('review_notes_modal').value = review.review_notes || '';
    }
}

// Display scores for modal
function displayScoresForModal(scores) {
    const scoreDisplay = document.getElementById('scoreDisplayModal');
    if (!scoreDisplay) return;
    
    const netScore = (scores.positive_points || 0) - (scores.negative_points || 0);
    scoreDisplay.innerHTML = `
        <div class="score-item">
            <span>النقاط الإيجابية:</span>
            <span class="score-positive">+${scores.positive_points || 0}</span>
        </div>
        <div class="score-item">
            <span>النقاط السلبية:</span>
            <span class="score-negative">-${scores.negative_points || 0}</span>
        </div>
        <div class="score-item score-total">
            <span>المجموع:</span>
            <span class="score-net">${netScore}</span>
        </div>
    `;
}

// Setup photo upload for modal
function setupPhotoUploadForModal() {
    const photoUploadArea = document.getElementById('photoUploadAreaModal');
    const photoInput = document.getElementById('photoInputModal');
    
    if (!photoUploadArea || !photoInput) return;
    
    photoUploadArea.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoUploadArea.style.backgroundColor = 'var(--bg-tertiary)';
    });
    
    photoUploadArea.addEventListener('dragleave', () => {
        photoUploadArea.style.backgroundColor = '';
    });
    
    photoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        photoUploadArea.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            handlePhotoUploadForModal(e.dataTransfer.files);
        }
    });
    
    photoInput.addEventListener('change', (e) => {
        handlePhotoUploadForModal(e.target.files);
    });
    
    // Setup quality review form submission for modal
    const qualityReviewForm = document.getElementById('qualityReviewFormModal');
    if (qualityReviewForm) {
        qualityReviewForm.onsubmit = handleQualityReviewSubmitModal;
    }
    
    // Setup needs_followup checkbox for modal
    const needsFollowupCheckbox = document.getElementById('needs_followup_modal');
    if (needsFollowupCheckbox) {
        needsFollowupCheckbox.addEventListener('change', (e) => {
            const followupGroup = document.getElementById('followupReasonGroupModal');
            if (followupGroup) {
                followupGroup.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
}

// Handle photo upload for modal
async function handlePhotoUploadForModal(files) {
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    const photoType = document.getElementById('photo_type_modal').value;
    if (!photoType) {
        alert('يرجى اختيار نوع الصورة');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo_type', photoType);
    Array.from(files).forEach(file => {
        formData.append('photos', file);
    });
    
    try {
        const data = await window.api.uploadPhotos(currentTicketId, formData);
        if (data.success) {
            alert('تم رفع الصور بنجاح');
            loadTicketDetailsForModal(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في رفع الصور: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Handle quality review submit for modal
async function handleQualityReviewSubmitModal(e) {
    e.preventDefault();
    
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    const formData = {
        contact_status: document.getElementById('contact_status_modal').value,
        service_status: document.getElementById('service_status_modal').value,
        team_rating: parseInt(document.getElementById('team_rating_modal').value),
        behavior_rating: document.getElementById('behavior_rating_modal').value,
        explained_sinmana: document.getElementById('explained_sinmana_modal').checked ? 1 : 0,
        explained_platform: document.getElementById('explained_platform_modal').checked ? 1 : 0,
        explained_mytv_plus: document.getElementById('explained_mytv_plus_modal').checked ? 1 : 0,
        explained_shahid_plus: document.getElementById('explained_shahid_plus_modal').checked ? 1 : 0,
        whatsapp_group_interest: document.getElementById('whatsapp_group_interest_modal').checked ? 1 : 0,
        subscription_amount: document.getElementById('subscription_amount_modal').value || null,
        needs_followup: document.getElementById('needs_followup_modal').checked ? 1 : 0,
        followup_reason: document.getElementById('followup_reason_modal').value || null,
        review_notes: document.getElementById('review_notes_modal').value || null,
        upsell_router: document.getElementById('upsell_router_modal').checked ? 1 : 0,
        upsell_onu: document.getElementById('upsell_onu_modal').checked ? 1 : 0,
        upsell_ups: document.getElementById('upsell_ups_modal').checked ? 1 : 0
    };
    
    try {
        const data = await window.api.submitQualityReview(currentTicketId, formData);
        if (data.success) {
            alert('تم حفظ تقييم الجودة بنجاح');
            loadTicketDetailsForModal(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في حفظ التقييم: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Remove photo for modal
async function removePhotoModal(photoId) {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
        return;
    }
    
    try {
        const data = await window.api.deletePhoto(photoId);
        if (data.success) {
            alert('تم حذف الصورة بنجاح');
            loadTicketDetailsForModal(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في حذف الصورة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Generate message for modal
async function generateMessageModal() {
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    try {
        const data = await window.api.generateMessage(currentTicketId);
        if (data.success) {
            const messageTextarea = document.getElementById('generatedMessageModal');
            const messageSection = document.getElementById('messageSectionModal');
            if (messageTextarea) {
                messageTextarea.value = data.message;
            }
            if (messageSection) {
                messageSection.style.display = 'block';
            }
        }
    } catch (error) {
        alert('خطأ في توليد الرسالة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Copy message for modal
function copyMessageModal() {
    const messageTextarea = document.getElementById('generatedMessageModal');
    if (messageTextarea) {
        messageTextarea.select();
        document.execCommand('copy');
        alert('تم نسخ الرسالة');
    }
}

// Modify showTicketDetails to open modal instead
async function showTicketDetails(ticketId) {
    openTicketDetailsModal(ticketId);
}

// Load photos for view (read-only)
function loadPhotosForView(photos) {
    const photoGrid = document.getElementById('photoGridViewModal');
    if (!photoGrid) return;
    
    photoGrid.innerHTML = '';
    
    if (photos.length === 0) {
        photoGrid.innerHTML = '<p style="color: var(--text-muted);">لا توجد صور</p>';
        return;
    }
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.photo_path}" alt="${photo.photo_type}">
        `;
        photoGrid.appendChild(photoItem);
    });
}

// Load quality review for view (read-only)
function loadQualityReviewForView(review) {
    const statusMap = {
        'answered': 'تم الرد',
        'no_answer': 'لم يرد',
        'closed': 'مغلق'
    };
    document.getElementById('view_contact_status').textContent = statusMap[review.contact_status] || review.contact_status || '-';
    
    const serviceMap = {
        'excellent': 'ممتاز',
        'good': 'جيد',
        'poor': 'رديء'
    };
    document.getElementById('view_service_status').textContent = serviceMap[review.service_status] || review.service_status || '-';
    
    document.getElementById('view_team_rating').textContent = review.team_rating || '-';
    
    const behaviorMap = {
        'excellent': 'ممتاز (+10)',
        'good': 'جيد (+5)',
        'normal': 'طبيعي (0)',
        'bad': 'سيء (-10)'
    };
    document.getElementById('view_behavior_rating').textContent = behaviorMap[review.behavior_rating] || review.behavior_rating || '-';
    
    document.getElementById('view_subscription_amount').textContent = review.subscription_amount ? review.subscription_amount + ' دينار' : '-';
    
    // Upsell
    const upsellItems = [];
    if (review.upsell_router) upsellItems.push('بيع راوتر (+10)');
    if (review.upsell_onu) upsellItems.push('بيع ONU (+10)');
    if (review.upsell_ups) upsellItems.push('بيع UPS (+10)');
    document.getElementById('view_upsell').textContent = upsellItems.length > 0 ? upsellItems.join(', ') : '-';
    
    // Explained services
    const explainedItems = [];
    if (review.explained_sinmana) explainedItems.push('سينمانا');
    if (review.explained_platform) explainedItems.push('منصة');
    if (review.explained_mytv_plus) explainedItems.push('MyTV+');
    if (review.explained_shahid_plus) explainedItems.push('شاهد بلس');
    document.getElementById('view_explained_services').textContent = explainedItems.length > 0 ? explainedItems.join(', ') : '-';
    
    document.getElementById('view_review_notes').textContent = review.review_notes || '-';
}

// Display scores for view
function displayScoresForView(scores) {
    const scoreDisplay = document.getElementById('scoreDisplayViewModal');
    if (!scoreDisplay) return;
    
    const netScore = (scores.positive_points || 0) - (scores.negative_points || 0);
    scoreDisplay.innerHTML = `
        <div class="score-item positive">
            <div class="label">النقاط الموجبة</div>
            <div class="value">+${scores.totalPositive || 0}</div>
        </div>
        <div class="score-item negative">
            <div class="label">النقاط السالبة</div>
            <div class="value">-${scores.totalNegative || 0}</div>
        </div>
        <div class="score-item net">
            <div class="label">النقاط الصافية</div>
            <div class="value">${scores.netScore || 0}</div>
        </div>
    `;
}

// Setup photo upload for new ticket modal
function setupPhotoUploadForNewTicket() {
    const photoUploadArea = document.getElementById('photoUploadAreaNewModal');
    const photoInput = document.getElementById('photoInputNewModal');
    
    if (!photoUploadArea || !photoInput) return;
    
    photoUploadArea.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoUploadArea.style.backgroundColor = 'var(--bg-tertiary)';
    });
    
    photoUploadArea.addEventListener('dragleave', () => {
        photoUploadArea.style.backgroundColor = '';
    });
    
    photoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        photoUploadArea.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            handlePhotoUploadForNewTicket(e.dataTransfer.files);
        }
    });
    
    photoInput.addEventListener('change', (e) => {
        handlePhotoUploadForNewTicket(e.target.files);
    });
}

// Handle photo upload for new ticket
async function handlePhotoUploadForNewTicket(files) {
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    const photoType = document.getElementById('photo_type_new_modal').value;
    if (!photoType) {
        alert('يرجى اختيار نوع الصورة');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo_type', photoType);
    Array.from(files).forEach(file => {
        formData.append('photos', file);
    });
    
    try {
        const data = await window.api.uploadPhotos(currentTicketId, formData);
        if (data.success) {
            alert('تم رفع الصور بنجاح');
            // Reload photos
            const ticketData = await window.api.getTicket(currentTicketId);
            if (ticketData.success) {
                loadPhotosForNewTicket(ticketData.ticket.photos || []);
            }
        }
    } catch (error) {
        alert('خطأ في رفع الصور: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Load photos for new ticket modal
function loadPhotosForNewTicket(photos) {
    const photoGrid = document.getElementById('photoGridNewModal');
    if (!photoGrid) return;
    
    photoGrid.innerHTML = '';
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.photo_path}" alt="${photo.photo_type}">
            <button class="remove-photo" onclick="removePhotoNewModal(${photo.id})">×</button>
        `;
        photoGrid.appendChild(photoItem);
    });
}

// Remove photo for new ticket
async function removePhotoNewModal(photoId) {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
        return;
    }
    
    try {
        const data = await window.api.deletePhoto(photoId);
        if (data.success) {
            alert('تم حذف الصورة بنجاح');
            const ticketData = await window.api.getTicket(currentTicketId);
            if (ticketData.success) {
                loadPhotosForNewTicket(ticketData.ticket.photos || []);
            }
        }
    } catch (error) {
        alert('خطأ في حذف الصورة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Handle quality review submit for new ticket
async function handleQualityReviewSubmitNewModal(e) {
    e.preventDefault();
    
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    const formData = {
        contact_status: document.getElementById('contact_status_new_modal').value,
        service_status: document.getElementById('service_status_new_modal').value,
        team_rating: parseInt(document.getElementById('team_rating_new_modal').value),
        explained_sinmana: document.getElementById('explained_sinmana_new_modal')?.checked ? 1 : 0,
        explained_platform: document.getElementById('explained_platform_new_modal')?.checked ? 1 : 0,
        explained_mytv_plus: document.getElementById('explained_mytv_plus_new_modal')?.checked ? 1 : 0,
        explained_shahid_plus: document.getElementById('explained_shahid_plus_new_modal')?.checked ? 1 : 0,
        explained_health_app: document.getElementById('explained_health_app_new_modal')?.checked ? 1 : 0,
        whatsapp_group_interest: document.getElementById('whatsapp_group_interest_new_modal').checked ? 1 : 0,
        subscription_amount: (() => {
            const value = document.getElementById('subscription_amount_new_modal')?.value;
            if (!value || value.trim() === '') return null;
            // Value is already converted to thousands (multiplied by 1000) in the input field
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return null;
            return numValue; // Already in actual amount (not in thousands)
        })(),
        needs_followup: document.getElementById('needs_followup_new_modal').checked ? 1 : 0,
        followup_reason: document.getElementById('followup_reason_new_modal').value || null,
        review_notes: document.getElementById('review_notes_new_modal').value || null,
        upsell_router: document.getElementById('upsell_router_new_modal').checked ? 1 : 0,
        upsell_onu: document.getElementById('upsell_onu_new_modal').checked ? 1 : 0,
        upsell_ups: document.getElementById('upsell_ups_new_modal').checked ? 1 : 0
    };
    
    try {
        const data = await window.api.submitQualityReview(currentTicketId, formData);
        if (data.success) {
            alert('تم حفظ تقييم الجودة بنجاح');
            // Reload scores
            const ticketData = await window.api.getTicket(currentTicketId);
            if (ticketData.success && ticketData.ticket.scores) {
                displayScoresForNewTicket(ticketData.ticket.scores);
            }
        }
    } catch (error) {
        alert('خطأ في حفظ التقييم: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Display scores for new ticket
function displayScoresForNewTicket(scores) {
    // Use calculateTotalPoints to update the display with current form values
    calculateTotalPoints().catch(err => console.error('Error:', err));
    // Scores section has been removed - points are now shown in header only
}

// Generate message for new ticket
async function generateMessageNewModal() {
    if (!currentTicketId) {
        alert('يجب إدخال التذكرة أولاً');
        return;
    }
    
    try {
        const data = await window.api.generateMessage(currentTicketId);
        if (data.success) {
            const messageTextarea = document.getElementById('generatedMessageNewModal');
            const messageSection = document.getElementById('messageSectionNewModal');
            if (messageTextarea) {
                messageTextarea.value = data.message;
            }
            if (messageSection) {
                messageSection.style.display = 'block';
            }
        }
    } catch (error) {
        alert('خطأ في توليد الرسالة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Copy message for new ticket
function copyMessageNewModal() {
    const messageTextarea = document.getElementById('generatedMessageNewModal');
    if (messageTextarea) {
        messageTextarea.select();
        document.execCommand('copy');
        alert('تم نسخ الرسالة');
    }
}

// Format date time helper (Gregorian/Miladi)
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Convert to Gregorian (Miladi) calendar
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Render checklist based on ticket type
function renderChecklist(ticketTypeName) {
    const container = document.getElementById('checklistContainer');
    const wrapper = document.getElementById('checklistContainerWrapper');
    
    if (!container || !wrapper) return;
    
    // Clear previous checklist
    container.innerHTML = '';
    checklistState = {};
    
    // Map Arabic ticket type name to English key
    const ticketTypeKey = ticketTypeMapping[ticketTypeName] || ticketTypeName;
    console.log('Ticket type name:', ticketTypeName, '-> Key:', ticketTypeKey); // Debug
    
    // Check if checklist exists for this ticket type
    if (!ticketChecklists[ticketTypeKey]) {
        console.warn('No checklist found for key:', ticketTypeKey); // Debug
        wrapper.style.display = 'none';
        calculateChecklistPoints();
        return;
    }
    
    // Show wrapper
    wrapper.style.display = 'block';
    
    // Render checklist items as vertical list
    ticketChecklists[ticketTypeKey].forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'checklist-item';
        
        const label = document.createElement('label');
        label.className = 'checklist-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'check-item';
        checkbox.value = index;
        
        checkbox.addEventListener('change', () => {
            calculateChecklistPoints();
        });
        
        const text = document.createTextNode(item);
        label.appendChild(checkbox);
        label.appendChild(text);
        row.appendChild(label);
        container.appendChild(row);
    });
    
    // Initialize points calculation
    calculateChecklistPoints();
}

// Toggle explained services checklist based on ticket type
function toggleExplainedServices(ticketTypeKey) {
    const wrapper = document.getElementById('explainedServicesWrapper');
    const container = document.getElementById('explainedServicesContainer');
    
    if (!wrapper || !container) return;
    
    // التذاكر التي يجب إظهار الخدمات المشروحة لها: 1 (FTTH_NEW), 2 (REACTIVATE_SERVICE), 7 (ONU_CHANGE)
    const allowedTypes = ['FTTH_NEW', 'REACTIVATE_SERVICE', 'ONU_CHANGE'];
    
    if (allowedTypes.includes(ticketTypeKey)) {
        wrapper.style.display = 'block';
        renderExplainedServicesChecklist(container);
    } else {
        wrapper.style.display = 'none';
        container.innerHTML = '';
        // Reset all checkboxes
        ['explained_sinmana_new_modal', 'explained_platform_new_modal', 'explained_mytv_plus_new_modal', 'explained_shahid_plus_new_modal', 'explained_health_app_new_modal'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });
    }
}

// Render explained services checklist
function renderExplainedServicesChecklist(container) {
    container.innerHTML = '';
    
    const services = [
        { id: 'explained_sinmana_new_modal', label: 'سينمانا' },
        { id: 'explained_platform_new_modal', label: 'منصة' },
        { id: 'explained_mytv_plus_new_modal', label: 'MyTV+' },
        { id: 'explained_shahid_plus_new_modal', label: 'شاهد بلس' },
        { id: 'explained_health_app_new_modal', label: 'تطبيق صحتك تهمنا عبر تطبيق الوطني' }
    ];
    
    services.forEach((service, index) => {
        const row = document.createElement('div');
        row.className = 'checklist-item';
        
        const label = document.createElement('label');
        label.className = 'checklist-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = service.id;
        checkbox.className = 'check-item';
        
        const text = document.createTextNode(service.label);
        label.appendChild(checkbox);
        label.appendChild(text);
        row.appendChild(label);
        container.appendChild(row);
    });
}

// Calculate checklist points
function calculateChecklistPoints() {
    const checkedItems = document.querySelectorAll('#checklistContainer .check-item:checked');
    const points = checkedItems.length;
    
    const qualityPointsEl = document.getElementById('qualityPoints');
    if (qualityPointsEl) {
        qualityPointsEl.textContent = points;
    }
    
    // Note: header points will be updated by calculateTotalPoints() which includes upsell points
    
    // Update total points if function exists
    if (typeof calculateTotalPoints === 'function') {
        calculateTotalPoints().catch(err => console.error('Error:', err));
    }
}

// Calculate total points (includes checklist points)
async function calculateTotalPoints() {
    let timePoints = 0; // Will be calculated from actual time
    const qualityPoints = parseInt(document.getElementById('qualityPoints')?.textContent || '0');
    let upsellPoints = 0; // Will be calculated from upsell checkboxes
    let penaltyPoints = 0; // Will be calculated from penalties
    
    // Get upsell points
    const upsellRouter = document.getElementById('upsell_router_new_modal')?.checked ? 10 : 0;
    const upsellOnu = document.getElementById('upsell_onu_new_modal')?.checked ? 10 : 0;
    const upsellUps = document.getElementById('upsell_ups_new_modal')?.checked ? 10 : 0;
    upsellPoints = upsellRouter + upsellOnu + upsellUps;
    
    // حساب خصم تقييم أداء الفريق
    const teamRatingInput = document.getElementById('team_rating_new_modal');
    if (teamRatingInput && teamRatingInput.value) {
        penaltyPoints = await calculateTeamRatingPenalty(teamRatingInput.value);
    }
    
    const total = timePoints + qualityPoints + upsellPoints - penaltyPoints;
    
    // Update total points display if exists
    const totalPointsEl = document.getElementById('totalPoints');
    if (totalPointsEl) {
        totalPointsEl.textContent = total;
    }
    
    // Update individual points displays
    const timePointsEl = document.getElementById('timePoints');
    if (timePointsEl) timePointsEl.textContent = timePoints;
    
    const qualityPointsDisplayEl = document.getElementById('qualityPointsDisplay');
    if (qualityPointsDisplayEl) qualityPointsDisplayEl.textContent = qualityPoints;
    
    const behaviorPointsEl = document.getElementById('behaviorPoints');
    if (behaviorPointsEl) behaviorPointsEl.textContent = behaviorPoints;
    
    const upsellPointsEl = document.getElementById('upsellPoints');
    if (upsellPointsEl) upsellPointsEl.textContent = upsellPoints;
    
    const penaltyPointsEl = document.getElementById('penaltyPoints');
    if (penaltyPointsEl) penaltyPointsEl.textContent = penaltyPoints;
    
    // Update header points display
    // النقاط المكتسبة = نقاط Checklist + نقاط البيع (Upsell)
    const earnedPoints = qualityPoints + upsellPoints;
    const headerQualityPointsEl = document.getElementById('headerQualityPoints');
    if (headerQualityPointsEl) {
        headerQualityPointsEl.textContent = earnedPoints;
    }
    const headerPenaltyPointsEl = document.getElementById('headerPenaltyPoints');
    if (headerPenaltyPointsEl) {
        headerPenaltyPointsEl.textContent = penaltyPoints;
    }
    
    // النقاط الكلية = النقاط المكتسبة - النقاط المخصومة
    const totalPointsValue = earnedPoints - penaltyPoints;
    const headerTotalPointsEl = document.getElementById('headerTotalPoints');
    if (headerTotalPointsEl) {
        headerTotalPointsEl.textContent = totalPointsValue;
    }
    
    // Note: Scores section has been removed - points are now shown in header only
}

// Load ticket types for edit form
async function loadTicketTypesForEdit() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTicketTypes();
        if (data.success) {
            const select = document.getElementById('edit_ticket_type_id');
            if (!select) return;
            
            select.innerHTML = '<option value="">اختر النوع</option>';
            
            const typeMapping = {
                'ربط جديد FTTH': { name: 'ربط مشترك جديد FTTH', order: 1 },
                'إعادة ربط': { name: 'إعادة مشترك إلى الخدمة', order: 2 },
                'قطع فايبر': { name: 'قطع فايبر', order: 3 },
                'ضعف إشارة RX': { name: 'ضعف إشارة البور RX', order: 4 },
                'تبديل راوتر/ONU': { name: 'تبديل او صيانه راوتر/ONU', order: 999 }
            };
            
            let filteredTypes = data.types.filter(type => 
                type.name_ar !== 'زيارة تسويقية' && 
                type.name_ar !== 'WiFi بدون تمديد'
            );
            
            const priorityTypes = [];
            const otherTypes = [];
            
            filteredTypes.forEach(type => {
                if (typeMapping[type.name_ar]) {
                    priorityTypes.push({
                        ...type,
                        displayName: typeMapping[type.name_ar].name,
                        order: typeMapping[type.name_ar].order
                    });
                } else {
                    otherTypes.push({
                        ...type,
                        displayName: type.name_ar,
                        order: 999
                    });
                }
            });
            
            priorityTypes.sort((a, b) => a.order - b.order);
            const sortedTypes = [...priorityTypes, ...otherTypes];
            
            sortedTypes.forEach((type, index) => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = `${index + 1} - ${type.displayName}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading ticket types for edit:', error);
    }
}

// Load teams for edit form
async function loadTeamsForEdit() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTeams();
        if (data.success) {
            const select = document.getElementById('edit_team_id');
            if (!select) return;
            
            select.innerHTML = '<option value="">اختر الفريق</option>';
            
            data.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                
                let membersText = '';
                if (team.members && team.members.length > 0) {
                    const firstNames = team.members.map(fullName => fullName.split(' ')[0]);
                    membersText = ` (${firstNames.join('/')})`;
                } else if (team.members_names) {
                    const firstNames = team.members_names.split(', ').map(fullName => fullName.split(' ')[0]);
                    membersText = ` (${firstNames.join('/')})`;
                }
                
                if (membersText) {
                    option.className = 'team-with-members';
                }
                option.textContent = team.name + membersText;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading teams for edit:', error);
    }
}

// Populate edit quality review form
function populateEditQualityReviewForm(review) {
    document.getElementById('edit_contact_status').value = review.contact_status || '';
    document.getElementById('edit_service_status').value = review.service_status || '';
    document.getElementById('edit_team_rating').value = review.team_rating || '';
    document.getElementById('edit_behavior_rating').value = review.behavior_rating || '';
    document.getElementById('edit_subscription_amount').value = review.subscription_amount || '';
    document.getElementById('edit_upsell_router').checked = review.upsell_router === 1;
    document.getElementById('edit_upsell_onu').checked = review.upsell_onu === 1;
    document.getElementById('edit_upsell_ups').checked = review.upsell_ups === 1;
    document.getElementById('edit_explained_sinmana').checked = review.explained_sinmana === 1;
    document.getElementById('edit_explained_platform').checked = review.explained_platform === 1;
    document.getElementById('edit_explained_mytv_plus').checked = review.explained_mytv_plus === 1;
    document.getElementById('edit_explained_shahid_plus').checked = review.explained_shahid_plus === 1;
    document.getElementById('edit_whatsapp_group_interest').checked = review.whatsapp_group_interest === 1;
    document.getElementById('edit_needs_followup').checked = review.needs_followup === 1;
    document.getElementById('edit_followup_reason').value = review.followup_reason || '';
    document.getElementById('edit_review_notes').value = review.review_notes || '';
    
    if (review.needs_followup === 1) {
        document.getElementById('editFollowupReasonGroup').style.display = 'block';
    }
}

// Setup edit forms
function setupEditForms(ticketId) {
    // Setup edit ticket form
    const editTicketForm = document.getElementById('editTicketFormModal');
    if (editTicketForm) {
        editTicketForm.onsubmit = (e) => handleEditTicketSubmit(e, ticketId);
    }
    
    // Setup edit quality review form
    const editQualityReviewForm = document.getElementById('editQualityReviewFormModal');
    if (editQualityReviewForm) {
        editQualityReviewForm.onsubmit = (e) => handleEditQualityReviewSubmit(e, ticketId);
    }
    
    // Setup needs_followup checkbox
    const needsFollowupCheckbox = document.getElementById('edit_needs_followup');
    if (needsFollowupCheckbox) {
        needsFollowupCheckbox.addEventListener('change', (e) => {
            const followupGroup = document.getElementById('editFollowupReasonGroup');
            if (followupGroup) {
                followupGroup.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
}

// Handle edit ticket submit
async function handleEditTicketSubmit(e, ticketId) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user || user.role !== 'team_leader') {
        alert('غير مصرح لك بتعديل التذكرة');
        return;
    }
    
    const formData = {
        subscriber_name: document.getElementById('edit_subscriber_name').value || null,
        subscriber_phone: document.getElementById('edit_subscriber_phone').value || null,
        ticket_type_id: parseInt(document.getElementById('edit_ticket_type_id').value) || null,
        team_id: parseInt(document.getElementById('edit_team_id').value) || null
    };
    
    try {
        const data = await window.api.updateTicket(ticketId, formData);
        if (data.success) {
            alert('تم تحديث التذكرة بنجاح');
            loadTicketDetailsForModal(ticketId);
            // Reload tickets list
            if (document.getElementById('tickets-list-page').style.display !== 'none') {
                loadTicketsList();
            }
        }
    } catch (error) {
        alert('خطأ في تحديث التذكرة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Handle edit quality review submit
async function handleEditQualityReviewSubmit(e, ticketId) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user || user.role !== 'team_leader') {
        alert('غير مصرح لك بتعديل تقييم الجودة');
        return;
    }
    
    const formData = {
        contact_status: document.getElementById('edit_contact_status').value,
        service_status: document.getElementById('edit_service_status').value,
        team_rating: parseInt(document.getElementById('edit_team_rating').value),
        behavior_rating: document.getElementById('edit_behavior_rating').value,
        explained_sinmana: document.getElementById('edit_explained_sinmana').checked ? 1 : 0,
        explained_platform: document.getElementById('edit_explained_platform').checked ? 1 : 0,
        explained_mytv_plus: document.getElementById('edit_explained_mytv_plus').checked ? 1 : 0,
        explained_shahid_plus: document.getElementById('edit_explained_shahid_plus').checked ? 1 : 0,
        whatsapp_group_interest: document.getElementById('edit_whatsapp_group_interest').checked ? 1 : 0,
        subscription_amount: document.getElementById('edit_subscription_amount').value || null,
        needs_followup: document.getElementById('edit_needs_followup').checked ? 1 : 0,
        followup_reason: document.getElementById('edit_followup_reason').value || null,
        review_notes: document.getElementById('edit_review_notes').value || null,
        upsell_router: document.getElementById('edit_upsell_router').checked ? 1 : 0,
        upsell_onu: document.getElementById('edit_upsell_onu').checked ? 1 : 0,
        upsell_ups: document.getElementById('edit_upsell_ups').checked ? 1 : 0
    };
    
    try {
        const data = await window.api.submitQualityReview(ticketId, formData);
        if (data.success) {
            alert('تم تحديث تقييم الجودة بنجاح');
            loadTicketDetailsForModal(ticketId);
        }
    } catch (error) {
        alert('خطأ في تحديث تقييم الجودة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Cancel edit ticket
function cancelEditTicket() {
    // Reload ticket details to reset form
    if (currentTicketId) {
        loadTicketDetailsForModal(currentTicketId);
    }
}

// Cancel edit quality review
function cancelEditQualityReview() {
    // Reload ticket details to reset form
    if (currentTicketId) {
        loadTicketDetailsForModal(currentTicketId);
    }
}

// Expose functions to window (openNewTicketModal already assigned at definition)
window.closeNewTicketModal = closeNewTicketModal;
window.openTicketDetailsModal = openTicketDetailsModal;
window.closeTicketDetailsModal = closeTicketDetailsModal;
window.resetFormModal = resetFormModal;
window.removePhotoNewModal = removePhotoNewModal;
window.generateMessageNewModal = generateMessageNewModal;
window.copyMessageNewModal = copyMessageNewModal;
window.cancelEditTicket = cancelEditTicket;
window.cancelEditQualityReview = cancelEditQualityReview;
// ==================== Assign Ticket to Technician ====================
let currentAssigningTicketId = null;

async function showAssignTicketModal(ticketId, teamId) {
    currentAssigningTicketId = ticketId;
    const modal = document.getElementById('assignTicketModal');
    if (!modal) {
        console.error('assignTicketModal not found');
        return;
    }
    
    // تحميل الفنيين
    await loadTechniciansForAssign(teamId);
    
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeAssignTicketModal() {
    const modal = document.getElementById('assignTicketModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    const form = document.getElementById('assignTicketForm');
    if (form) {
        form.reset();
    }
    const select = document.getElementById('assign_technician_id');
    if (select) {
        select.innerHTML = '<option value="">اختر الفني</option>';
    }
    currentAssigningTicketId = null;
}

async function loadTechniciansForAssign(teamId) {
    try {
        const data = await window.api.getTechniciansByTeam(teamId);
        const select = document.getElementById('assign_technician_id');
        if (select && data && data.success) {
            select.innerHTML = '<option value="">اختر الفني</option>';
            data.technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = tech.full_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading technicians:', error);
        alert('خطأ في تحميل الفنيين');
    }
}

// Setup assign ticket form
document.addEventListener('DOMContentLoaded', () => {
    const assignForm = document.getElementById('assignTicketForm');
    if (assignForm) {
        assignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentAssigningTicketId) {
                alert('لم يتم تحديد التذكرة');
                return;
            }
            
            const technicianId = document.getElementById('assign_technician_id').value;
            if (!technicianId) {
                alert('يرجى اختيار الفني');
                return;
            }
            
            try {
                const data = await window.api.assignTicketToTechnician(currentAssigningTicketId, {
                    technician_id: parseInt(technicianId)
                });
                
                if (data && data.success) {
                    alert('✅ ' + (data.message || 'تم إرسال التذكرة للفني بنجاح'));
                    closeAssignTicketModal();
                    loadTicketsList();
                } else {
                    alert('❌ خطأ: ' + (data.error || 'فشل إرسال التذكرة'));
                }
            } catch (error) {
                console.error('Error assigning ticket:', error);
                alert('❌ خطأ في إرسال التذكرة: ' + (error.message || 'خطأ غير معروف'));
            }
        });
    }
});

// ==================== Review Ticket ====================
let currentReviewingTicketId = null;

async function reviewTicket(ticketId) {
    currentReviewingTicketId = ticketId;
    await openTicketDetailsModal(ticketId);
    
    // انتظار تحميل تفاصيل التذكرة ثم إظهار قسم المراجعة
    setTimeout(() => {
        const reviewSection = document.getElementById('reviewSection');
        if (reviewSection) {
            reviewSection.style.display = 'block';
        }
        
        // إعداد event listener لقرار المراجعة
        const decisionSelect = document.getElementById('review_decision');
        if (decisionSelect) {
            // إزالة الـ listeners القديمة
            const newDecisionSelect = decisionSelect.cloneNode(true);
            decisionSelect.parentNode.replaceChild(newDecisionSelect, decisionSelect);
            
            // إضافة listener جديد
            newDecisionSelect.addEventListener('change', function() {
                const followupGroup = document.getElementById('followupReasonGroupReview');
                if (followupGroup) {
                    followupGroup.style.display = this.value === 'followup' ? 'block' : 'none';
                }
            });
        }
    }, 500);
}

function closeReviewSection() {
    const reviewSection = document.getElementById('reviewSection');
    if (reviewSection) {
        reviewSection.style.display = 'none';
    }
    currentReviewingTicketId = null;
}

async function submitReview() {
    if (!currentReviewingTicketId) {
        alert('لم يتم تحديد التذكرة');
        return;
    }
    
    const decision = document.getElementById('review_decision').value;
    if (!decision) {
        alert('يرجى اختيار قرار المراجعة');
        return;
    }
    
    try {
        const followupReason = decision === 'followup' ? document.getElementById('followup_reason_review').value : null;
        
        const data = await window.api.reviewTicket(currentReviewingTicketId, {
            decision: decision,
            followup_reason: followupReason
        });
        
        if (data && data.success) {
            alert('✅ ' + (data.message || 'تم حفظ المراجعة بنجاح'));
            closeReviewSection();
            loadTicketsList();
            closeTicketDetailsModal();
        } else {
            alert('❌ خطأ: ' + (data.error || 'فشل حفظ المراجعة'));
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('❌ خطأ: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Setup review form
document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitReview();
        });
    }
});

// Create Ticket Modal Functions
// Alert Modal Functions
function showAlertModal(title, message, type = 'warning') {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-title');
    const messageEl = document.getElementById('alert-message');
    const iconEl = document.getElementById('alert-icon');
    const okBtn = document.getElementById('alert-ok-btn');
    
    if (!modal || !titleEl || !messageEl || !iconEl) return;
    
    // Set title and message
    titleEl.textContent = title || 'تنبيه';
    messageEl.textContent = message || '';
    
    // Set icon and colors based on type
    const types = {
        'success': { icon: '✅', color: 'var(--success-color)', btnClass: 'btn-success' },
        'error': { icon: '❌', color: 'var(--danger-color)', btnClass: 'btn-danger' },
        'warning': { icon: '⚠️', color: 'var(--warning-color)', btnClass: 'btn-warning' },
        'info': { icon: 'ℹ️', color: 'var(--primary-color)', btnClass: 'btn-primary' }
    };
    
    const typeConfig = types[type] || types['warning'];
    iconEl.textContent = typeConfig.icon;
    iconEl.style.color = typeConfig.color;
    
    // Update button class
    if (okBtn) {
        okBtn.className = `btn ${typeConfig.btnClass}`;
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function closeAlertModal() {
    const modal = document.getElementById('alert-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const alertModal = document.getElementById('alert-modal');
    if (alertModal && e.target === alertModal) {
        closeAlertModal();
    }
});

async function openCreateTicketModal() {
    // Check permissions - only admin and call_center can create tickets
    const user = getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'call_center')) {
        showAlertModal('غير مصرح', 'غير مصرح لك بإنشاء التذاكر. فقط Admin و Call Center يمكنهم إنشاء التذاكر.', 'warning');
        return;
    }
    
    const modal = document.getElementById('create-ticket-modal');
    if (modal) {
        modal.classList.add('active');
        
        // Generate ticket number automatically
        generateTicketNumber();
        
        // Load ticket types only
        await loadTicketTypesForCreateModal();
        
        // Setup form submission
        setupCreateTicketFormSubmission();
        
        // Setup phone validation
        setupCreatePhoneValidation();
        
        // Check notify permission and show/hide notify button
        await checkNotifyPermission();
    }
}

// Check if user has permission to notify technicians and show/hide the notify button
async function checkNotifyPermission() {
    try {
        if (!window.api) return;
        
        // Get current user info from API
        const userData = await window.api.getCurrentUser();
        if (userData && userData.success && userData.user) {
            const user = userData.user;
            const canNotify = user.role === 'admin' || (user.can_notify_technicians === 1 || user.can_notify_technicians === true);
            
            // Show/hide the notify button
            const notifyBtn = document.querySelector('button[onclick="saveTicketAndNotifyQuality()"]');
            if (notifyBtn) {
                if (!canNotify && user.role === 'quality_staff') {
                    notifyBtn.style.display = 'none';
                } else {
                    notifyBtn.style.display = 'inline-block';
                }
            }
        }
    } catch (error) {
        console.error('Error checking notify permission:', error);
    }
}

// Generate automatic ticket number
function generateTicketNumber() {
    const ticketNumberInput = document.getElementById('create_ticket_number');
    if (ticketNumberInput) {
        // Format: TKT-YYYYMMDD-HHMMSS-XXX
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        
        const ticketNumber = `TKT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
        ticketNumberInput.value = ticketNumber;
    }
}

function closeCreateTicketModal() {
    const modal = document.getElementById('create-ticket-modal');
    if (modal) {
        modal.classList.remove('active');
        // Reset form
        document.getElementById('createTicketForm').reset();
    }
}

async function loadTicketTypesForCreateModal() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getTicketTypes();
        if (data && data.success && data.types) {
            const select = document.getElementById('create_ticket_type_id');
            if (select) {
                select.innerHTML = '<option value="">اختر النوع</option>';
                
                // Add all ticket types from database
                data.types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    // Use name_ar if available, otherwise use name
                    option.textContent = type.name_ar || type.name || 'نوع غير معروف';
                    select.appendChild(option);
                });
                
                // Add "مخصص" option at the end
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = 'مخصص';
                select.appendChild(customOption);
            }
        } else {
            console.error('Invalid response from getTicketTypes:', data);
            // Even if API fails, add custom option
            const select = document.getElementById('create_ticket_type_id');
            if (select) {
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = 'مخصص';
                select.appendChild(customOption);
            }
        }
    } catch (error) {
        console.error('Error loading ticket types:', error);
        // Even if error, add custom option
        const select = document.getElementById('create_ticket_type_id');
        if (select) {
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'مخصص';
            select.appendChild(customOption);
        }
    }
}

// Phone validation for create modal
function setupCreatePhoneValidation() {
    const phoneInput = document.getElementById('create_subscriber_phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            // Remove any non-numeric characters
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Limit to 11 digits
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
            
            // Show/hide error
            const errorDiv = document.getElementById('create_subscriber_phone_error');
            if (this.value.length > 0 && this.value.length !== 11) {
                if (errorDiv) {
                    errorDiv.textContent = 'يجب أن يحتوي على 11 رقم بالضبط';
                    errorDiv.style.display = 'block';
                }
                this.style.borderColor = '#dc3545';
            } else {
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                }
                this.style.borderColor = '';
            }
        });
    }
}

// Save ticket only (without notification) - Quality Staff
async function saveTicketOnlyQuality() {
    await createTicketWithNotificationQuality(false);
}

// Save ticket and send notification to technician - Quality Staff
async function saveTicketAndNotifyQuality() {
    await createTicketWithNotificationQuality(true);
}

// Create ticket with optional notification - Quality Staff
async function createTicketWithNotificationQuality(sendNotification = false) {
    // التحقق من الصلاحية إذا كان يريد إرسال تنبيه
    if (sendNotification) {
        try {
            if (!window.api) {
                showAlertModal('خطأ', 'API غير متاح');
                return;
            }
            
            // جلب معلومات المستخدم الحالي
            const currentUser = getCurrentUser();
            if (!currentUser) {
                showAlertModal('خطأ', 'غير قادر على تحديد المستخدم');
                return;
            }
            
            // التحقق من الصلاحية
            const userData = await window.api.getUser(currentUser.id);
            if (!userData || !userData.success || !userData.user) {
                showAlertModal('خطأ', 'غير قادر على جلب معلومات المستخدم');
                return;
            }
            
            const canNotify = userData.user.can_notify_technicians === 1 || userData.user.can_notify_technicians === true;
            if (!canNotify && currentUser.role !== 'admin') {
                showAlertModal('تحذير', 'ليس لديك صلاحية لإرسال تنبيهات للفنيين. يرجى التواصل مع المدير.', 'warning');
                return;
            }
        } catch (error) {
            console.error('Error checking permission:', error);
            showAlertModal('خطأ', 'حدث خطأ أثناء التحقق من الصلاحية', 'error');
            return;
        }
    }
    
    // Validate phone number
    const phone = document.getElementById('create_subscriber_phone')?.value?.trim() || '';
    if (phone && phone.length !== 11) {
        showAlertModal('تحذير', 'يجب أن يحتوي رقم الهاتف على 11 رقم بالضبط', 'warning');
        return;
    }
    
    // Get form values (simplified - only required fields)
    const ticketData = {
        // ticket_number will be auto-generated by server if empty
        ticket_number: document.getElementById('create_ticket_number')?.value?.trim() || null,
        subscriber_name: document.getElementById('create_subscriber_name')?.value?.trim() || '',
        subscriber_phone: phone,
        ticket_type_id: null, // Will be set below
        custom_ticket_type: null, // Will be set below
        region: document.getElementById('create_region')?.value?.trim() || null,
        notes: document.getElementById('create_notes')?.value?.trim() || null,
        send_notification: sendNotification
        // No team_id, technician_id, or time fields - will be set later
    };
    
    // Handle ticket type (regular or custom)
    const ticketTypeSelect = document.getElementById('create_ticket_type_id');
    const selectedType = ticketTypeSelect ? ticketTypeSelect.value : '';
    
    if (selectedType === 'custom') {
        const customType = document.getElementById('create_custom_ticket_type')?.value.trim();
        if (!customType) {
            showAlertModal('تحذير', 'الرجاء إدخال نوع التذكرة المخصص', 'warning');
            return;
        }
        ticketData.custom_ticket_type = customType;
    } else if (selectedType && selectedType !== '') {
        ticketData.ticket_type_id = parseInt(selectedType);
        if (isNaN(ticketData.ticket_type_id)) {
            showAlertModal('تحذير', 'نوع التذكرة غير صحيح', 'warning');
            return;
        }
    } else {
        showAlertModal('تحذير', 'الرجاء اختيار نوع التذكرة', 'warning');
        return;
    }
    
    // Validate required fields
    if (!ticketData.subscriber_name || !ticketData.subscriber_phone) {
        showAlertModal('تحذير', 'الرجاء ملء جميع الحقول المطلوبة (*)', 'warning');
        return;
    }
    
    try {
        const result = await window.api.createTicket(ticketData);
        if (result && result.success) {
            const message = sendNotification 
                ? 'تم إنشاء التذكرة بنجاح وإرسال تنبيه للفني!\nرقم التذكرة: ' + (result.ticket?.ticket_number || 'تم التوليد تلقائياً')
                : 'تم إنشاء التذكرة بنجاح!\nرقم التذكرة: ' + (result.ticket?.ticket_number || 'تم التوليد تلقائياً');
            showAlertModal('نجح', message, 'success');
            closeCreateTicketModal();
            // Reload tickets list based on current page
            const ticketsManagementNewPage = document.getElementById('tickets-management-new-page');
            if (ticketsManagementNewPage && ticketsManagementNewPage.style.display !== 'none') {
                // If we're on the new tickets management page, reload it
                if (typeof loadTicketsManagementNew === 'function') {
                    loadTicketsManagementNew(currentTicketFilterNew || 'NEW');
                }
            } else if (typeof loadTicketsManagement === 'function') {
                // Otherwise reload the old page
                loadTicketsManagement(currentTicketFilter || 'NEW');
            }
        } else {
            showAlertModal('خطأ', result.error || 'فشل إنشاء التذكرة', 'error');
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء إنشاء التذكرة: ' + (error.message || 'خطأ غير معروف'), 'error');
    }
}

function setupCreateTicketFormSubmission() {
    // Form submission is now handled by saveTicketOnlyQuality() and saveTicketAndNotifyQuality()
    // This function is kept for compatibility but form no longer has submit button
}

// Make functions globally accessible
window.saveTicketOnlyQuality = saveTicketOnlyQuality;
window.saveTicketAndNotifyQuality = saveTicketAndNotifyQuality;


window.showTicketDetails = showTicketDetails;
window.generateMessage = generateMessage;
window.copyMessage = copyMessage;
window.resetForm = resetForm;
window.toggleMobileMenu = toggleMobileMenu;
window.showAssignTicketModal = showAssignTicketModal;
window.closeAssignTicketModal = closeAssignTicketModal;
window.reviewTicket = reviewTicket;
window.closeReviewSection = closeReviewSection;
// Handle ticket type change to show/hide custom type input
window.handleTicketTypeChange = function() {
    const ticketTypeSelect = document.getElementById('create_ticket_type_id');
    const customTypeGroup = document.getElementById('create_custom_ticket_type_group');
    const customTypeInput = document.getElementById('create_custom_ticket_type');
    
    if (ticketTypeSelect && customTypeGroup && customTypeInput) {
        if (ticketTypeSelect.value === 'custom') {
            customTypeGroup.style.display = 'block';
            customTypeInput.required = true;
        } else {
            customTypeGroup.style.display = 'none';
            customTypeInput.required = false;
            customTypeInput.value = '';
        }
    }
};

window.openCreateTicketModal = openCreateTicketModal;
window.closeCreateTicketModal = closeCreateTicketModal;
window.showAlertModal = showAlertModal;
window.closeAlertModal = closeAlertModal;

// Export variables to global scope
window.ticketChecklists = ticketChecklists;
window.ticketTypeMapping = ticketTypeMapping;

})();

