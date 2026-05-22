// firebase-config.js
// Central initialization configuration for Firebase Auth, Realtime Database, and Storage

// 1. Central Configuration (baked-in defaults, white-labeled for customization)
let appConfig = {
    appName: "EzyShip Portal",
    setupAccessKey: "admin123", // Password to restrict setup page access
    firebaseConfig: {
        apiKey: "AIzaSyDcas4JHCS1kQ5P1DA-LEDjpqKtTf9WFrY",
        authDomain: "ezyship-ca164.firebaseapp.com",
        databaseURL: "https://ezyship-ca164-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "ezyship-ca164",
        storageBucket: "ezyship-ca164.firebasestorage.app",
        messagingSenderId: "175667938863",
        appId: "1:175667938863:web:f2d7960680a4945af0a8da",
        measurementId: "G-TYNM5ZVK3L"
    },
    features: {
        labels: true,
        scanner: true,
        dispatched: true,
        uploads: true,
        search: true,
        billing: true,
        gstBilling: true,
        customers: true,
        onlineExcel: true
    },
    gstProfile: {
        name: "Digital Dukan",
        gstin: "08AOVPG0169D1ZV",
        address: "Bheru Gali, Rampura Bazar, Kota, Rajasthan - 324006",
        state: "Rajasthan",
        stateCode: "08"
    }
};

// Load configuration override from localStorage (for previewing configuration changes instantly)
try {
    const localConfigStr = localStorage.getItem('appConfig');
    if (localConfigStr) {
        const localConfig = JSON.parse(localConfigStr);
        if (localConfig && typeof localConfig === 'object') {
            appConfig = {
                ...appConfig,
                ...localConfig,
                firebaseConfig: { ...appConfig.firebaseConfig, ...localConfig.firebaseConfig },
                features: { ...appConfig.features, ...localConfig.features },
                gstProfile: { ...appConfig.gstProfile, ...localConfig.gstProfile }
            };
        }
    }
} catch (e) {
    console.error("Error parsing local configuration override", e);
}

// 2. Initialize Firebase using the active configuration
let firebaseConfig = appConfig.firebaseConfig;
let firebaseInitialized = false;

if (firebaseConfig.apiKey) {
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseInitialized = true;
    } catch (e) {
        console.error("Firebase Initialization Failed", e);
    }
}

// Global handles
const firebaseAuth = firebaseInitialized ? firebase.auth() : null;
const firebaseDb = firebaseInitialized ? firebase.database() : null;
const firebaseStorage = firebaseInitialized ? firebase.storage() : null;

// (Google Sheets sync removed — dispatches now stored directly in Firebase Realtime Database)

// 3. Helper Functions
function getLoginUrl() {
    const isSubdir = window.location.pathname.includes('/prints/');
    return isSubdir ? '../login.html' : 'login.html';
}

function getMainUrl() {
    const isSubdir = window.location.pathname.includes('/prints/');
    return isSubdir ? '../index.html' : 'index.html';
}

// Enforces user session, redirects if not authenticated
function enforceAuth() {
    if (!firebaseInitialized) {
        console.warn("Firebase not configured. Redirecting to login for setup.");
        window.location.href = getLoginUrl();
        return;
    }
    
    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) {
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = getLoginUrl();
        } else {
            // User is authenticated, remove the style tag hiding the body (if present)
            const guard = document.getElementById('auth-guard-style');
            if (guard) {
                guard.remove();
            } else {
                // If script ran before body, remove style on DOMContentLoaded
                document.addEventListener("DOMContentLoaded", () => {
                    const g = document.getElementById('auth-guard-style');
                    if (g) g.remove();
                });
            }
        }
    });
}

// Global sign out helper
async function handleLogout(e) {
    if (e) e.preventDefault();
    if (firebaseInitialized && firebaseAuth) {
        try {
            await firebaseAuth.signOut();
        } catch (err) {
            console.error("Sign out failed", err);
        }
    }
    window.location.href = getMainUrl();
}

