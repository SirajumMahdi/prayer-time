// Prayer Times App - Main JavaScript

// ============================================
// Configuration & State
// ============================================
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = {
    Fajr: '🌅',
    Dhuhr: '☀️',
    Asr: '🌤️',
    Maghrib: '🌅',
    Isha: '🌙'
};
const CACHE_KEY = 'prayerTimesCache';
const LOCATION_KEY = 'userLocation';
const THEME_KEY = 'theme';
const NOTIFICATION_KEY = 'notificationSettings';
const SETTINGS_KEY = 'prayerSettings';
const LANG_KEY = 'language';
const TOTAL_QURAN_VERSES = 6236;
const HIJRI_MONTHS_BN = [
    "মুহাররম",
    "সফর",
    "রবিউল আউয়াল",
    "রবিউস সানি",
    "জমাদিউল আউয়াল",
    "জমাদিউস সানি",
    "রজব",
    "শাবান",
    "রমজান",
    "শাওয়াল",
    "জিলকদ",
    "জিলহজ"
];

const TRANSLATIONS = {
    en: {
        appTitle: "Prayer Times",
        locationPermission: "Prayer Times",
        now: "Now",
        remaining: "Remaining",
        timeRemaining: "Time Remaining",
        sehriEnds: "Sehri Ends",
        iftar: "Iftar",
        todaysSchedule: "Today's Schedule",
        fajr: "Fajr",
        dhuhr: "Dhuhr",
        asr: "Asr",
        maghrib: "Maghrib",
        isha: "Isha",
        newVerse: "New Verse",
        changeLocation: "Change Location",
        save: "Save",
        cancel: "Cancel",
        prayerNotifications: "🔔 Prayer Notifications",
        notificationDesc: "Set your preferred notification time for each prayer.",
        enableNotifications: "Enable Notifications",
        to: "to",
        notificationHint: "Leave times empty to skip notification for that prayer.",
        notificationError: "Please enter times within each prayer's window.",
        saveAllSettings: "Save",
        timeForPrayer: "Time for Prayer",
        focusPrayer: "Focus on your prayer",
        settingsTitle: "Settings",
        settingsDesc: "Customize your prayer calculation methods.",
        calcMethod: "Calculation Method",
        asrMethod: "Asr Method",
        standard: "Others",
        hanafi: "Hanafi",
        hijriAdj: "Hijri Date Adjustment",
        hijriAdjHint: "Adjust date by +/- days if needed.",
        saveSettings: "Save Settings"
    },
    bn: {
        appTitle: "নামাজের সময়সূচি",
        locationPermission: "নামাজের সময়সূচি",
        now: "এখন",
        remaining: "বাকি",
        timeRemaining: "বাকি সময়",
        sehriEnds: "সেহরির শেষ সময়",
        iftar: "ইফতার",
        todaysSchedule: "আজকের সময়সূচি",
        fajr: "ফজর",
        dhuhr: "যোহর",
        asr: "আসর",
        maghrib: "মাগরিব",
        isha: "ইশা",
        newVerse: "নতুন আয়াত",
        changeLocation: "অবস্থান পরিবর্তন করুন",
        save: "সংরক্ষণ করুন",
        cancel: "বাতিল করুন",
        prayerNotifications: "🔔 নামাজের নোটিফিকেশন",
        notificationDesc: "প্রতিটি নামাজের জন্য নোটিফিকেশনের সময় নির্ধারণ করুন।",
        enableNotifications: "নোটিফিকেশন চালু করুন",
        to: "থেকে",
        notificationHint: "কোনো নামাজের নোটিফিকেশন না চাইলে সময় খালি রাখুন।",
        notificationError: "অনুগ্রহ করে নামাজের নির্ধারিত সময়সীমার মধ্যে সময় দিন।",
        saveAllSettings: "সেটিংস সংরক্ষণ করুন",
        timeForPrayer: "নামাজের সময় হয়েছে",
        focusPrayer: "নামাজে মনোযোগ দিন",
        settingsTitle: "সেটিংস",
        settingsDesc: "নামাজের সময় গণনার পদ্ধতি কাস্টমাইজ করুন।",
        calcMethod: "গণনার পদ্ধতি",
        asrMethod: "আসর গণনার পদ্ধতি",
        standard: "অন্যান্য",
        hanafi: "হানাফি",
        hijriAdj: "হিজরি তারিখ সমন্বয়",
        hijriAdjHint: "প্রয়োজনে তারিখ ± দিনের মাধ্যমে ঠিক করুন।",
        saveSettings: "সেটিংস সংরক্ষণ করুন"
    }
};


let currentLang = 'en';

let prayerTimes = {};
let countdownInterval = null;
let notificationDismissedFor = null; // Tracks which prayer was dismissed

// ============================================
// Theme Management
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // If user has saved preference, use it; otherwise use system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
    }

    // Update button text
    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.body.classList.contains('dark');
    const themeText = document.querySelector('.theme-text');
    if (themeText) {
        themeText.textContent = isDark ? 'Dark' : 'Light';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    updateThemeButton();
}

// ============================================
// Location Management
// ============================================
function getSavedLocation() {
    const saved = localStorage.getItem(LOCATION_KEY);
    return saved ? JSON.parse(saved) : null;
}

function saveLocation(city, country) {
    localStorage.setItem(LOCATION_KEY, JSON.stringify({ city, country }));
}

async function detectLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );
                    const data = await response.json();
                    resolve({
                        city: data.city || data.locality || 'Unknown',
                        country: data.countryName || 'Unknown'
                    });
                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                    resolve(null);
                }
            },
            () => resolve(null),
            { timeout: 10000 }
        );
    });
}

