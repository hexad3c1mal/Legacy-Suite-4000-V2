/*
| Task127 BufferManager.js
| Manages asset queueing, caching, and slide composition
| by hexadec1mal.
| lmao this is mostly made by me dan13l
*/

class BufferManager {
    constructor(config) {
        this.config = config;
        this.buffer = new Map();
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        this.logWindow = null;
        this.logEntries = [];
        
        // Asset definitions
        this.assetDefinitions = {
            // Common assets (persistent across slides)
            ASSET_HEADER_MAIN: '.header-bottom',
            ASSET_TWC_LOGO: '.twc-logo',
            ASSET_CLOCK: '.clock',
            ASSET_LDL_IMAGE: '.ldl-image',
            ASSET_LDL_TEXT: '#ldl-text-span',
            ASSET_AD_CRAWL: '#ad-crawl-span',
            ASSET_LDL_CLOCK: '.ldl-clock',
            ASSET_LDL_DATE: '.ldl-clock-date',
            ASSET_LDL_TIME: '.ldl-clock-time',
            ASSET_HEADER_TEXT_SHADOW: '.header-text-shadow',
            ASSET_HEADER_TEXT: '.header-text',
            ASSET_HEADER_LINE_TOP: { type: 'element', selector: '.header-line-top', preload: false },
            ASSET_HEADER_LINE_BOTTOM: { type: 'element', selector: '.header-line-bottom', preload: false },
            
            // Slide-specific assets
            // Radar headers for static, animated, and modern modes
            ASSET_RADARHEADER_BLUE: { type: 'image', selector: '.radar-header-blue', preload: true },
            ASSET_RADARHEADER_PINK: { type: 'image', selector: '.radar-header-pink', preload: true },
            ASSET_RADARHEADER_MODERN: { type: 'image', selector: '.radar-header-modern', preload: true },
            ASSET_RADARHEADER_NODATA: { type: 'image', selector: '.radar-header-nodata', preload: true },
            ASSET_BOX_LAYER_0: { 
                type: 'image',
                selector: '.centerbox-layer.layer-0',
                preload: true
            },
            ASSET_BOX_LAYER_1: { 
                type: 'image',
                selector: '.centerbox-layer.layer-1',
                preload: true
            },
            ASSET_BOX_LAYER_2: { 
                type: 'image',
                selector: '.centerbox-layer.layer-2',
                preload: true
            },
            ASSET_BOX_LAYER_3: { 
                type: 'image',
                selector: '.centerbox-layer.layer-3',
                preload: true
            },
            ASSET_BOX_LAYER_4: { 
                type: 'image',
                selector: '.centerbox-layer.layer-4',
                preload: true
            },
            ASSET_BOX_LAYER_5: { 
                type: 'image',
                selector: '.centerbox-layer.layer-5',
                preload: true
            },
            ASSET_BOX_LAYER_6: { 
                type: 'image',
                selector: '.centerbox-layer.layer-6',
                preload: true
            },
            // Radar header variants
            ASSET_RADARHEADER_BLUE: { type: 'image', selector: '.radar-header-blue', preload: true },
            ASSET_RADARHEADER_PINK: { type: 'image', selector: '.radar-header-pink', preload: true },
            ASSET_RADARHEADER_MODERN: { type: 'image', selector: '.radar-header-modern', preload: true },
            ASSET_RADARHEADER_NODATA: { type: 'image', selector: '.radar-header-nodata', preload: true },
            ASSET_RADAR_BASEMAP: { 
                type: 'image',
                selector: '.radar-basemap',
                preload: true
            },
            ASSET_RADAR_DATA: { 
                type: 'image',
                selector: '.radar-data',
                preload: false
            },
            ASSET_EF_OVERLAY: { 
                type: 'element',
                selector: '#ef-overlay',
                preload: false
            },
            ASSET_EF_ICONS: {
                type: 'element',
                selector: '.ef-icon',
                preload: false
            },

            // Current conditions data - individual selectors
            ASSET_CC_LOCATION: '.current-location',
            ASSET_CC_TEMP: '.current-temp',
            ASSET_CC_CONDITION: '.current-condition',
            ASSET_CC_ICON: '.weather-icon',
            ASSET_CC_DATA_LABELS: '.current-data-labels',
            ASSET_CC_HUMIDITY: '.data-humidity',
            ASSET_CC_DEWPOINT: '.data-dewpoint',
            ASSET_CC_CEILING: '.data-ceiling',
            ASSET_CC_VISIBILITY: '.data-visibility',
            ASSET_CC_PRESSURE: '.data-pressure',
            ASSET_CC_WINDCHILL: '.data-windchill',
            ASSET_CC_WIND: '.current-wind',
            ASSET_CC_WIND_LINE2: '.current-wind-line2',
            ASSET_LOCAL_OBS_PANEL: {
                type: 'element',
                selector: '#local-observations-panel',
                preload: false
            }
        };
        
        // Slide compositions
        this.slideCompositions = {
            SLIDE_CC: [
                // 1. LDL image and text
                'ASSET_LDL_IMAGE', 'ASSET_LDL_TEXT',
                // 2. Graphical background (centerbox layer 0)
                'ASSET_BOX_LAYER_0',
                // 3. Clock
                'ASSET_CLOCK',
                // 4. Centerbox frame layers
                'ASSET_BOX_LAYER_1', 'ASSET_BOX_LAYER_2', 'ASSET_BOX_LAYER_3',
                'ASSET_BOX_LAYER_4', 'ASSET_BOX_LAYER_5', 'ASSET_BOX_LAYER_6',
                // 5. Header lines and main banner
                'ASSET_HEADER_LINE_TOP', 'ASSET_HEADER_LINE_BOTTOM', 'ASSET_HEADER_MAIN',
                // 6. TWC logo
                'ASSET_TWC_LOGO',
                // 7. Header text and shadow
                'ASSET_HEADER_TEXT_SHADOW', 'ASSET_HEADER_TEXT',
                // 8. Current Conditions text data
                'ASSET_CC_LOCATION', 'ASSET_CC_TEMP', 'ASSET_CC_CONDITION',
                'ASSET_CC_ICON', 'ASSET_CC_DATA_LABELS', 'ASSET_CC_HUMIDITY',
                'ASSET_CC_DEWPOINT', 'ASSET_CC_CEILING', 'ASSET_CC_VISIBILITY',
                'ASSET_CC_PRESSURE', 'ASSET_CC_WINDCHILL', 'ASSET_CC_WIND',
                'ASSET_CC_WIND_LINE2'
            ],
            SLIDE_RADAR: [
                // Radar headers are managed in setupRadarSlide
                'ASSET_RADAR_BASEMAP', 'ASSET_RADAR_DATA'
            ],
            SLIDE_EXTENDED: [
                'ASSET_HEADER_LINE_TOP', 'ASSET_HEADER_LINE_BOTTOM', 'ASSET_HEADER_MAIN', 'ASSET_TWC_LOGO', 'ASSET_CLOCK', 'ASSET_LDL_IMAGE', 'ASSET_LDL_TEXT',
                'ASSET_HEADER_TEXT_SHADOW', 'ASSET_HEADER_TEXT',
                'ASSET_BOX_LAYER_1',
                'ASSET_EF_OVERLAY', 'ASSET_EF_ICONS'
            ],
            SLIDE_LOCAL: [
                'ASSET_HEADER_LINE_TOP', 'ASSET_HEADER_LINE_BOTTOM', 'ASSET_HEADER_MAIN', 'ASSET_CLOCK', 'ASSET_LDL_IMAGE', 'ASSET_LDL_TEXT',
                'ASSET_HEADER_TEXT_SHADOW', 'ASSET_HEADER_TEXT', 'ASSET_TWC_LOGO',
                'ASSET_BOX_LAYER_0', 'ASSET_BOX_LAYER_1', 'ASSET_BOX_LAYER_2',
                'ASSET_BOX_LAYER_3', 'ASSET_BOX_LAYER_4', 'ASSET_BOX_LAYER_5',
                'ASSET_BOX_LAYER_6'
            ],
            SLIDE_LOCAL_OBS: [
                'ASSET_HEADER_LINE_TOP', 'ASSET_HEADER_LINE_BOTTOM', 'ASSET_HEADER_MAIN', 'ASSET_CLOCK', 'ASSET_LDL_IMAGE', 'ASSET_LDL_TEXT',
                'ASSET_HEADER_TEXT_SHADOW', 'ASSET_HEADER_TEXT', 'ASSET_TWC_LOGO',
                'ASSET_BOX_LAYER_0', 'ASSET_BOX_LAYER_1', 'ASSET_BOX_LAYER_2',
                'ASSET_BOX_LAYER_3', 'ASSET_BOX_LAYER_4', 'ASSET_BOX_LAYER_5',
                'ASSET_BOX_LAYER_6', 'ASSET_LOCAL_OBS_PANEL'
            ],
            // LDL Mode: LDL text, clock components, and minimal background
            SLIDE_LDL: [
                'ASSET_LDL_IMAGE', 'ASSET_LDL_TEXT', 'ASSET_LDL_DATE', 'ASSET_LDL_TIME'
            ]
        };
        
        this.init();
    }
    
