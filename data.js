/*
| Task127 data.js
| handles the data for the slides. 
| by hexadec1mal.
| rewrite done by me, dan13l
*/
class WeatherData {
    constructor() {
    this.stationCode = 'KORD';
    this.stationCountry = 'US';
        this.currentData = null;
        this.extendedForecast = null;
        this.rawPeriods = null;
        this.lastUpdate = null;
        this.airportsIndex = null;
        this.airportsList = null;
        this.configCache = null; // Cache for config including location override
    this.localObservations = [];
    this.localObservationsLastFetched = 0;
    this.localObservationsStation = null;
    this.localObsFetchPromise = null;
    this.stationListCache = new Map();
    this.activeAlerts = [];
    this.alertsLastFetched = 0;
    this.alertFetchPromise = null;
        
        this.iconMapping = {
            'clear': 'Clear.gif',
            'sunny': 'Sunny.gif',
            'partly-cloudy': 'Partly-Cloudy.gif',
            'mostly-cloudy': 'Mostly-Cloudy.gif',
            'cloudy': 'Cloudy.gif',
            'overcast': 'Cloudy.gif',
            'rain': 'Rain.gif',
            'light-rain': 'Rain.gif',
            'heavy-rain': 'Rain.gif',
            'showers': 'Shower.gif',
            'thunderstorm': 'Thunderstorm.gif',
            'thunder': 'Thunder.gif',
            'snow': 'Light-Snow.gif',
            'heavy-snow': 'Heavy-Snow.gif',
            'sleet': 'Sleet.gif',
            'freezing-rain': 'Freezing-Rain.gif',
            'wintry-mix': 'Wintry-Mix.gif',
            'fog': 'Cloudy.gif',
            'haze': 'Partly-Cloudy.gif',
            'default': 'Mostly-Cloudy.gif'
        };
    }