async function initLocation() {
    const cardLocationDisplay = document.querySelector('#cardLocation');

    let location = getSavedLocation();

    if (!location) {
        if (cardLocationDisplay) cardLocationDisplay.textContent = 'Detecting...';
        location = await detectLocation();

        if (!location) {
            location = { city: 'Dhaka', country: 'Bangladesh' };
        }

        saveLocation(location.city, location.country);
    }

    const locationText = `${location.city}, ${location.country}`;
    if (cardLocationDisplay) cardLocationDisplay.textContent = locationText;
    return location;
}



// ============================================
// Language Management
// ============================================
function initLanguage() {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang && TRANSLATIONS[savedLang]) {
        currentLang = savedLang;
    }
    updateLanguageUI();
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'bn' : 'en';
    localStorage.setItem(LANG_KEY, currentLang);
    updateLanguageUI();
    
    // Refresh displays that might have dynamic content
    if (prayerTimes && Object.keys(prayerTimes).length > 0) {
        updatePrayerTimesDisplay(prayerTimes);
        updateCurrentPrayerCard(prayerTimes);
        updateDateDisplay({ 
             // We need the date object, but it's not stored globally. 
             // We can re-fetch or just wait for next update. 
             // Ideally we store the last date object.
             // For now, let's just trigger what we can.
        });
        // We can re-call loadPrayerTimes() to refresh everything properly including date.
        loadPrayerTimes();
    }
    
    // Always refresh Ayah on language change
    fetchRandomAyah();
}

function getTranslation(key) {
    return TRANSLATIONS[currentLang][key] || key;
}

function updateLanguageUI() {
    // Update toggle button text
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.textContent = currentLang === 'en' ? 'BN' : 'EN';
    }

    // Toggle Font Family based on language
    if (currentLang === 'bn') {
        document.body.classList.remove('font-serif');
        document.body.classList.add('font-bangla');
    } else {
        document.body.classList.remove('font-bangla');
        document.body.classList.add('font-serif');
    }

    // Update all static elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (TRANSLATIONS[currentLang][key]) {
            element.textContent = TRANSLATIONS[currentLang][key];
        }
    });
    
    // Update specific prayer names in settings if needed (though they are static data-i18n now)
}

// ============================================
// Prayer Times API
// ============================================
function getCacheKey(city, country) {
    const date = new Date().toISOString().split('T')[0];
    return `${CACHE_KEY}_${city}_${country}_${date}`;
}

function getCachedPrayerTimes(city, country) {
    const key = getCacheKey(city, country);
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
}

function cachePrayerTimes(city, country, data) {
    const key = getCacheKey(city, country);
    localStorage.setItem(key, JSON.stringify(data));
}

async function fetchPrayerTimes(city, country) {
    const cached = getCachedPrayerTimes(city, country);
    if (cached) {
        return cached;
    }
    
    try {
        const settings = getSettings();
        // Remove adjustment and cache buster from API - we handle adjustment client-side now
        
        const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${settings.method}&school=${settings.school}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            const result = {
                timings: data.data.timings,
                date: data.data.date
            };
            cachePrayerTimes(city, country, result);
            return result;
        }
        throw new Error('API returned error');
    } catch (error) {
        console.error('Failed to fetch prayer times:', error);
        return null;
    }
}

// ============================================
// Time Utilities
// ============================================
function parseTime(timeString) {
    const cleanTime = timeString.split(' ')[0];
    const [hours, minutes] = cleanTime.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
}

function formatCountdown(ms) {
    if (ms < 0) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const result = [hours, minutes, seconds]
        .map(n => n.toString().padStart(2, '0'))
        .join(':');
        
    return localizeNumber(result);
}