    init() {
        this.log('BufferManager initialized');
        
        // Validate flavor configuration
        this.validateFlavor();
        
        this.startHeartbeat();
        
        if (this.config.debug === true) {
            this.openDebugWindow();
        }
    }
    
    validateFlavor() {
        const validFlavors = {
            'E92': {
                name: 'E92',
                products: ['Latest Observations', 'Local Forecast', 'Extended Forecast', 'Radar'],
                slides: ['SLIDE_LOCAL_OBS', 'SLIDE_LOCAL', 'SLIDE_EXTENDED', 'SLIDE_RADAR']
            },
            'DE02': {
                name: 'DE02', 
                products: ['Current Conditions', 'Latest Observations', 'Local Forecast', 'Extended Forecast', 'Radar'],
                slides: ['SLIDE_CC', 'SLIDE_LOCAL_OBS', 'SLIDE_LOCAL', 'SLIDE_EXTENDED', 'SLIDE_RADAR']
            },
            'LDL': {
                name: 'LDL Only',
                products: ['LDL Loop'],
                slides: ['SLIDE_LDL']
            },
            'NEW': {
                name: 'NEW',
                products: ['Current Conditions', 'Latest Observations', 'Local Forecast', 'Radar'],
                slides: ['SLIDE_CC', 'SLIDE_LOCAL_OBS', 'SLIDE_LOCAL', 'SLIDE_RADAR']
            }
        };
        
        const selectedFlavor = this.config.selectedflavor;
        
        if (!selectedFlavor || !validFlavors[selectedFlavor]) {
            this.log("Hmm. I don't know that one! Defaulting to DE02...", 'info');
            this.config.selectedflavor = 'DE02';
        }
        
        const flavor = validFlavors[this.config.selectedflavor];
        this.log(`Using flavor ${flavor.name}: ${flavor.products.join(', ')}`, 'info');
        
        // Store flavor config for renderer
        this.flavorConfig = flavor;
    }
    
