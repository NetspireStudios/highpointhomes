// === HIGHPOINT HOMES SERVICE WORKER ===
// Version 1.0.0

const CACHE_NAME = 'highpoint-homes-v1.0.0';
const STATIC_CACHE = 'static-assets-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-content-v1.0.0';
const IMAGE_CACHE = 'images-v1.0.0';

// Define what to cache immediately (critical assets)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/search.html',
    '/valuation.html',
    '/contact.html',
    '/reports.html',
    '/css/style.css',
    '/js/main.js',
    '/site.webmanifest',
    // Critical external assets
    'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&family=Playfair+Display:wght@300;400;500;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Dynamic content patterns to cache
const DYNAMIC_PATTERNS = [
    /^https:\/\/images\.unsplash\.com\//,
    /^https:\/\/fonts\.gstatic\.com\//,
    /^https:\/\/cdnjs\.cloudflare\.com\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== IMAGE_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all pages
            self.clients.claim()
        ])
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') return;
    
    event.respondWith(
        handleRequest(request)
    );
});

// Handle different types of requests with appropriate strategies
async function handleRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Strategy 1: HTML Pages - Network First with Cache Fallback
        if (request.destination === 'document' || 
            url.pathname.endsWith('.html') || 
            url.pathname === '/') {
            return await networkFirstStrategy(request, DYNAMIC_CACHE);
        }
        
        // Strategy 2: CSS/JS - Cache First with Network Fallback
        if (request.destination === 'style' || 
            request.destination === 'script' ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js')) {
            return await cacheFirstStrategy(request, STATIC_CACHE);
        }
        
        // Strategy 3: Images - Cache First with Network Update
        if (request.destination === 'image' ||
            DYNAMIC_PATTERNS.some(pattern => pattern.test(url.href))) {
            return await cacheFirstStrategy(request, IMAGE_CACHE);
        }
        
        // Strategy 4: Fonts - Cache First (long-term cache)
        if (request.destination === 'font' ||
            url.hostname === 'fonts.gstatic.com') {
            return await cacheFirstStrategy(request, STATIC_CACHE);
        }
        
        // Strategy 5: Other requests - Network First
        return await networkFirstStrategy(request, DYNAMIC_CACHE);
        
    } catch (error) {
        console.error('Service Worker: Request failed:', error);
        return await handleOfflineFallback(request);
    }
}

// Network First Strategy - good for HTML and dynamic content
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache');
        const cachedResponse = await caches.match(request);
        return cachedResponse || await handleOfflineFallback(request);
    }
}

// Cache First Strategy - good for static assets
async function cacheFirstStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Update cache in background for next time
        updateCacheInBackground(request, cacheName);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        return await handleOfflineFallback(request);
    }
}

// Update cache in background
async function updateCacheInBackground(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Silently fail - we already have cached version
    }
}

// Handle offline fallbacks
async function handleOfflineFallback(request) {
    const url = new URL(request.url);
    
    // For HTML pages, return cached index or offline page
    if (request.destination === 'document' || url.pathname.endsWith('.html')) {
        const cachedPage = await caches.match(request) || 
                          await caches.match('/index.html') ||
                          await caches.match('/');
        
        if (cachedPage) return cachedPage;
        
        // Return basic offline page if nothing cached
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Offline - Highpoint Homes</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 2rem;
                        background: #fefefe;
                        color: #0a0a0a;
                    }
                    .offline-container {
                        max-width: 600px;
                        margin: 0 auto;
                        margin-top: 10vh;
                    }
                    .logo {
                        font-family: serif;
                        font-size: 2.5rem;
                        color: #DAA520;
                        margin-bottom: 1rem;
                    }
                    .message {
                        font-size: 1.2rem;
                        margin-bottom: 2rem;
                    }
                    .retry-btn {
                        background: #DAA520;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        font-size: 1rem;
                        cursor: pointer;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <div class="logo">HIGHPOINT</div>
                    <div class="message">
                        You're currently offline. Please check your internet connection and try again.
                    </div>
                    <button class="retry-btn" onclick="window.location.reload()">
                        Try Again
                    </button>
                </div>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    // For images, return placeholder or cached version
    if (request.destination === 'image') {
        return new Response(
            '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666">Image unavailable offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
    
    // For other resources, return 503 Service Unavailable
    return new Response(null, { status: 503, statusText: 'Service Unavailable' });
}

// Background sync for form submissions (when available)
self.addEventListener('sync', (event) => {
    if (event.tag === 'contact-form') {
        event.waitUntil(syncContactForm());
    }
});

// Handle background sync for contact forms
async function syncContactForm() {
    // Get queued form data from IndexedDB
    const queuedForms = await getQueuedForms();
    
    for (const formData of queuedForms) {
        try {
            await submitForm(formData);
            await removeFromQueue(formData.id);
        } catch (error) {
            console.error('Service Worker: Failed to sync form:', error);
        }
    }
}

// Placeholder functions for form sync (would need IndexedDB implementation)
async function getQueuedForms() {
    // Implementation would use IndexedDB to store queued forms
    return [];
}

async function submitForm(formData) {
    // Implementation would submit form to server
    return fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
    });
}

async function removeFromQueue(id) {
    // Implementation would remove from IndexedDB queue
}

// Push notification handling (if needed in future)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/android-chrome-192x192.png',
                badge: '/favicon-32x32.png',
                tag: 'highpoint-notification',
                requireInteraction: false,
                actions: [
                    {
                        action: 'view',
                        title: 'View Property'
                    },
                    {
                        action: 'dismiss',
                        title: 'Dismiss'
                    }
                ]
            })
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_INFO') {
        event.ports[0].postMessage({
            caches: [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE],
            version: CACHE_NAME
        });
    }
});

console.log('Service Worker: Registered successfully'); 