function formatTime12h_OLD(date) { // Keeping original as backup or reference if needed, but overridden above
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function getCurrentPrayer(timings) {
    const now = new Date();
    
    // Check each prayer in reverse order to find current one
    for (let i = PRAYER_NAMES.length - 1; i >= 0; i--) {
        const prayerName = PRAYER_NAMES[i];
        const prayerTime = parseTime(timings[prayerName]);
        
        if (now >= prayerTime) {
            // Get the end time (which is the start of next prayer)
            const nextIndex = (i + 1) % PRAYER_NAMES.length;
            const nextPrayerName = PRAYER_NAMES[nextIndex];
            let endTime = parseTime(timings[nextPrayerName]);
            
            // If next prayer is Fajr (after Isha), add a day
            if (nextIndex === 0) {
                endTime.setDate(endTime.getDate() + 1);
            }
            
            return {
                name: prayerName,
                startTime: prayerTime,
                endTime: endTime,
                icon: PRAYER_ICONS[prayerName]
            };
        }
    }
    
    // Before Fajr - still in previous Isha time
    const ishaTime = parseTime(timings.Isha);
    ishaTime.setDate(ishaTime.getDate() - 1);
    const fajrTime = parseTime(timings.Fajr);
    
    return {
        name: 'Isha',
        startTime: ishaTime,
        endTime: fajrTime,
        icon: PRAYER_ICONS.Isha
    };
}

function getNextPrayer(timings) {
    const now = new Date();
    
    for (const name of PRAYER_NAMES) {
        const prayerTime = parseTime(timings[name]);
        if (prayerTime > now) {
            return { 
                name, 
                time: prayerTime,
                icon: PRAYER_ICONS[name]
            };
        }
    }
    
    // All prayers passed, next is Fajr tomorrow
    const fajrTomorrow = parseTime(timings.Fajr);
    fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
    return { 
        name: 'Fajr', 
        time: fajrTomorrow,
        icon: PRAYER_ICONS.Fajr
    };
}

// ============================================
// UI Updates
// ============================================
function updateDateDisplay(dateData) {
    const gregorianEl = document.getElementById('gregorianDate');
    const hijriEl = document.getElementById('hijriDate');
    
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const today = new Date();
    // Use currentLang for locale if supported, otherwise default to English for date format
    const locale = currentLang === 'bn' ? 'bn-BD' : 'en-US';
    gregorianEl.textContent = today.toLocaleDateString(locale, options);
    
    if (dateData && dateData.hijri) {
        let hijri = { ...dateData.hijri }; // Clone to avoid mutating original cache if needed
        
        // Apply Client-Side Adjustment
        const settings = getSettings();
        const adjustment = parseInt(settings.adjustment) || 0;
        
        if (adjustment !== 0) {
            let day = parseInt(hijri.day);
            let month = parseInt(hijri.month.number);
            let year = parseInt(hijri.year);
            
            day += adjustment;
            
            // Simple month overflow handling (assuming 30 days for simplicity as requested)
            if (day > 30) {
                day -= 30;
                month += 1;
                if (month > 12) {
                    month = 1;
                    year += 1;
                }
            } else if (day < 1) {
                day += 30;
                month -= 1;
                if (month < 1) {
                    month = 12;
                    year -= 1;
                }
            }
            
            hijri.day = day.toString();
            hijri.month.number = month;
            // Update English month name if changed? 
            // The API returns English name. We rely on month number for BN translation.
            // For English display, we might get mismatch if month changed. 
            // Let's rely on BN translation logic or keep old English name if we don't have a map.
            // However, since we have HIJRI_MONTHS_BN, we can allow BN to work. 
            // For English, strictly speaking, we'd need an English array too if month changed.
        }

        let monthName = hijri.month.en;
        
        // Use month number for robust translation (1-based index)
        if (currentLang === 'bn' && hijri.month.number) {
            const monthIndex = parseInt(hijri.month.number) - 1;
            if (monthIndex >= 0 && monthIndex < HIJRI_MONTHS_BN.length) {
                monthName = HIJRI_MONTHS_BN[monthIndex];
            }
        }
        
        // Localize numbers for Hijri
        const day = localizeNumber(hijri.day);
        const year = localizeNumber(hijri.year);
        
        hijriEl.textContent = `${day} ${monthName} ${year} AH`;
    }
}

function updatePrayerTimesDisplay(timings) {
    const now = new Date();
    const currentPrayer = getCurrentPrayer(timings);
    
    PRAYER_NAMES.forEach((name, index) => {
        const row = document.getElementById(name.toLowerCase());
        const startEl = row.querySelector('.prayer-start');
        const endEl = row.querySelector('.prayer-end');
        const statusEl = row.querySelector('.prayer-status');
        const prayerTime = parseTime(timings[name]);
        
        // Get end time (start of next prayer)
        const nextIndex = (index + 1) % PRAYER_NAMES.length;
        const nextPrayerName = PRAYER_NAMES[nextIndex];
        let endTime = parseTime(timings[nextPrayerName]);
        
        // If next prayer is Fajr (after Isha), it's tomorrow
        if (nextIndex === 0) {
            endTime.setDate(endTime.getDate() + 1);
        }
        
        startEl.textContent = formatTime12h(prayerTime);
        // endEl.textContent = formatTime12h(endTime); // Removed as per request
        
        row.classList.remove('current', 'passed');
        statusEl.textContent = '';
        statusEl.className = 'prayer-status w-6 h-6 rounded-full flex items-center justify-center text-xs';
        
        if (name === currentPrayer.name) {
            row.classList.add('current');
            statusEl.textContent = '●';
        } else if (prayerTime < now && name !== currentPrayer.name) {
            row.classList.add('passed');
            statusEl.textContent = '✓';
        }
    });
}

function updateCurrentPrayerCard(timings) {
    const current = getCurrentPrayer(timings);
    const now = new Date();
    const remaining = current.endTime - now;

    document.getElementById('currentPrayerName').textContent = getTranslation(current.name.toLowerCase()) || current.name;
    document.getElementById('currentPrayerCountdown').textContent = formatCountdown(remaining);
    
    // Update current prayer time display
    const timeEl = document.getElementById('currentPrayerTime');
    if (timeEl) {
        // Localize "Started at"
        const timeStr = formatTime12h(current.startTime);
        timeEl.textContent = currentLang === 'bn' 
            ? `${timeStr}-এ শুরু হয়েছে` 
            : `Started at ${timeStr}`;
    }

    // Update sticky header
    document.getElementById('headerPrayerName').textContent = getTranslation(current.name.toLowerCase()) || current.name;
    document.getElementById('headerCountdown').textContent = formatCountdown(remaining);

    // Update progress
    const totalDuration = current.endTime - current.startTime;
    const elapsed = now - current.startTime;
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    // Update SVG semi-circle progress in card
    const svgProgress = document.getElementById('currentPrayerProgress');
    if (svgProgress) {
        const dashArray = 251.2;
        const offset = dashArray - (dashArray * (progress / 100));
        svgProgress.style.strokeDashoffset = offset;
    }

    // Update linear progress bar in timeline list
    const currentRow = document.getElementById(current.name.toLowerCase());
    if (currentRow) {
        const progressBar = currentRow.querySelector('.prayer-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
}



function updateSehriIftar(timings) {
    document.getElementById('sehriTime').textContent = formatTime12h(parseTime(timings.Fajr));
    document.getElementById('iftarTime').textContent = formatTime12h(parseTime(timings.Maghrib));
}

function startCountdown(timings) {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Update immediately
    updateCurrentPrayerCard(timings);
    updatePrayerTimesDisplay(timings);
    
    // Update every second
    countdownInterval = setInterval(() => {
        updateCurrentPrayerCard(timings);
        
        // Check if prayer time changed
        const now = new Date();
        const current = getCurrentPrayer(timings);
        const next = getNextPrayer(timings);
        if (Math.abs(next.time.getTime() - now.getTime()) < 1000) {
            updatePrayerTimesDisplay(timings);
        }
    }, 1000);
}

// ============================================
// Quran Ayah
// ============================================
async function fetchRandomAyah() {
    const loader = document.getElementById('ayahLoader');
    const content = document.getElementById('ayahContent');
    
    loader.classList.remove('hidden');
    content.classList.add('hidden');
    
    try {
        const verseNumber = Math.floor(Math.random() * TOTAL_QURAN_VERSES) + 1;
        // Use 'bn.bengali' for Bangla, 'en.sahih' for English
        const edition = currentLang === 'bn' ? 'bn.bengali' : 'en.sahih';
        const url = `https://api.alquran.cloud/v1/ayah/${verseNumber}/editions/quran-uthmani,${edition}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            const arabicData = data.data[0];
            const translationData = data.data[1];
            
            document.getElementById('arabicText').textContent = arabicData.text;
            document.getElementById('englishText').textContent = `"${translationData.text}"`;
            
            // Translate Surah name if possible, or just used the returned englishName for now.
            // The API returns 'englishName' and 'englishNameTranslation'. 
            // For Bangla, the 'edition' helps with the text, but metadata might still be in English unless we fetch a different endpoint.
            // However, let's stick to translating numbers at least.
            const surahName = translationData.surah.englishName; // We might need a map for Surah names if we want full translation
            const surahNum = localizeNumber(translationData.surah.number);
            const verseNum = localizeNumber(translationData.numberInSurah);

            document.getElementById('ayahReference').textContent = 
                `— ${surahName} ${surahNum}:${verseNum}`;
            
            loader.classList.add('hidden');
            content.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to fetch ayah:', error);
        loader.innerHTML = '<p class="text-red-400">Failed to load verse</p>';
    }
}

// ============================================
// Location Form Handling
// ============================================
function showLocationForm() {
    document.getElementById('locationForm').classList.remove('hidden');
}

function hideLocationForm() {
    document.getElementById('locationForm').classList.add('hidden');
}

async function handleLocationSave() {
    const city = document.getElementById('cityInput').value.trim();
    const country = document.getElementById('countryInput').value.trim();

    if (!city || !country) {
        alert('Please enter both city and country');
        return;
    }

    saveLocation(city, country);
    
    // Update display
    const cardLocationDisplay = document.querySelector('#cardLocation');
    if (cardLocationDisplay) cardLocationDisplay.textContent = `${city}, ${country}`;
    
    // Reload prayer times for new location
    loadPrayerTimes();
}

// ============================================
// Notification System
// ============================================
function getNotificationSettings() {
    const defaultSettings = {
        enabled: true,
        prayers: {
            Fajr: { start: '', end: '' },
            Dhuhr: { start: '', end: '' },
            Asr: { start: '', end: '' },
            Maghrib: { start: '', end: '' },
            Isha: { start: '', end: '' }
        }
    };
    
    const saved = localStorage.getItem(NOTIFICATION_KEY);
    if (!saved) return defaultSettings;
    
    try {
        const parsed = JSON.parse(saved);
        // Safely merge with defaults to handle old/incomplete data
        return {
            enabled: parsed.enabled !== undefined ? parsed.enabled : defaultSettings.enabled,
            prayers: {
                Fajr: { ...defaultSettings.prayers.Fajr, ...(parsed.prayers?.Fajr || {}) },
                Dhuhr: { ...defaultSettings.prayers.Dhuhr, ...(parsed.prayers?.Dhuhr || {}) },
                Asr: { ...defaultSettings.prayers.Asr, ...(parsed.prayers?.Asr || {}) },
                Maghrib: { ...defaultSettings.prayers.Maghrib, ...(parsed.prayers?.Maghrib || {}) },
                Isha: { ...defaultSettings.prayers.Isha, ...(parsed.prayers?.Isha || {}) }
            }
        };
    } catch (e) {
        console.error('Failed to parse notification settings:', e);
        return defaultSettings;
    }
}

function saveNotificationSettingsToStorage(settings) {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(settings));
}

function formatTimeFor24h(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Format time with Bengali numerals if selected language is Bangla
function formatTime12h(date) {
    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    if (currentLang === 'bn') {
        return time
            .replace('AM', '') 
            .replace('PM', '')
            .trim()
            .replace(/0/g, '০').replace(/1/g, '১').replace(/2/g, '২').replace(/3/g, '৩').replace(/4/g, '৪')
            .replace(/5/g, '৫').replace(/6/g, '৬').replace(/7/g, '৭').replace(/8/g, '৮').replace(/9/g, '৯');
    }
    return time;
}

// Helper to convert English numbers to Bengali if needed for countdown
function localizeNumber(numStr) {
    if (currentLang !== 'bn') return numStr;
    return numStr.toString()
        .replace(/0/g, '০').replace(/1/g, '১').replace(/2/g, '২').replace(/3/g, '৩').replace(/4/g, '৪')
        .replace(/5/g, '৫').replace(/6/g, '৬').replace(/7/g, '৭').replace(/8/g, '৮').replace(/9/g, '৯');
}

function parseTimeInput(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
}

function getPrayerEndTime(prayerName, timings) {
    const prayerIndex = PRAYER_NAMES.indexOf(prayerName);
    const nextIndex = (prayerIndex + 1) % PRAYER_NAMES.length;
    const nextPrayerName = PRAYER_NAMES[nextIndex];
    let endTime = parseTime(timings[nextPrayerName]);
    
    // If next prayer is Fajr (after Isha), it's tomorrow
    if (nextIndex === 0) {
        endTime.setDate(endTime.getDate() + 1);
    }
    return endTime;
}

function showNotificationSettings() {
    const settings = getNotificationSettings();
    document.getElementById('notificationEnabled').checked = settings.enabled;
    
    // Update each prayer's time window and inputs
    if (prayerTimes && Object.keys(prayerTimes).length > 0) {
        PRAYER_NAMES.forEach(name => {
            const startTime = parseTime(prayerTimes[name]);
            const endTime = getPrayerEndTime(name, prayerTimes);
            
            // Format times for min/max attributes (24h format)
            const minTime = formatTimeFor24h(startTime);
            const maxTime = formatTimeFor24h(endTime);
            
            // Update window display
            const windowEl = document.getElementById(`${name.toLowerCase()}Window`);
            if (windowEl) {
                windowEl.textContent = `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;
            }
            
            // Populate saved values and set min/max limits
            const prayerSettings = settings.prayers[name] || { start: '', end: '' };
            const startInput = document.getElementById(`${name.toLowerCase()}Start`);
            const endInput = document.getElementById(`${name.toLowerCase()}End`);
            
            if (startInput) {
                startInput.min = minTime;
                startInput.max = maxTime;
                startInput.value = prayerSettings.start || '';
            }
            if (endInput) {
                endInput.min = minTime;
                endInput.max = maxTime;
                endInput.value = prayerSettings.end || '';
            }
        });
    }
    
    document.getElementById('notificationSettings').classList.remove('hidden');
}

