// === LUXURY REAL ESTATE WEBSITE - MODERN ES6+ VERSION ===

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

// Initialize Lenis Smooth Scroll
let lenis;
function initLenis() {
    // Check if Lenis is available
    if (typeof Lenis === 'undefined') {
        console.warn('Lenis library not loaded, falling back to native scroll');
        return;
    }

    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Integrate with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
    
    console.log('Lenis smooth scroll initialized successfully');
}

// Configuration for development vs production
const CONFIG = {
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    enablePerformanceMonitoring: false, // Set to true only when needed
    enableDebugLogs: false
};

// Modern State Management
class AppState {
    constructor() {
        this.isMenuOpen = false;
        this.cursor = null;
        this.loadingProgress = 0;
        this.showLoaderOnce = sessionStorage.getItem('loaderShown') !== 'true';
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.reducedMotionListener = null;
        this.resizeObserver = null;
    }

    // Add method to update reduced motion preference
    updateReducedMotion() {
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Cleanup method
    cleanup() {
        if (this.reducedMotionListener) {
            this.reducedMotionListener.removeEventListener('change', this.updateReducedMotion);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

// Performance utilities
const Performance = {
    // Debounce function for performance optimization
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    // Throttle function for scroll events
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    },

    // Intersection Observer for better performance
    createObserver(callback, options = {}) {
        const defaultOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };
        return new IntersectionObserver(callback, { ...defaultOptions, ...options });
    },

    // Web Vitals monitoring (configurable for production)
    reportWebVitals() {
        if (!CONFIG.enablePerformanceMonitoring || !('PerformanceObserver' in window)) return;

        try {
            // Largest Contentful Paint
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                        this.logMetric('LCP', entry.startTime);
                    }
                }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    this.logMetric('FID', entry.processingStart - entry.startTime);
                }
            }).observe({ entryTypes: ['first-input'] });

            // Cumulative Layout Shift
            new PerformanceObserver(list => {
                let cumulativeScore = 0;
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        cumulativeScore += entry.value;
                    }
                }
                this.logMetric('CLS', cumulativeScore);
            }).observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
            ErrorHandler.log(error, 'Performance monitoring setup');
        }
    },

    // Configurable logging for metrics
    logMetric(metric, value) {
        if (CONFIG.enableDebugLogs) {
            console.log(`${metric}:`, value);
        }
        
        // In production, send to analytics service instead
        if (!CONFIG.isDevelopment && window.gtag) {
            window.gtag('event', metric, {
                value: Math.round(value),
                metric_id: `${metric}_${Date.now()}`
            });
        }
    }
};

// Global app state
const appState = new AppState();

// Enhanced Error handling utility
const ErrorHandler = {
    log(error, context = '') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        if (CONFIG.enableDebugLogs) {
            console.error(`Error in ${context}:`, error);
        }

        // In production, send to error tracking service
        if (!CONFIG.isDevelopment && window.Sentry) {
            window.Sentry.captureException(error, {
                tags: { context },
                extra: errorInfo
            });
        }
    },

    async handle(asyncFunction, context = '') {
        try {
            return await asyncFunction();
        } catch (error) {
            this.log(error, context);
            return null;
        }
    },

    // Global error handler
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.log(event.error, 'Global Error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.log(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });
    }
};

// Modern initialization with async/await and error handling
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Setup global error handling
        ErrorHandler.setupGlobalErrorHandling();

        // Start performance monitoring if enabled
        if (CONFIG.enablePerformanceMonitoring) {
            Performance.reportWebVitals();
        }

        // Initialize core functionality
        await initializeApp();
        
    } catch (error) {
        ErrorHandler.log(error, 'DOMContentLoaded');
    }
});

