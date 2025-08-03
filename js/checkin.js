document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT SELECTORS ---
    const eventSelector = document.getElementById('event-selector');
    const eventNameDisplay = document.getElementById('event-name-display');
    const totalTicketsSoldSpan = document.getElementById('total-tickets-sold');
    const ticketsCheckedInSpan = document.getElementById('tickets-checked-in');
    const remainingCapacitySpan = document.getElementById('remaining-capacity');
    const ticketIdInput = document.getElementById('ticket-id-input');
    const scanResultDisplay = document.getElementById('scan-result-display');
    const manualCheckinBtn = document.getElementById('manual-checkin-btn');
    
    // --- STATE VARIABLES ---
    let currentEventId = null;
    let totalTicketsForCurrentEvent = 0;
    let ticketsCurrentlyCheckedIn = 0;
    
    // --- HELPER FUNCTIONS ---
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    // Access global custom alert if it exists on the window object
    const showCustomAlert = window.showCustomAlert || ((title, msg) => alert(`${title}: ${msg}`));

    function displayScanResult(message, type = 'info') {
        scanResultDisplay.innerHTML = message; // Use innerHTML to render icons
        scanResultDisplay.className = 'scan-result'; // Reset classes
        scanResultDisplay.classList.add(type); // Add new type for styling

        // Clear message after 3 seconds
        setTimeout(() => {
            if (!currentEventId) {
                scanResultDisplay.innerHTML = `<i class="fas fa-qrcode"></i> Select an event to begin`;
            } else {
                scanResultDisplay.innerHTML = `<i class="fas fa-qrcode"></i> Ready to scan`;
            }
            scanResultDisplay.className = 'scan-result';
        }, 10000);
    }

    function updateCounters() {
        ticketsCheckedInSpan.textContent = ticketsCurrentlyCheckedIn;
        const remaining = totalTicketsForCurrentEvent - ticketsCurrentlyCheckedIn;
        remainingCapacitySpan.textContent = remaining > 0 ? remaining : 0;
    }

    function resetCheckinArea() {
        eventNameDisplay.textContent = 'No Event Selected';
        totalTicketsSoldSpan.textContent = '--';
        ticketsCheckedInSpan.textContent = '--';
        remainingCapacitySpan.textContent = '--';
        ticketIdInput.disabled = true;
        manualCheckinBtn.disabled = true;
        displayScanResult('<i class="fas fa-qrcode"></i> Select an event to begin');
        currentEventId = null;
    }

    // --- API & BUSINESS LOGIC ---
    async function processTicketScan(ticketId) {
        if (!currentEventId) {
            showCustomAlert('Error', 'Please select an event before scanning.', 'error');
            return;
        }
        if (!ticketId.trim()) return;

        displayScanResult('Checking...', 'info');
        ticketIdInput.disabled = true;
        manualCheckinBtn.disabled = true;

        try {
            const token = getAuthToken();
            if (!token) throw new Error('Auth token not found');

            const response = await fetch('/api/tickets/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ticketId, eventId: currentEventId })
            });

            const result = await response.json();

            if (response.ok) {
                displayScanResult(`<i class="fas fa-check-circle"></i> ${result.message || 'Valid Ticket'}`, 'success');
                ticketsCurrentlyCheckedIn++;
                updateCounters();
            } else {
                displayScanResult(`<i class="fas fa-times-circle"></i> ${result.message || 'Invalid Ticket'}`, 'error');
                showCustomAlert('Check-in Failed', result.message, 'error');
            }
        } catch (error) {
            console.error('Check-in error:', error);
            const errorMessage = error.message === 'Auth token not found' 
                ? 'Authentication error. Please log in again.' 
                : 'Network error during check-in.';
            showCustomAlert('Error', errorMessage, 'error');
            displayScanResult('Error', 'error');
            if(error.message === 'Auth token not found') window.location.href = 'login.html';
        } finally {
            ticketIdInput.value = '';
            ticketIdInput.disabled = false;
            manualCheckinBtn.disabled = false;
            ticketIdInput.focus();
        }
    }

    async function loadEventDetails(eventId) {
        resetCheckinArea();
        if (!eventId) return;

        displayScanResult('Loading stats...', 'info');

        try {
            const token = getAuthToken();
            if (!token) throw new Error('Auth token not found');
            
            // This API endpoint should return stats for a specific event
            const response = await fetch(`/api/checkin/stats/${eventId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error(`Failed to fetch event stats. Status: ${response.status}`);

            const stats = await response.json();
            
            currentEventId = eventId;
            totalTicketsForCurrentEvent = stats.totalTickets;
            ticketsCurrentlyCheckedIn = stats.checkedInCount;

            eventNameDisplay.textContent = stats.eventName;
            totalTicketsSoldSpan.textContent = stats.totalTickets;
            updateCounters();
            
            ticketIdInput.disabled = false;
            manualCheckinBtn.disabled = false;
            ticketIdInput.focus();
            displayScanResult('<i class="fas fa-qrcode"></i> Ready to scan', 'info');

        } catch (error) {
            console.error("Failed to load event details:", error);
            showCustomAlert('Error', error.message, 'error');
            resetCheckinArea();
        }
    }
    
    async function initializePage() {
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('Access Denied', 'You must be logged in to use the check-in system.', 'error', () => {
                window.location.href = 'login.html';
            });
            return;
        }

        try {
            // Fetch all events this user is allowed to manage
            const response = await fetch('/api/events/my-events', { // Assuming an endpoint that gets events for the logged-in staff
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Could not fetch events.');

            const events = await response.json();

            if (events && events.length > 0) {
                eventSelector.innerHTML = '<option value="">-- Please choose an event --</option>'; // Reset
                events.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event._id;
                    option.textContent = event.eventName;
                    eventSelector.appendChild(option);
                });
            } else {
                showCustomAlert('No Events Found', 'There are no events available for you to manage.', 'info');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            showCustomAlert('Error', 'Could not load event list. Please try again later.', 'error');
        }
    }

    // --- EVENT LISTENERS ---
    eventSelector.addEventListener('change', () => {
        loadEventDetails(eventSelector.value);
    });

    ticketIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processTicketScan(ticketIdInput.value.trim());
        }
    });

    manualCheckinBtn.addEventListener('click', () => {
        processTicketScan(ticketIdInput.value.trim());
    });

    // --- START ---
    initializePage();
});