function hideNotificationSettings() {
    document.getElementById('notificationSettings').classList.add('hidden');
}

function saveNotificationSettings() {
    const prayers = {};
    let hasInvalid = false;
    
    // Clear previous errors
    const globalError = document.getElementById('notificationError');
    if (globalError) globalError.classList.add('hidden');
    
    PRAYER_NAMES.forEach(name => {
        const startInput = document.getElementById(`${name.toLowerCase()}Start`);
        const endInput = document.getElementById(`${name.toLowerCase()}End`);
        if (startInput) startInput.classList.remove('border-red-500');
        if (endInput) endInput.classList.remove('border-red-500');
    });
    
    PRAYER_NAMES.forEach(name => {
        const startInput = document.getElementById(`${name.toLowerCase()}Start`);
        const endInput = document.getElementById(`${name.toLowerCase()}End`);
        
        let startVal = startInput ? startInput.value : '';
        let endVal = endInput ? endInput.value : '';
        let prayerInvalid = false;
        
        // Validate times are within prayer window
        if (prayerTimes && (startVal || endVal)) {
            const prayerStart = parseTime(prayerTimes[name]);
            const prayerEnd = getPrayerEndTime(name, prayerTimes);
            const minTime = formatTimeFor24h(prayerStart);
            const maxTime = formatTimeFor24h(prayerEnd);
            
            // Check if start time is valid
            if (startVal && (startVal < minTime || startVal > maxTime)) {
                if (startInput) startInput.classList.add('border-red-500');
                prayerInvalid = true;
            }
            
            // Check if end time is valid
            if (endVal && (endVal < minTime || endVal > maxTime)) {
                if (endInput) endInput.classList.add('border-red-500');
                prayerInvalid = true;
            }
            
            // Ensure start is before end
            if (startVal && endVal && startVal > endVal) {
                if (endInput) endInput.classList.add('border-red-500');
                prayerInvalid = true;
            }
            
            if (prayerInvalid) {
                hasInvalid = true;
            }
        }
        
        prayers[name] = {
            start: prayerInvalid ? '' : startVal,
            end: prayerInvalid ? '' : endVal
        };
    });
    
    if (hasInvalid) {
        if (globalError) globalError.classList.remove('hidden');
        return; // Don't close modal, let user fix
    }
    
    const settings = {
        enabled: document.getElementById('notificationEnabled').checked,
        prayers: prayers
    };
    
    saveNotificationSettingsToStorage(settings);
    hideNotificationSettings();
    scheduleNextNotificationCheck(); // Reschedule with new settings
}

