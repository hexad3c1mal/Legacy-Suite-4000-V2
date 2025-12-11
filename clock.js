/*
| Task127 clock.js
| Well.... its a clock. 
| What else do you want me to say?
| by hexadec1mal.
*/
class Clock {
    constructor() {
        this.timeElement = null;
        this.dateElement = null;
        this.updateInterval = null;
    }

    init() {
        this.timeElement = document.getElementById('clock-time');
        this.dateElement = document.getElementById('clock-date');
        this.start();
    }

    start() {
        this.updateClock(); // Initial update
        this.updateInterval = setInterval(() => this.updateClock(), 1000);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateClock() {
        const now = new Date();
        
        // Format time (12-hour format with AM/PM)
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
        
        // Format date (DAY MON DD)
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const dayName = days[now.getDay()];
        const monthName = months[now.getMonth()];
        const date = now.getDate();
        
        // Create date string with special character handling
        let dateString = `${dayName} ${monthName} `;
        
        // Handle single vs double digit dates with character-specific adjustments
        if (date < 10) {
            dateString += ' '; // Space for single digits
            const digitChar = date.toString();
            if (digitChar === '4') {
                dateString += `<span class="char-4">${digitChar}</span>`;
            } else if (digitChar === '1') {
                dateString += `<span class="char-1">${digitChar}</span>`;
            } else if (digitChar === '7') {
                dateString += `<span class="char-7">${digitChar}</span>`;
            } else {
                dateString += digitChar;
            }
        } else {
            // For double digits, check if second digit needs adjustment
            const dateStr = date.toString();
            if (dateStr.endsWith('4')) {
                dateString += dateStr.slice(0, -1) + `<span class="char-4">4</span>`;
            } else if (dateStr.endsWith('1')) {
                dateString += dateStr.slice(0, -1) + `<span class="char-1">1</span>`;
            } else if (dateStr.endsWith('7')) {
                dateString += dateStr.slice(0, -1) + `<span class="char-7">7</span>`;
            } else {
                dateString += dateStr;
            }
        }
        
        // Update display
        if (this.timeElement) {
            this.timeElement.textContent = timeString;
        }
        if (this.dateElement) {
            this.dateElement.innerHTML = dateString;
        }
    }
}

// Export for use in main app
window.Clock = Clock;