// Main initialization function
async function initializeApp() {
    const initTasks = [];

    // Only show loader on first visit
    if (appState.showLoaderOnce) {
        initTasks.push(initializeLoader());
        sessionStorage.setItem('loaderShown', 'true');
    } else {
        // Skip loader on subsequent page visits
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        initTasks.push(initializeHeroAnimation(), initializeSlideAnimations());
    }
    
    // Initialize Lenis first
    initLenis();
    
    // Initialize all other components
    initTasks.push(
        initializeCursor(),
        initializeNavigation(),
        initializeScrollTriggers(),
        initializeInteractions(),
        initializeLuxuryEffects(),
        initializeDynamicColorSwitching()
    );

    // Wait for all initialization tasks to complete
    await Promise.allSettled(initTasks);
}

// Fallback for native scrolling
function setupNativeScrollFallback() {
    // Ensure scrolling works
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    
    // Setup native scroll events for navbar
    let lastScrollY = 0;
    let navbarVisible = true;
    const navbar = document.getElementById('navbar');
    
    function handleScroll() {
        const currentScrollY = window.scrollY;
        
        if (navbar) {
            // Add/remove scrolled class
            if (currentScrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            
            // Hide/show navbar on scroll direction change
            if (currentScrollY > lastScrollY && currentScrollY > 200 && navbarVisible) {
                // Scrolling down
                gsap.to(navbar, {
                    y: -100,
                    duration: 0.3,
                    ease: "power2.out"
                });
                navbarVisible = false;
            } else if (currentScrollY < lastScrollY && !navbarVisible) {
                // Scrolling up
                gsap.to(navbar, {
                    y: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });
                navbarVisible = true;
            }
        }
        
        lastScrollY = currentScrollY;
        
        // Update scroll progress
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) {
            const scrolled = (currentScrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            progressBar.style.width = Math.min(scrolled, 100) + '%';
        }
        
        // Show/hide scroll to top button
        const scrollButton = document.querySelector('.scroll-to-top');
        if (scrollButton) {
            if (currentScrollY > window.innerHeight) {
                scrollButton.style.opacity = '1';
                scrollButton.style.pointerEvents = 'auto';
                scrollButton.style.transform = 'translateY(0) scale(1)';
            } else {
                scrollButton.style.opacity = '0';
                scrollButton.style.pointerEvents = 'none';
                scrollButton.style.transform = 'translateY(20px) scale(0.9)';
            }
        }
    }
    
    // Throttled scroll handler
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
}

// Enhanced Loading Screen Animation (only on first visit)
function initializeLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgressBar = document.getElementById('loading-progress');
    const loadingLogo = document.querySelector('.loading-logo');
    
    if (!loadingScreen || !loadingProgressBar || !loadingLogo) {
        initializeHeroAnimation();
        initializeSlideAnimations();
        return;
    }
    
    // Animate logo first
    gsap.to(loadingLogo, {
        opacity: 1,
        duration: 0.8,
        ease: "power3.out"
    });
    
    // Faster loading progress
    let progress = 0;
    const loadingSteps = [
        { value: 40, delay: 100 },
        { value: 80, delay: 150 },
        { value: 100, delay: 100 }
    ];
    
    let currentStep = 0;
    
    function updateProgress() {
        if (currentStep < loadingSteps.length) {
            const step = loadingSteps[currentStep];
            
            gsap.to({ value: progress }, {
                value: step.value,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: function() {
                    progress = this.targets()[0].value;
                    gsap.set(loadingProgressBar, {
                        width: `${progress}%`
                    });
                },
                onComplete: () => {
                    currentStep++;
                    if (currentStep < loadingSteps.length) {
                        setTimeout(updateProgress, loadingSteps[currentStep - 1].delay);
                    } else {
                        setTimeout(hideLoader, 200);
                    }
                }
            });
        }
    }
    
    // Start loading immediately
    setTimeout(updateProgress, 50);
}

function hideLoader() {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (!loadingScreen) return;
    
    // Quick fade out
    gsap.to(loadingScreen, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.add('hidden');
            initializeHeroAnimation();
            initializeSlideAnimations();
        }
    });
}

