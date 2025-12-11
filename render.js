/*
| Task127 Render.js
| This version is from the Private Beta!
| Render.js handles well, rendering. 
| Created by hexadec1mal.
| Task127 - Not as good as the taiganet sim, but better than nothing!
| modified to play nice by me dan13l
*/

class Renderer {
    constructor(config) {
    this.config = config;
    const hasWindow = typeof window !== 'undefined';
    const hasDocument = typeof document !== 'undefined';

    this.baseContentWidth = 720;
    this.baseContentHeight = 480;

    if (hasDocument && hasWindow && typeof window.getComputedStyle === 'function') {
        try {
            const rootStyles = window.getComputedStyle(document.documentElement);
            const parsedWidth = parseFloat(rootStyles.getPropertyValue('--content-width'));
            const parsedHeight = parseFloat(rootStyles.getPropertyValue('--content-height'));
            if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
                this.baseContentWidth = parsedWidth;
            }
            if (Number.isFinite(parsedHeight) && parsedHeight > 0) {
                this.baseContentHeight = parsedHeight;
            }
        } catch (error) {
            console.warn('Viewport sizing: unable to read base dimensions from CSS variables:', error.message);
        }
    }

    this.boundApplyViewportScale = () => this.applyViewportScale();
    if (hasWindow) {
        window.addEventListener('resize', this.boundApplyViewportScale);
        window.addEventListener('orientationchange', this.boundApplyViewportScale);
        if (hasDocument) {
            const readyState = document.readyState;
            if (readyState === 'complete' || readyState === 'interactive') {
                this.applyViewportScale();
            } else {
                document.addEventListener('DOMContentLoaded', this.boundApplyViewportScale, { once: true });
            }
        }
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(this.boundApplyViewportScale);
        } else {
            setTimeout(this.boundApplyViewportScale, 0);
        }
    }
    // Normalize boolean flags that may be strings
    this.config.animate_radar = this.config.animate_radar === true || this.config.animate_radar === 'true';
    this.config.modern = this.config.modern === true || this.config.modern === 'true';
    this.config.force_red_mode = this.normalizeBoolean(this.config.force_red_mode);
    this.slowDraw = config.slow_draw === 'y';
    this.lastRadarTimestamp = 0;
    this.cachedRadarPath = null;
    this.cachedRadarStillUrl = null;
    this.cachedRadarSourceType = null;
        this.segmentTimeout = null;
        this.ldlLoopInterval = null;
        this.adCrawlInterval = null;
        this.adCrawlMessages = [];
        this.currentAdIndex = 0;
    this.defaultAdCrawlMessages = [];
    this.savedAdCrawlMessages = null;
    this.originalLayer1Src = null;
    this.alertLevel = 'none';
    this.ldlContentMode = 'conditions';
    this.ldlBaseImage = './LDL.png';
    this.ldlBaseImageCaptured = false;
    this.ldlWatchImage = './LDLWatch.png';
    this.ldlWarningImage = './LDLWarning.png';
    this.boundLDLWeatherUpdate = null;
    this.currentSlide = null;
    this.localForecastPageTimeout = null;
    this.localForecastPagesActive = false;
    this.bufferManager = new BufferManager(config);
    this.redModeForced = this.config.force_red_mode === true;
    this.latestAlerts = [];
    this.isRedModeActive = false;
    this.baseAssetsReady = false;
    this.pendingRedModeState = null;
    this.redModeAssetMap = new Map([
        ['.twc-logo', './red_mode/TWCLogo.png'],
        ['.header-bottom', './red_mode/header.png'],
        ['.ldl-image', './red_mode/LDL.png'],
        ['.centerbox-layer.layer-0', './red_mode/layer_farthest_back_0.png'],
        ['.centerbox-layer.layer-1', './red_mode/05_layer_back_1.png'],
        ['.centerbox-layer.layer-2', './red_mode/layer_back_2.png'],
        ['.centerbox-layer.layer-3', './red_mode/layer_back_3.png'],
        ['.centerbox-layer.layer-4', './red_mode/layer_back_4.png'],
        ['.centerbox-layer.layer-5', './red_mode/layer_back_5.png'],
        ['.centerbox-layer.layer-6', './red_mode/layer_front_6.png']
    ]);
        if (hasDocument) {
            const applyFontClass = () => {
                if (document.body) {
                    document.body.classList.add('jr-fonts-active');
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', applyFontClass, { once: true });
            } else {
                applyFontClass();
            }
        }
        this.boundLocalObsUpdate = (event) => {
            this.updateLocalObservationsDisplay(event.detail);
        };
        window.addEventListener('local-observations-update', this.boundLocalObsUpdate);
        this.boundAlertsUpdate = (event) => {
            this.latestAlerts = Array.isArray(event.detail) ? event.detail : [];
            this.updateRedModeState();
            this.updateAlertVisualState();
        };
        window.addEventListener('weather-alerts-update', this.boundAlertsUpdate);
        this.narrationsEnabled = config.narrations === true || config.narrations === 'y';
        // DISABLED: Intro video functionality commented out due to budget constraints
        // Normalize intro video flag (case-insensitive 'y' or 'true')
        // const introsVal = String(this.config.intros || '').toLowerCase();
        // this.config.intros = introsVal === 'y' || introsVal === 'true';
        this.config.intros = false; // Force disabled
        // Normalize solo viewer flag
        this.config.solo = this.config.solo === true || this.config.solo === 'true';
    // LDL mode flags (accept boolean true or string 'y'/'true')
    const ldlInBetween = this.config.ldl_inbetween_cues;
    this.config.ldl_inbetween_cues = ldlInBetween === true || ldlInBetween === 'y' || ldlInBetween === 'true';
    const ldlAlways = this.config.ldl_always;
    this.config.ldl_always = ldlAlways === true || ldlAlways === 'y' || ldlAlways === 'true';
        this.narrationMap = {};
    this.isInitialized = false;
    this.alertScrollActive = false;
    const parsedAdInterval = Number(config?.ad_crawl_interval_ms);
    this.adCrawlIntervalMs = Number.isFinite(parsedAdInterval) && parsedAdInterval > 0 ? parsedAdInterval : 45000;
    this.lockedSlideId = typeof config?.lock_slide_id === 'string' && config.lock_slide_id.trim().length
        ? config.lock_slide_id.trim()
        : null;
    // Always start LDL text and clock immediately  
    setTimeout(() => {
        this.startLDLLoop(null, { mode: 'conditions' });
        this.startLDLClock();
    }, 100);
        this.radarRefreshInterval = null;        const cfgW = Number(config?.radar_map_width);
        const cfgH = Number(config?.radar_map_height);
        this.mapSpec = {
            width: Number.isFinite(cfgW) ? cfgW : 7066,
            height: Number.isFinite(cfgH) ? cfgH : 4248,
            lonMin: -127.680,
            latMin: 21.649,
            lonMax: -66.507,
            latMax: 50.434,
        };
        this.defaultRadarZoom = 4.2;
    }

    normalizeBoolean(value) {
        if (value === null || value === undefined) {
            return false;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim().toLowerCase();
            if (['y', 'yes', 'true', '1', 'on', 'enable', 'enabled'].includes(trimmed)) {
                return true;
            }
            if (['n', 'no', 'false', '0', 'off', 'disable', 'disabled'].includes(trimmed)) {
                return false;
            }
        }
        return Boolean(value);
    }

    async init() {
        this.bufferManager.log('Renderer initializing...', 'info', 'RENDERER');

        // Preload radar data at startup (in background)
        this.preloadRadarData();

        // Hide all UI until current conditions data is loaded
        this.hideAllElements();

        // Wait for current conditions data before rendering the first slide
        this.bufferManager.log('Waiting for current conditions data...', 'info', 'RENDERER');
        try {
            await window.weatherData.fetchCurrentConditions();
            this.bufferManager.log('Current Conditions data ready', 'info', 'RENDERER');
        } catch (err) {
            this.bufferManager.log(`Error loading Current Conditions data: ${err.message}`, 'error', 'RENDERER');
        }

        // Check if solo viewer mode is enabled
        if (this.config.solo && this.config.solo_url) {
            this.bufferManager.log('Solo viewer mode enabled', 'info', 'RENDERER');
            this.startSoloViewer();
            return;
        }

        // Check for LDL flavor
        if (this.config.selectedflavor === 'LDL') {
            this.bufferManager.log('LDL flavor selected - running pure LDL mode', 'info', 'RENDERER');
            this.startLDLFlavor();
            return;
        }

        // LDL always runs in background - no special mode needed

        // Initialize ad crawl system
        this.initializeAdCrawl();
        
        // Start ad crawl if enabled (runs during normal operation)
        if (this.config.ad_crawl_enabled) {
            this.startAdCrawl();
        }

        // Handle Lot8s cueing: if enabled, skip startup until cue
        if (this.config.lot8s_cue === 'y') {
            // Default cuetimes if not set
            if (!this.config.cuetimes || this.config.cuetimes.trim() === '') {
                this.config.cuetimes = 'x18,x48';
            }
            this.bufferManager.log('Lot8s cue enabled, waiting for cue times: ' + this.config.cuetimes, 'info', 'RENDERER');
            // Parse cue time patterns
            this.cuePatterns = this.config.cuetimes.split(',')
                .map(code => ({ prefix: code.charAt(0), minute: parseInt(code.slice(1),10) }))
                .filter(p => ['x','o'].includes(p.prefix) && Number.isInteger(p.minute) && p.minute >=0 && p.minute < 60);
            // Schedule first cue after data load
            this.scheduleNextCue();
            this.isInitialized = true;
            return;
        }
        // Perform startup sequence based on slow_draw setting
        if (this.slowDraw) {
            this.bufferManager.log('Starting slow draw startup sequence', 'info', 'RENDERER');
            this.performSlowStartup();
        } else {
            this.bufferManager.log('Starting fast startup sequence', 'info', 'RENDERER');
            this.performFastStartup();
        }

        // After initialization in init(), load narration mapping
        if (this.narrationsEnabled) {
            fetch('tg_sorted_narrations/narration_files.txt')
                .then(res => res.text())
                .then(text => {
                    text.trim().split('\n').slice(1).forEach(line => {
                        // Parse first two CSV fields: file_id and prod_id
                        const match = line.match(/^([^,]+),\s*([^,]+),/);
                        if (match) {
                            const id = match[1].trim();
                            const code = match[2].trim();
                            if (!this.narrationMap[code]) this.narrationMap[code] = [];
                            this.narrationMap[code].push(id);
                        }
                    });
                });
        }
    }

    performFastStartup() {
        // Load graphical background and data first
        this.paintCurrentConditionsData();
        
        // Then teleport everything else in at once
        const commonElements = [
            '.header-bottom', '.twc-logo', '.header-text-shadow', '.header-text', 
            '.clock', '.ldl-image', '#ldl-text-span', '.header-line',
            '.centerbox-layer:not(.ef-layer)'
        ];
        
        commonElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.clipPath = 'none';
                el.style.transition = 'none'; // No animation
            });
        });

        // Apply modern mode if enabled  
        if (this.config.modern) {
            this.bufferManager.log('Applying modern mode...', 'info', 'RENDERER');
            document.body.classList.add('modern-mode');
            this.applyModernModeAssets();
        }
        
        // Remove initial clip mask so UI can render
        document.body.style.clipPath = 'none';
        const contentContainer = document.querySelector('.content-container');
        if (contentContainer) contentContainer.style.clipPath = 'none';
        
        // Start systems
        this.finishInitialization();
    }

    performSlowStartup() {
        // Animate everything in using standard animation style
        const sequence = [
            { element: document.body, delay: 0, duration: 3000, type: 'image' },
            { selector: '.clock', delay: 500, duration: 800, type: 'image' },
            { selector: '.ldl-image', delay: 1000, duration: 800, type: 'image' },
            { selector: '#ldl-text-span', delay: 1500, duration: 800, type: 'text' },
            { selector: '.header-bottom', delay: 2000, duration: 1000, type: 'image' },
            { element: document.querySelector('.content-container'), delay: 2500, duration: 2000, type: 'image' },
            { selector: '.twc-logo', delay: 3500, duration: 1000, type: 'image' },
            { selector: '.header-text-shadow', delay: 4500, duration: 800, type: 'text' },
            { selector: '.header-text', delay: 5000, duration: 800, type: 'text' },
            // Split centerbox layers into sequential entries
            { selector: '.centerbox-layer.layer-0', delay: 6000, duration: 120, type: 'image' },
            { selector: '.centerbox-layer.layer-1', delay: 6120, duration: 120, type: 'image' },
            { selector: '.centerbox-layer.layer-2', delay: 6240, duration: 120, type: 'image' },
            { selector: '.centerbox-layer.layer-3', delay: 6360, duration: 120, type: 'image' },
            { selector: '.centerbox-layer.layer-4', delay: 6480, duration: 120, type: 'image' },
            { selector: '.centerbox-layer.layer-5', delay: 6600, duration: 120, type: 'image' },
            { selector: '.centerbox-layer.layer-6', delay: 6720, duration: 120, type: 'image' }
        ];

        this.executePaintSequence(sequence, () => {
            this.paintCurrentConditionsData();
            this.finishInitialization();
        });
    }

    async preloadRadarData() {
        this.bufferManager.log('Preloading radar data...', 'info', 'RENDERER');
        try {
            await this.loadRadarData({ reveal: false });
            this.bufferManager.log('Radar data preloaded successfully', 'info', 'RENDERER');
        } catch (error) {
            this.bufferManager.log(`Failed to preload radar data: ${error.message}`, 'error', 'RENDERER');
        }
    }

    initializeWeatherSTAR() {
        // Legacy method - now handled by init()
        this.bufferManager.log('Legacy initializeWeatherSTAR called - redirecting to init()', 'info', 'RENDERER');
        this.init();
    }

    hideAllElements() {
        // Set initial clip paths for all elements
    const imageElements = document.querySelectorAll('img, .centerbox-layer, .radar-header, .radar-basemap, .radar-data, .current-location, .current-temp, .current-condition, .weather-icon, .current-data-labels');
        imageElements.forEach(el => {
            el.style.clipPath = 'inset(0 0 100% 0)';
            el.style.opacity = '1';
            el.style.display = 'none'; // Hidden until needed
        });

    const textElements = document.querySelectorAll('.header-text, .header-text-shadow, #ldl-text-span, #local-forecast-text');
        textElements.forEach(el => {
            el.style.clipPath = 'inset(0 100% 0 0)';
            el.style.opacity = '1';
            el.style.display = 'none'; // Hidden until needed
        });

        // Hide Extended Forecast elements initially
        const efElements = document.querySelectorAll('#ef-overlay, .ef-icon, .centerbox-layer.ef-layer');
        efElements.forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
            // Reset clipPath for potential animation
            el.style.clipPath = 'inset(0 0 100% 0)';
        });

        const localPanel = document.getElementById('local-observations-panel');
        if (localPanel) {
            localPanel.style.display = 'none';
            localPanel.style.opacity = '0';
            localPanel.style.clipPath = 'inset(0 0 100% 0)';
        }

        document.body.style.clipPath = 'inset(0 0 100% 0)';
        document.querySelector('.content-container').style.clipPath = 'inset(0 0 100% 0)';
    }

    executePaintSequence(sequence, callback) {
        let completed = 0;
        const total = sequence.length;

        sequence.forEach((item, index) => {
            setTimeout(() => {
                let elements = [];
                
                if (item.element) {
                    elements = [item.element];
                } else if (item.selector) {
                    elements = Array.from(document.querySelectorAll(item.selector));
                }

                elements.forEach(element => {
                    element.style.display = 'block';
                    
                    if (item.type === 'text') {
                        this.simulateTypewriterEffect(element, item.duration);
                    } else {
                        this.simulateDialUpLoading(element, item.duration, item.element === document.body);
                    }
                });

                completed++;
                if (completed === total && callback) {
                    // After paint-in completes, invoke the callback
                    setTimeout(callback, Math.max(...sequence.map(s => s.delay + s.duration)) + 100);
                }
            }, item.delay);
        });
    }

    finishInitialization() {
        this.bufferManager.log('Paint-in sequence complete, starting systems...', 'info', 'RENDERER');
        
        // Apply modern mode if enabled (only if not already done in fast startup)
        if (this.config.modern && !document.body.classList.contains('modern-mode')) {
            this.bufferManager.log('Applying modern mode...', 'info', 'RENDERER');
            document.body.classList.add('modern-mode');
            this.applyModernModeAssets();
        }
        
        // Remove initial clip mask so UI can render (only if not already done)
        if (document.body.style.clipPath !== 'none') {
            document.body.style.clipPath = 'none';
        }
        const contentContainer = document.querySelector('.content-container');
        if (contentContainer && contentContainer.style.clipPath !== 'none') {
            contentContainer.style.clipPath = 'none';
        }
        
        // Paint current conditions data (only if not already done in fast startup)
        if (this.slowDraw) {
            this.paintCurrentConditionsData();
        }
        
        // Handle Lot8s cueing if enabled
        if (this.config.lot8s_cue === 'y') {
            this.bufferManager.log('Lot8s cue enabled, scheduling cues...', 'info', 'RENDERER');
            // Parse cue time patterns
            this.cuePatterns = (this.config.cuetimes || '').split(',')
                .map(code => ({ prefix: code.charAt(0), minute: parseInt(code.slice(1),10) }))
                .filter(p => ['x','o'].includes(p.prefix) && Number.isInteger(p.minute) && p.minute >=0 && p.minute < 60);
            // Schedule first cue
            this.scheduleNextCue();
        } else {
            // Queue initial slide assets
            this.bufferManager.queueSlide('SLIDE_CC');
            // Start LDL and segment systems immediately
            this.startLDLLoop();
            this.startSegmentSequence();
        }
        this.isInitialized = true;
        this.baseAssetsReady = true;
        this.updateRedModeState();
        this.updateAlertVisualState();
        this.applyViewportScale();
    }

    getLocalForecastDuration() {
        const periods = window.weatherData?.rawPeriods;
        if (!Array.isArray(periods) || periods.length < 3) return 12000;
        
        const firstThree = periods.slice(0, 3);
        const fullText = firstThree.map(p => {
            return `${p.name.toUpperCase()}...${p.detailedForecast || p.shortForecast}`;
        }).join(' ');
        
        const pages = this.splitTextIntoPages(fullText);
        return pages.length * 7000; // 7 seconds per page
    }

    paintCurrentConditionsData() {
        const ccElements = document.querySelectorAll(
            '.current-location, .current-temp, .current-condition, .weather-icon, ' +
            '.current-data-labels, .data-humidity, .data-dewpoint, .data-ceiling, ' +
            '.data-visibility, .data-pressure, .data-windchill, .current-wind, .current-wind-line2'
        );

        ccElements.forEach((element, index) => {
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '1';
                element.style.clipPath = 'inset(0 0 100% 0)';
                
                setTimeout(() => {
                    this.simulateDialUpLoading(element, 200, false);
                }, index * 50);
            }
        });
    }

    simulateDialUpLoading(element, duration = 3000, isBackground = false) {
        let scanlineProgress = 0;
        const totalDuration = duration;
        const startTime = Date.now();
        
        const smoothScan = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            let easedProgress;
            if (isBackground) {
                easedProgress = Math.pow(progress, 0.7);
            } else if (duration < 1000) {
                easedProgress = progress;
            } else {
                easedProgress = 1 - Math.pow(1 - progress, 2);
            }
            
            const revealPercentage = easedProgress * 100;
            const clipValue = Math.max(0, 100 - revealPercentage);
            
            element.style.clipPath = `inset(0 0 ${clipValue}% 0)`;
            
            if (progress < 1) {
                requestAnimationFrame(smoothScan);
            } else {
                element.style.clipPath = 'none';
                
                if (this.config.debug_mode === 'y') {
                    const type = isBackground ? 'background' : 'element';
                    console.log(`${type} ${element.className || element.tagName} fully scanned! (${duration}ms)`);
                }
            }
        };
        
        requestAnimationFrame(smoothScan);
    }

    simulateTypewriterEffect(element, duration = 800) {
        const originalText = element.textContent;
        
        element.style.clipPath = 'inset(0 100% 0 0)';
        element.style.opacity = '1';
        
        const totalDuration = duration;
        const startTime = Date.now();
        
        const wipeReveal = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            const revealPercentage = progress * 100;
            const clipValue = Math.max(0, 100 - revealPercentage);
            
            element.style.clipPath = `inset(0 ${clipValue}% 0 0)`;
            
            if (progress < 1) {
                requestAnimationFrame(wipeReveal);
            } else {
                element.style.clipPath = 'none';
                
                if (this.config.debug_mode === 'y') {
                    console.log(`Text "${originalText}" fully wiped in! (${duration}ms)`);
                }
            }
        };
        
        requestAnimationFrame(wipeReveal);
    }

    animateCurrentConditionsText() {
        const tempElement = document.querySelector('.current-temp');
        const conditionElement = document.querySelector('.current-condition');
        const weatherIconElement = document.querySelector('.weather-icon');
        const dataLabelsElement = document.querySelector('.current-data-labels');
        const individualDataElements = document.querySelectorAll('.data-humidity, .data-dewpoint, .data-ceiling, .data-visibility, .data-pressure, .data-windchill');
        const windElements = document.querySelectorAll('.current-wind, .current-wind-line2');
        const locationElement = document.querySelector('.current-location');
        
        if (this.config.debug_mode === 'y') {
            console.log('PAINTING Current Conditions data - NO MERCY!');
        }
        
        const allElements = [locationElement, tempElement, conditionElement, weatherIconElement, dataLabelsElement, ...individualDataElements, ...windElements];
        
        allElements.forEach((element, index) => {
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '1';
                element.style.clipPath = 'inset(0 0 100% 0)';
                
                setTimeout(() => {
                    this.simulateDialUpLoading(element, 200, false);
                }, index * 50);
            }
        });
    }

    startSegmentSequence() {
        if (!this.isInitialized) {
            this.bufferManager.log('Segment sequence delayed - waiting for initialization', 'info', 'RENDERER');
            setTimeout(() => this.startSegmentSequence(), 1000);
            return;
        }

        if (this.segmentTimeout) {
            clearTimeout(this.segmentTimeout);
            this.segmentTimeout = null;
        }
        
        this.bufferManager.log('Starting segment sequence (full product cycle)...', 'info', 'RENDERER');

        if (this.lockedSlideId) {
            this.bufferManager.log(`Slide lock active: ${this.lockedSlideId} (rotation paused)`, 'info', 'RENDERER');
            this.transitionToSlide(this.lockedSlideId);
            return;
        }

        // Start with Current Conditions
        this.transitionToSlide('SLIDE_CC');
        this.startProductRotation();
    }

    startProductRotation() {
        if (this.segmentTimeout) {
            clearTimeout(this.segmentTimeout);
        }

        // Get flavor configuration from BufferManager
        const flavorConfig = this.bufferManager.flavorConfig;
        if (!flavorConfig) {
            this.bufferManager.log('No flavor config found, using default DE02', 'error', 'RENDERER');
            // Default fallback
            const products = [
                { slideId: 'SLIDE_CC',       name: 'Current Conditions', duration: 15000 },
                { slideId: 'SLIDE_LOCAL_OBS', name: 'Latest Observations', duration: 15000 },
                { slideId: 'SLIDE_LOCAL',    name: 'Local Forecast',     duration: 15000 },
                { slideId: 'SLIDE_EXTENDED', name: 'Extended Forecast',  duration: 15000 },
                { slideId: 'SLIDE_RADAR',    name: 'Radar',              duration: 15000 }
            ];
            this.rotateProducts(products, 0);
            return;
        }
        
        // Build product list from flavor config
        const products = [];
        flavorConfig.slides.forEach(slideId => {
            switch(slideId) {
                case 'SLIDE_CC':
                    products.push({ slideId: 'SLIDE_CC',    name: 'Current Conditions', duration: 15000 });
                    break;
                case 'SLIDE_LOCAL_OBS':
                    products.push({ slideId: 'SLIDE_LOCAL_OBS', name: 'Latest Observations', duration: 15000 });
                    break;
                case 'SLIDE_LOCAL':
                    products.push({ slideId: 'SLIDE_LOCAL', name: 'Local Forecast',     duration: 15000 });
                    break;
                case 'SLIDE_EXTENDED':
                    products.push({ slideId: 'SLIDE_EXTENDED', name: 'Extended Forecast', duration: 15000 });
                    break;
                case 'SLIDE_RADAR':
                    products.push({ slideId: 'SLIDE_RADAR', name: 'Radar', duration: 15000 });
                    break;
                case 'SLIDE_LDL':
                    // LDL runs continuously, no duration needed
                    this.bufferManager.log('LDL flavor - continuous LDL loop mode', 'info', 'RENDERER');
                    return;
            }
        });
        
        this.bufferManager.log(`Starting ${flavorConfig.name} rotation with ${products.length} products`, 'info', 'RENDERER');
        this.rotateProducts(products, 0);
    }
    
    rotateProducts(products, currentIndex) {
        const product = products[currentIndex];
        // DISABLED: Intro video functionality commented out due to budget constraints
        // console.log(`rotateProducts: slide=${product.slideId}, intros=${this.config.intros}`);
        console.log(`rotateProducts: slide=${product.slideId}`);
        
        this.bufferManager.log(`Transitioning to: ${product.name}`, 'info', 'RENDERER');
        this.transitionToSlide(product.slideId);        const nextProduct = () => {
            // Check if loop is disabled
            if (this.config.loop === 'n') {
                const nextIndex = currentIndex + 1;
                if (nextIndex >= products.length) {
                    // Completed flavor sequence and loop is disabled
                    this.bufferManager.log('Flavor sequence complete, loop disabled', 'info', 'RENDERER');
                    this.stopMusic(); // Stop music when Local on the 8s sequence ends
                    // Keep ad crawl running even when loop is disabled
                    
                    // LDL always visible - no special handling needed
                    {
                        // Instead of nuking the renderer, just stop product rotation
                        this.bufferManager.log('Stopping product rotation - waiting for next cue', 'info', 'RENDERER');
                        // Clear intervals but keep UI visible for LDL or manual control
                        if (this.segmentTimeout) {
                            clearTimeout(this.segmentTimeout);
                            this.segmentTimeout = null;
                        }
                    }
                    return;
                }
                // Continue to next product in sequence
                this.rotateProducts(products, nextIndex);
            } else {
                // Loop enabled - continue rotation
                const nextIndex = (currentIndex + 1) % products.length;
                this.rotateProducts(products, nextIndex);
            }
        };
        
        this.segmentTimeout = setTimeout(nextProduct, product.duration);
    }
    
    stopRendering() {
        // Clear any active timeouts
        if (this.segmentTimeout) {
            clearTimeout(this.segmentTimeout);
            this.segmentTimeout = null;
        }
        
        if (this.ldlLoopInterval) {
            clearInterval(this.ldlLoopInterval);
            this.ldlLoopInterval = null;
        }
        
        if (this.radarRefreshInterval) {
            clearInterval(this.radarRefreshInterval);
            this.radarRefreshInterval = null;
        }

        if (this.boundLocalObsUpdate) {
            window.removeEventListener('local-observations-update', this.boundLocalObsUpdate);
            this.boundLocalObsUpdate = null;
        }
        if (this.boundAlertsUpdate) {
            window.removeEventListener('weather-alerts-update', this.boundAlertsUpdate);
            this.boundAlertsUpdate = null;
        }
        
        // Hide all UI elements
        this.hideAllUIElements();
        
    // Set body to gray background and hide graphical background
    const content = document.querySelector('.content-container');
    if (content) content.style.display = 'none';
        document.body.style.clipPath = 'none';
        
        // Stop BufferManager heartbeat
        this.bufferManager.destroy();
        
        this.bufferManager.log('Rendering stopped - gray screen mode', 'info', 'RENDERER');
    }

    updateRedModeState() {
        const shouldActivate = this.shouldUseRedMode();
        if (!this.baseAssetsReady) {
            this.pendingRedModeState = shouldActivate;
            return;
        }
        this.pendingRedModeState = null;
        this.setRedModeActive(shouldActivate);
    }

    shouldUseRedMode() {
        this.redModeForced = this.normalizeBoolean(this.config.force_red_mode);
        if (this.redModeForced) {
            return true;
        }
        // Temporarily disable automatic activation based on alerts
        return false;
    }

    ensureLDLBaseImage() {
        const ldlImg = document.querySelector('.ldl-image');
        if (!ldlImg) {
            return null;
        }
        if (!this.ldlBaseImageCaptured) {
            const currentSrc = ldlImg.getAttribute('src') || this.ldlBaseImage;
            if (currentSrc) {
                this.ldlBaseImage = currentSrc;
            }
            this.ldlBaseImageCaptured = true;
        }
        return ldlImg;
    }

    setLDLImageSource(newSrc) {
        const ldlImg = this.ensureLDLBaseImage();
        if (!ldlImg || !newSrc) {
            return;
        }
        const currentAttr = ldlImg.getAttribute('src');
        if (currentAttr !== newSrc) {
            ldlImg.setAttribute('src', newSrc);
            this.bufferManager.log(`LDL image swapped to ${newSrc}`, 'info', 'RENDERER');
        }
    }

    determineAlertLevel(alerts) {
        if (!Array.isArray(alerts) || alerts.length === 0) {
            return 'none';
        }

        let level = 'none';
        for (const alert of alerts) {
            if (!alert) continue;
            const event = String(alert.event || '').toLowerCase();
            const severity = String(alert.severity || '').toLowerCase();
            const urgency = String(alert.urgency || '').toLowerCase();
            const certainty = String(alert.certainty || '').toLowerCase();

            const isWarning = /warning|emergency/.test(event) || ['extreme', 'severe'].includes(severity) || urgency === 'immediate';
            if (isWarning) {
                return 'warning';
            }

            const isWatch = /watch|advisory/.test(event) || ['moderate'].includes(severity) || certainty === 'possible';
            if (isWatch) {
                level = 'watch';
            }
        }
        return level;
    }

    scoreAlertPriority(alert) {
        if (!alert) return 0;
        const event = String(alert.event || '').toLowerCase();
        const severity = String(alert.severity || '').toLowerCase();
        const urgency = String(alert.urgency || '').toLowerCase();
        if (/warning|emergency/.test(event) || ['extreme', 'severe'].includes(severity) || urgency === 'immediate') {
            return 2;
        }
        if (/watch|advisory/.test(event) || severity === 'moderate') {
            return 1;
        }
        return 0;
    }

    stripAlertIntro(text) {
        if (!text) {
            return '';
        }
        const normalized = String(text).replace(/\r\n/g, '\n').trim();
        if (!normalized) {
            return '';
        }

        const doubleBreak = normalized.indexOf('\n\n');
        if (doubleBreak >= 0 && doubleBreak < 400) {
            return normalized.slice(doubleBreak + 2).trim();
        }

        const lines = normalized.split('\n');
        while (lines.length && /^[A-Z0-9\-\/\s]{4,}$/.test(lines[0].trim())) {
            lines.shift();
        }
        return lines.join('\n').trim();
    }

    wrapAlertText(text, maxLen = 52) {
        if (!text) {
            return [];
        }
        const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
        const lines = [];
        let current = '';
        words.forEach((word) => {
            const candidate = current ? `${current} ${word}` : word;
            if (candidate.length > maxLen && current) {
                lines.push(current.toUpperCase());
                current = word;
            } else {
                current = candidate;
            }
        });
        if (current) {
            lines.push(current.toUpperCase());
        }
        return lines;
    }

    buildAlertLines(alerts) {
        if (!Array.isArray(alerts) || alerts.length === 0) {
            return [];
        }

        const sorted = alerts.slice().sort((a, b) => this.scoreAlertPriority(b) - this.scoreAlertPriority(a));
        const lines = [];

        sorted.forEach((alert, index) => {
            if (!alert) return;
            const title = String(alert.event || 'Weather Alert').toUpperCase();
            if (title) {
                lines.push(title);
            }

            const headline = this.stripAlertIntro(alert.headline || '');
            if (headline) {
                lines.push(...this.wrapAlertText(headline));
            }

            const description = this.stripAlertIntro(alert.description || '');
            if (description) {
                const paragraphs = description.split(/\n+/).filter(Boolean);
                paragraphs.forEach((paragraph) => {
                    lines.push(...this.wrapAlertText(paragraph));
                });
            }

            const instruction = this.stripAlertIntro(alert.instruction || '');
            if (instruction) {
                lines.push(...this.wrapAlertText(instruction));
            }

            if (index < sorted.length - 1) {
                lines.push('—');
            }
        });

        return lines.filter(line => line && line.trim().length);
    }

    hideLDLText() {
        this.bufferManager.hideAsset('ASSET_LDL_TEXT');
        const ldlContainer = document.querySelector('.ldl-text');
        if (ldlContainer) {
            ldlContainer.style.display = 'none';
            ldlContainer.style.opacity = '0';
        }
    }

    showLDLText() {
        this.bufferManager.showAsset('ASSET_LDL_TEXT');
        const ldlContainer = document.querySelector('.ldl-text');
        if (ldlContainer) {
            ldlContainer.style.display = 'block';
            ldlContainer.style.opacity = '1';
        }
        const ldlSpan = document.getElementById('ldl-text-span');
        if (ldlSpan) {
            ldlSpan.style.display = 'inline-block';
            ldlSpan.style.opacity = '1';
        }
    }

    updateAlertVisualState() {
        const level = this.determineAlertLevel(this.latestAlerts);
        const previousLevel = this.alertLevel;
        this.alertLevel = level;

        const isAlertActive = level === 'watch' || level === 'warning';
        document.body.classList.toggle('ldl-alert-watch', level === 'watch');
        document.body.classList.toggle('ldl-alert-warning', level === 'warning');
        if (!isAlertActive) {
            document.body.classList.remove('ldl-alert-watch', 'ldl-alert-warning');
        }
        const alertLines = isAlertActive ? this.buildAlertLines(this.latestAlerts) : null;

        if (isAlertActive) {
            const alertSrc = level === 'warning' ? this.ldlWarningImage : this.ldlWatchImage;
            this.setLDLImageSource(alertSrc);
            this.stopLDLLoop();
            this.hideLDLText();
            if (!this.alertScrollActive) {
                this.savedAdCrawlMessages = [...this.adCrawlMessages];
            }
            const message = this.composeAlertCrawlMessage(alertLines);
            this.stopAdCrawl();
            this.startAdCrawl({
                force: true,
                messages: [message]
            });
        } else {
            this.setLDLImageSource(this.ldlBaseImage);
            this.stopAdCrawl();
            if (this.savedAdCrawlMessages && this.savedAdCrawlMessages.length) {
                this.adCrawlMessages = [...this.savedAdCrawlMessages];
                this.savedAdCrawlMessages = null;
            } else if (this.defaultAdCrawlMessages.length) {
                this.adCrawlMessages = [...this.defaultAdCrawlMessages];
            }
            this.showLDLText();
            this.startLDLLoop(null, { mode: 'conditions', interval: 4000 });
            if (this.config.ad_crawl_enabled) {
                this.startAdCrawl();
            }
        }

        if (previousLevel !== level) {
            this.bufferManager.log(`Alert level changed: ${previousLevel} -> ${level}`, 'info', 'RENDERER');
        }
    }

    setRedModeActive(active) {
        const currentlyActive = this.isRedModeActive === true;
        if (active && !currentlyActive) {
            this.applyRedModeAssets();
        } else if (!active && currentlyActive) {
            this.restoreDefaultAssets();
        }
    }

    applyRedModeAssets() {
        this.bufferManager.log('Applying red mode assets', 'info', 'RENDERER');
        this.redModeAssetMap.forEach((src, selector) => {
            this.swapImageSource(selector, src);
        });
        this.swapBackground('.content-container', "url('./red_mode/graphical.png')");
        document.body.classList.add('red-mode');
        this.isRedModeActive = true;
    }

    restoreDefaultAssets() {
        this.bufferManager.log('Restoring default assets', 'info', 'RENDERER');
        this.redModeAssetMap.forEach((_, selector) => {
            this.restoreImageSource(selector);
        });
        this.restoreBackground('.content-container');
        document.body.classList.remove('red-mode');
        this.isRedModeActive = false;
    }

    swapImageSource(selector, newSrc) {
        const element = document.querySelector(selector);
        if (!element) return;
        if (!element.dataset.defaultSrc) {
            element.dataset.defaultSrc = element.getAttribute('src') || '';
        }
        if (element.getAttribute('src') === newSrc) return;
        element.setAttribute('src', newSrc);
    }

    restoreImageSource(selector) {
        const element = document.querySelector(selector);
        if (!element) return;
        const defaultSrc = element.dataset ? element.dataset.defaultSrc : undefined;
        if (defaultSrc !== undefined) {
            element.setAttribute('src', defaultSrc);
        }
    }

    swapBackground(selector, backgroundImage) {
        const element = document.querySelector(selector);
        if (!element) return;
        if (!element.dataset.defaultBackgroundImage) {
            const computed = window.getComputedStyle(element);
            element.dataset.defaultBackgroundImage = computed.backgroundImage || '';
            element.dataset.defaultBackgroundSize = computed.backgroundSize || '';
            element.dataset.defaultBackgroundPosition = computed.backgroundPosition || '';
            element.dataset.defaultBackgroundRepeat = computed.backgroundRepeat || '';
        }
        element.style.backgroundImage = backgroundImage;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.backgroundRepeat = 'no-repeat';
    }

    restoreBackground(selector) {
        const element = document.querySelector(selector);
        if (!element) return;
        const data = element.dataset || {};
        if (data.defaultBackgroundImage !== undefined) {
            element.style.backgroundImage = data.defaultBackgroundImage;
            element.style.backgroundSize = data.defaultBackgroundSize || '';
            element.style.backgroundPosition = data.defaultBackgroundPosition || '';
            element.style.backgroundRepeat = data.defaultBackgroundRepeat || '';
        } else {
            element.style.backgroundImage = '';
            element.style.backgroundSize = '';
            element.style.backgroundPosition = '';
            element.style.backgroundRepeat = '';
        }
    }

    transitionToSlide(slideId) {
    // Clear all slide state classes before applying the new one
    document.body.classList.remove('slide-cc', 'slide-radar', 'slide-extended', 'slide-local', 'slide-local-obs');
        document.body.classList.add(
            slideId === 'SLIDE_CC' ? 'slide-cc' :
            slideId === 'SLIDE_RADAR' ? 'slide-radar' :
            slideId === 'SLIDE_LOCAL' ? 'slide-local' :
            slideId === 'SLIDE_LOCAL_OBS' ? 'slide-local-obs' :
            slideId === 'SLIDE_EXTENDED' ? 'slide-extended' : ''
        );
        
        const previousSlide = this.currentSlide;
        
        // Get asset lists for comparison
        const previousAssets = previousSlide ? this.bufferManager.slideCompositions[previousSlide] || [] : [];
        const currentAssets = this.bufferManager.slideCompositions[slideId] || [];
        
        // Determine which assets are new/changed
        const assetsToHide = previousAssets.filter(assetId => !currentAssets.includes(assetId));
        const assetsToShow = currentAssets.filter(assetId => !previousAssets.includes(assetId));
        const persistentAssets = currentAssets.filter(assetId => previousAssets.includes(assetId));
        
        this.bufferManager.log(`Transition analysis: ${assetsToHide.length} to hide, ${assetsToShow.length} to show, ${persistentAssets.length} persistent`, 'info', 'RENDERER');

        // Handle special setup for each slide
        if (slideId === 'SLIDE_RADAR') {
            this.setupRadarSlide();
        } else if (slideId === 'SLIDE_EXTENDED') {
            this.setupExtendedForecastSlide();
        } else if (slideId === 'SLIDE_LOCAL_OBS') {
            this.setupLocalObservationsSlide();
        } else if (slideId === 'SLIDE_LOCAL') {
            this.setupLocalForecastSlide();
        } else if (slideId === 'SLIDE_CC') {
            this.setupCurrentConditionsSlide();
        }
        
        // Hide assets that are no longer needed
        assetsToHide.forEach(assetId => {
            this.bufferManager.hideAsset(assetId);
        });
        
        // Show new assets with smart animation
        this.showNewAssets(assetsToShow, slideId);

        if (persistentAssets.length > 0) {
            this.ensurePersistentAssetsVisible(persistentAssets);
        }
        
        // Handle header text changes (always consider this "new" content)
        this.handleHeaderTextChanges(slideId, previousSlide);
        
        this.currentSlide = slideId;
        // Play a random narration clip if enabled
        if (this.narrationsEnabled) {
            console.log('Narrations enabled, checking for slide:', slideId);
            // Choose static vs animated radar narration
            const isAnimated = (this.config.animate_radar === true || this.config.animate_radar === 'true' ||
                               this.config.modern === true || this.config.modern === 'true');
            // Determine narration code per slide
            let code = null;
            if (slideId === 'SLIDE_CC') code = 'cc';
            else if (slideId === 'SLIDE_LOCAL_OBS') code = 'ol';
            else if (slideId === 'SLIDE_LOCAL') code = 'hr';
            else if (slideId === 'SLIDE_EXTENDED') code = 'ex';
            else if (slideId === 'SLIDE_RADAR') code = isAnimated ? 'lr' : 'cr';
            console.log(`Narration code for ${slideId}:`, code);
            // Play a random file if available
            const list = code && this.narrationMap[code];
            console.log(`Available narrations for ${code}:`, list);
            if (Array.isArray(list) && list.length) {
                const idx = Math.floor(Math.random() * list.length);
                const audioEl = document.getElementById('narration-audio');
                if (audioEl) {
                    const src = `tg_sorted_narrations/${code}/${list[idx]}.flac`;
                    console.log('Playing narration:', src);
                    audioEl.src = src;
                    audioEl.play().catch((err) => {
                        console.log('Narration play failed:', err);
                    });
                }
            } else {
                console.log('No narrations available for code:', code);
            }
        } else {
            console.log('Narrations disabled');
        }
    }
    
    playNarrationFiles(audioEl, fileIds) {
        const playNext = (index) => {
            if (index >= fileIds.length) return;
            const fileId = fileIds[index];
            audioEl.src = `tg_sorted_narrations/${fileId}.flac`;
            audioEl.play().then(() => {
                // Wait for this file to finish, then play next
                audioEl.onended = () => playNext(index + 1);
            }).catch(() => {
                // If error, try to play next file immediately
                playNext(index + 1);
            });
        };
        // Start playback with the first file
        playNext(0);
    }
    
    showNewAssets(assetsToShow, slideId) {
        // Group assets by type for proper animation ordering
        const headerAssets = assetsToShow.filter(id => id.includes('HEADER'));
        const boxLayerAssets = assetsToShow.filter(id => id.startsWith('ASSET_BOX_LAYER_'));
        const radarAssets = assetsToShow.filter(id => id.includes('RADAR'));
        const otherAssets = assetsToShow.filter(id => 
            !id.includes('HEADER') && 
            !id.startsWith('ASSET_BOX_LAYER_') && 
            !id.includes('RADAR')
        );
        
        // Show assets in proper order with appropriate animation
        let delay = 0;
        
        // 1. Headers first (if any)
        headerAssets.forEach(assetId => {
            setTimeout(() => {
                if (this.slowDraw) {
                    this.showAssetWithAnimation(assetId, 'text');
                } else {
                    this.bufferManager.showAsset(assetId);
                }
            }, delay);
            delay += this.slowDraw ? 200 : 0;
        });
        
        // 2. Other elements
        otherAssets.forEach(assetId => {
            setTimeout(() => {
                if (this.slowDraw) {
                    this.showAssetWithAnimation(assetId, 'image');
                } else {
                    this.bufferManager.showAsset(assetId);
                }
            }, delay);
            delay += this.slowDraw ? 100 : 0;
        });
        
        // 3. Box layers sequentially (if any)
        if (boxLayerAssets.length > 0) {
            setTimeout(() => {
                if (this.slowDraw) {
                    this.animateBoxLayersSequentially(boxLayerAssets);
                } else {
                    // Fast mode - show all at once
                    boxLayerAssets.forEach(assetId => {
                        this.bufferManager.showAsset(assetId);
                    });
                }
            }, delay);
        }
        
        // 4. Radar assets last (special handling for radar/header)
        radarAssets.forEach(assetId => {
            setTimeout(() => {
                // Radar assets never animate, always show immediately
                this.bufferManager.showAsset(assetId);
            }, delay);
        });
    }
    
    showAssetWithAnimation(assetId, type) {
        const asset = this.bufferManager.buffer.get(assetId);
        if (!asset && !this.bufferManager.queueAsset(assetId)) {
            return;
        }
        
        const element = asset ? asset.element : this.bufferManager.buffer.get(assetId)?.element;
        if (!element) return;
        
        const elements = Array.isArray(element) ? element : [element];
        
        elements.forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            
            if (type === 'text') {
                // Left-to-right clip animation for text
                el.style.clipPath = 'inset(0 100% 0 0)';
                el.style.transition = 'clip-path 400ms ease-out';
                
                requestAnimationFrame(() => {
                    el.style.clipPath = 'inset(0 0% 0 0)';
                });
            } else {
                // Top-to-bottom reveal for images
                el.style.clipPath = 'inset(0 0 100% 0)';
                el.style.transition = 'clip-path 300ms ease-out';
                
                requestAnimationFrame(() => {
                    el.style.clipPath = 'inset(0 0 0% 0)';
                });
            }
        });
    }
    
    animateBoxLayersSequentially(boxLayerAssets) {
        // Sort box layers in order (0, 1, 2, 3, 4, 5, 6)
        const sortedLayers = boxLayerAssets.sort((a, b) => {
            const layerA = parseInt(a.split('_').pop());
            const layerB = parseInt(b.split('_').pop());
            return layerA - layerB;
        });
        
        sortedLayers.forEach((assetId, index) => {
            setTimeout(() => {
                this.showAssetWithAnimation(assetId, 'image');
            }, index * 120); // 120ms delay between layers
        });
    }

    ensurePersistentAssetsVisible(assetIds) {
        assetIds.forEach(assetId => {
            const asset = this.bufferManager.buffer.get(assetId) || (this.bufferManager.queueAsset(assetId) ? this.bufferManager.buffer.get(assetId) : null);
            if (!asset) {
                return;
            }

            const elements = Array.isArray(asset.element) ? asset.element : [asset.element];
            elements.forEach(el => {
                if (!el) return;
                const computedDisplay = window.getComputedStyle ? window.getComputedStyle(el).display : el.style.display;
                if (computedDisplay === 'none' || el.style.display === 'none') {
                    el.style.display = 'block';
                }
                el.style.opacity = '1';
                el.style.clipPath = 'none';
                el.style.transition = 'none';
            });
        });
    }
    
    handleHeaderTextChanges(slideId, previousSlide) {
        // Add diagnostic logging
        this.bufferManager.log(`handleHeaderTextChanges: slideId=${slideId}, previousSlide=${previousSlide}`, 'info', 'RENDERER');
        
        // Only animate header text if it actually changed
        const headerChanged = this.isHeaderTextChanged(slideId, previousSlide);
        this.bufferManager.log(`Header changed: ${headerChanged}`, 'info', 'RENDERER');
        
        if (!headerChanged) return;

        this.bufferManager.log('Header text changed - animating new text', 'info', 'RENDERER');
        
        const headerTextElements = document.querySelectorAll('.header-text, .header-text-shadow');
        headerTextElements.forEach(el => {
            if (this.slowDraw) {
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.clipPath = 'inset(0 100% 0 0)';
                el.style.transition = 'clip-path 400ms ease-out';
                requestAnimationFrame(() => {
                    el.style.clipPath = 'inset(0 0% 0 0)';
                });
            } else {
                // Fast mode - no animation
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.clipPath = 'none';
                el.style.transition = 'none';
            }
        });
    }
    
    isHeaderTextChanged(slideId, previousSlide) {
        // Define header text content for each slide
        const headerContent = {
            'SLIDE_CC': ['Current', 'Conditions'],
            'SLIDE_LOCAL_OBS': ['Latest', 'Observations'],
            'SLIDE_LOCAL': ['Local Forecast'], 
            'SLIDE_EXTENDED': ['Extended', 'Forecast'], // Simplified for comparison
            'SLIDE_RADAR': ['', ''] // No text header
        };
        
        const currentHeader = headerContent[slideId] || ['', ''];
        const previousHeader = headerContent[previousSlide] || ['', ''];
        
        return currentHeader[0] !== previousHeader[0] || currentHeader[1] !== previousHeader[1];
    }

    // Hide both header-line wrappers to clear previous header content
    clearLocalForecastHeader() {
        const topWrapper = document.querySelector('.header-line-top');
        const bottomWrapper = document.querySelector('.header-line-bottom');
        if (topWrapper) {
            const topText = topWrapper.querySelector('.header-text.line1');
            const topShadow = topWrapper.querySelector('.header-text-shadow.line1');
            this.setHeaderElementTop(topText, 0);
            this.setHeaderElementLeft(topText, 0);
            this.setHeaderElementLetterSpacing(topText);
            this.setHeaderElementWordSpacing(topText);
            this.setHeaderElementTop(topShadow, 0);
            this.setHeaderElementLeft(topShadow, 0);
            this.setHeaderElementLetterSpacing(topShadow);
            this.setHeaderElementWordSpacing(topShadow);
            this.setHeaderElementTop(topWrapper, 0);
            this.setHeaderElementLeft(topWrapper, 0);
            topWrapper.style.display = 'none';
            topWrapper.style.opacity = '0';
            topWrapper.style.clipPath = '';
            topWrapper.style.top = '';
            topWrapper.style.left = '';
            topWrapper.style.transform = '';
        }
        if (bottomWrapper) {
            const bottomText = bottomWrapper.querySelector('.header-text.line2');
            const bottomShadow = bottomWrapper.querySelector('.header-text-shadow.line2');
            this.setHeaderElementTop(bottomText, 0);
            this.setHeaderElementLeft(bottomText, 0);
            this.setHeaderElementLetterSpacing(bottomText);
            this.setHeaderElementWordSpacing(bottomText);
            this.setHeaderElementTop(bottomShadow, 0);
            this.setHeaderElementLeft(bottomShadow, 0);
            this.setHeaderElementLetterSpacing(bottomShadow);
            this.setHeaderElementWordSpacing(bottomShadow);
            this.setHeaderElementTop(bottomWrapper, 0);
            this.setHeaderElementLeft(bottomWrapper, 0);
            bottomWrapper.style.display = 'none';
            bottomWrapper.style.opacity = '0';
            bottomWrapper.style.clipPath = '';
            bottomWrapper.style.top = '';
            bottomWrapper.style.left = '';
            bottomWrapper.style.transform = '';
        }
    }

    // Set the header title lines, passing empty string hides the line
    setHeaderTitle(line1, line2) {
        const topWrapper = document.querySelector('.header-line-top');
        const bottomWrapper = document.querySelector('.header-line-bottom');
        if (!topWrapper || !bottomWrapper) return;

        // Reset any centering applied by csetHeaderTitle
        topWrapper.style.top = '';
        topWrapper.style.left = '';
        topWrapper.style.transform = '';
        topWrapper.style.opacity = '';
        topWrapper.style.clipPath = '';
        this.setHeaderElementTop(topWrapper, 0);
        this.setHeaderElementLeft(topWrapper, 0);
        this.setHeaderElementTop(bottomWrapper, 0);
        this.setHeaderElementLeft(bottomWrapper, 0);

        const topText = topWrapper.querySelector('.header-text.line1');
        const topShadow = topWrapper.querySelector('.header-text-shadow.line1');
        const bottomText = bottomWrapper.querySelector('.header-text.line2');
        const bottomShadow = bottomWrapper.querySelector('.header-text-shadow.line2');

        if (topText) topText.textContent = line1 || '';
        if (topShadow) topShadow.textContent = line1 || '';
        if (bottomText) bottomText.textContent = line2 || '';
        if (bottomShadow) bottomShadow.textContent = line2 || '';

        this.setHeaderElementTop(topText, 0);
        this.setHeaderElementTop(topShadow, 0);
        this.setHeaderElementLeft(topText, 0);
        this.setHeaderElementLeft(topShadow, 0);
        this.setHeaderElementLetterSpacing(topText);
        this.setHeaderElementLetterSpacing(topShadow);
        this.setHeaderElementWordSpacing(topText);
        this.setHeaderElementWordSpacing(topShadow);
        this.setHeaderElementTop(bottomText, 0);
        this.setHeaderElementTop(bottomShadow, 0);
        this.setHeaderElementLeft(bottomText, 0);
        this.setHeaderElementLeft(bottomShadow, 0);
        this.setHeaderElementLetterSpacing(bottomText);
        this.setHeaderElementLetterSpacing(bottomShadow);
        this.setHeaderElementWordSpacing(bottomText);
        this.setHeaderElementWordSpacing(bottomShadow);

        const showTop = Boolean(line1 && line1.trim().length);
        const showBottom = Boolean(line2 && line2.trim().length);

        topWrapper.style.display = showTop ? 'block' : 'none';
        topWrapper.style.opacity = showTop ? '1' : '0';
        topWrapper.style.clipPath = showTop ? 'none' : '';

        bottomWrapper.style.display = showBottom ? 'block' : 'none';
        bottomWrapper.style.opacity = showBottom ? '1' : '0';
        bottomWrapper.style.clipPath = showBottom ? 'none' : '';
    }

    // Centered single-line header (cset for centered)
    csetHeaderTitle(text) {
        // Clear any two-line header and prepare single-line centered header
        this.clearLocalForecastHeader();

        const topWrapper = document.querySelector('.header-line-top');
        const bottomWrapper = document.querySelector('.header-line-bottom');

        if (bottomWrapper) {
            const bottomText = bottomWrapper.querySelector('.header-text.line2');
            const bottomShadow = bottomWrapper.querySelector('.header-text-shadow.line2');
            if (bottomText) bottomText.textContent = '';
            if (bottomShadow) bottomShadow.textContent = '';
            bottomWrapper.style.display = 'none';
            bottomWrapper.style.opacity = '0';
            bottomWrapper.style.clipPath = '';
            bottomWrapper.style.top = '';
            bottomWrapper.style.left = '';
            bottomWrapper.style.transform = '';
            bottomWrapper.style.position = '';
        }

        if (!topWrapper) return;

        const topText = topWrapper.querySelector('.header-text.line1');
        const topShadow = topWrapper.querySelector('.header-text-shadow.line1');
        if (topText) topText.textContent = text || '';
        if (topShadow) topShadow.textContent = text || '';

        this.setHeaderElementTop(topText, 0);
        this.setHeaderElementLeft(topText, 0);
        this.setHeaderElementLetterSpacing(topText);
        this.setHeaderElementWordSpacing(topText);
        this.setHeaderElementTop(topShadow, 0);
        this.setHeaderElementLeft(topShadow, 0);
        this.setHeaderElementLetterSpacing(topShadow);
        this.setHeaderElementWordSpacing(topShadow);

        topWrapper.style.display = text ? 'block' : 'none';
        topWrapper.style.opacity = text ? '1' : '0';
        topWrapper.style.clipPath = text ? 'none' : '';
        topWrapper.style.top = '1px';
        topWrapper.style.left = '50%';
        topWrapper.style.transform = 'translateX(-10%)';
    }

    setBottomHeaderLine(text, offset = 0) {
        this.clearLocalForecastHeader();

        const topWrapper = document.querySelector('.header-line-top');
        const bottomWrapper = document.querySelector('.header-line-bottom');
        if (topWrapper) {
            const topText = topWrapper.querySelector('.header-text.line1');
            const topShadow = topWrapper.querySelector('.header-text-shadow.line1');
            if (topText) topText.textContent = '';
            if (topShadow) topShadow.textContent = '';
            topWrapper.style.display = 'none';
            topWrapper.style.opacity = '0';
            topWrapper.style.clipPath = '';
            topWrapper.style.top = '60px';
        }

        if (!bottomWrapper) {
            return;
        }

        const bottomText = bottomWrapper.querySelector('.header-text.line2');
        const bottomShadow = bottomWrapper.querySelector('.header-text-shadow.line2');
        if (bottomText) bottomText.textContent = text || '';
        if (bottomShadow) bottomShadow.textContent = text || '';

        this.setHeaderElementTop(bottomText, offset);
        this.setHeaderElementTop(bottomShadow, offset);
        this.setHeaderElementLeft(bottomText, 0);
        this.setHeaderElementLeft(bottomShadow, 0);
        this.setHeaderElementLetterSpacing(bottomText);
        this.setHeaderElementLetterSpacing(bottomShadow);
        this.setHeaderElementWordSpacing(bottomText);
        this.setHeaderElementWordSpacing(bottomShadow);

        const showBottom = Boolean(text && text.trim().length);
        bottomWrapper.style.display = showBottom ? 'block' : 'none';
        bottomWrapper.style.opacity = showBottom ? '1' : '0';
        bottomWrapper.style.clipPath = showBottom ? 'none' : '';
        bottomWrapper.style.left = '';
        bottomWrapper.style.transform = '';

        if (!bottomWrapper.dataset.defaultTop) {
            bottomWrapper.dataset.defaultTop = window.getComputedStyle(bottomWrapper).top || '';
        }

        bottomWrapper.style.top = showBottom ? (bottomWrapper.dataset.defaultTop || '') : '';
    }

    setHeaderElementTop(element, offset = 0) {
        if (!element) return;

        if (this.config?.modern) {
            element.style.removeProperty('top');
            return;
        }

        if (!element.dataset.defaultTop) {
            const computedTop = window.getComputedStyle(element).top || '0px';
            element.dataset.defaultTop = computedTop;
            element.dataset.defaultTopInline = element.style.top || '';
        }

        const defaultTop = element.dataset.defaultTop;
        const numericTop = parseFloat(defaultTop);
        const base = Number.isFinite(numericTop) ? numericTop : 0;
        const unitMatch = defaultTop.match(/([a-z%]+)$/i);
        const unit = unitMatch ? unitMatch[1] : 'px';
        if (offset) {
            const newTop = `${base + offset}${unit}`;
            element.style.setProperty('top', newTop, 'important');
            return;
        }

        const inlineDefault = element.dataset.defaultTopInline;
        if (inlineDefault) {
            element.style.setProperty('top', inlineDefault);
        } else {
            element.style.removeProperty('top');
        }
    }

    setHeaderElementLeft(element, offset = 0) {
        if (!element) return;

        if (this.config?.modern) {
            element.style.removeProperty('left');
            return;
        }

        if (!element.dataset.defaultLeft) {
            const computedLeft = window.getComputedStyle(element).left || '0px';
            element.dataset.defaultLeft = computedLeft;
            element.dataset.defaultLeftInline = element.style.left || '';
        }

        const defaultLeft = element.dataset.defaultLeft;
        const numericLeft = parseFloat(defaultLeft);
        const base = Number.isFinite(numericLeft) ? numericLeft : 0;
        const unitMatch = defaultLeft.match(/([a-z%]+)$/i);
        const unit = unitMatch ? unitMatch[1] : 'px';
        if (offset) {
            const newLeft = `${base + offset}${unit}`;
            element.style.setProperty('left', newLeft, 'important');
            return;
        }

        const inlineDefault = element.dataset.defaultLeftInline;
        if (inlineDefault) {
            element.style.setProperty('left', inlineDefault);
        } else {
            element.style.removeProperty('left');
        }
    }

    setHeaderElementLetterSpacing(element, letterSpacing = null) {
        if (!element) return;

        if (this.config?.modern) {
            element.style.removeProperty('letter-spacing');
            return;
        }

        if (!element.dataset.defaultLetterSpacing) {
            const computedLetterSpacing = window.getComputedStyle(element).letterSpacing || '';
            element.dataset.defaultLetterSpacing = computedLetterSpacing;
            element.dataset.defaultLetterSpacingInline = element.style.letterSpacing || '';
        }

        if (letterSpacing !== null && letterSpacing !== undefined) {
            element.style.setProperty('letter-spacing', letterSpacing, 'important');
            return;
        }

        const inlineDefault = element.dataset.defaultLetterSpacingInline;
        if (inlineDefault) {
            element.style.setProperty('letter-spacing', inlineDefault);
        } else {
            element.style.removeProperty('letter-spacing');
        }
    }

    setHeaderElementWordSpacing(element, wordSpacing = null) {
        if (!element) return;

        if (this.config?.modern) {
            element.style.removeProperty('word-spacing');
            return;
        }

        if (!element.dataset.defaultWordSpacing) {
            const computedWordSpacing = window.getComputedStyle(element).wordSpacing || '';
            element.dataset.defaultWordSpacing = computedWordSpacing;
            element.dataset.defaultWordSpacingInline = element.style.wordSpacing || '';
        }

        if (wordSpacing !== null && wordSpacing !== undefined) {
            element.style.setProperty('word-spacing', wordSpacing, 'important');
            return;
        }

        const inlineDefault = element.dataset.defaultWordSpacingInline;
        if (inlineDefault) {
            element.style.setProperty('word-spacing', inlineDefault);
        } else {
            element.style.removeProperty('word-spacing');
        }
    }

    refreshHeaderVisibility() {
        document.querySelectorAll('.header-line').forEach(el => {
            const textNode = el.querySelector('.header-text');
            const textContent = textNode ? textNode.textContent : '';
            const hasText = Boolean(textContent && textContent.trim().length);
            if (hasText) {
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.clipPath = 'none';
            } else {
                el.style.display = 'none';
                el.style.opacity = '0';
                el.style.clipPath = '';
            }
        });
    }

    shouldUseNoDataRadarHeader() {
        try {
            const data = window.weatherData;
            if (!data) return false;
            if (typeof data.isStationOutsideUS === 'function') {
                return data.isStationOutsideUS() === true;
            }
            const code = typeof data.stationCode === 'string' ? data.stationCode.trim().toUpperCase() : '';
            if (!code) return false;
            if (/^K[A-Z0-9]{3}$/.test(code)) return false;
            if (/^P[ACHMNPRTWX][A-Z0-9]{2}$/.test(code)) return false;
            if (/^T[JKS][A-Z0-9]{2}$/.test(code)) return false;
            if (/^M[DHKNP][A-Z0-9]{2}$/.test(code)) return false;
            if (/^N[A-Z0-9]{3}$/.test(code)) return false;
            return true;
        } catch (error) {
            console.warn('Radar header fallback detection failed:', error.message);
            return false;
        }
    }

    applyViewportScale() {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        const container = document.querySelector('.content-container');
        if (!container) {
            return;
        }

        const baseWidth = Number.isFinite(this.baseContentWidth) && this.baseContentWidth > 0
            ? this.baseContentWidth
            : 720;
        const baseHeight = Number.isFinite(this.baseContentHeight) && this.baseContentHeight > 0
            ? this.baseContentHeight
            : 480;

        const viewportWidth = window.innerWidth || baseWidth;
        const viewportHeight = window.innerHeight || baseHeight;

        const scaleX = viewportWidth / baseWidth;
        const scaleY = viewportHeight / baseHeight;
        let scale = Math.min(scaleX, scaleY);
        if (!Number.isFinite(scale) || scale <= 0) {
            scale = 1;
        }

        container.style.width = `${baseWidth}px`;
        container.style.height = `${baseHeight}px`;
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.top = '50%';
        container.style.transformOrigin = 'center center';
        container.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    setupCurrentConditionsSlide() {
        // Clear Local Forecast header if present
        this.clearLocalForecastHeader();
        
        // Remove radar-active class to show ad crawl again
        document.body.classList.remove('radar-active');
        
        // Show TWC logo (hidden during radar segments)
        this.bufferManager.showAsset('ASSET_TWC_LOGO');
        
        // Hide any Extended Forecast visuals
        const efOverlay = document.getElementById('ef-overlay');
        if (efOverlay) efOverlay.style.display = 'none';
        document.querySelectorAll('.centerbox-layer.ef-layer, .ef-icon').forEach(el => {
            el.style.display = 'none';
        });

    // Hide Local Forecast and Latest Observations overlays
    this.hideLocalForecastOverlay();
    this.hideLocalObservationsPanel();

        // Restore header
        this.setHeaderTitle('Current', 'Conditions');
        const topFill = document.querySelector('.header-line-top .header-text.line1');
        if (topFill) {
            topFill.classList.remove('white-text');
        }
        document.querySelectorAll('.header-line').forEach(el => el.classList.remove('header-condensed'));
        this.refreshHeaderVisibility();

        // Restore centerbox layer-1 if needed
        const layer1 = document.querySelector('.centerbox-layer.layer-1');
        if (layer1 && this.originalLayer1Src) {
            layer1.src = this.originalLayer1Src;
        }

    // Stop radar refresh
        this.stopRadarRefresh();
    // Prefetch radar data in background for next radar slide
    this.preloadRadarData();
        // Hide any Extended Forecast visuals before showing CC
        this.hideExtendedForecastElements();
        // Show header, logo, LDL, and text
        this.showCommonElements();
        // Show current conditions content
        this.showCurrentConditions();
        // Ensure header wrapper divs are visible
        document.querySelectorAll('.header-line-top, .header-line-bottom').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });

        // Show header image
        const headerImg = document.querySelector('.header-bottom');
        if (headerImg) {
            headerImg.style.display = 'block';
            headerImg.style.opacity = '1';
            headerImg.style.clipPath = 'none';
        }
        // Show header lines and text
        document.querySelectorAll('.header-line, .header-text, .header-text-shadow').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });
        // Show LDL
        document.querySelectorAll('.ldl-image, #ldl-text-span').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });
        // Show clock and date
        document.querySelectorAll('.clock').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });
        // Show centerbox layers (graphical)
        document.querySelectorAll('.centerbox-layer:not(.ef-layer)').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });

        // Restore graphical background container
        const contentBox = document.querySelector('.content-container');
        if (contentBox) {
            contentBox.style.display = 'block';
            contentBox.style.opacity = '1';
            contentBox.style.clipPath = 'none';
        }
    }

    setupRadarSlide() {
        // Clear Local Forecast header if present
        this.clearLocalForecastHeader();
        
        // Hide ad crawl during radar
        document.body.classList.add('radar-active');
        
        // Explicitly clear header text for radar so previous slide's header doesn't bleed through
        this.setHeaderTitle('', '');
    // Hide all radar header variants
        this.bufferManager.hideAsset('ASSET_RADARHEADER_BLUE');
        this.bufferManager.hideAsset('ASSET_RADARHEADER_PINK');
        this.bufferManager.hideAsset('ASSET_RADARHEADER_MODERN');
        this.bufferManager.hideAsset('ASSET_RADARHEADER_NODATA');
        this.bufferManager.hideAsset('ASSET_TWC_LOGO');
    // Show appropriate radar header
    const useNoDataHeader = this.shouldUseNoDataRadarHeader();
    if (useNoDataHeader) {
        this.bufferManager.showAsset('ASSET_RADARHEADER_NODATA');
        this.bufferManager.hideAsset('ASSET_RADAR_BASEMAP');
        this.bufferManager.hideAsset('ASSET_RADAR_DATA');
        this.stopRadarRefresh();
        return;
    }
    if (this.config.modern) {
        this.bufferManager.showAsset('ASSET_RADARHEADER_MODERN');
    } else if (this.config.animate_radar) {
        this.bufferManager.showAsset('ASSET_RADARHEADER_PINK');
    } else {
        this.bufferManager.showAsset('ASSET_RADARHEADER_BLUE');
    }
        // Animated radar: show GIF and header via BufferManager
        if (this.config.animate_radar) {
            this.bufferManager.log('Radar slide: animated radar mode enabled', 'info', 'RENDERER');
            // Show animated header variant (pink)
            this.bufferManager.showAsset('ASSET_RADARHEADER_PINK');
            // Show basemap and data assets
            this.bufferManager.showAsset('ASSET_RADAR_BASEMAP');
            this.bufferManager.showAsset('ASSET_RADAR_DATA');
            // Set data src to animated GIF
            const radarDataEl = document.querySelector('.radar-data');
            if (radarDataEl) {
                radarDataEl.src = this.config.radar_gif_url;
            }
            // Center on current location
            const loc = window.weatherData?.currentData;
            if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                this.centerRadarOn(loc.latitude, loc.longitude, { zoom: this.getRadarZoom() });
            }
            return;
        }
        // Load and display radar data (static)
        this.bufferManager.log('Radar slide: loading radar data (static)', 'info', 'RENDERER');
        this.loadRadarData({ reveal: true }).then(() => {
            const data = window.weatherData?.currentData;
            if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                this.centerRadarOn(data.latitude, data.longitude, { zoom: this.getRadarZoom() });
            }
            this.startRadarRefresh();
        }).catch(err => {
            this.bufferManager.log(`Error loading radar data: ${err}`, 'error', 'RENDERER');
        });
    }

    setupExtendedForecastSlide() {
        this.bufferManager.log('Setting up Extended Forecast slide', 'info', 'RENDERER');
        
        // Stop radar
        this.stopRadarRefresh();

        // Remove radar-active class to show ad crawl again
        document.body.classList.remove('radar-active');

        // Show TWC logo (hidden during radar segments)
        this.bufferManager.showAsset('ASSET_TWC_LOGO');

    // Hide Local Forecast and Latest Observations overlays
    this.hideLocalForecastOverlay();
    this.hideLocalObservationsPanel();

        // Swap centerbox to Extended Forecast
        const layer1 = document.querySelector('.centerbox-layer.layer-1');
        if (layer1) {
            if (!this.originalLayer1Src) {
                this.originalLayer1Src = layer1.src;
            }
            layer1.src = './centerbox/extendedforecast.png';
        }

        // Set header text for Extended Forecast
        const data = window.weatherData?.currentData || {};
        const rawLoc = data.location || data.station || 'Local';
        const makePossessive = (name) => {
            try {
                const trimmed = String(name).trim();
                if (!trimmed) return "Local's";
                if (/['']s$/i.test(trimmed) || /['']$/i.test(trimmed)) return trimmed;
                if (/s$/i.test(trimmed)) return `${trimmed}'`;
                return `${trimmed}'s`;
            } catch { return "Local's"; }
        };
        const line1 = makePossessive(rawLoc);
        const line2 = 'Extended Forecast';
        
        this.bufferManager.log(`Setting EF header: "${line1}" / "${line2}"`, 'info', 'RENDERER');
        
        // Simple header title setting - no forced visibility
        this.setHeaderTitle(line1, line2);

        // Make location name white (line 1), Extended Forecast stays yellow (line 2)
        const topFill = document.querySelector('.header-line-top .header-text.line1');
        if (topFill) {
            topFill.classList.add('white-text');
        }

        // Render Extended Forecast overlay
        this.renderExtendedForecastOverlay();
    }

    setupLocalObservationsSlide() {
        this.stopRadarRefresh();
        this.hideRadarElements();
        this.hideExtendedForecastElements();
        this.hideLocalForecastOverlay();

        document.body.classList.remove('radar-active');

        this.bufferManager.showAsset('ASSET_TWC_LOGO');

        document.querySelectorAll(
            '.current-location, .current-temp, .current-condition, .weather-icon, ' +
            '.current-data-labels, .data-humidity, .data-dewpoint, .data-ceiling, ' +
            '.data-visibility, .data-pressure, .data-windchill, .current-wind, .current-wind-line2'
        ).forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
        });

        document.querySelectorAll('.centerbox-layer:not(.ef-layer)').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });

        this.setBottomHeaderLine('Latest Observations', -15);
        const bottomText = document.querySelector('.header-line-bottom .header-text.line2');
        const bottomShadow = document.querySelector('.header-line-bottom .header-text-shadow.line2');
        const elements = [bottomText, bottomShadow];
        const headerHorizontalOffset = -10;
        const headerVerticalOffset = -10;
        const headerLetterSpacing = '-15.2px';
        const headerWordSpacing = '-1.5px';
        elements.forEach(el => {
            if (!el) return;
            this.setHeaderElementLeft(el, headerHorizontalOffset);
            this.setHeaderElementTop(el, headerVerticalOffset);
            this.setHeaderElementLetterSpacing(el, headerLetterSpacing);
            this.setHeaderElementWordSpacing(el, headerWordSpacing);
        });
        const topFill = document.querySelector('.header-line-top .header-text.line1');
        if (topFill) {
            topFill.classList.remove('white-text');
        }
        document.querySelectorAll('.header-line').forEach(el => el.classList.remove('header-condensed'));
        this.refreshHeaderVisibility();

        const panel = document.getElementById('local-observations-panel');
        if (panel) {
            panel.style.display = 'block';
            panel.style.opacity = '1';
            panel.style.clipPath = 'none';
        }

        if (Array.isArray(window.weatherData?.localObservations)) {
            this.updateLocalObservationsDisplay(window.weatherData.localObservations);
        }

        if (window.weatherData?.fetchLocalObservations) {
            window.weatherData.fetchLocalObservations()
                .then(() => {
                    if (Array.isArray(window.weatherData.localObservations)) {
                        this.updateLocalObservationsDisplay(window.weatherData.localObservations);
                    }
                })
                .catch(err => console.warn('Failed to refresh local observations:', err));
        }
    }

    hideLocalForecastOverlay() {
        this.clearLocalForecastPaging();
        const localTextOverlay = document.getElementById('local-forecast-text');
        if (localTextOverlay) {
            localTextOverlay.style.display = 'none';
            localTextOverlay.style.opacity = '0';
            localTextOverlay.textContent = '';
        }
    }

    hideLocalObservationsPanel() {
        const panel = document.getElementById('local-observations-panel');
        if (panel) {
            panel.style.display = 'none';
            panel.style.opacity = '0';
        }
    }

    updateLocalObservationsDisplay(observations) {
        const panel = document.getElementById('local-observations-panel');
        if (!panel) return;

        const body = panel.querySelector('.local-obs-body');
        if (!body) return;

        const empty = panel.querySelector('.local-obs-empty');

        body.innerHTML = '';

        const list = Array.isArray(observations) ? observations.filter(Boolean) : [];
        const weatherData = window.weatherData;
        const hasFetched = Number.isFinite(weatherData?.localObservationsLastFetched) && weatherData.localObservationsLastFetched > 0;

        if (list.length === 0) {
            if (empty) {
                empty.style.display = 'block';
                empty.textContent = hasFetched ? 'No nearby observations available.' : 'Loading observations...';
            }
            return;
        }

        if (empty) {
            empty.style.display = 'none';
            empty.textContent = '';
        }

        const sorted = list.slice().sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        const currentStation = typeof weatherData?.stationCode === 'string' ? weatherData.stationCode.toUpperCase() : null;

        let currentObservation = null;
        if (currentStation) {
            currentObservation = sorted.find(obs => {
                const code = typeof obs.station === 'string' ? obs.station.toUpperCase() : '';
                return code === currentStation;
            }) || null;
        }

        const filtered = sorted.filter(obs => {
            if (!currentStation) return true;
            const code = typeof obs.station === 'string' ? obs.station.toUpperCase() : '';
            return code !== currentStation;
        });

        const usedLocations = new Set();
        const displayRows = [];

        if (currentObservation) {
            const currentLabel = this.chooseObservationDisplayName(currentObservation, usedLocations);
            if (currentLabel) {
                displayRows.push({ observation: currentObservation, label: currentLabel, isCurrent: true });
            }
        }

        for (const obs of filtered) {
            if (displayRows.length >= 7) break;
            const label = this.chooseObservationDisplayName(obs, usedLocations);
            if (!label) continue;
            displayRows.push({ observation: obs, label, isCurrent: false });
        }

        if (displayRows.length === 0) {
            if (empty) {
                empty.style.display = 'block';
                empty.textContent = hasFetched ? 'No nearby observations available.' : 'Loading observations...';
            }
            return;
        }

        displayRows.forEach(({ observation, label, isCurrent }) => {
            const row = document.createElement('div');
            row.className = 'local-obs-row';

            const locationCell = document.createElement('div');
            locationCell.className = 'local-obs-cell local-obs-location';
            const nameEl = document.createElement('span');
            nameEl.className = 'local-obs-name';
            let displayLabel = label || String(observation.station || '—');
            const abbreviateFn = window.weatherData?.abbreviateLocationNameIfConfigured;
            if (typeof abbreviateFn === 'function') {
                try {
                    displayLabel = abbreviateFn.call(window.weatherData, displayLabel);
                } catch (err) {
                    console.warn('Local obs name abbreviation failed:', err?.message || err);
                }
            }
            if (isCurrent) {
                displayLabel = `${displayLabel} (CURRENT)`;
            }
            nameEl.textContent = displayLabel;
            locationCell.appendChild(nameEl);

            const tempCell = document.createElement('div');
            tempCell.className = 'local-obs-cell local-obs-temp';
            tempCell.textContent = this.formatObservationTemperature(observation.temperature);

            const conditionCell = document.createElement('div');
            conditionCell.className = 'local-obs-cell local-obs-condition';
            const abbreviatedCondition = this.abbreviateObservationCondition(observation.condition);
            conditionCell.textContent = abbreviatedCondition || '—';

            const windCell = document.createElement('div');
            windCell.className = 'local-obs-cell local-obs-wind';
            windCell.textContent = this.formatObservationWind(observation.windDirection, observation.windSpeed, observation.windGust);

            row.appendChild(locationCell);
            row.appendChild(tempCell);
            row.appendChild(conditionCell);
            row.appendChild(windCell);
            body.appendChild(row);
        });
    }

    abbreviateObservationCondition(condition) {
        if (!condition) {
            return null;
        }
        const normalized = String(condition).toUpperCase();
        let result = normalized
            .replace(/\bMOSTLY\b/g, 'M')
            .replace(/\bPARTLY\b/g, 'P')
            .replace(/\s+/g, ' ')
            .trim();

        if (!result) {
            return null;
        }

        const shouldAbbreviate = typeof window.weatherData?.shouldAbbreviateLocationPrefix === 'function'
            ? window.weatherData.shouldAbbreviateLocationPrefix()
            : Boolean(window.weatherData?.configCache?.abbreviate_location_prefix);

        if (shouldAbbreviate) {
            const words = result.split(' ').filter(Boolean);
            if (words.length > 1) {
                const firstWord = words[0];
                if (firstWord.length > 1 && !firstWord.endsWith('.')) {
                    const initial = firstWord.charAt(0);
                    if (/^[A-Z]$/.test(initial)) {
                        words[0] = `${initial}.`;
                        result = words.join(' ');
                    }
                }
            }
        }

        return result;
    }

    formatObservationTemperature(temp) {
        if (!Number.isFinite(temp)) {
            return '—';
        }
        return `${temp}`;
    }

    formatObservationWind(direction, speed) {
        if (!Number.isFinite(speed) || speed <= 0) {
            return 'Calm';
        }
        const dir = direction && direction !== 'CALM' ? direction : '';
        const output = dir ? `${dir}${Math.round(speed)}` : `${Math.round(speed)}`;
        return output.trim();
    }

    chooseObservationDisplayName(observation, usedNames) {
        if (!observation || !usedNames) {
            return null;
        }

        const segments = this.splitObservationLocationName(observation.location);
        const hasMultipleSegments = segments.length > 1;

        for (const segment of segments) {
            const label = segment;
            const key = label.toUpperCase();
            if (!key) continue;
            if (!usedNames.has(key)) {
                usedNames.add(key);
                return label;
            }
        }

        if (!hasMultipleSegments) {
            const fallbackLocation = typeof observation.location === 'string' ? observation.location.trim() : '';
            const fallbackKey = fallbackLocation.toUpperCase();
            if (fallbackLocation && !usedNames.has(fallbackKey)) {
                usedNames.add(fallbackKey);
                return fallbackLocation;
            }
        }

        const stationCode = typeof observation.station === 'string' ? observation.station.trim().toUpperCase() : '';
        if (stationCode && !usedNames.has(stationCode)) {
            usedNames.add(stationCode);
            return stationCode;
        }

        return null;
    }

    splitObservationLocationName(location) {
        if (typeof location !== 'string') {
            return [];
        }

        const trimmed = location.trim();
        if (!trimmed) {
            return [];
        }

        if (!trimmed.includes('/')) {
            return [trimmed];
        }

        return trimmed
            .split('/')
            .map(part => part.trim())
            .filter(Boolean);
    }

    formatObservationTimestamp(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }
        try {
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            }).format(date);
        } catch (error) {
            console.warn('Timestamp formatting failed:', error.message);
            return null;
        }
    }

    setupLocalForecastSlide() {
        // Stop radar and hide extended forecast elements
        this.stopRadarRefresh();
        this.hideExtendedForecastElements();
        this.hideLocalObservationsPanel();

        // Remove radar-active class to show ad crawl again
        document.body.classList.remove('radar-active');

    // Set header text for Local Forecast (single line) and drop it slightly
    this.setHeaderTitle('Local Forecast', '');

    // Drop the Local Forecast header so it lines up with the text block
    const headerVerticalOffset = 18;
    const headerHorizontalOffset = -10;
    const headerLetterSpacing = '-13px';
    const lfHeader = document.querySelector('.header-line-top .header-text.line1');
    const lfShadow = document.querySelector('.header-line-top .header-text-shadow.line1');
    const headerWrapper = document.querySelector('.header-line-top');

    this.setHeaderElementTop(lfHeader, headerVerticalOffset);
    this.setHeaderElementTop(lfShadow, headerVerticalOffset);
    this.setHeaderElementTop(headerWrapper, headerVerticalOffset);
    this.setHeaderElementLeft(lfHeader, headerHorizontalOffset);
    this.setHeaderElementLeft(lfShadow, headerHorizontalOffset);
    this.setHeaderElementWordSpacing(lfHeader);
    this.setHeaderElementWordSpacing(lfShadow);
    this.setHeaderElementLetterSpacing(lfHeader, headerLetterSpacing);
    this.setHeaderElementLetterSpacing(lfShadow, headerLetterSpacing);

        // Show TWC logo (hidden during radar segments)
        this.bufferManager.showAsset('ASSET_TWC_LOGO');

        // Hide all current conditions content
        document.querySelectorAll(
            '.current-location, .current-temp, .current-condition, .weather-icon, ' +
            '.current-data-labels, .data-humidity, .data-dewpoint, .data-ceiling, ' +
            '.data-visibility, .data-pressure, .data-windchill, .current-wind, .current-wind-line2'
        ).forEach(el => {
            el.style.display = 'none';
        });

        // Show standard centerbox layers
        document.querySelectorAll('.centerbox-layer:not(.ef-layer)').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.clipPath = 'none';
        });

        // Ensure forecast data is loaded then start pages
        if (!window.weatherData?.rawPeriods) {
            window.weatherData.fetchExtendedForecast()
                .then(() => this.startLocalForecastPages())
                .catch(err => console.warn('Failed to fetch forecast for Local Forecast:', err));
        } else {
            this.startLocalForecastPages();
        }
    }

    getLDLLinesFromData(data) {
        const degreeGlyph = typeof window.weatherData?.getTemperatureDegreeGlyph === 'function'
            ? window.weatherData.getTemperatureDegreeGlyph()
            : '\\';
        const deg = `${degreeGlyph}F`;
        const fmtNum = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : String(n));
        const fmtFeet = (f) => {
            if (!f || f === 'Unlimited') return 'Unlimited';
            const num = parseInt(f, 10);
            return num.toLocaleString('en-US');
        };
        const loc = data?.location || data?.station || '';
        const ceiling = fmtFeet(data?.ceiling);
        const temp = fmtNum(data?.temperature);
        const windChill = fmtNum(data?.windChill ?? data?.temperature);
        const humidity = fmtNum(data?.humidity);
        const dew = fmtNum(data?.dewpoint);
        const pressure = data?.pressure ? String(data.pressure) : '—';
        const windDir = data?.windDirection || 'CALM';
        const windSpd = fmtNum(data?.windSpeed || 0);

        const ceilingLine = ceiling === 'Unlimited'
            ? 'Ceiling: Unlimited'
            : `Clear Below  ${ceiling} ft`;

        return [
            `Conditions at ${loc}`,
            ceilingLine,
            `Temp: ${temp}${deg}     Wind Chill: ${windChill}${deg}`,
            `Humidity:  ${humidity}%    Dewpoint: ${dew}${deg}`,
            `Barometric Pressure: ${pressure} in.`,
            `Wind: ${windDir}  ${windSpd} MPH`
        ];
    }

    composeAlertCrawlMessage(lines) {
        if (!Array.isArray(lines) || lines.length === 0) {
            return 'WEATHER ALERT IN EFFECT';
        }
        return lines
            .map(line => String(line).trim())
            .filter(Boolean)
            .join(' ');
    }

    stopLDLLoop() {
        if (this.ldlLoopInterval) {
            clearInterval(this.ldlLoopInterval);
            this.ldlLoopInterval = null;
        }
        if (this.boundLDLWeatherUpdate) {
            window.removeEventListener('weather-update', this.boundLDLWeatherUpdate);
            this.boundLDLWeatherUpdate = null;
        }
    }

    startLDLLoop(customLines = null, options = {}) {
        const span = document.getElementById('ldl-text-span');
        if (!span) return;

        this.stopLDLLoop();

        const mode = options.mode || 'conditions';
        const interval = Number.isFinite(options.interval) ? options.interval : (mode === 'alerts' ? 6000 : 4000);
        this.ldlContentMode = mode;

        const ensureLines = (sourceLines) => {
            if (Array.isArray(sourceLines) && sourceLines.length) {
                return sourceLines;
            }
            return [' '];
        };

        const resolveConditionLines = () => this.getLDLLinesFromData(window.weatherData?.currentData);

        let lines = ensureLines(mode === 'conditions' ? (customLines || resolveConditionLines()) : customLines);
        let idx = 0;

        const paintInFast = (el) => {
            this.simulateTypewriterEffect(el, 250);
        };
        const smashCutHide = (el) => {
            el.style.opacity = '1';
            el.style.transition = 'none';
            el.style.clipPath = 'inset(0 100% 0 0)';
        };

        const showNext = () => {
            if (!lines.length) {
                span.textContent = '';
                return;
            }
            span.textContent = lines[idx];
            paintInFast(span);
            idx = (idx + 1) % lines.length;
        };

        showNext();
        if (this.ldlLoopInterval) {
            clearInterval(this.ldlLoopInterval);
        }
        this.ldlLoopInterval = setInterval(() => {
            smashCutHide(span);
            showNext();
        }, interval);

        if (mode === 'conditions') {
            this.boundLDLWeatherUpdate = (ev) => {
                const updated = ensureLines(this.getLDLLinesFromData(ev.detail));
                lines = updated;
                idx = idx % lines.length;
            };
            window.addEventListener('weather-update', this.boundLDLWeatherUpdate);
        }
    }

    async transitionToRadar() {
        console.log('Transitioning to Radar view...');

        // Hide current conditions elements
        this.hideCurrentConditions();
        this.hideExtendedForecastElements();
    this.hideLocalForecastOverlay();
    this.hideLocalObservationsPanel();

        // Show common elements
        this.showCommonElements();

        const useNoDataHeader = this.shouldUseNoDataRadarHeader();
        const headerEls = document.querySelectorAll('.radar-header');
        headerEls.forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
        });

        // Set radar header based on config
        let headerSelector = '.radar-header-blue';
        if (useNoDataHeader) {
            headerSelector = '.radar-header-nodata';
        } else if (this.config.modern) {
            headerSelector = '.radar-header-modern';
        } else if (this.config.animate_radar) {
            headerSelector = '.radar-header-pink';
        }

        const radarHeader = document.querySelector(headerSelector);
        if (radarHeader) {
            radarHeader.style.display = 'block';
            radarHeader.style.opacity = '1';
            radarHeader.style.clipPath = 'none';
            if (!useNoDataHeader && this.config.pillow_box) {
                if (headerSelector === '.radar-header-blue') {
                    radarHeader.src = './header/wr_radar.png';
                } else if (headerSelector === '.radar-header-pink') {
                    radarHeader.src = './header/wr_radar_pink.png';
                }
            }
        }

        if (useNoDataHeader) {
            this.bufferManager.hideAsset('ASSET_RADAR_BASEMAP');
            this.bufferManager.hideAsset('ASSET_RADAR_DATA');
            this.stopRadarRefresh();
            return;
        }

        // Load and show radar data
        await this.loadRadarData({ reveal: true });

        // Center radar on location
        const data = window.weatherData?.currentData;
        if (data && data.latitude && data.longitude) {
            this.centerRadarOn(data.latitude, data.longitude, { zoom: this.getRadarZoom() });
        } else {
            this.centerRadarOn((this.mapSpec.latMin + this.mapSpec.latMax) / 2, (this.mapSpec.lonMin + this.mapSpec.lonMax) / 2, { zoom: 1.2 });
        }

        this.startRadarRefresh();
    }

    async transitionToExtendedForecast() {
        console.log('Transitioning to Extended Forecast...');

        // Stop radar and hide radar elements
        this.stopRadarRefresh();
        this.hideRadarElements();
        this.hideCurrentConditions();
    this.hideLocalForecastOverlay();
    this.hideLocalObservationsPanel();

        // Show common elements
        this.showCommonElements();

        // Swap centerbox to Extended Forecast
        const layer1 = document.querySelector('.centerbox-layer.layer-1');
        if (layer1) {
            if (!this.originalLayer1Src) {
                this.originalLayer1Src = layer1.src;
            }
            layer1.src = './centerbox/extendedforecast.png';
            layer1.style.display = 'block';
            layer1.style.opacity = '1';
            layer1.style.clipPath = 'none';
        }

        // Hide other centerbox layers
        const otherLayers = document.querySelectorAll('.centerbox-layer:not(.layer-1)');
        otherLayers.forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
        });

        // Set header text for Extended Forecast
        const data = window.weatherData?.currentData || {};
        const rawLoc = data.location || data.station || 'Local';
        const makePossessive = (name) => {
            try {
                const trimmed = String(name).trim();
                if (!trimmed) return "Local's";
                if (/['']s$/i.test(trimmed) || /['']$/i.test(trimmed)) return trimmed;
                if (/s$/i.test(trimmed)) return `${trimmed}'`;
                return `${trimmed}'s`;
            } catch { return "Local's"; }
        };
        const line1 = makePossessive(rawLoc);
    const line2 = 'Extended Forecast';
    // Set two-line header for Extended Forecast
    this.setHeaderTitle(line1, 'Extended Forecast');

        const topFill = document.querySelector('.header-line-top .header-text.line1');
        if (topFill) {
            topFill.classList.add('white-text');
        }

        document.querySelectorAll('.header-line').forEach(el => el.classList.add('header-condensed'));

        // Show Extended Forecast overlay
        this.renderExtendedForecastOverlay();
        const ef = document.getElementById('ef-overlay');
        if (ef) {
            ef.style.display = 'block';
            ef.style.opacity = '1';
        }
    }

    getRadarZoom() {
        const z = Number(this.config?.radar_zoom);
        if (Number.isFinite(z) && z >= 1.0 && z <= 10.0) return z;
        return this.defaultRadarZoom;
    }

    latLonToPixel(lat, lon) {
        const { width, height, lonMin, lonMax, latMin, latMax } = this.mapSpec;
        const clampedLon = Math.max(lonMin, Math.min(lonMax, lon));
        const clampedLat = Math.max(latMin, Math.min(latMax, lat));
        const x = ((clampedLon - lonMin) / (lonMax - lonMin)) * width;
        const y = ((latMax - clampedLat) / (latMax - latMin)) * height;
        return { x, y };
    }

    centerRadarOn(lat, lon, { zoom = 3.0 } = {}) {
        const { width: imgW, height: imgH } = this.mapSpec;
        const viewportW = 720;
        const viewportH = 480;
        const { x, y } = this.latLonToPixel(lat, lon);
        const baseScale = viewportW / imgW;
        const scale = baseScale * zoom;
        const cssW = imgW * scale;
        const cssH = imgH * scale;
        let left = -(x * scale - viewportW / 2);
        let top = -(y * scale - viewportH / 2);
        const minLeft = viewportW - cssW;
        const minTop = viewportH - cssH;
        left = Math.min(0, Math.max(minLeft, left));
        top = Math.min(0, Math.max(minTop, top));

        const basemap = document.querySelector('.radar-basemap');
        const overlay = document.querySelector('.radar-data');

        [basemap, overlay].forEach((img) => {
            if (!img) return;
            img.style.position = 'absolute';
            img.style.top = `${top}px`;
            img.style.left = `${left}px`;
            img.style.width = `${cssW}px`;
            img.style.height = 'auto';
            img.style.objectFit = 'fill';
        });
    }

    async loadRadarData(options = { reveal: true }) {
        try {
            if (this.shouldUseNoDataRadarHeader()) {
                this.bufferManager.hideAsset('ASSET_RADAR_BASEMAP');
                this.bufferManager.hideAsset('ASSET_RADAR_DATA');
                return;
            }

            if (this.config.animate_radar) {
                this.bufferManager.log('Animated radar: swapping to GIF header and data', 'info', 'RENDERER');
                const headerEls = document.querySelectorAll('.radar-header');
                headerEls.forEach(el => {
                    el.style.display = el.classList.contains('radar-header-pink') ? 'block' : 'none';
                    el.style.opacity = el.classList.contains('radar-header-pink') ? '1' : '0';
                });
                const radarMap = document.querySelector('.radar-basemap');
                const radarImage = document.querySelector('.radar-data');
                if (radarMap) {
                    radarMap.style.display = 'block';
                    radarMap.style.opacity = '1';
                }
                if (radarImage) {
                    radarImage.src = this.config.radar_gif_url;
                    radarImage.style.display = 'block';
                    radarImage.style.opacity = '1';
                }
                const data = window.weatherData?.currentData;
                if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                    this.centerRadarOn(data.latitude, data.longitude, { zoom: this.getRadarZoom() });
                }
                return;
            }

            if (this.config.modern && window.weatherData?.latitude && window.weatherData?.longitude) {
                return await this.loadMapboxBasemap(options);
            }

            const now = Date.now();
            const withinCacheWindow = this.lastRadarTimestamp && now - this.lastRadarTimestamp < 15 * 60 * 1000;
            if (withinCacheWindow && this.cachedRadarStillUrl) {
                console.log('Using cached radar still');
                this.applyRadarStill(this.cachedRadarStillUrl, options.reveal !== false);
                return;
            }

            console.log('Requesting radar data from server...');
            const response = await fetch('/api/radar/download');
            const result = await response.json();

            if (result.success) {
                await this.processRadarDownloadResult(result, now, options);
            } else {
                console.warn('Failed to load radar data:', result.error);
            }
        } catch (error) {
            console.error('Error loading radar data:', error);
        }
    }

    async processRadarDownloadResult(result, now, options = { reveal: true }) {
        const reveal = options.reveal !== false;
        this.cachedRadarPath = result.imagePath;
        this.cachedRadarSourceType = result.format || (String(result.imagePath || '').toLowerCase().endsWith('.gif') ? 'gif' : 'png');

        let stillUrl = '';
        if (this.cachedRadarSourceType === 'gif') {
            try {
                stillUrl = await this.getRadarStillFromGif(`${result.imagePath}?t=${now}`);
            } catch (error) {
                console.warn('Unable to derive still frame from radar GIF:', error.message);
                stillUrl = `${result.imagePath}?t=${now}`;
            }
        } else {
            stillUrl = `${result.imagePath}?t=${now}`;
        }

        this.cachedRadarStillUrl = stillUrl;
        this.lastRadarTimestamp = now;

        if (reveal) {
            this.applyRadarStill(stillUrl, true);
        }
    }

    applyRadarStill(stillUrl, reveal = true) {
        if (!reveal) {
            return;
        }

        const radarMap = document.querySelector('.radar-basemap');
        const radarImage = document.querySelector('.radar-data');

        if (radarMap) {
            radarMap.style.display = 'none';
            radarMap.style.opacity = '0';
        }

        if (radarImage) {
            if (stillUrl) {
                radarImage.src = stillUrl;
            }
            radarImage.style.display = 'block';
            radarImage.style.opacity = '1';
        }
    }

    async getRadarStillFromGif(gifPathWithQuery) {
        const absoluteUrl = new URL(gifPathWithQuery, window.location.origin).href;

    if (typeof ImageDecoder !== 'function' || typeof createImageBitmap !== 'function') {
            console.warn('ImageDecoder not available; falling back to radar GIF directly');
            return absoluteUrl;
        }

        const response = await fetch(absoluteUrl, { cache: 'reload' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const decoder = new ImageDecoder({ data: buffer, type: 'image/gif' });
        if (decoder.tracks?.ready) {
            await decoder.tracks.ready;
        }

        const track = decoder.tracks && decoder.tracks.length ? decoder.tracks[0] : null;
        const frameCount = track?.frameCount || 1;
        const targetFrame = Math.max(0, frameCount - 1);
        const { image } = await decoder.decode({ frameIndex: targetFrame });

        const canvas = document.createElement('canvas');
        canvas.width = image.displayWidth || image.codedWidth || 0;
        canvas.height = image.displayHeight || image.codedHeight || 0;

        const context = canvas.getContext('2d');
        if (!context) {
            image.close?.();
            decoder.close?.();
            throw new Error('Unable to acquire 2D canvas context');
        }

        context.drawImage(image, 0, 0);
        image.close?.();
        decoder.close?.();

        return canvas.toDataURL('image/png');
    }

    async loadMapboxBasemap(options = { reveal: true }) {
        try {
            const now = Date.now();
            
            // Check cache first (15 minute cache like normal radar)
            if (this.lastMapboxTimestamp && now - this.lastMapboxTimestamp < 15 * 60 * 1000) {
                console.log('Using cached Mapbox basemap');
                if (this.cachedMapboxPath && options.reveal) {
                    const radarMap = document.querySelector('.radar-basemap');
                    const radarImage = document.querySelector('.radar-data');
                    
                    if (radarMap) {
                        radarMap.src = this.cachedMapboxPath + '?t=' + now;
                        radarMap.style.display = 'block';
                        radarMap.style.opacity = '1';
                    }
                    // Hide the radar data layer in modern mode - just show the basemap
                    if (radarImage) {
                        radarImage.style.display = 'none';
                    }
                }
                return;
            }
            
            console.log('Requesting Mapbox basemap from server...');
            const lat = window.weatherData.latitude;
            const lon = window.weatherData.longitude;
            const zoom = 10; // Fixed zoom level for consistency
            
            const response = await fetch(`/api/radar/mapbox-basemap?lat=${lat}&lon=${lon}&zoom=${zoom}`);
            const result = await response.json();
            
            if (result.success) {
                console.log('Mapbox basemap ready:', result.imagePath);
                this.cachedMapboxPath = result.imagePath;
                this.lastMapboxTimestamp = now;
                
                if (options.reveal) {
                    const radarMap = document.querySelector('.radar-basemap');
                    const radarImage = document.querySelector('.radar-data');
                    
                    if (radarMap) {
                        radarMap.src = result.imagePath + '?t=' + now;
                        radarMap.style.display = 'block';
                        radarMap.style.opacity = '1';
                    }
                    // Hide the radar data layer in modern mode - just show the basemap
                    if (radarImage) {
                        radarImage.style.display = 'none';
                    }
                }
            } else {
                console.warn('Failed to load Mapbox basemap:', result.error);
                // Fall back to regular radar
                return await this.loadRegularRadar(options);
            }
        } catch (error) {
            console.error('Error loading Mapbox basemap:', error);
            // Fall back to regular radar
            return await this.loadRegularRadar(options);
        }
    }

    async loadRegularRadar(options = { reveal: true }) {
        // This is the original radar loading logic for fallback
        try {
            const now = Date.now();
            
            console.log('Requesting radar data from server...');
            const response = await fetch('/api/radar/download');
            const result = await response.json();
            
            if (result.success) {
                await this.processRadarDownloadResult(result, now, options);
            } else {
                console.warn('Failed to load radar data:', result.error);
            }
        } catch (error) {
            console.error('Error loading radar data:', error);
        }
    }

    startRadarRefresh() {
        if (this.radarRefreshInterval) {
            clearInterval(this.radarRefreshInterval);
        }
        
        this.radarRefreshInterval = setInterval(async () => {
            console.log('Refreshing radar data...');
            if (this.config.modern && window.weatherData?.latitude && window.weatherData?.longitude) {
                await this.loadMapboxBasemap();
            } else {
                await this.loadRadarData();
            }
        }, 15 * 60 * 1000);
    }

    stopRadarRefresh() {
        if (this.radarRefreshInterval) {
            clearInterval(this.radarRefreshInterval);
            this.radarRefreshInterval = null;
        }
    }

    transitionToCurrentConditions() {
        console.log('Transitioning back to Current Conditions...');
        
        // Stop radar and hide radar elements
        this.stopRadarRefresh();
        this.hideRadarElements();
        this.hideExtendedForecastElements();
    this.hideLocalForecastOverlay();
    this.hideLocalObservationsPanel();

        // Restore centerbox layer-1 to original
        const layer1 = document.querySelector('.centerbox-layer.layer-1');
        if (layer1 && this.originalLayer1Src) {
            layer1.src = this.originalLayer1Src;
        }

        // Restore header for Current Conditions
        this.setHeaderTitle('Current', 'Conditions');
        const topFill = document.querySelector('.header-line-top .header-text.line1');
        if (topFill) {
            topFill.classList.remove('white-text');
        }
        document.querySelectorAll('.header-line').forEach(el => el.classList.remove('header-condensed'));

        // Show current conditions
        this.showCurrentConditions();
    }

    hideCurrentConditions() {
        const elements = document.querySelectorAll(
            '.current-location, .current-temp, .current-condition, .weather-icon, .current-data-labels, .data-humidity, .data-dewpoint, .data-ceiling, .data-visibility, .data-pressure, .data-windchill, .current-wind, .current-wind-line2'
        );
        elements.forEach(element => {
            element.style.opacity = '0';
            element.style.display = 'none';
        });

        this.hideLocalForecastOverlay();
        this.hideLocalObservationsPanel();
    }

    showCurrentConditions() {
        console.log('Showing Current Conditions elements...');
        
        // Show common elements
        this.showCommonElements();
        
        // Show current conditions specific elements
        const ccElements = [
            '.twc-logo', '.centerbox-layer:not(.ef-layer)',
            '.current-location', '.current-temp', '.current-condition', '.weather-icon',
            '.current-data-labels', '.data-humidity', '.data-dewpoint', '.data-ceiling',
            '.data-visibility', '.data-pressure', '.data-windchill',
            '.current-wind', '.current-wind-line2'
        ];
        
        ccElements.forEach(sel => {
            const elems = document.querySelectorAll(sel);
            elems.forEach(el => {
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.clipPath = 'none';
            });
        });

        const locationEl = document.querySelector('.current-location');
        if (locationEl && window.weatherData?.adjustCurrentLocationPlacement) {
            window.weatherData.adjustCurrentLocationPlacement(locationEl);
        }

        // Hide radar, EF, and Local Forecast elements
        this.hideRadarElements();
        this.hideExtendedForecastElements();
    this.hideLocalForecastOverlay();
    this.hideLocalObservationsPanel();
    }

    showCommonElements() {
        // Elements visible across all products
        const commonElements = [
            '.header-bottom', '.twc-logo', '.header-text-shadow', '.header-text', '.clock',
            '.centerbox-layer', '.radar-header', '.radar-basemap', '.radar-data', '.current-conditions-body',
            '.current-location', '.current-temp', '.current-condition', '.weather-icon',
            '.current-data', '.current-data-labels', '.current-data-values',
            '.data-humidity', '.data-dewpoint', '.data-ceiling', '.data-visibility',
            '.data-pressure', '.data-windchill', '.current-wind', '.current-wind-line2'
        ];
        
        commonElements.forEach(sel => {
            const elems = document.querySelectorAll(sel);
            elems.forEach(el => {
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.clipPath = 'none';
            });
        });

        // Ensure LDL text is visible
        const ldlSpan = document.getElementById('ldl-text-span');
        if (ldlSpan) {
            ldlSpan.style.display = 'inline-block';
            ldlSpan.style.opacity = '1';
        }
    }

    hideCurrentConditions() {
        const ccElements = [
            '.twc-logo', '.centerbox-layer',
            '.current-location', '.current-temp', '.current-condition', '.weather-icon',
            '.current-data-labels', '.data-humidity', '.data-dewpoint', '.data-ceiling',
            '.data-visibility', '.data-pressure', '.data-windchill',
            '.current-wind', '.current-wind-line2'
        ];
        
        ccElements.forEach(sel => {
            const elems = document.querySelectorAll(sel);
            elems.forEach(el => {
                el.style.display = 'none';
                el.style.opacity = '0';
            });
        });

        this.hideLocalForecastOverlay();
        this.hideLocalObservationsPanel();
    }

    hideRadarElements() {
        const radarElements = ['.radar-header', '.radar-basemap', '.radar-data'];
        radarElements.forEach(sel => {
            const elems = document.querySelectorAll(sel);
            elems.forEach(el => {
                el.style.display = 'none';
                el.style.opacity = '0';
            });
        });
    }

    hideExtendedForecastElements() {
        // Hide EF overlay
        const ef = document.getElementById('ef-overlay');
        if (ef) {
            ef.style.display = 'none';
            ef.style.opacity = '0';
        }
        // Hide EF-specific layer and icons
        const efExtras = document.querySelectorAll('.centerbox-layer.ef-layer, .ef-icon');
        efExtras.forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
        });
    }

    hideAllUIElements() {
        const allElements = [
            '.header-bottom', '.twc-logo', '.header-text-shadow', '.header-text', '.clock',
            '.centerbox-layer', '.radar-header', '.radar-basemap', '.radar-data', '.current-conditions-body',
            '.current-location', '.current-temp', '.current-condition', '.weather-icon',
            '.current-data', '.current-data-labels', '.current-data-values',
            '.data-humidity', '.data-dewpoint', '.data-ceiling', '.data-visibility',
            '.data-pressure', '.data-windchill', '.current-wind', '.current-wind-line2',
            '#local-forecast-text', '#local-observations-panel'
        ];
        
        allElements.forEach(sel => {
            const elems = document.querySelectorAll(sel);
            elems.forEach(element => {
                element.style.opacity = '0';
                element.style.display = 'none';
            });
        });
    }

    renderExtendedForecastOverlay() {
        const efData = window.weatherData?.extendedForecast;
        const ef = document.getElementById('ef-overlay');
        if (!ef) return;
        const cols = ef.querySelectorAll('.ef-col');
        if (!Array.isArray(efData) || efData.length < 3 || cols.length < 3) return;
        for (let i = 0; i < 3; i++) {
            const day = efData[i];
            const col = cols[i];
            const dow = col.querySelector('.ef-dow');
            const cond = col.querySelector('.ef-cond');
            const lo = col.querySelector('.ef-lo-val');
            const hi = col.querySelector('.ef-hi-val');
            const iconEl = col.querySelector('.ef-icon');
            if (dow) dow.textContent = day.name || '';
            if (cond) {
                let text = String(day.shortForecast || '').trim();
                text = text.replace(/^Chance\b/i, 'Scattered');
                text = text.replace(/Thunderstorms?|T-?storms?/ig, "T'Storms");
                if (/T'?Storms/i.test(text)) {
                    text = text
                        .replace(/\bShowers?\b/ig, '')
                        .replace(/\b(Rain\s+)?Showers?\b/ig, '')
                        .replace(/\b(and|&|with)\b/ig, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                    const wordsAll = text.split(/\s+/);
                    const hasDescriptor = /(Scattered|Isolated|Numerous|Few|Slight|Strong|Severe|Likely)/i.test(text);
                    let firstWord = wordsAll.find(w => !/T'?Storms/i.test(w)) || '';
                    if (!hasDescriptor || !firstWord) firstWord = 'Scattered';
                    text = `${firstWord} T'Storms`;
                }
                text = text.replace(/\s{2,}/g, ' ');
                const words = text.split(/\s+/);
                // Limit to maximum 3 words
                const limitedWords = words.slice(0, 3);
                if (limitedWords.length === 2) {
                    cond.innerHTML = `${limitedWords[0]}<br>${limitedWords[1]}`;
                } else if (limitedWords.length === 1) {
                    cond.innerHTML = `${limitedWords[0]}<br>&nbsp;`;
                } else if (limitedWords.length === 3) {
                    cond.innerHTML = `${limitedWords[0]}<br>${limitedWords[1]} ${limitedWords[2]}`;
                } else {
                    cond.textContent = limitedWords.join(' ');
                }
            }
            if (lo) lo.textContent = (day.lo ?? '—');
            if (hi) hi.textContent = (day.hi ?? '—');
            if (iconEl) {
                try {
                    const iconFile = window.weatherData?.getWeatherIcon?.(day.shortForecast, false);
                    if (iconFile) {
                        iconEl.src = `./currentconditions+extendedforecast_icons/${iconFile}`;
                        iconEl.alt = day.shortForecast || '';
                    }
                } catch {}
            }
        }
        if (!this._efUpdateHooked) {
            window.addEventListener('forecast-update', () => this.renderExtendedForecastOverlay());
            this._efUpdateHooked = true;
        }
    }

    startLocalForecastPages() {
        this.clearLocalForecastPaging();
        const overrideText = typeof this.config.fake_local_forecast_text === 'string'
            ? this.config.fake_local_forecast_text.trim()
            : '';

        let fullText = '';
        let pages = [];
        if (overrideText) {
            const tonightBlock = overrideText.split(/\bTomorrow\.\.\./i)[0]?.trim();
            fullText = tonightBlock && tonightBlock.length ? tonightBlock : overrideText;
            pages = [fullText];
            this.bufferManager.log('Local Forecast using override text from config (Tonight segment only).', 'info', 'RENDERER');
        } else {
            const periods = window.weatherData?.rawPeriods;
            if (!Array.isArray(periods) || periods.length < 3) {
                this.bufferManager.log('Local Forecast has insufficient period data and no override text.', 'warn', 'RENDERER');
                return;
            }

            // Get first 3 periods and format as continuous text
            const firstThree = periods.slice(0, 3);
            fullText = firstThree.map(p => {
                return `${p.name.toUpperCase()}...${p.detailedForecast || p.shortForecast}`;
            }).join(' ');
            pages = this.splitTextIntoPages(fullText);
        }

        // Log the full text for debugging
        this.bufferManager.log(`Local Forecast Full Text: ${fullText}`, 'info', 'RENDERER');

        // If pages not set (non-override path) ensure we logged
        if (!Array.isArray(pages) || pages.length === 0) {
            pages = this.splitTextIntoPages(fullText);
        }

        pages.forEach((page, index) => {
            this.bufferManager.log(`Local Forecast Page ${index + 1}: ${page}`, 'info', 'RENDERER');
        });
        
        // Start showing pages
        this.localForecastPagesActive = true;
        setTimeout(() => {
            if (this.localForecastPagesActive) {
                this.showLocalForecastPages(pages, 0);
            }
        }, 0);
    }

    splitTextIntoPages(text) {
        // Create a temporary element to measure actual text dimensions
        const tempElement = document.createElement('div');
        tempElement.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 565px;
            height: 325px;
            color: #d7d7d7;
            font-family: 'Star4000', monospace;
            font-size: 24pt;
            line-height: 1.2;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow: hidden;
            padding: 20px;
            box-sizing: border-box;
            visibility: hidden;
        `;
        document.body.appendChild(tempElement);

        const pages = [];
        let currentPage = '';
        const words = text.split(' ');
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testPage = currentPage ? `${currentPage} ${word}` : word;
            
            // Test if adding this word would overflow the container
            tempElement.textContent = testPage;
            
            if (tempElement.scrollHeight > tempElement.clientHeight && currentPage) {
                // Adding this word would overflow - finish current page and start new one
                pages.push(currentPage.trim());
                currentPage = word;
            } else {
                currentPage = testPage;
            }
        }
        
        // Add the last page if it has content
        if (currentPage.trim()) {
            pages.push(currentPage.trim());
        }
        
        // Clean up temporary element
        document.body.removeChild(tempElement);
        
        return pages;
    }

    showLocalForecastPages(pages, currentPageIndex) {
        if (!this.localForecastPagesActive) {
            return;
        }

        if (this.currentSlide && this.currentSlide !== 'SLIDE_LOCAL') {
            this.clearLocalForecastPaging();
            return;
        }

        if (currentPageIndex >= pages.length) {
            // All pages shown, transition to next slide
            this.bufferManager.log('Local Forecast pages complete', 'info', 'RENDERER');
            this.clearLocalForecastPaging();
            return;
        }

        const pageText = pages[currentPageIndex];
        this.bufferManager.log(`Displaying Local Forecast Page ${currentPageIndex + 1}/${pages.length}: "${pageText.substring(0, 100)}${pageText.length > 100 ? '...' : ''}"`, 'info', 'RENDERER');
        
        // Hide all current conditions elements first
        document.querySelectorAll('.current-location, .current-temp, .current-condition, .weather-icon, .current-data-labels, .data-humidity, .data-dewpoint, .data-ceiling, .data-visibility, .data-pressure, .data-windchill, .current-wind, .current-wind-line2').forEach(el => {
            el.style.display = 'none';
            el.style.opacity = '0';
        });
        
        // Create or get local forecast text overlay
        let localTextOverlay = document.getElementById('local-forecast-text');
        if (!localTextOverlay) {
            localTextOverlay = document.createElement('div');
            localTextOverlay.id = 'local-forecast-text';
            if (!this.config.modern) {
                localTextOverlay.style.cssText = `
                    position: absolute;
                    top: 96.5px;
                    left: 60px;
                    width: 565px;
                    height: 350px;
                    color: #d7d7d7;
                    font-family: 'Star4000', monospace;
                    font-size: 22pt;
                    line-height: 1.05;
                    letter-spacing: -90px !important;
                    -webkit-text-stroke: 0.5px #000000;
                    text-shadow: 2px 2px 1px #000;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow: hidden;
                    z-index: 100;
                    padding: 16px 18px;
                    box-sizing: border-box;
                    opacity: 1;
                `;
            }
            document.querySelector('.content-container').appendChild(localTextOverlay);
        } else if (this.config.modern) {
            localTextOverlay.removeAttribute('style');
        }
        if (this.config.modern) {
            localTextOverlay.style.removeProperty('font-size');
            localTextOverlay.style.removeProperty('line-height');
            localTextOverlay.style.removeProperty('letter-spacing');
            localTextOverlay.style.removeProperty('padding');
            localTextOverlay.style.removeProperty('font-family');
        } else {
            localTextOverlay.style.fontSize = '22pt';
            localTextOverlay.style.lineHeight = '1.34';
            localTextOverlay.style.letterSpacing = '-12.3px';
            localTextOverlay.style.padding = '16px 18px';
        }

        // Set the page text with mixed case handling
        const displayText = this.config.mixed_case === false ? pageText.toUpperCase() : pageText;
        localTextOverlay.textContent = displayText;
        localTextOverlay.style.display = 'block';
        localTextOverlay.style.opacity = '1';
        localTextOverlay.style.clipPath = 'none';

        // Schedule next page after 7 seconds
        if (this.localForecastPageTimeout) {
            clearTimeout(this.localForecastPageTimeout);
        }
        this.localForecastPageTimeout = setTimeout(() => {
            this.showLocalForecastPages(pages, currentPageIndex + 1);
        }, 7000);
    }

    clearLocalForecastPaging() {
        if (this.localForecastPageTimeout) {
            clearTimeout(this.localForecastPageTimeout);
            this.localForecastPageTimeout = null;
        }
        this.localForecastPagesActive = false;
        const overlay = document.getElementById('local-forecast-text');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
        }
    }

    applyModernModeAssets() {
        console.log('=== applyModernModeAssets called ===');
        console.log('Config modern setting:', this.config.modern);
        
        // Swap main header background
        const headerImg = document.querySelector('.header-bottom');
        if (headerImg) {
            console.log('Modern mode: Swapping header from', headerImg.src, 'to modern_header.png');
            headerImg.src = './modern/modern_header.png';
        }

        // Swap LDL background 
        const ldlImg = document.querySelector('.ldl-image');
        if (ldlImg) {
            console.log('Modern mode: Swapping LDL from', ldlImg.src, 'to modern_ldl.png');
            ldlImg.src = './modern/modern_ldl.png';
        }

        // Swap radar header background
        const radarHeaderImg = document.querySelector('.radar-header');
        if (radarHeaderImg) {
            console.log('Modern mode: Swapping radar header from', radarHeaderImg.src, 'to modern_radar.png');
            radarHeaderImg.src = './modern/modern_radar.png';
            this.bufferManager.log('Modern radar header applied', 'info', 'RENDERER');
        } else {
            console.log('Modern mode: radar header element not found');
        }

        // Swap extended forecast centerbox
        const efImg = document.querySelector('.ef-layer');
        if (efImg) {
            console.log('Modern mode: Swapping EF box from', efImg.src, 'to modern_extendedforecastbox.png');
            efImg.src = './modern/modern_extendedforecastbox.png';
        }

        // Swap TWC logo
        const logoImg = document.querySelector('.twc-logo');
        if (logoImg) {
            logoImg.src = './modern/modern_logo.png';
        }

        // Apply modern background via CSS
        const contentContainer = document.querySelector('.content-container');
        if (contentContainer) {
            contentContainer.style.background = "url('./modern/modern_graphical.png') center/cover no-repeat";
        }

        this.bufferManager.log('Modern mode assets applied', 'info', 'RENDERER');
    }

    // Add scheduling for Lot8s cues
    scheduleNextCue() {
        const now = new Date();
        const currentMinute = now.getMinutes();
        const currentHour = now.getHours();
        // Find next cue in patterns
        let nextTime = null;
        for (const pattern of this.cuePatterns) {
            const { prefix, minute } = pattern;
            let cueHour = currentHour;
            // x: every hour, o: every other hour (even hours)
            if (prefix === 'o' && cueHour % 2 !== 0) continue;
            if (minute > currentMinute) {
                nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cueHour, minute, 0);
                break;
            }
        }
        // If no future cue today, roll to next day
        if (!nextTime) {
            const first = this.cuePatterns[0];
            let nextHour = currentHour + 1;
            if (first.prefix === 'o' && nextHour % 2 !== 0) nextHour++;
            nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, first.minute, 0);
        }
        const delay = nextTime - now;
        this.bufferManager.log(`Next Lot8s cue at ${nextTime}`, 'info', 'RENDERER');
        setTimeout(() => {
            this.bufferManager.log('Executing Lot8s cue', 'info', 'RENDERER');
            // On cue, play intro video if enabled (once), then trigger full flavor sequence starting at Local Forecast
            const runCue = () => {
                console.log('Starting triggerLocalCue...');
                this.triggerLocalCue();
            };
            // DISABLED: Intro video functionality commented out due to budget constraints
            // if (this.config.intros) {
            //     console.log('Playing intro video...');
            //     const videoEl = document.getElementById('intro-video');
            //     if (videoEl) {
            //         const src = this.config.modern ? './intros/modern.mp4' : './intros/classic.mp4';
            //         console.log('Intro video src:', src);
            //         videoEl.src = src;
            //         videoEl.load();
            //         videoEl.style.display = 'block';
            //         console.log('Video element shown, attempting to play...');
            //         videoEl.onended = () => {
            //             console.log('Intro video ended');
            //             videoEl.style.display = 'none';
            //             runCue();
            //         };
            //         videoEl.play().catch((err) => {
            //             console.log('Intro video play failed:', err);
            //             videoEl.style.display = 'none';
            //             runCue();
            //         });
            //     } else {
            //         console.log('Intro video element not found');
            //         runCue();
            //     }
            // } else {
            //     console.log('Intros disabled, running cue directly');
                runCue();
            // }
            // Schedule next cue
            this.scheduleNextCue();
        }, delay);
    }

    // Handle Local on the 8s cue: run full flavor sequence starting at Local Forecast
    triggerLocalCue() {
        this.bufferManager.log('Triggering Local on the 8s flavor sequence', 'info', 'RENDERER');
        
        // Stop LDL between cues if active
        this.stopLDLBetweenCues();
        
        // Start ad crawl for local on the 8s
        this.startAdCrawl();
        
        // Start fresh music when Local on the 8s begins
        this.resumeMusic();
        
        // Clear existing timeouts and intervals
        if (this.segmentTimeout) clearTimeout(this.segmentTimeout);
        if (this.ldlLoopInterval) clearInterval(this.ldlLoopInterval);
        if (this.radarRefreshInterval) clearInterval(this.radarRefreshInterval);
        
        // Show the UI (in case it's hidden)
        console.log('Showing UI for cue...');
        const content = document.querySelector('.content-container');
        if (content) {
            content.style.display = 'block';
            content.style.clipPath = 'none';
        }
        document.body.style.background = '';
        document.body.style.clipPath = 'none';
        
        // Remove text-only class if present
        document.body.classList.remove('text-only');
        
        // Start LDL loop
        this.startLDLLoop();
        
        // Start normal product rotation (flavor unchanged)
        this.startProductRotation();
        this.baseAssetsReady = true;
        this.updateRedModeState();
    }
    
    startSoloViewer() {
        this.bufferManager.log(`Starting solo viewer with URL: ${this.config.solo_url}`, 'info', 'RENDERER');
        
        // Hide all WeatherSTAR UI
        const content = document.querySelector('.content-container');
        if (content) content.style.display = 'none';
        
        // Show and configure solo viewer
        const soloViewer = document.getElementById('solo-viewer');
        if (soloViewer) {
            soloViewer.style.display = 'block';
            soloViewer.src = this.config.solo_url;
            soloViewer.load();
            
            soloViewer.addEventListener('error', (e) => {
                this.bufferManager.log(`Solo viewer error: ${e.message}`, 'error', 'RENDERER');
                console.error('Solo viewer failed to load stream:', e);
            });
            
            soloViewer.addEventListener('loadstart', () => {
                this.bufferManager.log('Solo viewer: Stream loading started', 'info', 'RENDERER');
            });
            
            soloViewer.addEventListener('canplay', () => {
                this.bufferManager.log('Solo viewer: Stream ready to play', 'info', 'RENDERER');
            });
            
            soloViewer.play().catch((err) => {
                this.bufferManager.log(`Solo viewer play failed: ${err.message}`, 'error', 'RENDERER');
            });
        } else {
            this.bufferManager.log('Solo viewer element not found', 'error', 'RENDERER');
        }
    }

    // Ad Crawl Methods
    async initializeAdCrawl() {
        if (!this.config.ad_crawl_enabled) return;
        
        this.bufferManager.log('Initializing ad crawl system', 'info', 'RENDERER');
        
        if (this.config.ad_crawl_mode === 'rss' && this.config.ad_crawl_rss_url) {
            await this.fetchRSSMessages();
        } else if (this.config.ad_crawl_messages && this.config.ad_crawl_messages.length > 0) {
            this.adCrawlMessages = [...this.config.ad_crawl_messages];
        }
        
        if (this.adCrawlMessages.length === 0) {
            // Fallback messages
            this.adCrawlMessages = [
                "Welcome to WeatherSTAR 4000 Task127!",
                "Your local weather on the 8s.",
                "Visit weather.com for complete forecasts."
            ];
        }
        
        this.bufferManager.log(`Ad crawl initialized with ${this.adCrawlMessages.length} messages`, 'info', 'RENDERER');
        this.defaultAdCrawlMessages = [...this.adCrawlMessages];
    }
    
    async fetchRSSMessages() {
        try {
            this.bufferManager.log('Fetching RSS feed for ad crawl', 'info', 'RENDERER');
            const response = await fetch('/api/rss-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: this.config.ad_crawl_rss_url })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    this.adCrawlMessages = data.items.slice(0, 6).map(item => item.title);
                    this.bufferManager.log(`Fetched ${this.adCrawlMessages.length} RSS headlines`, 'info', 'RENDERER');
                } else {
                    throw new Error('No RSS items received');
                }
            } else {
                throw new Error(`RSS fetch failed: ${response.status}`);
            }
        } catch (error) {
            this.bufferManager.log(`RSS fetch failed: ${error.message}, using custom messages`, 'warning', 'RENDERER');
            this.adCrawlMessages = this.config.ad_crawl_messages || [];
        }
    }
    
    startAdCrawl(options = {}) {
        const force = options.force === true;
        const overrideMessages = Array.isArray(options.messages)
            ? options.messages.map(msg => String(msg).trim()).filter(msg => msg.length > 0)
            : null;

        if (overrideMessages && overrideMessages.length) {
            this.adCrawlMessages = overrideMessages;
            this.currentAdIndex = 0;
        } else if (!this.adCrawlMessages.length && this.defaultAdCrawlMessages.length) {
            this.adCrawlMessages = [...this.defaultAdCrawlMessages];
        }

        if (!force && (!this.config.ad_crawl_enabled || this.adCrawlMessages.length === 0)) {
            return;
        }

        if (this.adCrawlMessages.length === 0) {
            return;
        }

        if (this.adCrawlInterval) {
            clearInterval(this.adCrawlInterval);
            this.adCrawlInterval = null;
        }

    const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : this.adCrawlIntervalMs;

        if (force) {
            document.body.classList.add('alert-ad-crawl');
            this.alertScrollActive = true;
        } else {
            document.body.classList.remove('alert-ad-crawl');
            this.alertScrollActive = false;
        }

        // Remove radar suppression so crawl is visible when forced
        if (force) {
            document.body.classList.remove('radar-active');
        }

        document.body.classList.add('local-on-8s');

        this.showNextAdMessage({ logPrefix: force ? 'Alert crawl' : 'Ad crawl' });

        this.adCrawlInterval = setInterval(() => {
            this.showNextAdMessage({ logPrefix: force ? 'Alert crawl' : 'Ad crawl' });
        }, intervalMs);
    }
    
    showNextAdMessage({ logPrefix = 'Ad crawl' } = {}) {
        if (this.adCrawlMessages.length === 0) return;
        
        const message = this.adCrawlMessages[this.currentAdIndex];
        const adCrawlSpan = document.getElementById('ad-crawl-span');
        
        if (adCrawlSpan) {
            adCrawlSpan.textContent = message;
            this.bufferManager.log(`${logPrefix}: "${message}"`, 'info', 'RENDERER');
        }
        
        // Move to next message
        this.currentAdIndex = (this.currentAdIndex + 1) % this.adCrawlMessages.length;
    }
    
    resetAdCrawlAnimation() {
        const span = document.getElementById('ad-crawl-span');
        if (!span) return;
        span.style.animation = '';
    }

    stopAdCrawl() {
        this.bufferManager.log('Stopping ad crawl', 'info', 'RENDERER');
        
        // Remove CSS class to hide ad crawl
        document.body.classList.remove('local-on-8s');
        document.body.classList.remove('alert-ad-crawl');
        
        // Clear interval
        if (this.adCrawlInterval) {
            clearInterval(this.adCrawlInterval);
            this.adCrawlInterval = null;
        }
        
        // Clear current message
        const adCrawlSpan = document.getElementById('ad-crawl-span');
        if (adCrawlSpan) {
            adCrawlSpan.textContent = '';
            this.resetAdCrawlAnimation();
        }

        this.alertScrollActive = false;
    }

    // Music control methods for Local on the 8s timing
    stopMusic() {
        const musicEl = document.getElementById('weatherstar-music');
        if (musicEl) {
            musicEl.pause();
            this.bufferManager.log('Music stopped (Local on the 8s ended, loop disabled)', 'info', 'RENDERER');
        }
    }

    resumeMusic() {
        const musicEl = document.getElementById('weatherstar-music');
        if (musicEl && window.musicPlayer) {
            // Start fresh with a new random track instead of resuming
            const newTrack = window.musicPlayer.pickRandomTrack();
            if (newTrack) {
                musicEl.src = newTrack;
                musicEl.load(); // Ensure the new track is loaded
                musicEl.play().catch((err) => {
                    this.bufferManager.log(`Failed to start new music track: ${err.message}`, 'warning', 'RENDERER');
                });
                this.bufferManager.log(`Music restarted with fresh track: ${newTrack}`, 'info', 'RENDERER');
            } else {
                this.bufferManager.log('No music tracks available for restart', 'warning', 'RENDERER');
            }
        }
    }

    // LDL Mode functionality
    startLDLFlavor() {
        this.bufferManager.log('Starting LDL flavor mode', 'info', 'RENDERER');
        
        // Add ldl-mode class to body for CSS styling
        document.body.classList.add('ldl-mode');
        
        // Hide all other UI elements
        this.hideAllElements();
        
        // CRITICAL FIX: Unhide the body background for LDL mode
        document.body.style.clipPath = 'none';
        const contentContainer = document.querySelector('.content-container');
        if (contentContainer) {
            contentContainer.style.clipPath = 'none';
        }
        
        // Show only the LDL text and clock elements
        const ldlTextSpan = document.getElementById('ldl-text-span');
        const ldlClockDate = document.getElementById('ldl-clock-date');
        const ldlClockTime = document.getElementById('ldl-clock-time');
        const ldlClock = document.querySelector('.ldl-clock');
        
        // Make sure the LDL clock container is visible
        if (ldlClock) {
            ldlClock.style.display = 'block';
            ldlClock.style.visibility = 'visible';
            ldlClock.style.opacity = '1';
        }
        
        if (ldlTextSpan) {
            ldlTextSpan.style.display = 'inline-block';
            ldlTextSpan.style.visibility = 'visible';
            ldlTextSpan.style.opacity = '1';
            ldlTextSpan.style.clipPath = 'none';
        }
        
        if (ldlClockDate) {
            ldlClockDate.style.display = 'inline-block';
            ldlClockDate.style.visibility = 'visible';
            ldlClockDate.style.opacity = '1';
        }
        
        if (ldlClockTime) {
            ldlClockTime.style.display = 'inline-block';
            ldlClockTime.style.visibility = 'visible';
            ldlClockTime.style.opacity = '1';
        }
        
        // Start LDL loop and clock
        this.startLDLLoop();
        this.startLDLClock();
        
        this.isInitialized = true;
        this.baseAssetsReady = true;
        this.updateRedModeState();
        this.bufferManager.log('LDL flavor mode started successfully', 'info', 'RENDERER');
    }

    startLDLClock() {
        const dateSpan = document.getElementById('ldl-clock-date');
        const timeSpan = document.getElementById('ldl-clock-time');
        
        if (!dateSpan || !timeSpan) return;
        
        const updateLDLClock = () => {
            const now = new Date();
            
            // Format date: "MON AUG  5"
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                              'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            
            const dayName = dayNames[now.getDay()];
            const monthName = monthNames[now.getMonth()];
            const day = now.getDate().toString().padStart(2, ' ');
            
            // Format time: "10:27:45 PM"
            const timeStr = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            
            dateSpan.textContent = `${dayName} ${monthName} ${day}`;
            timeSpan.textContent = timeStr;
        };
        
        // Update immediately and then every second
        updateLDLClock();
        setInterval(updateLDLClock, 1000);
        
        this.bufferManager.log('LDL clock started', 'info', 'RENDERER');
    }

    // startLDLMode removed - LDL always visible

    startLDLClock() {
        this.bufferManager.log('Starting LDL clock updates', 'info', 'RENDERER');
        
        // Update clock immediately
        this.updateLDLClock();
        
        // Update every second
        setInterval(() => {
            this.updateLDLClock();
        }, 1000);
    }

    updateLDLClock() {
        const now = new Date();
        const dateEl = document.getElementById('ldl-clock-date');
        const timeEl = document.getElementById('ldl-clock-time');
        
        if (dateEl && timeEl) {
            // Format date: "TUE SEP 2"
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                           'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            
            const dayName = days[now.getDay()];
            const monthName = months[now.getMonth()];
            const dayNum = now.getDate();
            
            // Format time: "8:25:40 PM"
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            if (hours > 12) hours -= 12;
            if (hours === 0) hours = 12;
            
            const dateText = `${dayName} ${monthName} ${dayNum}`;
            const timeText = `${hours}:${minutes}:${seconds} ${ampm}`;
            
            dateEl.textContent = dateText;
            timeEl.textContent = timeText;
            
            // Debug log first update
            if (!this.clockDebugLogged) {
                this.bufferManager.log(`LDL clock updated: ${dateText} ${timeText}`, 'info', 'RENDERER');
                this.clockDebugLogged = true;
            }
        } else {
            this.bufferManager.log('LDL clock elements not found!', 'error', 'RENDERER');
        }
    }

    // startLDLBetweenCues removed - LDL always visible

    // stopLDLBetweenCues removed - LDL always visible
}

window.Renderer = Renderer;