    async fetchCurrentConditions() {
        try {
            console.log(`Fetching weather data for ${this.stationCode}`);
            
            const response = await fetch(`https://api.weather.gov/stations/${this.stationCode}/observations/latest`);
            
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!this.airportsIndex) {
                try { 
                    await this.loadAirportsIndex(); 
                } catch (error) {
                    console.warn('Failed to load airports index:', error.message);
                }
            }
            
            this.currentData = this.parseWeatherData(data);
            this.lastUpdate = new Date();

            this.fetchLocalObservations({ force: true }).catch(error => {
                console.warn('Latest observations update failed:', error.message);
            });
            
            console.log('Weather data loaded successfully');
            
            try {
                window.dispatchEvent(new CustomEvent('weather-update', { detail: this.currentData }));
            } catch (error) {
                console.warn('Weather update event dispatch failed:', error.message);
            }

            this.fetchActiveAlerts().catch(error => {
                console.warn('Active alerts refresh pending:', error.message);
            });
            
            return this.currentData;
            
        } catch (error) {
            console.error('Failed to fetch weather data:', error.message);
            
            if (!this.airportsIndex) {
                try { 
                    await this.loadAirportsIndex(); 
                } catch (indexError) {
                    console.warn('Failed to load airports index for fallback:', indexError.message);
                }
            }
            
            this.currentData = this.buildUnavailableCurrentConditions();
            this.lastUpdate = new Date();

            this.fetchLocalObservations({ force: true }).catch(fetchError => {
                console.warn('Latest observations update failed (no data):', fetchError.message);
            });

            try {
                window.dispatchEvent(new CustomEvent('weather-update', { detail: this.currentData }));
            } catch (eventError) {
                console.warn('Weather update event dispatch failed (no data):', eventError.message);
            }

            this.updateActiveAlerts([]);
            
            return this.currentData;
        }
    }

    parseWeatherData(apiData) {
        const props = apiData.properties;
        const stationInfo = this.getStationInfo(this.stationCode);
    const locationSource = stationInfo?.municipality || stationInfo?.name || 'Unknown';
    const locationName = this.getLocationName(locationSource);
    const lat = this.parseCoordinate(stationInfo?.latitude ?? stationInfo?.latitude_deg);
    const lon = this.parseCoordinate(stationInfo?.longitude ?? stationInfo?.longitude_deg);
        
        return {
            station: this.stationCode,
            location: locationName,
            latitude: lat,
            longitude: lon,
            temperature: this.convertCelsiusToFahrenheit(props.temperature?.value),
            dewpoint: this.convertCelsiusToFahrenheit(props.dewpoint?.value),
            windChill: this.convertCelsiusToFahrenheit(props.windChill?.value),
            condition: this.parseCondition(props.textDescription),
            icon: this.getWeatherIcon(this.parseCondition(props.textDescription)),
            humidity: props.relativeHumidity?.value ? Math.round(props.relativeHumidity.value) : null,
            pressure: this.convertPascalsToInches(props.barometricPressure?.value),
            visibility: this.convertMetersToMiles(props.visibility?.value),
            ceiling: this.parseCeiling(props.cloudLayers),
            windDirection: this.parseWindDirection(props.windDirection?.value),
            windSpeed: this.convertMpsToMph(props.windSpeed?.value),
            windGust: this.convertMpsToMph(props.windGust?.value),
            observationTime: new Date(props.timestamp),
            rawData: props
        };
    }

    convertCelsiusToFahrenheit(celsius) {
        if (celsius === null || celsius === undefined) return null;
        return Math.round((celsius * 9/5) + 32);
    }

    convertPascalsToInches(pascals) {
        if (pascals === null || pascals === undefined) return null;
        return (pascals * 0.0002953).toFixed(2);
    }

    convertMetersToMiles(meters) {
        if (meters === null || meters === undefined) return null;
        const miles = meters * 0.000621371;
        return miles >= 10 ? Math.round(miles) : miles.toFixed(1);
    }

    parseCoordinate(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    convertMpsToMph(mps) {
        if (mps === null || mps === undefined) return null;
        return Math.round(mps * 2.237);
    }

    parseWindDirection(degrees) {
        if (degrees === null || degrees === undefined) return 'CALM';
        
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    parseCondition(description) {
        if (!description) return 'Unknown';
        
        let condition = description
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        const currentHour = new Date().getHours();
        const isDaytime = currentHour >= 6 && currentHour < 18;
        
        if (condition.toLowerCase() === 'clear' && isDaytime) {
            condition = 'Sunny';
        }
        
        return condition;
    }

    getWeatherIcon(description, applyDayNightLogic = true) {
        if (!description) {
            return 'null.png';
        }

        const desc = description.trim().toLowerCase();
        if (!desc || desc === 'unknown') {
            return 'null.png';
        }

        const now = new Date();
        const hour = now.getHours();
        const isNight = hour < 6 || hour >= 18;
        
        if (desc.includes('clear')) {
            return this.iconMapping.clear;
        } else if (desc.includes('sunny')) {
            return (applyDayNightLogic && isNight) ? 'Clear.gif' : this.iconMapping.sunny;
        } else if (desc.includes('partly cloudy') || desc.includes('partly')) {
            return this.iconMapping['partly-cloudy'];
        } else if (desc.includes('mostly cloudy') || desc.includes('mostly')) {
            return (applyDayNightLogic && isNight) ? 'Mostly-Clear.gif' : this.iconMapping['mostly-cloudy'];
        } else if (desc.includes('cloudy') || desc.includes('overcast')) {
            return this.iconMapping.cloudy;
        } else if (desc.includes('thunderstorm') || desc.includes('thunder')) {
            return this.iconMapping.thunderstorm;
        } else if (desc.includes('rain')) {
            return this.iconMapping.rain;
        } else if (desc.includes('shower')) {
            return this.iconMapping.showers;
        } else if (desc.includes('snow')) {
            return this.iconMapping.snow;
        } else if (desc.includes('sleet')) {
            return this.iconMapping.sleet;
        } else {
            return this.iconMapping.default;
        }
    }

    parseCeiling(cloudLayers) {
        if (!cloudLayers || cloudLayers.length === 0) return 'Unlimited';
        
        let lowestCeiling = Infinity;
        for (const layer of cloudLayers) {
            if (layer.amount === 'OVC' || layer.amount === 'BKN') {
                const heightMeters = layer.base?.value;
                if (heightMeters && heightMeters < lowestCeiling) {
                    lowestCeiling = heightMeters;
                }
            }
        }
        
        if (lowestCeiling === Infinity) return 'Unlimited';
        
        const feetAGL = Math.round(lowestCeiling * 3.28084);
        return `${feetAGL}`;
    }

    async fetchLocalObservations(options = {}) {
        const { force = false, maxStations = 7 } = options;
        const now = Date.now();

        if (!force && this.localObsFetchPromise) {
            return this.localObsFetchPromise;
        }

        if (!force && this.localObservationsStation === this.stationCode) {
            const age = now - this.localObservationsLastFetched;
            const hasData = Array.isArray(this.localObservations) && this.localObservations.length > 0;
            if (hasData && age < 10 * 60 * 1000) {
                return this.localObservations;
            }
        }

        this.localObsFetchPromise = this._loadLocalObservations(maxStations)
            .then(results => {
                this.localObservations = results;
                this.localObservationsLastFetched = Date.now();
                this.localObservationsStation = this.stationCode;
                try {
                    window.dispatchEvent(new CustomEvent('local-observations-update', { detail: results }));
                } catch (eventError) {
                    console.warn('Latest observations event dispatch failed:', eventError.message);
                }
                return results;
            })
            .catch(error => {
                console.warn('Failed to fetch latest observations:', error.message);
                this.localObservations = [];
                this.localObservationsLastFetched = Date.now();
                this.localObservationsStation = this.stationCode;
                try {
                    window.dispatchEvent(new CustomEvent('local-observations-update', { detail: [] }));
                } catch (eventError) {
                    console.warn('Latest observations event dispatch failed:', eventError.message);
                }
                throw error;
            })
            .finally(() => {
                this.localObsFetchPromise = null;
            });

        return this.localObsFetchPromise;
    }

    async _loadLocalObservations(maxStations) {
        try {
            if (!Number.isFinite(maxStations) || maxStations <= 0) {
                maxStations = 7;
            }

            if (!this.currentData) {
                return [];
            }

            await this.loadAirportsIndex();

            let originLat = this.parseCoordinate(this.currentData.latitude);
            let originLon = this.parseCoordinate(this.currentData.longitude);

            if (!Number.isFinite(originLat) || !Number.isFinite(originLon)) {
                const stationInfo = this.getStationInfo(this.stationCode);
                originLat = this.parseCoordinate(stationInfo?.latitude ?? stationInfo?.latitude_deg);
                originLon = this.parseCoordinate(stationInfo?.longitude ?? stationInfo?.longitude_deg);
            }

            if (!Number.isFinite(originLat) || !Number.isFinite(originLon)) {
                return [];
            }

            let candidates = [];
            try {
                candidates = await this.fetchNearbyStationsFromNWS(originLat, originLon, maxStations * 3);
            } catch (error) {
                console.warn('NWS station lookup failed:', error.message);
            }

            if ((!candidates || !candidates.length) && this.airportsList?.length) {
                const fallback = this.getNearestStations(originLat, originLon, maxStations * 4);
                candidates = fallback.map(entry => ({
                    station: entry.station,
                    ident: entry.ident,
                    name: entry.name,
                    distanceKm: entry.distanceKm,
                    distanceMiles: entry.distanceMiles
                })).filter(item => item.station);
            }

            if (!candidates || candidates.length === 0) {
                return [];
            }

            const unique = [];
            const seenStations = new Set();
            for (const candidate of candidates) {
                const code = candidate?.station;
                if (!code || seenStations.has(code)) continue;
                seenStations.add(code);
                unique.push(candidate);
                if (unique.length >= maxStations * 4) break;
            }

            const fetches = unique.map(async candidate => {
                const stationCode = candidate.station;
                try {
                    const response = await fetch(`https://api.weather.gov/stations/${stationCode}/observations/latest`);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const json = await response.json();
                    const record = this.formatObservationRecord(
                        stationCode,
                        json,
                        candidate.distanceMiles,
                        candidate.name
                    );
                    return record;
                } catch (error) {
                    console.warn(`Latest observation fetch failed for ${stationCode}:`, error.message);
                    return null;
                }
            });

            const settled = await Promise.allSettled(fetches);
            const observations = settled
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value)
                .filter(record => {
                    if (!record) return false;
                    if (typeof record.ageMinutes === 'number' && record.ageMinutes > 240) return false;
                    return true;
                });

            observations.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

            const homeStation = typeof this.stationCode === 'string' ? this.stationCode.toUpperCase() : null;
            const filtered = observations.filter(obs => {
                if (!homeStation) return true;
                const code = typeof obs.station === 'string' ? obs.station.toUpperCase() : '';
                return code !== homeStation;
            });

            const sliceLimit = Math.max(maxStations, maxStations * 2);
            return filtered.slice(0, sliceLimit);
        } catch (error) {
            console.warn('Error assembling latest observations:', error.message);
            return [];
        }
    }

    async fetchActiveAlerts(options = {}) {
        const { force = false } = options;
        const now = Date.now();

        if (!force && this.alertFetchPromise) {
            return this.alertFetchPromise;
        }

        if (!force && this.alertsLastFetched > 0 && (now - this.alertsLastFetched) < 2 * 60 * 1000) {
            return this.activeAlerts;
        }

        const lat = this.parseCoordinate(this.currentData?.latitude);
        const lon = this.parseCoordinate(this.currentData?.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            console.warn('Skipping alert fetch due to missing coordinates');
            return this.activeAlerts;
        }

        const fetchPromise = (async () => {
            try {
                const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Alert fetch failed: ${response.status}`);
                }

                const payload = await response.json();
                const features = Array.isArray(payload?.features) ? payload.features : [];
                const alerts = [];
                const seen = new Set();

                for (const feature of features) {
                    const props = feature?.properties || {};
                    const status = (props.status || '').toUpperCase();
                    const messageType = (props.messageType || '').toUpperCase();
                    if (messageType === 'CANCEL' || messageType === 'ACK') continue;
                    if (status && status !== 'ACTUAL') continue;

                    const idSource = feature?.id || props.id || props['@id'] || props.identifier || `${props.event || 'Alert'}-${props.effective || props.onset || ''}`;
                    const id = idSource ? String(idSource) : `alert-${alerts.length}`;
                    if (seen.has(id)) continue;
                    seen.add(id);

                    alerts.push({
                        id,
                        event: props.event || props.headline || 'Weather Alert',
                        headline: props.headline || null,
                        description: props.description || null,
                        instruction: props.instruction || null,
                        severity: props.severity || null,
                        certainty: props.certainty || null,
                        urgency: props.urgency || null,
                        effective: this.parseAlertDate(props.effective || props.onset),
                        onset: this.parseAlertDate(props.onset),
                        expires: this.parseAlertDate(props.expires),
                        ends: this.parseAlertDate(props.ends),
                        sender: props.senderName || null,
                        status: props.status || null,
                        messageType: props.messageType || null
                    });
                }

                alerts.sort((a, b) => {
                    const aTime = a.effective instanceof Date ? a.effective.getTime() : 0;
                    const bTime = b.effective instanceof Date ? b.effective.getTime() : 0;
                    return bTime - aTime;
                });

                this.updateActiveAlerts(alerts);
                return this.activeAlerts;
            } catch (error) {
                console.warn('Active alerts fetch failed:', error.message);
                throw error;
            }
        })();

        this.alertFetchPromise = fetchPromise
            .catch(() => this.activeAlerts)
            .finally(() => {
                this.alertFetchPromise = null;
            });

        return this.alertFetchPromise;
    }

    updateActiveAlerts(alerts) {
        const normalized = Array.isArray(alerts) ? alerts : [];
        const changed = this.haveAlertsChanged(normalized);
        this.activeAlerts = normalized;
        this.alertsLastFetched = Date.now();
        if (!changed) {
            return;
        }
        try {
            window.dispatchEvent(new CustomEvent('weather-alerts-update', { detail: normalized }));
        } catch (error) {
            console.warn('Alert update event dispatch failed:', error.message);
        }
    }

    haveAlertsChanged(newAlerts) {
        const previous = Array.isArray(this.activeAlerts) ? this.activeAlerts : [];
        if (previous.length !== newAlerts.length) {
            return true;
        }

        const previousSignatures = new Set(previous.map(alert => this.getAlertSignature(alert)));
        for (const alert of newAlerts) {
            const signature = this.getAlertSignature(alert);
            if (!previousSignatures.has(signature)) {
                return true;
            }
        }
        return false;
    }

    getAlertSignature(alert) {
        if (!alert) return '';
        return [
            alert.id || '',
            alert.event || '',
            alert.severity || '',
            alert.urgency || '',
            alert.certainty || '',
            alert.headline || '',
            alert.description || '',
            alert.instruction || ''
        ].join('|');
    }

    parseAlertDate(value) {
        if (!value) return null;
        try {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        } catch (error) {
            return null;
        }
    }

    getNearestStations(lat, lon, limit = 10) {
        if (!this.airportsList || this.airportsList.length === 0) {
            return [];
        }

        const results = [];
        for (const airport of this.airportsList) {
            if (!airport || !airport.station) continue;
            if (!Number.isFinite(airport.latitude) || !Number.isFinite(airport.longitude)) {
                continue;
            }
            const distanceKm = this.calculateDistance(lat, lon, airport.latitude, airport.longitude);
            const distanceMiles = distanceKm * 0.621371;
            results.push({
                ident: airport.ident,
                station: airport.station,
                municipality: airport.municipality,
                state: airport.state,
                name: airport.name,
                latitude: airport.latitude,
                longitude: airport.longitude,
                distanceKm,
                distanceMiles
            });
        }

        results.sort((a, b) => a.distanceKm - b.distanceKm);
        return results.slice(0, limit);
    }

    async fetchNearbyStationsFromNWS(lat, lon, limit = 20) {
        const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
        const cached = this.stationListCache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < 10 * 60 * 1000) {
            return cached.items.slice(0, limit);
        }

        const url = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}/stations`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Stations lookup failed: ${response.status}`);
        }

        const data = await response.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const items = [];

        for (const feature of features) {
            const stationCode = feature?.properties?.stationIdentifier;
            if (!this.isLikelyObservationStation(stationCode)) continue;

            const coords = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : null;
            const stationLon = this.parseCoordinate(coords?.[0]);
            const stationLat = this.parseCoordinate(coords?.[1]);
            const distanceKm = (Number.isFinite(stationLat) && Number.isFinite(stationLon))
                ? this.calculateDistance(lat, lon, stationLat, stationLon)
                : null;

            items.push({
                station: stationCode.trim().toUpperCase(),
                name: feature?.properties?.name || null,
                distanceKm,
                distanceMiles: Number.isFinite(distanceKm) ? distanceKm * 0.621371 : null,
                latitude: stationLat,
                longitude: stationLon
            });
        }

        items.sort((a, b) => {
            const da = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
            const db = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
            return da - db;
        });

        this.stationListCache.set(cacheKey, { timestamp: now, items });
        return items.slice(0, limit);
    }

    formatObservationRecord(stationCode, apiData, distanceMiles, fallbackName = null) {
        if (!apiData || !apiData.properties) {
            return null;
        }

        const props = apiData.properties;
        const timestamp = props.timestamp ? new Date(props.timestamp) : null;
        const validTimestamp = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp : null;
        let ageMinutes = null;
        if (validTimestamp) {
            ageMinutes = Math.round((Date.now() - validTimestamp.getTime()) / 60000);
        }

    const stationInfo = this.getStationInfo(stationCode);
    const location = this.formatObservationLocation(stationCode, stationInfo, fallbackName);

        return {
            station: stationCode,
            location,
            distance: Number.isFinite(distanceMiles) ? distanceMiles : null,
            temperature: this.convertCelsiusToFahrenheit(props.temperature?.value),
            dewpoint: this.convertCelsiusToFahrenheit(props.dewpoint?.value),
            humidity: props.relativeHumidity?.value ? Math.round(props.relativeHumidity.value) : null,
            windSpeed: this.convertMpsToMph(props.windSpeed?.value),
            windGust: this.convertMpsToMph(props.windGust?.value),
            windDirection: this.parseWindDirection(props.windDirection?.value),
            visibility: this.convertMetersToMiles(props.visibility?.value),
            pressure: this.convertPascalsToInches(props.barometricPressure?.value),
            condition: this.parseCondition(props.textDescription),
            observationTime: validTimestamp,
            ageMinutes
        };
    }

    formatObservationLocation(stationCode, stationInfo, fallbackName = null) {
        if (!stationInfo) {
            if (fallbackName) return fallbackName;
            return stationCode;
        }

        const city = stationInfo.municipality ? String(stationInfo.municipality).trim() : '';
        const state = stationInfo.state ? String(stationInfo.state).trim() : '';
        const name = stationInfo.name ? String(stationInfo.name).trim() : '';

        if (city) {
            return city;
        }
        if (name) {
            return name;
        }
        if (fallbackName) return fallbackName;
        return stationCode;
    }

    buildUnavailableCurrentConditions() {
        const stationInfo = this.getStationInfo(this.stationCode);
        const locationSource = stationInfo?.municipality || stationInfo?.name || this.stationCode || 'Unknown';
        const locationName = this.getLocationName(locationSource);
        const lat = this.parseCoordinate(stationInfo?.latitude ?? stationInfo?.latitude_deg);
        const lon = this.parseCoordinate(stationInfo?.longitude ?? stationInfo?.longitude_deg);

        return {
            station: this.stationCode,
            location: locationName,
            latitude: lat,
            longitude: lon,
            temperature: null,
            dewpoint: null,
            windChill: null,
            condition: 'Data Unavailable',
            icon: 'null.png',
            humidity: null,
            pressure: null,
            visibility: null,
            ceiling: null,
            windDirection: null,
            windSpeed: null,
            windGust: null,
            observationTime: null,
            rawData: { unavailable: true }
        };
    }

    updateCurrentConditionsDisplay(data = this.currentData) {
        if (this.configCache?.use_placeholder_current_conditions) {
            console.log('Current conditions update skipped (placeholder lock active)');
            return;
        }
        if (!data) {
            data = this.buildUnavailableCurrentConditions();
        }

        console.log('Updating current conditions display with live data');

        const locElement = document.querySelector('.current-location');
        if (locElement) {
            const locationText = data.location || '--';
            locElement.textContent = locationText;
            if (locationText && locationText !== '--') {
                this.adjustCurrentLocationPlacement(locElement);
            } else {
                locElement.style.right = '';
                locElement.style.left = '';
            }
        }

        const tempElement = document.querySelector('.current-temp');
        if (tempElement) {
            const temperatureValue = Number(data.temperature);
            const degreeGlyph = this.getTemperatureDegreeGlyph();
            tempElement.textContent = Number.isFinite(temperatureValue)
                ? `${Math.round(temperatureValue)}${degreeGlyph}`
                : '--';
        }

        const conditionElement = document.querySelector('.current-condition');
        if (conditionElement) {
            const conditionText = data.condition || 'Data Unavailable';
            conditionElement.innerHTML = this.formatConditionText(conditionText);
            conditionElement.classList.remove(...Array.from(conditionElement.classList).filter(cls => cls.startsWith('condition-')));
            const conditionClass = this.getConditionCSSClass(conditionText);
            conditionElement.classList.add(conditionClass);
            console.log(`Applied condition: "${conditionText}" with class: "${conditionClass}"`);
        }

        const iconElement = document.querySelector('.weather-icon');
        if (iconElement) {
            const iconName = data.icon || 'null.png';
            iconElement.src = `./currentconditions+extendedforecast_icons/${iconName}`;
            iconElement.alt = data.condition || 'Data Unavailable';
            iconElement.className = 'weather-icon ' + this.getIconClass(iconName);
            console.log(`Applied icon class: ${this.getIconClass(iconName)} for ${iconName}`);
        }

        const humidityElement = document.querySelector('.data-humidity');
        if (humidityElement) {
            const humidityValue = Number(data.humidity);
            humidityElement.textContent = Number.isFinite(humidityValue)
                ? `${Math.round(humidityValue)}%`
                : '--';
        }

        const dewpointElement = document.querySelector('.data-dewpoint');
        if (dewpointElement) {
            const dewpointValue = Number(data.dewpoint);
            const degreeGlyph = this.getTemperatureDegreeGlyph();
            dewpointElement.textContent = Number.isFinite(dewpointValue)
                ? `${Math.round(dewpointValue)}${degreeGlyph}`
                : '--';
        }

        const ceilingElement = document.querySelector('.data-ceiling');
        if (ceilingElement) {
            const ceilingText = data.ceiling !== null && data.ceiling !== undefined && String(data.ceiling).trim()
                ? String(data.ceiling).trim()
                : '--';
            ceilingElement.textContent = ceilingText;
        }

        const visibilityElement = document.querySelector('.data-visibility');
        if (visibilityElement) {
            let visibilityText = '--';
            if (data.visibility !== null && data.visibility !== undefined) {
                const visibilityValue = Number(data.visibility);
                if (Number.isFinite(visibilityValue)) {
                    const formatted = visibilityValue >= 10 ? Math.round(visibilityValue) : visibilityValue.toFixed(1);
                    visibilityText = `${formatted} mi.`;
                } else if (typeof data.visibility === 'string' && data.visibility.trim()) {
                    visibilityText = data.visibility.trim();
                }
            }
            visibilityElement.textContent = visibilityText;
        }

        const pressureElement = document.querySelector('.data-pressure');
        if (pressureElement) {
            const pressureText = data.pressure !== null && data.pressure !== undefined && String(data.pressure).trim()
                ? String(data.pressure).trim()
                : '--';
            pressureElement.textContent = pressureText;
        }

        const windChillElement = document.querySelector('.data-windchill');
        if (windChillElement) {
            const windChillValue = Number(data.windChill);
            const degreeGlyph = this.getTemperatureDegreeGlyph();
            windChillElement.textContent = Number.isFinite(windChillValue)
                ? `${Math.round(windChillValue)}${degreeGlyph}`
                : '--';
        }

        const windElement = document.querySelector('.current-wind');
        if (windElement) {
            const windSpeedValue = Number(data.windSpeed);
            const windGustValue = Number(data.windGust);
            const speed = Number.isFinite(windSpeedValue) ? Math.round(windSpeedValue) : null;
            const gust = Number.isFinite(windGustValue) ? Math.round(windGustValue) : null;
            const gustIsMeaningful = Number.isFinite(windGustValue) && gust !== null && gust > 0;
            const direction = typeof data.windDirection === 'string' && data.windDirection.trim()
                ? data.windDirection.trim()
                : null;

            if (direction && speed !== null) {
                const gustSuffix = gustIsMeaningful ? ` G${gust}` : '';
                windElement.textContent = `Wind: ${direction}  ${speed}${gustSuffix}`;
            } else if (speed !== null) {
                windElement.textContent = `Wind: ${speed} mph`;
            } else if (direction) {
                windElement.textContent = `Wind: ${direction}`;
            } else {
                windElement.textContent = 'Wind: --';
            }
        }

        const gustElement = document.querySelector('.current-wind-line2');
        if (gustElement) {
            const windSpeedValue = Number(data.windSpeed);
            const windGustValue = Number(data.windGust);
            const segments = [];

            if (Number.isFinite(windSpeedValue)) {
                segments.push(`${Math.round(windSpeedValue)} mph`);
            }
            if (Number.isFinite(windGustValue)) {
                const gustRounded = Math.round(windGustValue);
                if (gustRounded > 0) {
                    segments.push(`Gusts to ${gustRounded}`);
                }
            }

            if (segments.length) {
                gustElement.style.display = 'block';
                gustElement.textContent = segments.join(' ').trim();
            } else {
                gustElement.style.display = 'none';
                gustElement.textContent = '';
            }
        }

        this.applyAuthenticColors(data);
        console.log('Current conditions display updated successfully');
    }

    adjustCurrentLocationPlacement(element) {
        if (!element) return;

        const schedule = () => {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(applyAdjustment);
            } else {
                setTimeout(applyAdjustment, 0);
            }
        };

        const applyAdjustment = () => {
            try {
                if (!element.dataset.defaultRight) {
                    const computed = window.getComputedStyle(element);
                    element.dataset.defaultRight = computed?.right || '255px';
                }

                const baseRight = parseFloat(element.dataset.defaultRight) || 255;
                const minRight = 90;
                const defaultBaseline = 200;
                let baseWidth = Number.isFinite(parseFloat(element.dataset.baseWidth))
                    ? parseFloat(element.dataset.baseWidth)
                    : defaultBaseline;
                const width = element.offsetWidth;

                if (!Number.isFinite(width) || width <= 0) {
                    const retries = Number(element.dataset.locationAdjustRetries || '0');
                    if (retries < 5) {
                        element.dataset.locationAdjustRetries = String(retries + 1);
                        schedule();
                    }
                    return;
                }

                if (width < baseWidth) {
                    baseWidth = width;
                    element.dataset.baseWidth = String(width);
                } else {
                    element.dataset.baseWidth = String(baseWidth);
                }

                element.dataset.locationAdjustRetries = '0';

                const excess = width - baseWidth;
                const shiftMultiplier = 1.6;
                const adjustedRight = excess > 0
                    ? Math.max(minRight, baseRight - excess * shiftMultiplier)
                    : baseRight;

                element.style.right = `${adjustedRight}px`;
                element.style.left = 'auto';
            } catch (error) {
                console.warn('Location placement adjustment failed:', error.message);
            }
        };

        schedule();
    }

    getConditionCSSClass(condition) {
        if (!condition) return 'condition-unknown';
        
        const conditionLower = condition.toLowerCase();
        
        if (conditionLower.includes('clear')) {
            return 'condition-clear';
        } else if (conditionLower.includes('mostly cloudy')) {
            return 'condition-mostly-cloudy';
        } else if (conditionLower.includes('partly cloudy')) {
            return 'condition-partly-cloudy';
        } else if (conditionLower.includes('cloudy') || conditionLower.includes('overcast')) {
            return 'condition-cloudy';
        } else if (conditionLower.includes('sunny')) {
            return 'condition-sunny';
        } else if (conditionLower.includes('rain')) {
            return 'condition-rain';
        } else if (conditionLower.includes('shower')) {
            return 'condition-showers';
        } else if (conditionLower.includes('thunderstorm')) {
            return 'condition-thunderstorm';
        } else if (conditionLower.includes('snow')) {
            return 'condition-snow';
        } else if (conditionLower.includes('fog')) {
            return 'condition-fog';
        } else {
            return 'condition-unknown';
        }
    }

    formatConditionText(condition) {
        if (!condition) return 'Unknown';
        return condition;
    }
    
    applyAuthenticColors(data) {
        if (!data) return;

        try {
            console.log('Classic WeatherSTAR 4000 white text preserved - only location gets color');
        } catch (error) {
            console.error('Error applying authentic colors:', error.message);
        }
    }

    getIconClass(iconFilename) {
        if (!iconFilename) return 'null';
        
        const className = iconFilename
            .replace('.gif', '')
            .replace('.png', '')
            .toLowerCase()
            .replace(/-/g, '-');
            
        return className;
    }

    async init() {
        console.log('WeatherSTAR 4000 Data Module initializing');
        
        await this.loadStationFromConfig();
        
        try {
            await this.loadAirportsIndex();
        } catch (error) {
            console.warn('Could not preload airports index:', error.message);
        }

        this.refreshStationMetadata();
        
        // Fetch current conditions and update display immediately
        await this.fetchCurrentConditions();
        this.updateCurrentConditionsDisplay();
        
        // Prefetch extended forecast in background without blocking
        this.fetchExtendedForecast().catch(error => {
            console.warn('Forecast prefetch failed:', error.message);
        });
        
        setInterval(async () => {
            console.log('Refreshing weather data');
            await this.fetchCurrentConditions();
            this.updateCurrentConditionsDisplay();
        }, 5 * 60 * 1000);
        
        console.log('WeatherSTAR 4000 Data Module ready');
    }

    async fetchExtendedForecast() {
        try {
            if (!this.currentData) await this.fetchCurrentConditions();
            
            const lat = this.currentData?.latitude;
            const lon = this.currentData?.longitude;
            
            if (!(Number.isFinite(lat) && Number.isFinite(lon))) {
                throw new Error('Missing coordinates for forecast');
            }
            
            const ptResp = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
            if (!ptResp.ok) throw new Error(`Points lookup failed: ${ptResp.status}`);
            
            const pt = await ptResp.json();
            const fcUrl = pt?.properties?.forecast;
            if (!fcUrl) throw new Error('No forecast URL found');
            
            const fcResp = await fetch(fcUrl);
            if (!fcResp.ok) throw new Error(`Forecast fetch failed: ${fcResp.status}`);
            
            const fcData = await fcResp.json();
            const periods = fcData?.properties?.periods;
            if (!Array.isArray(periods) || periods.length < 3) throw new Error('Insufficient forecast data');
            
            this.rawPeriods = periods;
            this.extendedForecast = this.buildForecastDays(periods);
            
            try { 
                window.dispatchEvent(new CustomEvent('forecast-update', { detail: this.extendedForecast })); 
            } catch (error) {
                console.warn('Forecast update event dispatch failed:', error.message);
            }
            
            return this.extendedForecast;
            
        } catch (error) {
            console.warn('Extended forecast fetch failed, using mock data:', error.message);
            this.extendedForecast = this.getMockForecast();
            this.rawPeriods = this.getMockPeriods();
            
            try { 
                window.dispatchEvent(new CustomEvent('forecast-update', { detail: this.extendedForecast })); 
            } catch (eventError) {
                console.warn('Forecast update event dispatch failed (mock data):', eventError.message);
            }
            
            return this.extendedForecast;
        }
    }

    buildForecastDays(periods) {
        if (!Array.isArray(periods) || !periods.length) return this.getMockForecast();
        
        const dayPeriods = periods.filter(p => p.isDaytime === true);
        const pick = dayPeriods.slice(2, 5);
        
        const findNightLow = (startIso) => {
            const start = new Date(startIso);
            const night = periods.find(p => p.isDaytime === false && new Date(p.startTime) > start);
            return Number.isFinite(night?.temperature) ? night.temperature : null;
        };
        
        const dow = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
        const days = pick.map(p => {
            const d = new Date(p.startTime);
            const name = dow[d.getDay()];
            const hi = Number.isFinite(p.temperature) ? p.temperature : null;
            const lo = findNightLow(p.startTime);
            return {
                name,
                shortForecast: String(p.shortForecast || p.name || '').replace(/\s+/g,' ').trim(),
                hi,
                lo,
            };
        });
        
        if (days.length < 3) return this.getMockForecast();
        return days;
    }

    getMockForecast() {
        const dow = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
        const today = new Date();
        const mk = i => {
            const d = new Date(today.getTime() + (i+2)*24*3600*1000);
            return {
                name: dow[d.getDay()],
                shortForecast: ['Sunny','Partly Cloudy','Mostly Sunny'][i%3],
                hi: 70 + i*3,
                lo: 50 + i*2,
            };
        };
        return [mk(0), mk(1), mk(2)];
    }

    getMockPeriods() {
        const now = new Date();
        const periods = [];
        for (let i = 0; i < 14; i++) {
            const start = new Date(now.getTime() + i * 12 * 3600 * 1000);
            periods.push({
                number: i + 1,
                name: i % 2 === 0 ? 'Today' : 'Tonight',
                startTime: start.toISOString(),
                isDaytime: i % 2 === 0,
                temperature: 70 + Math.floor(i / 2) * 5,
                temperatureUnit: 'F',
                shortForecast: ['Sunny', 'Clear', 'Partly Cloudy', 'Mostly Sunny'][i % 4],
                detailedForecast: 'Mock forecast data'
            });
        }
        return periods;
    }

    getRuntimeLocationOverride() {
        if (typeof window === 'undefined') {
            return null;
        }
        const override = window.__LOCATION_OVERRIDE;
        if (!override) {
            return null;
        }
        const code = String(override).trim().toUpperCase();
        return code.length ? code : null;
    }

    async loadStationFromConfig() {
        const runtimeOverride = this.getRuntimeLocationOverride();
        try {
            const resp = await fetch('/api/config');
            if (!resp.ok) throw new Error(`Config fetch failed: ${resp.status}`);
            
            const cfg = await resp.json();
            this.configCache = cfg; // Cache config for location override
            
            if (runtimeOverride) {
                this.stationCode = runtimeOverride;
                console.log(`Station override from URL/IP: ${this.stationCode}`);
                this.refreshStationMetadata();
                return;
            }

            const code = (cfg.locationcode || cfg.locationCode || cfg.station || '').toString().trim().toUpperCase();

            if (code) {
                this.stationCode = code;
                console.log(`Station from config: ${this.stationCode}`);
                this.refreshStationMetadata();
            } else {
                console.warn(`No locationcode in config; attempting automatic location detection`);
                await this.autoDetectLocation();
            }
        } catch (error) {
            if (runtimeOverride) {
                this.stationCode = runtimeOverride;
                console.warn('Config fetch failed; using runtime override', error.message);
                this.refreshStationMetadata();
            } else {
                console.warn(`Failed to load station from config; attempting automatic location detection`, error.message);
                await this.autoDetectLocation();
            }
        }
    }

    async autoDetectLocation() {
        try {
            console.log('Attempting automatic location detection...');
            
            // Try geolocation API first
            if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 10000,
                        enableHighAccuracy: false
                    });
                });
                
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                console.log(`Geolocation detected: ${lat}, ${lon}`);
                
                // Find nearest airport/station using airports.csv
                const nearestStation = await this.findNearestStation(lat, lon);
                if (nearestStation) {
                    this.stationCode = nearestStation;
                    console.log(`Auto-detected nearest station: ${this.stationCode}`);
                    this.refreshStationMetadata();
                    return;
                }
            }
            
            // Fallback to IP-based location
            const ipLocation = await this.getLocationFromIP();
            if (ipLocation) {
                this.stationCode = ipLocation;
                console.log(`Auto-detected station from IP: ${this.stationCode}`);
                this.refreshStationMetadata();
                return;
            }
            
            console.warn(`Auto-detection failed; using default: ${this.stationCode}`);
            this.refreshStationMetadata();
            
        } catch (error) {
            console.warn(`Auto-detection failed; using default: ${this.stationCode}`, error.message);
            this.refreshStationMetadata();
        }
    }

    async findNearestStation(lat, lon) {
        try {
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                throw new Error('Invalid coordinates for station lookup');
            }

            try {
                const nwsStations = await this.fetchNearbyStationsFromNWS(lat, lon, 5);
                if (Array.isArray(nwsStations) && nwsStations.length) {
                    const preferredNws = nwsStations.find(item => this.isPreferredStationCode(item.station));
                    const selection = preferredNws || nwsStations[0];
                    if (selection?.station) {
                        return selection.station.trim().toUpperCase();
                    }
                }
            } catch (nwsError) {
                console.warn('NWS station lookup unavailable:', nwsError.message);
            }

            await this.loadAirportsIndex();
            const candidates = this.getNearestStations(lat, lon, 10);

            const preferredCandidate = candidates.find(entry => this.isPreferredStationCode(entry.station));
            if (preferredCandidate?.station) {
                return preferredCandidate.station.trim().toUpperCase();
            }

            const fallbackCandidate = candidates.find(entry => this.isLikelyObservationStation(entry.station));
            if (fallbackCandidate?.station) {
                return fallbackCandidate.station.trim().toUpperCase();
            }

            return null;
        } catch (error) {
            console.error('Error finding nearest station:', error.message);
            return null;
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    async getLocationFromIP() {
        try {
            // Use a free IP geolocation service
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('IP location service unavailable');
            
            const data = await response.json();
            if (data.latitude && data.longitude) {
                return await this.findNearestStation(data.latitude, data.longitude);
            }
            
            return null;
        } catch (error) {
            console.warn('IP-based location detection failed:', error.message);
            return null;
        }
    }

    getLocationName(defaultName) {
        // Return override location name if set, otherwise use default
        let name = defaultName;
        if (this.configCache && this.configCache.location_override) {
            name = this.configCache.location_override;
        }
        return this.abbreviateLocationNameIfConfigured(name);
    }

    abbreviateLocationNameIfConfigured(name) {
        if (!name) return name;
        if (!this.shouldAbbreviateLocationPrefix()) {
            return name;
        }

        const trimmed = String(name).trim();
        if (!trimmed) {
            return trimmed;
        }

        const words = trimmed.split(/\s+/).filter(Boolean);
        if (words.length < 2) {
            return trimmed;
        }

        const first = words[0];
        if (!first || first.length === 1) {
            return trimmed;
        }

        // Avoid double abbreviation if the first word already ends with a period
        if (/\.\s*$/.test(first) || first.endsWith('.')) {
            return trimmed;
        }

        const initial = first.charAt(0);
        if (!/\p{L}/u.test(initial)) {
            return trimmed;
        }

        const abbreviated = `${initial.toUpperCase()}.`;
        words[0] = abbreviated;
        return words.join(' ');
    }

    shouldAbbreviateLocationPrefix() {
        const flag = this.configCache?.abbreviate_location_prefix;
        if (typeof flag === 'string') {
            const normalized = flag.trim().toLowerCase();
            return normalized === 'y' || normalized === 'yes' || normalized === 'true';
        }
        return Boolean(flag);
    }

    isModernModeEnabled() {
        const flag = this.configCache?.modern;
        if (typeof flag === 'string') {
            const normalized = flag.trim().toLowerCase();
            return ['true', 'on', 'enable', 'enabled', 'y', 'yes', '1'].includes(normalized);
        }
        return Boolean(flag);
    }

    getTemperatureDegreeGlyph() {
        return this.isModernModeEnabled() ? '\u00B0' : '\\';
    }

    async loadAirportsIndex() {
        if (this.airportsIndex && this.airportsList) return this.airportsIndex;

        console.log('Loading airports index');
        const resp = await fetch('airports.csv');
        if (!resp.ok) throw new Error(`Airports CSV fetch failed: ${resp.status}`);

        const text = await resp.text();
    const rows = this.parseCSV(text);
        const headers = rows.shift();
        const idx = (name) => headers.indexOf(name);
        const identIdx = idx('ident');
        const muniIdx = idx('municipality');
        const latIdx = idx('latitude_deg');
        const lonIdx = idx('longitude_deg');
        const isoIdx = idx('iso_country');
        const regionIdx = idx('iso_region');
        const nameIdx = idx('name');
        const gpsIdx = idx('gps_code');
        const localIdx = idx('local_code');
        const typeIdx = idx('type');

        if (identIdx === -1 || isoIdx === -1 || latIdx === -1 || lonIdx === -1) {
            throw new Error('Airports CSV missing required columns');
        }

        const map = new Map();
        const list = [];

        for (const row of rows) {
            if (!row || !row.length) continue;
            const iso = isoIdx >= 0 ? row[isoIdx] : null;

            const rawIdent = identIdx >= 0 ? row[identIdx] : null;
            const rawGps = gpsIdx >= 0 ? row[gpsIdx] : null;
            const rawLocal = localIdx >= 0 ? row[localIdx] : null;

            const ident = rawIdent ? rawIdent.trim().toUpperCase() : null;
            const gpsCode = rawGps ? rawGps.trim().toUpperCase() : null;
            const localCode = rawLocal ? rawLocal.trim().toUpperCase() : null;

            const stationCode = this.selectStationCode(gpsCode, ident, localCode);
            if (!stationCode) continue;

            const latVal = this.parseCoordinate(latIdx >= 0 ? row[latIdx] : null);
            const lonVal = this.parseCoordinate(lonIdx >= 0 ? row[lonIdx] : null);
            if (!Number.isFinite(latVal) || !Number.isFinite(lonVal)) continue;

            const isoRegionRaw = regionIdx >= 0 ? row[regionIdx] : '';
            let state = null;
            if (isoRegionRaw && isoRegionRaw.startsWith('US-')) {
                const parts = isoRegionRaw.split('-');
                if (parts[1]) {
                    state = parts[1].toUpperCase();
                }
            }

            const entry = {
                ident,
                station: stationCode,
                municipality: muniIdx >= 0 ? (row[muniIdx] || null) : null,
                state,
                country: iso || null,
                name: nameIdx >= 0 ? (row[nameIdx] || null) : null,
                latitude: latVal,
                longitude: lonVal,
                latitude_deg: latVal,
                longitude_deg: lonVal,
                type: typeIdx >= 0 ? (row[typeIdx] || null) : null
            };

            if (ident) {
                map.set(ident, entry);
            }
            if (stationCode && stationCode !== ident) {
                map.set(stationCode, entry);
            }

            if ((iso || '').toUpperCase() === 'US') {
                list.push(entry);
            }
        }

        this.airportsIndex = map;
        this.airportsList = list;
        console.log(`Airports index ready (${map.size} entries, ${list.length} US stations)`);
        this.refreshStationMetadata();
        return this.airportsIndex;
    }

    getStationInfo(code) {
        if (!code || !this.airportsIndex) return null;
        return this.airportsIndex.get(code) || null;
    }

    refreshStationMetadata() {
        const code = typeof this.stationCode === 'string' ? this.stationCode.trim().toUpperCase() : '';
        let country = null;

        if (code && this.airportsIndex) {
            const info = this.getStationInfo(code);
            if (info && info.country) {
                country = String(info.country).trim().toUpperCase();
            }
        }

        if (!country) {
            country = this.estimateCountryFromCode(code);
        }

        this.stationCountry = country || 'US';
    }

    estimateCountryFromCode(code) {
        if (!code) return 'US';
        const upper = code.trim().toUpperCase();
        if (!upper) return 'US';

        if (/^K[A-Z0-9]{3}$/.test(upper)) return 'US';
        if (/^P[ACHMNPRTWX][A-Z0-9]{2}$/.test(upper)) return 'US';
        if (/^T[JKS][A-Z0-9]{2}$/.test(upper)) return 'US';
        if (/^M[DHKNP][A-Z0-9]{2}$/.test(upper)) return 'US';
        if (/^N[A-Z0-9]{3}$/.test(upper)) return 'US';

        return 'INTL';
    }

    isStationOutsideUS() {
        return (this.stationCountry && this.stationCountry.toUpperCase() !== 'US');
    }

    selectStationCode(gpsCode, ident, localCode) {
        const candidates = [gpsCode, ident, localCode];
        for (const code of candidates) {
            if (this.isLikelyObservationStation(code)) {
                return code.trim().toUpperCase();
            }
        }
        return null;
    }

    isPreferredStationCode(code) {
        if (!this.isLikelyObservationStation(code)) return false;
        const trimmed = String(code).trim().toUpperCase();
        if (trimmed.length !== 4) return false;
        return this.estimateCountryFromCode(trimmed) === 'US';
    }

    isLikelyObservationStation(code) {
        if (!code) return false;
        const trimmed = String(code).trim().toUpperCase();
        if (!trimmed) return false;
        // Reject placeholders or heliport identifiers
        if (trimmed.includes('-')) return false;
        if (!/^[A-Z0-9]+$/.test(trimmed)) return false;
        if (trimmed.length === 4) {
            return /^[A-Z][A-Z0-9]{3}$/.test(trimmed);
        }
        if (trimmed.length === 3) {
            return /^[A-Z][A-Z0-9]{2}$/.test(trimmed);
        }
        return false;
    }

    parseCSV(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            
            if (inQuotes) {
                if (c === '"') {
                    if (text[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += c;
                }
            } else {
                if (c === '"') {
                    inQuotes = true;
                } else if (c === ',') {
                    row.push(field);
                    field = '';
                } else if (c === '\n') {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                } else if (c === '\r') {
                    // ignore
                } else {
                    field += c;
                }
            }
        }
        
        if (field.length > 0 || inQuotes || row.length > 0) {
            row.push(field);
            rows.push(row);
        }
        
        return rows;
    }
}

window.WeatherData = WeatherData;