// Enhanced Custom Cursor (fixed disappearing issue)
function initializeCursor() {
    cursor = document.getElementById('cursor');
    
    if (!cursor || window.innerWidth <= 768) {
        if (cursor) cursor.style.display = 'none';
        document.body.style.cursor = 'auto';
        return;
    }
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let isVisible = true;
    
    // Show cursor initially
    cursor.style.opacity = '1';
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Ensure cursor is visible
        if (!isVisible) {
            cursor.style.opacity = '1';
            isVisible = true;
        }
    });
    
    // Prevent cursor from disappearing
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        isVisible = true;
    });
    
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        isVisible = false;
    });
    
    // Smooth cursor follow
    function updateCursor() {
        cursorX += (mouseX - cursorX) * 0.12;
        cursorY += (mouseY - cursorY) * 0.12;
        
        gsap.set(cursor, {
            x: cursorX,
            y: cursorY
        });
        
        requestAnimationFrame(updateCursor);
    }
    updateCursor();
    
    // Simplified cursor interactions
    const interactiveElements = document.querySelectorAll('a, button, .service-item, .property-cta, .stat-item, .contact-item');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            gsap.to(cursor.querySelector('.cursor-dot'), {
                scale: 2,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        el.addEventListener('mouseleave', () => {
            gsap.to(cursor.querySelector('.cursor-dot'), {
                scale: 1,
                duration: 0.3,
                ease: "power2.out"
            });
        });
    });
}

// Modern Navigation with Enhanced Accessibility
async function initializeNavigation() {
    return ErrorHandler.handle(async () => {
        const navbar = document.getElementById('navbar');
        const menuToggle = document.getElementById('menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');
        
        if (!navbar) return;
        
        // Enhanced mobile menu toggle with accessibility
        if (menuToggle && navMenu) {
            const handleMenuToggle = () => {
                toggleMobileMenu();
                // Update ARIA attributes for accessibility
                const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
                menuToggle.setAttribute('aria-expanded', (!expanded).toString());
            };

            menuToggle.addEventListener('click', handleMenuToggle);
            
            // Keyboard support for menu toggle
            menuToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMenuToggle();
                }
            });
        }
        
        // Enhanced smooth scroll with modern API
        const smoothScrollToTarget = async (targetId) => {
            const targetElement = document.querySelector(targetId);
            if (!targetElement) return false;
            
            // Use modern scroll API with fallback
            if ('scrollBehavior' in document.documentElement.style) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
            } else {
                // Fallback for older browsers
                const targetPosition = targetElement.offsetTop - 100;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
            return true;
        };
        
        // Enhanced navigation link handling
        navLinks.forEach(link => {
            const handleLinkClick = async (e) => {
                const href = link.getAttribute('href');
                
                if (href?.startsWith('#')) {
                    e.preventDefault();
                    await smoothScrollToTarget(href);
                    
                    // Update active state
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // Close mobile menu if open
                    if (appState.isMenuOpen) {
                        toggleMobileMenu();
                    }
                    
                    // Update URL without causing page jump
                    if (history.pushState) {
                        history.pushState(null, null, href);
                    }
                }
            };
            
            link.addEventListener('click', handleLinkClick);
            
            // Enhanced keyboard support
            link.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleLinkClick(e);
                }
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (appState.isMenuOpen && 
                !navMenu.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                toggleMobileMenu();
            }
        });
        
        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && appState.isMenuOpen) {
                toggleMobileMenu();
                menuToggle.focus(); // Return focus to menu button
            }
        });
        
    }, 'initializeNavigation');
}

