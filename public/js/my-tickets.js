// js/my-tickets.js

// IMPORTANT: Ensure that the QRCode.js library (or equivalent) is loaded
// IN YOUR HTML *BEFORE* this my-tickets.js script.
// Example: <script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const upcomingTicketsList = document.getElementById('upcoming-tickets');
    const pastTicketsList = document.getElementById('past-tickets');
    const tabsNav = document.querySelector('.tabs-nav');

    // Ensure common.js functions are available globally
    const formatTime = window.formatTime; // Access global formatTime
    const showCustomAlert = window.showCustomAlert; // Access global showCustomAlert
    
    // Improved QR Code Logic - Generates on demand
    const handleQrCodeClick = (event) => {
        if (event.target.matches('.show-qr-btn')) {
            const button = event.target;
            const ticketItem = button.closest('.ticket-item'); // Closest ticket item for context
            const qrCodeDiv = ticketItem.querySelector('.ticket-qr-code');
            const ticketId = button.dataset.ticketData; // Get the ticket ID from a data attribute

            console.log('--- QR Code Button Clicked! ---');
            console.log('Ticket ID from data-attribute:', ticketId);

            if (!qrCodeDiv || !ticketId) {
                console.error('ERROR: Missing QR Code container or Ticket ID (data-ticket-data).');
                showCustomAlert('Error', 'Missing QR code display area or ticket data. Cannot generate. Please contact support.', 'error');
                return; 
            }

            // Toggle visibility of the QR code container
            qrCodeDiv.classList.toggle('hidden');
            button.textContent = qrCodeDiv.classList.contains('hidden') ? 'Show QR Code' : 'Hide QR Code';

            // Check if QR code needs to be generated:
            // It's currently visible AND it doesn't already have a generated QR (canvas or table child)
            const hasQRCodeChild = qrCodeDiv.querySelector('canvas, table');
            if (!qrCodeDiv.classList.contains('hidden') && !hasQRCodeChild) {
                // Show a temporary loading message first
                qrCodeDiv.innerHTML = '<p class="qr-loading-placeholder">Generating QR Code...</p>';
                
                if (typeof QRCode !== 'undefined') {
                    try {
                        // Immediately clear the loading placeholder before generating the actual QR code
                        qrCodeDiv.innerHTML = ''; 

                        new QRCode(qrCodeDiv, {
                            text: ticketId, // Use the actual ticket ID for the QR code data
                            width: 200, // Increased size for better readability
                            height: 200, // Increased height for better readability
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H // High correction level
                        });
                        console.log(`QR Code successfully generated for ticket: ${ticketId}`);
                        // No need to remove placeholder here as qrCodeDiv.innerHTML was set to ''
                        // right before QRCode was created.

                    } catch (qrError) {
                        console.error(`ERROR: Failed to generate QR Code for ${ticketId}:`, qrError);
                        qrCodeDiv.innerHTML = '<p class="error-msg">Failed to generate QR. Try again.</p>';
                        showCustomAlert('QR Code Error', `Could not generate QR code for ticket ${ticketId}. Please try again.`, 'error');
                    }
                } else {
                    qrCodeDiv.innerHTML = '<p class="error-msg">QR code library not loaded.</p>';
                    console.error('ERROR: QRCode.js library (frontend) not found. Make sure it\'s loaded before my-tickets.js.');
                    showCustomAlert('Configuration Error', 'The QR code generation library is missing. Please contact support.', 'error');
                }
            } else if (hasQRCodeChild) {
                // If it's already generated and just being hidden/shown
                console.log('QR Code already generated for this ticket. Just toggling visibility.');
                // Ensure the placeholder is removed if it somehow stayed
                qrCodeDiv.querySelector('.qr-loading-placeholder')?.remove();
            }
        }
    };

    // Attach delegated listeners for QR code button clicks
    if (upcomingTicketsList) upcomingTicketsList.addEventListener('click', handleQrCodeClick);
    if (pastTicketsList) pastTicketsList.addEventListener('click', handleQrCodeClick);

    // Tab Navigation Logic
    if (tabsNav) {
        tabsNav.addEventListener('click', (event) => {
            if (event.target.matches('.tab-btn')) {
                const targetId = event.target.dataset.target;
                tabsNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                document.querySelectorAll('.tickets-list').forEach(list => list.classList.add('hidden'));
                document.getElementById(targetId).classList.remove('hidden');
            }
        });
    }

    // Fetch and Render User Tickets
    async function fetchUserTickets() {
        if (!upcomingTicketsList || !pastTicketsList) {
            console.error("Missing ticket list containers in HTML.");
            return;
        }

        // Display loading messages
        upcomingTicketsList.innerHTML = '<p class="loading-message">Loading your tickets...</p>';
        pastTicketsList.innerHTML = '<p class="loading-message hidden">Loading your tickets...</p>'; // Keep consistent loading message for past too

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            upcomingTicketsList.innerHTML = ''; // Clear loading message
            pastTicketsList.innerHTML = '';
            showCustomAlert('Authentication Required', 'You must be logged in to view your tickets. Redirecting to login page.', 'error', () => {
                window.location.href = 'login.html';
            });
            return;
        }

        try {
            const response = await fetch('/api/users/tickets', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) {
                if (response.status === 403) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userRole');
                    upcomingTicketsList.innerHTML = ''; // Clear loading message
                    pastTicketsList.innerHTML = '';
                    showCustomAlert('Session Expired', 'Your session has expired. Please log in again.', 'error', () => {
                        window.location.href = 'login.html';
                    });
                    return;
                }
                const errorData = await response.json(); // Try to get message from response
                throw new Error(errorData.message || 'Failed to fetch tickets.');
            }
            const tickets = await response.json();
            renderTickets(tickets);
        } catch (error) {
            console.error('Error fetching user tickets:', error);
            upcomingTicketsList.innerHTML = ''; // Clear loading message
            pastTicketsList.innerHTML = '';
            // Display an initial error message to the user before the custom alert
            upcomingTicketsList.innerHTML = `<p class="error-msg">Sorry, an error occurred loading your tickets.</p>`; 
            showCustomAlert('Tickets Load Error', `Sorry, we could not load your tickets: ${error.message}. Please try again later.`, 'error');
        }
    }

    function renderTickets(tickets) {
        upcomingTicketsList.innerHTML = ''; // Clear loading message/previous content
        pastTicketsList.innerHTML = '';     // Clear loading message/previous content

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to start of day for accurate comparison

        let hasUpcoming = false;
        let hasPast = false;

        if (tickets.length === 0) {
            upcomingTicketsList.innerHTML = '<p class="info-msg">You currently have no tickets.</p>';
            pastTicketsList.innerHTML = '<p class="info-msg">No past tickets found.</p>';
            return;
        }

        tickets.forEach(ticket => {
            // Basic validation for essential ticket properties
            if (!ticket.ticketId || !ticket.eventName || !ticket.eventDate || !ticket.eventTime || !ticket.ticketType) {
                console.warn('Skipping malformed ticket data (missing essential fields):', ticket);
                return;
            }

            const eventDate = new Date(ticket.eventDate);
            // Ensure eventDate is valid before comparison
            if (isNaN(eventDate.getTime())) {
                console.warn('Skipping ticket with invalid event date:', ticket);
                return;
            }

            const ticketHTML = `
                <div class="ticket-item glass">
                    <div class="ticket-details">
                        <h3>${ticket.eventName}</h3>
                        <p>
                            <i class="fas fa-calendar-alt"></i> ${eventDate.toLocaleDateString()}
                            <span class="info-separator"> &bull; </span>
                            <i class="fas fa-clock"></i> ${formatTime(ticket.eventTime)}
                        </p>
                        <p class="ticket-type-info">${ticket.ticketType}</p>
                        <p><i class="fas fa-receipt"></i> Ticket ID: <strong>${ticket.ticketId}</strong></p>
                        <p><i class="fas fa-clock"></i> Purchased: ${new Date(ticket.purchaseDate).toLocaleString()}</p>
                        ${/* Placeholder for backend-provided ticket status/validity */''}
                        ${ticket.status ? `<p class="ticket-status status-${ticket.status.toLowerCase()}">Status: ${ticket.status}</p>` : ''}
                        ${ticket.validity ? `<p class="ticket-validity validity-${ticket.validity.toLowerCase()}">Validity: ${ticket.validity}</p>` : ''}
                    </div>
                    <div class="ticket-actions">
                        <div class="ticket-qr-code hidden" id="qrcode-${ticket.ticketId}">
                            <p class="qr-loading-placeholder hidden">Generating QR Code...</p>
                        </div>
                        <button class="show-qr-btn cta-button" data-ticket-data="${ticket.ticketId}">Show QR Code</button>
                    </div>
                </div>`;
            
            if (eventDate >= today) {
                upcomingTicketsList.insertAdjacentHTML('beforeend', ticketHTML);
                hasUpcoming = true;
            } else {
                pastTicketsList.insertAdjacentHTML('beforeend', ticketHTML);
                hasPast = true;
            }
        });

        // Display messages if no tickets in a category
        if (!hasUpcoming) upcomingTicketsList.innerHTML = '<p class="info-msg">No upcoming tickets.</p>';
        if (!hasPast) pastTicketsList.innerHTML = '<p class="info-msg">No past tickets found.</p>';
    }

    // Initial load of tickets when the page loads
    fetchUserTickets();
});