// ============================================
// General Settings System
// ============================================
function getSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : {
        method: 1, // Karachi (Default for BD)
        school: 1, // Hanafi (Default for BD)
        adjustment: 0
    };
}

function saveSettingsToStorage(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function showSettings() {
    const settings = getSettings();
    
    // Set Calculation Method
    const methodSelect = document.getElementById('calcMethod');
    if (methodSelect) methodSelect.value = settings.method;
    
    // Set Asr School
    const schoolRadios = document.getElementsByName('asrMethod');
    schoolRadios.forEach(radio => {
        radio.checked = parseInt(radio.value) === settings.school;
    });
    
    // Set Adjustment
    const adjInput = document.getElementById('hijriAdj');
    if (adjInput) adjInput.value = settings.adjustment;
    
    document.getElementById('settingsModal').classList.remove('hidden');
}

function hideSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
    const method = parseInt(document.getElementById('calcMethod').value);
    
    let school = 0;
    document.getElementsByName('asrMethod').forEach(radio => {
        if (radio.checked) school = parseInt(radio.value);
    });
    
    const adjustment = parseInt(document.getElementById('hijriAdj').value);
    
    saveSettingsToStorage({ method, school, adjustment });
    hideSettings();
    
    // Clear cache to force re-fetch with new settings
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
            localStorage.removeItem(key);
        }
    });
    
    loadPrayerTimes(); // Refresh data with new settings
}