// Enhanced Mobile Menu Toggle with Accessibility
function toggleMobileMenu() {
    return ErrorHandler.handle(() => {
        const navMenu = document.getElementById('nav-menu');
        const menuToggle = document.getElementById('menu-toggle');
        const spans = menuToggle?.querySelectorAll('span');
        
        if (!navMenu || !spans) return;
        
        appState.isMenuOpen = !appState.isMenuOpen;
        
        // Skip animations if user prefers reduced motion
        const duration = appState.prefersReducedMotion ? 0 : 0.3;
        
        if (appState.isMenuOpen) {
            navMenu.classList.add('active');
            
            // Animate hamburger to X
            gsap.to(spans[0], { rotation: 45, y: 4, duration, ease: "power2.out" });
            gsap.to(spans[1], { opacity: 0, duration: duration * 0.7, ease: "power2.out" });
            gsap.to(spans[2], { rotation: -45, y: -4, duration, ease: "power2.out" });
            
            // Animate menu items with stagger
            if (!appState.prefersReducedMotion) {
                gsap.fromTo('.nav-menu .nav-link', 
                    { opacity: 0, y: 50 },
                    { 
                        opacity: 1, 
                        y: 0,
                        duration: 0.5, 
                        stagger: 0.1, 
                        delay: 0.2, 
                        ease: "power2.out" 
                    }
                );
            }
            
            // Trap focus within menu for accessibility
            const firstLink = navMenu.querySelector('.nav-link');
            if (firstLink) firstLink.focus();
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = 'hidden';
            
        } else {
            navMenu.classList.remove('active');
            
            // Animate X back to hamburger
            gsap.to(spans[0], { rotation: 0, y: 0, duration, ease: "power2.out" });
            gsap.to(spans[1], { opacity: 1, duration: duration * 0.7, delay: duration * 0.3, ease: "power2.out" });
            gsap.to(spans[2], { rotation: 0, y: 0, duration, ease: "power2.out" });
            
            // Re-enable body scroll
            document.body.style.overflow = '';
        }
        
        // Update ARIA attribute
        menuToggle.setAttribute('aria-expanded', appState.isMenuOpen.toString());
        
    }, 'toggleMobileMenu');
}

// Simplified Hero Animation
function initializeHeroAnimation() {
    const heroLines = document.querySelectorAll('.hero-title .line');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const scrollPrompt = document.querySelector('.scroll-prompt');
    
    if (!heroLines.length) return;
    
    // Simple timeline
    const tl = gsap.timeline();
    
    // Animate hero text
    tl.to(heroLines, {
        x: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out"
    });
    
    if (heroSubtitle) {
        tl.to(heroSubtitle, {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out"
        }, "-=0.5");
    }
    
    if (scrollPrompt) {
        tl.to(scrollPrompt, {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out"
        }, "-=0.3");
    }
}

// Slide In Right Animations
function initializeSlideAnimations() {
    const slideElements = document.querySelectorAll('.slide-in-right');
    
    slideElements.forEach(element => {
        const delay = element.getAttribute('data-delay') || 0;
        
        gsap.to(element, {
            x: 0,
            opacity: 1,
            duration: 0.8,
            delay: parseFloat(delay),
            ease: "power3.out",
            scrollTrigger: {
                trigger: element,
                start: "top 90%",
                toggleActions: "play none none reverse"
            }
        });
    });
}