    openDebugWindow() {
        // Create debug window for log tail
        this.logWindow = window.open('', 'WeatherSTAR_Debug', 
            'width=720,height=480,left=' + (window.screenX - 740) + ',top=' + window.screenY);
        
        if (this.logWindow) {
            this.logWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Tail</title>
                    <style>
                        @font-face {
                            font-family: 'Star4000Small';
                            src: url('./Star4000/Star4000 Small.ttf') format('truetype');
                        }
                        body {
                            margin: 0;
                            padding: 10px;
                            background: #000;
                            color: #fff;
                            font-family: 'Star4000Small', monospace;
                            font-size: 12px;
                            overflow-y: scroll;
                            height: 100vh;
                            box-sizing: border-box;
                        }
                        .log-entry {
                            margin-bottom: 2px;
                            word-wrap: break-word;
                        }
                        .timestamp {
                            color: #00ff00;
                        }
                        .module {
                            color: #ffff00;
                        }
                        .error {
                            color: #ff0000;
                        }
                        .info {
                            color: #00ffff;
                        }
                    </style>
                </head>
                <body>
                    <div id="log-container"></div>
                </body>
                </html>
            `);
            
            this.updateDebugWindow();
        }
    }
    
    log(message, type = 'info', module = 'BUFFERMANAGER') {
        const timestamp = new Date().toLocaleString();
        const entry = {
            timestamp,
            module,
            message,
            type
        };
        
        this.logEntries.push(entry);
        
        // Keep only last 1000 entries
        if (this.logEntries.length > 1000) {
            this.logEntries = this.logEntries.slice(-1000);
        }
        
        console.log(`[${timestamp}] ${module}: ${message}`);
        
        if (this.logWindow && !this.logWindow.closed) {
            this.updateDebugWindow();
        }
    }
    
    updateDebugWindow() {
        if (!this.logWindow || this.logWindow.closed) return;
        
        const container = this.logWindow.document.getElementById('log-container');
        if (!container) return;
        
        container.innerHTML = this.logEntries.map(entry => 
            `<div class="log-entry">
                <span class="timestamp">[${entry.timestamp}]</span> 
                <span class="module">${entry.module}:</span> 
                <span class="${entry.type}">${entry.message}</span>
            </div>`
        ).join('');
        
        // Auto scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.heartbeat();
        }, 30000); // Every 30 seconds
        
        // Initial heartbeat
        setTimeout(() => this.heartbeat(), 1000);
    }
    
    heartbeat() {
        const now = Date.now();
        const timeSinceLastBeat = now - this.lastHeartbeat;
        
        if (timeSinceLastBeat > 60000) { // Increased from 45000 to 60000
            this.log('Buffer Starved! Refreshing...', 'error');
            setTimeout(() => window.location.reload(), 1000);
            return;
        }
        
        this.lastHeartbeat = now;
        
        const time = new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        const date = new Date().toLocaleDateString('en-US');
        
        const queuedAssets = Array.from(this.buffer.keys());
        
        console.log(`
BUFFERMANAGER.JS HEARTBEAT_____
TIME: ${time}
DATE: ${date}
ASSETS IN QUEUE:
${queuedAssets.length > 0 ? queuedAssets.join('\n') : '(none)'}
_________________________________________`);
        
        this.log(`Heartbeat - ${queuedAssets.length} assets in queue`, 'info');
        
        // Clean expired data
        this.cleanExpiredData();
    }
    
    queueAsset(assetId, element = null, options = {}) {
        if (!element && this.assetDefinitions[assetId]) {
            const def = this.assetDefinitions[assetId];
            const selector = typeof def === 'string' ? def : def.selector;
            const nodeList = document.querySelectorAll(selector);
            element = nodeList.length > 1 ? Array.from(nodeList) : nodeList[0];
        }
        
        if (!element) {
            this.log(`Asset ${assetId} not found`, 'error');
            return false;
        }
        
        this.buffer.set(assetId, {
            element,
            queued: Date.now(),
            options,
            ready: true
        });
        
        console.log(`
BUFFERMANAGER.JS UPDATE____
ASSET ID ${assetId} HAS BEEN ADDED TO QUEUE
______________________________________________________`);
        
        this.log(`Asset ${assetId} queued`, 'info');
        return true;
    }
    
    queueSlide(slideId) {
    const composition = this.slideCompositions[slideId];
        if (!composition) {
            this.log(`Unknown slide: ${slideId}`, 'error');
            return false;
        }
        
        this.log(`Queueing slide ${slideId} with ${composition.length} assets`, 'info');
        
        composition.forEach(assetId => {
            this.queueAsset(assetId);
        });
        
        return true;
    }
    
    showSlide(slideId, previousSlideId = null) {
    const composition = this.slideCompositions[slideId];
        const previousComposition = previousSlideId ? this.slideCompositions[previousSlideId] : [];
        
        if (!composition) {
            this.log(`Cannot show unknown slide: ${slideId}`, 'error');
            return false;
        }
        
        this.log(`Transitioning from ${previousSlideId || 'none'} to ${slideId}`, 'info');
        // Special custom sequence for Current Conditions
        if (slideId === 'SLIDE_CC') {
            const seq = this.slideCompositions.SLIDE_CC || [];
            // Hide assets not in CC sequence
            if (previousSlideId) {
                const prev = this.slideCompositions[previousSlideId] || [];
                prev.filter(a => !seq.includes(a)).forEach(a => this.hideAsset(a));
            }
            this.log('Starting SLIDE_CC custom sequence', 'info');
            let delay = 0;
            seq.forEach(assetId => {
                const duration = this.getAssetAnimationDuration(assetId);
                setTimeout(() => {
                    if (assetId.startsWith('ASSET_BOX_LAYER_')) {
                        this.showBoxLayerAnimated(assetId);
                    } else {
                        this.showAsset(assetId);
                    }
                }, delay);
                delay += duration;
            });
            return true;
        }
        
        // Handle special slide setup first
        this.handleSpecialSlideSetup(slideId, previousSlideId);
        // Ensure EF visuals are completely hidden on non-Extended slides
        if (slideId !== 'SLIDE_EXTENDED') {
            document.querySelectorAll('#ef-overlay, .centerbox-layer.ef-layer, .ef-icon').forEach(el => {
                el.style.display = 'none';
                el.style.opacity = '0';
            });
        }
        
        // Hide assets that are not in the new slide
        if (previousComposition.length > 0) {
            const assetsToHide = previousComposition.filter(assetId => !composition.includes(assetId));
            assetsToHide.forEach(assetId => {
                this.hideAsset(assetId);
            });
        }
        
        // Separate box layers from other assets
        const boxLayers = composition.filter(assetId => assetId.startsWith('ASSET_BOX_LAYER_'));
        const otherAssets = composition.filter(assetId => !assetId.startsWith('ASSET_BOX_LAYER_'));
        
        // Hide all box layers initially
        boxLayers.forEach(assetId => {
            this.hideAsset(assetId);
        });
        
        // Show non-box assets immediately
        otherAssets.forEach(assetId => {
            this.showAsset(assetId);
        });
        // Ensure header lines visible on CC/Extended slides, hidden otherwise
        if (slideId === 'SLIDE_CC' || slideId === 'SLIDE_EXTENDED') {
            this.showAsset('ASSET_HEADER_LINE_TOP');
            this.showAsset('ASSET_HEADER_LINE_BOTTOM');
        } else {
            this.hideAsset('ASSET_HEADER_LINE_TOP');
            this.hideAsset('ASSET_HEADER_LINE_BOTTOM');
        }
        
        // Render box layers with CSS-driven sequential reveals
        boxLayers.forEach(assetId => {
            const asset = this.buffer.get(assetId);
            if (asset && asset.element) {
                // Ensure element is hidden first
                asset.element.style.display = 'block';
                asset.element.style.opacity = '1';
                asset.element.style.clipPath = 'inset(0 0 100% 0)';
                
                // Remove and re-add CSS class to trigger animation
                asset.element.classList.remove('reveal-layer');
                // Force reflow
                asset.element.getBoundingClientRect();
                asset.element.classList.add('reveal-layer');
            }
        });
        
        return true;
    }
    
    queueBoxLayersSequential(boxLayers) {
        // Sort box layers in order (0, 1, 2, 3, 4, 5, 6)
        const sortedLayers = boxLayers.sort((a, b) => {
            const layerA = parseInt(a.split('_').pop());
            const layerB = parseInt(b.split('_').pop());
            return layerA - layerB;
        });
        
        this.log(`Queuing ${sortedLayers.length} box layers for sequential rendering`, 'info');
        
        // Render layers sequentially with delay
        this.renderLayersSequentially(sortedLayers, 0);
    }
    
    renderLayersSequentially(layers, index) {
        if (index >= layers.length) {
            this.log('All box layers rendered sequentially', 'info');
            return;
        }
        
        const assetId = layers[index];
        this.log(`Rendering box layer ${index}: ${assetId}`, 'info');
        
        // Show the asset with animation
        this.showBoxLayerAnimated(assetId);
        
        // Wait for animation duration then render next layer
        const delay = this.getAssetAnimationDuration(assetId);
        setTimeout(() => {
            this.renderLayersSequentially(layers, index + 1);
        }, delay);
    }
    
    getAssetAnimationDuration(assetId) {
        // Return animation duration in milliseconds for different asset types
        if (assetId.startsWith('ASSET_BOX_LAYER_')) {
            return 200; // 200ms per box layer
        }
        return 100; // Default duration
    }
    
    showBoxLayerAnimated(assetId) {
        const asset = this.buffer.get(assetId);
        if (!asset) {
            // Try to queue it if not in buffer
            if (!this.queueAsset(assetId)) {
                return false;
            }
            return this.showBoxLayerAnimated(assetId); // Recursive call after queueing
        }
        
        const element = asset.element;
        if (element) {
            // Prepare element for animation
            element.style.display = 'block';
            element.style.opacity = '1';
            element.style.transition = ''; // Clear existing transition
            element.style.clipPath = 'inset(0 0 100% 0)'; // Fully hidden

            // Force reflow to apply initial clipPath
            /* eslint-disable no-unused-expressions */
            element.getBoundingClientRect();
            /* eslint-enable no-unused-expressions */

            // Animate clip-path to reveal the layer
            console.log(`Animating box layer: ${assetId}`);
            element.style.transition = 'clip-path 200ms ease-out';
            element.style.clipPath = 'inset(0 0 0% 0)'; // Fully visible
        }
        
        return true;
    }
    
    handleSpecialSlideSetup(slideId, previousSlideId) {
        // Handle special cases where assets need modification
        // Ensure clock is hidden on radar slide
        if (slideId === 'SLIDE_RADAR') {
            this.hideAsset('ASSET_CLOCK');
        }
        // No special layer-1 swapping; original box layer remains unchanged
    }
    showAsset(assetId) {
        const asset = this.buffer.get(assetId);
        if (!asset) {
            // Try to queue it if not in buffer
            if (!this.queueAsset(assetId)) {
                return false;
            }
            return this.showAsset(assetId); // Recursive call after queueing
        }
        
        const elems = Array.isArray(asset.element) ? asset.element : [asset.element];
        elems.forEach(element => {
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '1';
                element.style.clipPath = 'none';
            }
        });
        
        return true;
    }
    
    hideAsset(assetId) {
        const asset = this.buffer.get(assetId);
        // If asset not buffered, attempt to hide via selector definition
        if (!asset) {
            const def = this.assetDefinitions[assetId];
            if (def) {
                const selector = typeof def === 'string' ? def : def.selector;
                document.querySelectorAll(selector).forEach(element => {
                    element.style.display = 'none';
                    element.style.opacity = '0';
                    // reset clipPath if needed
                    if (assetId.startsWith('ASSET_BOX_LAYER_') || assetId === 'ASSET_EF_LAYER') {
                        element.style.clipPath = 'inset(0 0 100% 0)';
                        element.style.transition = '';
                    }
                });
                return true;
            }
            return false;
        }
        
        const elems = Array.isArray(asset.element) ? asset.element : [asset.element];
        elems.forEach(element => {
            if (element) {
                element.style.display = 'none';
                element.style.opacity = '0';
                // If this is a box layer, reset clip-path and transition for animation
                if (assetId.startsWith('ASSET_BOX_LAYER_')) {
                    element.style.clipPath = 'inset(0 0 100% 0)';
                    element.style.transition = '';
                }
            }
        });
        
        return true;
    }
    
    isAssetReady(assetId) {
        const asset = this.buffer.get(assetId);
        return asset && asset.ready;
    }
    
    cleanExpiredData() {
        const now = Date.now();
        const expiredAssets = [];
        
        // Clean assets older than 1 hour
        for (const [assetId, asset] of this.buffer.entries()) {
            if (now - asset.queued > 3600000) { // 1 hour
                expiredAssets.push(assetId);
                this.buffer.delete(assetId);
            }
        }
        
        if (expiredAssets.length > 0) {
            console.log(`
BUFFERMANAGER.JS DATA EXPIRY____
THE FOLLOWING DATA HAS EXPIRED AND HAS BEEN REMOVED FROM CACHE:
${expiredAssets.join('\n')}
____________________________________________________________`);
            
            this.log(`Expired ${expiredAssets.length} assets from cache`, 'info');
        }
    }
    
    getBufferStatus() {
        const assets = Array.from(this.buffer.entries()).map(([id, asset]) => ({
            id,
            queued: new Date(asset.queued).toLocaleTimeString(),
            ready: asset.ready
        }));
        
        return {
            totalAssets: this.buffer.size,
            assets
        };
    }
    
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.logWindow && !this.logWindow.closed) {
            this.logWindow.close();
        }
        
        this.buffer.clear();
    }
}
// Expose BufferManager
window.BufferManager = BufferManager;

window.BufferManager = BufferManager;