let notificationCountdownInterval = null;

function updateNotificationCountdown(endTime) {
    const countdownEl = document.getElementById('notificationCountdown');
    if (!countdownEl) return;
    
    const now = new Date();
    const diff = endTime - now;
    
    if (diff <= 0) {
        countdownEl.textContent = '0:00';
        return;
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showPrayerNotification(prayerName, icon, notificationEndTime) {
    document.getElementById('notificationPrayerName').textContent = getTranslation(prayerName.toLowerCase()) || prayerName;
    document.getElementById('notificationIcon').textContent = icon;
    
    // Start countdown timer
    updateNotificationCountdown(notificationEndTime);
    if (notificationCountdownInterval) clearInterval(notificationCountdownInterval);
    notificationCountdownInterval = setInterval(() => {
        updateNotificationCountdown(notificationEndTime);
    }, 1000);
    
    document.getElementById('prayerNotification').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hidePrayerNotification() {
    if (notificationCountdownInterval) {
        clearInterval(notificationCountdownInterval);
        notificationCountdownInterval = null;
    }
    document.getElementById('prayerNotification').classList.add('hidden');
    document.body.style.overflow = '';
}

function dismissNotification() {
    const current = getCurrentPrayer(prayerTimes);
    notificationDismissedFor = current.name;
    hidePrayerNotification();
}

function checkNotificationTrigger(timings) {
    const settings = getNotificationSettings();
    if (!settings.enabled) return;

    const now = new Date();
    const current = getCurrentPrayer(timings);
    
    // Don't show if already dismissed for this prayer
    if (notificationDismissedFor === current.name) return;
    
    // Get settings for the current prayer
    const prayerSettings = settings.prayers[current.name];
    if (!prayerSettings || !prayerSettings.start || !prayerSettings.end) return;
    
    // Parse the user's notification window for this prayer
    const notificationStart = parseTimeInput(prayerSettings.start);
    const notificationEnd = parseTimeInput(prayerSettings.end);
    
    if (!notificationStart || !notificationEnd) return;
    
    // Check if we're within the notification window AND within the current prayer time
    const inNotificationWindow = now >= notificationStart && now <= notificationEnd;
    const inPrayerWindow = now >= current.startTime && now < current.endTime;
    
    if (inNotificationWindow && inPrayerWindow) {
        showPrayerNotification(current.name, current.icon, notificationEnd);
    } else {
        // Hide notification if we're outside the window
        const notificationEl = document.getElementById('prayerNotification');
        if (!notificationEl.classList.contains('hidden')) {
            hidePrayerNotification();
        }
    }
    
    // Reset dismissed prayer when prayer changes
    if (notificationDismissedFor && notificationDismissedFor !== current.name) {
        notificationDismissedFor = null;
    }
}

// ============================================
// Smart Notification Scheduling
// ============================================
let notificationCheckTimeout = null;

function scheduleNextNotificationCheck() {
    if (notificationCheckTimeout) clearTimeout(notificationCheckTimeout);
    
    // Default check interval if no urgent events (e.g. 1 minute)
    let timeToWait = 60000;
    
    const settings = getNotificationSettings();
    if (!settings.enabled || !prayerTimes) {
        notificationCheckTimeout = setTimeout(() => {
            scheduleNextNotificationCheck();
        }, timeToWait);
        return;
    }
    
    const now = new Date();
    let nextEventTime = null;
    let minDiff = Infinity;
    
    // Check all prayers to find the soonest notification start or end time
    PRAYER_NAMES.forEach(name => {
        const prayerSettings = settings.prayers[name];
        if (!prayerSettings || !prayerSettings.start || !prayerSettings.end) return;
        
        const start = parseTimeInput(prayerSettings.start);
        const end = parseTimeInput(prayerSettings.end);
        
        if (!start || !end) return;
        
        // Check start time
        if (start > now && (start - now) < minDiff) {
            minDiff = start - now;
            nextEventTime = start;
        }
        
        // Check end time (to close notification)
        if (end > now && (end - now) < minDiff) {
            minDiff = end - now;
            nextEventTime = end;
        }
    });

    // If we have a specific next event, wait until then (plus small buffer)
    if (nextEventTime) {
        timeToWait = Math.max(0, nextEventTime - now) + 100; // +100ms buffer
    } else {
        // If all times are past for today, check again tomorrow/later
        // For simplicity, we'll check every minute to catch day rollovers
        timeToWait = 60000;
    }
    
    // Log for debugging
    // console.log(`Next notification check in ${(timeToWait/1000).toFixed(1)}s`);

    notificationCheckTimeout = setTimeout(() => {
        checkNotificationTrigger(prayerTimes);
        scheduleNextNotificationCheck(); // Recurse
    }, timeToWait);
}

// Update checkNotificationTrigger to remove the old manual logic if any
// (No changes needed inside checkNotificationTrigger logic itself, just calling scheduleNextNotificationCheck at the end is handled by the timeout callback wrapper above)


// ============================================
// Main Initialization
// ============================================
async function loadPrayerTimes() {
    const location = getSavedLocation() || { city: 'Dhaka', country: 'Bangladesh' };
    const data = await fetchPrayerTimes(location.city, location.country);
    
    if (data) {
        prayerTimes = data.timings;
        updateDateDisplay(data.date);
        updatePrayerTimesDisplay(prayerTimes);
        updateSehriIftar(prayerTimes);
        startCountdown(prayerTimes);
        
        // Start/Update the smart scheduler whenever prayer times are loaded
        scheduleNextNotificationCheck();
    }
}


async function init() {
    initTheme();
    initLanguage(); // Initialize language
    
    // Event listeners - Initialize early to ensure UI is responsive
    const safeAddListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
        else console.warn(`Element ${id} not found`);
    };

    safeAddListener('themeToggle', 'click', toggleTheme);
    safeAddListener('langToggle', 'click', toggleLanguage);
    safeAddListener('newAyahBtn', 'click', fetchRandomAyah);
    safeAddListener('changeLocationBtn', 'click', showLocationForm);
    safeAddListener('cancelLocationBtn', 'click', hideLocationForm);
    safeAddListener('saveLocationBtn', 'click', handleLocationSave);
    
    // Notification event listeners
    safeAddListener('notificationSettingsBtn', 'click', showNotificationSettings);
    safeAddListener('dismissNotification', 'click', dismissNotification);
    
    // General Settings listeners
    safeAddListener('settingsBtn', 'click', showSettings);
    
    // Calendar event listeners
    safeAddListener('calendarBtn', 'click', showCalendar);
    safeAddListener('prevMonth', 'click', () => navigateMonth(-1));
    safeAddListener('nextMonth', 'click', () => navigateMonth(1));
    safeAddListener('downloadCalendar', 'click', downloadCalendar);
    
    // Stats event listeners
    safeAddListener('statsBtn', 'click', showStatsModal);
    safeAddListener('resetStats', 'click', resetPrayerStats);
    
    // Prayer tracking - add click handlers to all prayer track buttons
    document.querySelectorAll('.prayer-track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const prayer = btn.dataset.prayer;
            togglePrayerCompletion(prayer);
        });
    });
    
    document.getElementById('hijriInc')?.addEventListener('click', () => {
        const input = document.getElementById('hijriAdj');
        if(input) input.value = parseInt(input.value) + 1;
    });
    
    document.getElementById('hijriDec')?.addEventListener('click', () => {
        const input = document.getElementById('hijriAdj');
        if(input) input.value = parseInt(input.value) - 1;
    });

    document.getElementById('countryInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLocationSave();
    });

    // Async Data Loading
    await initLocation();
    await loadPrayerTimes();
    await fetchRandomAyah();
    
    // Load prayer tracking state for today
    updatePrayerTrackingUI();
    
    // Initial scheduler start is handled in loadPrayerTimes when data is ready
    
    // Scroll Observer for Sticky Header content
    const headerPrayerInfo = document.getElementById('headerPrayerInfo');
    const currentPrayerCard = document.getElementById('currentPrayerCard');

    if (headerPrayerInfo && currentPrayerCard) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Card visible: Hide header info
                    headerPrayerInfo.classList.add('opacity-0', 'pointer-events-none');
                    headerPrayerInfo.classList.remove('opacity-100');
                } else {
                    // Card hidden: Show header info
                    headerPrayerInfo.classList.remove('opacity-0', 'pointer-events-none');
                    headerPrayerInfo.classList.add('opacity-100');
                }
            });
        }, { threshold: 0.1 });

        observer.observe(currentPrayerCard);
    }
}