// Simplified ScrollTrigger Animations
function initializeScrollTriggers() {
    // Stats counter animation
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        
        if (!isNaN(target)) {
            ScrollTrigger.create({
                trigger: stat,
                start: "top 90%",
                onEnter: () => {
                    gsap.to(stat, {
                        innerHTML: target,
                        duration: 2,
                        ease: "power2.out",
                        snap: { innerHTML: 1 },
                        onUpdate: function() {
                            stat.innerHTML = Math.ceil(stat.innerHTML) + (target === 98 ? '%' : '+');
                        }
                    });
                }
            });
        }
    });
    
    // Service hover effects
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach((item) => {
        item.addEventListener('mouseenter', () => {
            gsap.to(item, {
                x: 20,
                duration: 0.4,
                ease: "power2.out"
            });
            
            const serviceNumber = item.querySelector('.service-number');
            if (serviceNumber) {
                gsap.to(serviceNumber, {
                    color: '#DAA520',
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        });
        
        item.addEventListener('mouseleave', () => {
            gsap.to(item, {
                x: 0,
                duration: 0.4,
                ease: "power2.out"
            });
            
            const serviceNumber = item.querySelector('.service-number');
            if (serviceNumber) {
                gsap.to(serviceNumber, {
                    color: '#666',
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        });
    });
}

// Simplified Interactive Elements
function initializeInteractions() {
    // Button hover effects
    const buttons = document.querySelectorAll('.cta-button, .property-cta, .report-btn, .contact-agent-btn, .load-more');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            gsap.to(button, {
                scale: 1.05,
                y: -3,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        button.addEventListener('mouseleave', () => {
            gsap.to(button, {
                scale: 1,
                y: 0,
                duration: 0.3,
                ease: "power2.out"
            });
        });
    });
    
    // Image hover effects
    const imageContainers = document.querySelectorAll('.image-container, .property-image');
    imageContainers.forEach(container => {
        const img = container.querySelector('img');
        
        container.addEventListener('mouseenter', () => {
            if (img) {
                gsap.to(img, {
                    scale: 1.05,
                    duration: 0.6,
                    ease: "power2.out"
                });
            }
            
            gsap.to(container, {
                y: -5,
                duration: 0.4,
                ease: "power2.out"
            });
        });
        
        container.addEventListener('mouseleave', () => {
            if (img) {
                gsap.to(img, {
                    scale: 1,
                    duration: 0.6,
                    ease: "power2.out"
                });
            }
            
            gsap.to(container, {
                y: 0,
                duration: 0.4,
                ease: "power2.out"
            });
        });
    });
    
    // Contact items hover effects
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            gsap.to(item, {
                x: 15,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        item.addEventListener('mouseleave', () => {
            gsap.to(item, {
                x: 0,
                duration: 0.3,
                ease: "power2.out"
            });
        });
    });
}

// Simplified Luxury Effects
function initializeLuxuryEffects() {
    // Add floating animation to accent elements
    gsap.to('.accent', {
        y: -3,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
        stagger: 0.5
    });
    
    // Form input focus effects
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            gsap.to(input, {
                scale: 1.02,
                duration: 0.2,
                ease: "power2.out"
            });
        });
        
        input.addEventListener('blur', () => {
            gsap.to(input, {
                scale: 1,
                duration: 0.2,
                ease: "power2.out"
            });
        });
    });
    
    // Add scroll progress indicator
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #DAA520, #F4E4A6, #DAA520);
        z-index: 10001;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
}

// Simplified page transitions
function initializePageTransitions() {
    const navLinks = document.querySelectorAll('.nav-link[href$=".html"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            
            // Simple fade transition
            gsap.to('body', {
                opacity: 0.5,
                duration: 0.3,
                ease: "power2.inOut",
                onComplete: () => {
                    window.location.href = href;
                }
            });
        });
    });
}

// Enhanced scroll to top functionality
function addScrollToTop() {
    const scrollButton = document.createElement('button');
    scrollButton.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
    scrollButton.className = 'scroll-to-top';
    scrollButton.setAttribute('aria-label', 'Scroll to top of page');
    scrollButton.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 50px;
        height: 50px;
        border: 2px solid rgba(218, 165, 32, 0.5);
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        color: #DAA520;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;
        z-index: 1000;
        font-size: 1.2rem;
        font-weight: 300;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    document.body.appendChild(scrollButton);
    
    // Enhanced scroll to top animation with accessibility
    scrollButton.addEventListener('click', () => {
        // Announce to screen readers
        announceToScreenReader('Scrolling to top of page');
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Return focus to main content after scroll
        setTimeout(() => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.focus();
            }
        }, 500);
    });
    
    // Keyboard support
    scrollButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollButton.click();
        }
    });
}

// Enhanced accessibility functions
function announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        // Clear after announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