// 4. Route Guarding (Immediately redirects if page corresponds to a disabled feature)
(function() {
    const path = window.location.pathname;
    const isSubdir = path.includes('/prints/');
    const filename = path.split('/').pop() || 'index.html';

    // Skip guards for public/config landing pages
    if (filename === 'login.html' || filename === 'setup.html' || (filename === 'index.html' && !isSubdir)) {
        return;
    }

    // Map filename to feature key
    let currentFeature = null;
    if (isSubdir) {
        if (filename === 'index.html') currentFeature = 'labels';
        else if (filename === 'scanner.html') currentFeature = 'scanner';
        else if (filename === 'dispatched.html') currentFeature = 'dispatched';
    } else {
        if (filename === 'uploads.html') currentFeature = 'uploads';
        else if (filename === 'search.html') currentFeature = 'search';
        else if (filename === 'billing.html') currentFeature = 'billing';
        else if (filename === 'gst-billing.html') currentFeature = 'gstBilling';
        else if (filename === 'customers.html') currentFeature = 'customers';
        else if (filename === 'online-excel.html') currentFeature = 'onlineExcel';
    }

    // If current feature is disabled, redirect to first enabled feature
    if (currentFeature && appConfig.features && appConfig.features[currentFeature] === false) {
        const featurePriority = [
            'labels',
            'scanner',
            'dispatched',
            'uploads',
            'search',
            'billing',
            'gstBilling',
            'customers',
            'onlineExcel'
        ];

        let targetFeature = null;
        for (const feat of featurePriority) {
            if (appConfig.features[feat] !== false) {
                targetFeature = feat;
                break;
            }
        }

        const prefixRoot = isSubdir ? '../' : '';
        const prefixPrints = isSubdir ? '' : 'prints/';
        let redirectUrl = prefixRoot + 'login.html';

        if (targetFeature) {
            switch (targetFeature) {
                case 'labels': redirectUrl = prefixPrints + 'index.html'; break;
                case 'scanner': redirectUrl = prefixPrints + 'scanner.html'; break;
                case 'dispatched': redirectUrl = prefixPrints + 'dispatched.html'; break;
                case 'uploads': redirectUrl = prefixRoot + 'uploads.html'; break;
                case 'search': redirectUrl = prefixRoot + 'search.html'; break;
                case 'billing': redirectUrl = prefixRoot + 'billing.html'; break;
                case 'gstBilling': redirectUrl = prefixRoot + 'gst-billing.html'; break;
                case 'customers': redirectUrl = prefixRoot + 'customers.html'; break;
                case 'onlineExcel': redirectUrl = prefixRoot + 'online-excel.html'; break;
            }
        }

        console.warn(`Feature '${currentFeature}' is disabled. Redirecting user to: ${redirectUrl}`);
        window.location.href = redirectUrl;
    }
})();

// 5. Dynamic Navigation Rendering (Runs after DOM loaded to update navigation elements)
document.addEventListener("DOMContentLoaded", () => {
    // Find either <nav> element or element with class nav-links
    const navContainer = document.querySelector('nav') || document.querySelector('.nav-links');
    if (!navContainer) return;

    const path = window.location.pathname;
    const isSubdir = path.includes('/prints/');
    const filename = path.split('/').pop() || 'index.html';

    const prefixRoot = isSubdir ? '../' : '';
    const prefixPrints = isSubdir ? '' : 'prints/';

    // All possible nav links and their targets
    const navItems = [
        { key: 'labels', name: '📄 Labels', url: prefixPrints + 'index.html' },
        { key: 'scanner', name: '🔍 Scanner', url: prefixPrints + 'scanner.html' },
        { key: 'dispatched', name: '📋 Dispatched', url: prefixPrints + 'dispatched.html' },
        { key: 'uploads', name: '📸 Upload Tracking', url: prefixRoot + 'uploads.html' },
        { key: 'search', name: '🔎 Search Photos', url: prefixRoot + 'search.html' },
        { key: 'billing', name: '🧾 Billing', url: prefixRoot + 'billing.html' },
        { key: 'gstBilling', name: '🧾 GST Billing', url: prefixRoot + 'gst-billing.html' },
        { key: 'customers', name: '👤 Customers', url: prefixRoot + 'customers.html' },
        { key: 'onlineExcel', name: '📊 Online Excel', url: prefixRoot + 'online-excel.html' }
    ];

    // Determine currently active navigation key
    let activeKey = null;
    if (isSubdir) {
        if (filename === 'index.html') activeKey = 'labels';
        else if (filename === 'scanner.html') activeKey = 'scanner';
        else if (filename === 'dispatched.html') activeKey = 'dispatched';
    } else {
        if (filename === 'uploads.html') activeKey = 'uploads';
        else if (filename === 'search.html') activeKey = 'search';
        else if (filename === 'billing.html') activeKey = 'billing';
        else if (filename === 'gst-billing.html') activeKey = 'gstBilling';
        else if (filename === 'customers.html') activeKey = 'customers';
        else if (filename === 'online-excel.html') activeKey = 'onlineExcel';
    }

    // Filter list to keep only enabled items
    const enabledItems = navItems.filter(item => appConfig.features[item.key] !== false);

    // Build the inside HTML
    let navHtml = enabledItems.map(item => {
        const activeClass = item.key === activeKey ? ' class="on"' : '';
        return `    <a href="${item.url}"${activeClass}>${item.name}</a>`;
    }).join('\n');

    // Append logout button
    navHtml += `\n    <a href="#" onclick="handleLogout(event)" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171; background: rgba(239, 68, 68, 0.08);">🚪 Logout</a>`;

    // Overwrite contents of the element
    navContainer.innerHTML = navHtml;
});