// ============================================
// Prayer Tracking System
// ============================================
const PRAYER_LOG_KEY = 'prayer_log';

function getTodayDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
}

function getPrayerLog() {
    const saved = localStorage.getItem(PRAYER_LOG_KEY);
    return saved ? JSON.parse(saved) : {};
}

function savePrayerLog(log) {
    localStorage.setItem(PRAYER_LOG_KEY, JSON.stringify(log));
}

function togglePrayerCompletion(prayerName) {
    const dateKey = getTodayDateKey();
    const log = getPrayerLog();
    
    if (!log[dateKey]) {
        log[dateKey] = {};
    }
    
    // Toggle the prayer completion
    log[dateKey][prayerName] = !log[dateKey][prayerName];
    
    savePrayerLog(log);
    updatePrayerTrackingUI();
}

function updatePrayerTrackingUI() {
    const dateKey = getTodayDateKey();
    const log = getPrayerLog();
    const todayLog = log[dateKey] || {};
    
    document.querySelectorAll('.prayer-track-btn').forEach(btn => {
        const prayer = btn.dataset.prayer;
        if (todayLog[prayer]) {
            btn.classList.add('completed');
        } else {
            btn.classList.remove('completed');
        }
    });
}

function calculateStreak() {
    const log = getPrayerLog();
    const dates = Object.keys(log).sort().reverse();
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if all 5 prayers were completed on each day
    for (let i = 0; i < dates.length; i++) {
        const dateLog = log[dates[i]];
        const completedCount = PRAYER_NAMES.filter(p => dateLog[p]).length;
        
        if (completedCount === 5) {
            tempStreak++;
            
            // Check if this is for current streak (consecutive from today)
            const checkDate = new Date(dates[i]);
            checkDate.setHours(0, 0, 0, 0);
            
            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);
            
            if (checkDate.getTime() === expectedDate.getTime()) {
                currentStreak = tempStreak;
            }
        } else {
            tempStreak = 0;
        }
        
        bestStreak = Math.max(bestStreak, tempStreak);
    }
    
    return { currentStreak, bestStreak };
}

function getWeeklyStats() {
    const log = getPrayerLog();
    const stats = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        
        const dayLog = log[dateKey] || {};
        const completed = PRAYER_NAMES.filter(p => dayLog[p]).length;
        
        stats.push({
            date: dateKey,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            completed: completed
        });
    }
    
    return stats;
}

function getMonthlyCount() {
    const log = getPrayerLog();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let total = 0;
    
    Object.keys(log).forEach(dateKey => {
        const date = new Date(dateKey);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const dayLog = log[dateKey];
            total += PRAYER_NAMES.filter(p => dayLog[p]).length;
        }
    });
    
    return total;
}