// Enhanced scroll prompt functionality
function initializeScrollPrompt() {
    const scrollPrompt = document.querySelector('.scroll-prompt');
    if (!scrollPrompt) return;
    
    scrollPrompt.addEventListener('click', () => {
        const target = scrollPrompt.getAttribute('data-scroll-target');
        const targetElement = target ? document.getElementById(target) : null;
        
        if (targetElement) {
            announceToScreenReader(`Scrolling to ${target} section`);
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Focus the target section for screen readers
            setTimeout(() => {
                targetElement.focus();
            }, 500);
        }
    });
    
    // Keyboard support for scroll prompt
    scrollPrompt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollPrompt.click();
        }
    });
}

// Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            if (CONFIG.enableDebugLogs) {
                console.log('ServiceWorker registered successfully:', registration.scope);
            }
            
            // Handle service worker updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        showUpdateNotification();
                    }
                });
            });
            
            return registration;
        } catch (error) {
            if (CONFIG.enableDebugLogs) {
                console.log('ServiceWorker registration failed:', error);
            }
        }
    }
}

// Show update notification for PWA
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-primary);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            font-size: 0.9rem;
        ">
            <strong>Update Available</strong><br>
            A new version of the app is available.
            <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" 
                    style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        margin-top: 0.5rem;
                        cursor: pointer;
                        font-size: 0.8rem;
                    ">
                Update Now
            </button>
            <button onclick="this.parentElement.parentElement.remove();" 
                    style="
                        background: transparent;
                        border: none;
                        color: rgba(255,255,255,0.8);
                        float: right;
                        cursor: pointer;
                        font-size: 1.2rem;
                        line-height: 1;
                        margin-top: -0.5rem;
                    ">
                ×
            </button>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// Enhanced loading progress with accessibility
function updateLoadingProgress(progress) {
    const progressBar = document.getElementById('loading-progress');
    const loadingScreen = document.getElementById('loading-screen');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', Math.round(progress));
        
        // Announce progress to screen readers at key milestones
        if (progress === 25 || progress === 50 || progress === 75 || progress === 100) {
            announceToScreenReader(`Loading ${Math.round(progress)}% complete`);
        }
    }
}

// Enhanced form submission with accessibility
function handleFormSubmission(form) {
    const submitBtn = form.querySelector('button[type="submit"], .submit-btn');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    const formType = form.getAttribute('id') || 'form';
    
    // Update button state
    submitBtn.textContent = 'SENDING...';
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    
    // Announce to screen readers
    announceToScreenReader(`Submitting ${formType}, please wait`);
    
    // Simulate processing with enhanced accessibility
    setTimeout(() => {
        submitBtn.textContent = 'SENT ✓';
        submitBtn.style.background = '#27ae60';
        submitBtn.setAttribute('aria-busy', 'false');
        
        // Announce success
        announceToScreenReader(`${formType} submitted successfully`);
        
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
            form.reset();
            
            // Focus first input for next submission
            const firstInput = form.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 2000);
    }, 1500);
}

// Initialize additional features
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollPrompt();
    addScrollToTop();
    
    // Register service worker
    registerServiceWorker();
    
    // Enhanced form handling with accessibility
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmission(form);
        });
    });
    
    // Add reduced motion listener
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    appState.reducedMotionListener = (e) => {
        appState.prefersReducedMotion = e.matches;
        announceToScreenReader(e.matches ? 'Animations reduced' : 'Animations enabled');
    };
    reducedMotionQuery.addEventListener('change', appState.reducedMotionListener);
    
    // Enhanced keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Escape key handling
        if (e.key === 'Escape') {
            // Close mobile menu if open
            if (appState.isMenuOpen) {
                const menuToggle = document.getElementById('menu-toggle');
                if (menuToggle) {
                    menuToggle.click();
                    menuToggle.focus();
                }
            }
            
            // Remove focus from any focused element (useful for modal-like states)
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
        }
        
        // Skip to main content with Alt + M
        if (e.altKey && e.key === 'm') {
            e.preventDefault();
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.focus();
                announceToScreenReader('Jumped to main content');
            }
        }
        
        // Skip to navigation with Alt + N
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            const navigation = document.getElementById('navbar');
            if (navigation) {
                const firstLink = navigation.querySelector('.nav-link');
                if (firstLink) {
                    firstLink.focus();
                    announceToScreenReader('Jumped to navigation');
                }
            }
        }
    });
});