function showStatsModal() {
    const { currentStreak, bestStreak } = calculateStreak();
    const weeklyStats = getWeeklyStats();
    const monthlyCount = getMonthlyCount();
    const todayLog = getPrayerLog()[getTodayDateKey()] || {};
    const todayCount = PRAYER_NAMES.filter(p => todayLog[p]).length;
    
    // Update streak displays
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('bestStreak').textContent = bestStreak;
    
    // Update today's progress
    document.getElementById('todayCount').textContent = `${todayCount}/5`;
    document.getElementById('todayProgressBar').style.width = `${(todayCount / 5) * 100}%`;
    
    // Update weekly chart
    const chartEl = document.getElementById('weeklyChart');
    const labelsEl = document.getElementById('weeklyLabels');
    chartEl.innerHTML = '';
    labelsEl.innerHTML = '';
    
    weeklyStats.forEach(day => {
        const barContainer = document.createElement('div');
        barContainer.className = 'flex-1 flex flex-col items-center';
        
        const bar = document.createElement('div');
        bar.className = `stats-bar ${day.completed === 0 ? 'empty' : ''}`;
        bar.style.height = `${(day.completed / 5) * 100}%`;
        bar.style.minHeight = day.completed > 0 ? '4px' : '2px';
        
        barContainer.appendChild(bar);
        chartEl.appendChild(barContainer);
        
        const label = document.createElement('div');
        label.className = 'stats-label flex-1';
        label.textContent = day.dayName;
        labelsEl.appendChild(label);
    });
    
    // Update monthly count
    document.getElementById('monthlyCount').textContent = `${monthlyCount} prayers`;
    
    document.getElementById('statsModal').classList.remove('hidden');
}

function hideStats() {
    document.getElementById('statsModal').classList.add('hidden');
}

function resetPrayerStats() {
    if (confirm('Are you sure you want to reset all prayer tracking data?')) {
        localStorage.removeItem(PRAYER_LOG_KEY);
        updatePrayerTrackingUI();
        showStatsModal(); // Refresh the modal
    }
}

// ============================================
// Monthly Calendar System
// ============================================
const CALENDAR_CACHE_KEY = 'calendar_cache';
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
let calendarData = null;

function getCalendarCacheKey(year, month, city, country) {
    return `${CALENDAR_CACHE_KEY}_${year}_${month}_${city}_${country}`;
}

function getCachedCalendarData(year, month, city, country) {
    const key = getCalendarCacheKey(year, month, city, country);
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
}

function cacheCalendarData(year, month, city, country, data) {
    const key = getCalendarCacheKey(year, month, city, country);
    localStorage.setItem(key, JSON.stringify(data));
}

async function fetchMonthlyPrayerTimes(year, month) {
    const location = getSavedLocation() || { city: 'Dhaka', country: 'Bangladesh' };
    const settings = getSettings();
    
    // Check cache first
    const cached = getCachedCalendarData(year, month, location.city, location.country);
    if (cached) {
        return cached;
    }
    
    try {
        const url = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(location.city)}&country=${encodeURIComponent(location.country)}&method=${settings.method}&school=${settings.school}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            cacheCalendarData(year, month, location.city, location.country, data.data);
            return data.data;
        }
    } catch (error) {
        console.error('Failed to fetch monthly calendar:', error);
    }
    
    return null;
}

async function renderCalendar(year, month) {
    const grid = document.getElementById('calendarGrid');
    const loader = document.getElementById('calendarLoader');
    const title = document.getElementById('calendarTitle');
    
    // Show loader
    grid.innerHTML = '';
    loader.classList.remove('hidden');
    
    // Update title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    title.textContent = `${monthNames[month - 1]} ${year}`;
    
    // Fetch data
    const data = await fetchMonthlyPrayerTimes(year, month);
    loader.classList.add('hidden');
    
    if (!data) {
        grid.innerHTML = '<div class="col-span-7 text-center py-8 text-[#636e72]">Failed to load calendar data</div>';
        return;
    }
    
    calendarData = data;
    
    // Calculate first day offset
    const firstDay = new Date(year, month - 1, 1).getDay();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    
    // Add empty cells for offset
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
    }
    
    // Add days
    data.forEach((day, index) => {
        const dayNum = index + 1;
        const isToday = isCurrentMonth && today.getDate() === dayNum;
        
        const cell = document.createElement('div');
        cell.className = `calendar-day ${isToday ? 'today' : ''}`;
        
        const timings = day.timings;
        
        cell.innerHTML = `
            <div class="day-number">${dayNum}</div>
            <div class="prayer-times">
                <span>F: ${timings.Fajr.split(' ')[0]}</span>
                <span>D: ${timings.Dhuhr.split(' ')[0]}</span>
                <span>A: ${timings.Asr.split(' ')[0]}</span>
                <span>M: ${timings.Maghrib.split(' ')[0]}</span>
                <span>I: ${timings.Isha.split(' ')[0]}</span>
            </div>
        `;
        
        grid.appendChild(cell);
    });
}

function showCalendar() {
    calendarYear = new Date().getFullYear();
    calendarMonth = new Date().getMonth() + 1;
    document.getElementById('calendarModal').classList.remove('hidden');
    renderCalendar(calendarYear, calendarMonth);
}

function hideCalendar() {
    document.getElementById('calendarModal').classList.add('hidden');
}

function navigateMonth(offset) {
    calendarMonth += offset;
    
    if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear++;
    } else if (calendarMonth < 1) {
        calendarMonth = 12;
        calendarYear--;
    }
    
    renderCalendar(calendarYear, calendarMonth);
}

function downloadCalendar() {
    window.print();
}

document.addEventListener('DOMContentLoaded', init);