// Simple page entrance
window.addEventListener('load', () => {
    // Announce page load completion
    setTimeout(() => {
        announceToScreenReader('Page loaded successfully');
    }, 1000);
    
    gsap.from('body', {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out"
    });
});

// Enhanced form handling with proper accessibility
function initializeFormHandling() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Add proper labels and descriptions if missing
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!input.getAttribute('aria-label') && !input.id) {
                const label = form.querySelector(`label[for="${input.name}"]`);
                if (label) {
                    const id = `input-${input.name}-${Math.random().toString(36).substr(2, 9)}`;
                    input.id = id;
                    label.setAttribute('for', id);
                }
            }
        });
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmission(form);
        });
    });
}

// Initialize enhanced form handling
document.addEventListener('DOMContentLoaded', initializeFormHandling);

// Utility function for smooth scrolling with accessibility
function scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
        top: elementPosition + offset,
        behavior: 'smooth'
    });
    
    // Announce scroll action
    const elementName = element.getAttribute('aria-label') || 
                       element.id || 
                       element.tagName.toLowerCase();
    announceToScreenReader(`Scrolling to ${elementName}`);
    
    // Focus element after scroll for screen readers
    setTimeout(() => {
        if (element.tabIndex === -1) {
            element.tabIndex = -1;
        }
        element.focus();
    }, 500);
}

// Performance optimizations
function optimizePerformance() {
    // Preload critical images with modern formats
    const criticalImages = [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3',
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src + '?auto=format&fit=crop&w=2000&q=80';
    });
    
    // Implement lazy loading for non-critical images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        // Observe images with data-src attribute
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Enhanced Dynamic Color Switching for All Pages
function initializeDynamicColorSwitching() {
    return ErrorHandler.handle(() => {
        const heroSection = document.querySelector('.hero');
        const pageHeader = document.querySelector('.page-header');
        const navbar = document.querySelector('.navbar');
        const heroContent = document.querySelector('.hero-content');
        
        if (!navbar) return;
        
        // Determine which header section exists (hero for homepage, page-header for others)
        const headerSection = heroSection || pageHeader;
        if (!headerSection) return;
        
        let ticking = false;
        
        function updateColors() {
            const scrollY = window.scrollY;
            const headerHeight = headerSection.offsetHeight;
            const headerBottom = headerHeight * 0.7; // Switch colors at 70% of header height
            
            // Determine if we're in header section or below
            const isInHeader = scrollY < headerBottom;
            
            // Update navbar based on header presence
            if (isInHeader) {
                navbar.classList.remove('content-light');
                navbar.classList.add('header-dark');
            } else {
                navbar.classList.remove('header-dark');
                navbar.classList.add('content-light');
            }
            
            // Update hero content color (only for homepage)
            if (heroContent) {
                if (isInHeader) {
                    heroContent.classList.remove('text-dark');
                    heroContent.classList.add('text-white');
                } else {
                    heroContent.classList.remove('text-white');
                    heroContent.classList.add('text-dark');
                }
            }
            
            ticking = false;
        }
        
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(updateColors);
                ticking = true;
            }
        }
        
        // Initial setup
        updateColors();
        
        // Listen for scroll events
        window.addEventListener('scroll', onScroll, { passive: true });
        
    }, 'initializeDynamicColorSwitching');
}

// Initialize optimizations
optimizePerformance();

// Export for use in other files
window.HighpointAnimations = {
    scrollToElement,
    initializeHeroAnimation,
    toggleMobileMenu,
    initializeLuxuryEffects,
    announceToScreenReader,
    registerServiceWorker,
    initializeDynamicColorSwitching
}; 