document.addEventListener('DOMContentLoaded', () => {
    // Selectors for initially existing elements that will be populated
    const eventDetailsContainer = document.querySelector('.event-details-container'); // The main wrapper for event details
    const eventInfoBox = document.getElementById('event-info-box'); // The specific info box part
    const eventImage = document.getElementById('event-image'); // The image element
    const eventName = document.getElementById('event-name'); // The h1 for event name
    const eventDateTime = document.getElementById('event-date-time'); // The p for date/time
    const eventLocation = document.getElementById('event-location'); // The p for location
    const eventDescriptionText = document.getElementById('event-description-text'); // The div/p for description
    const ticketOptionsList = document.querySelector('.ticket-options-list'); // The UL for ticket options

    // Ensure common.js functions are available
    const parseFloatSafe = window.parseFloatSafe;
    const formatTime = window.formatTime;
    const renderCartItems = window.renderCartItems;
    const showCustomAlert = window.showCustomAlert;

    // Add to Cart Function
    function addTicketToCart(id, name, quantity, price, eventName) {
        let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
        const existingItemIndex = cart.findIndex(item => item.id === id);
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += quantity;
        } else {
            cart.push({ id, name, quantity, price, eventName });
        }
        localStorage.setItem('cartItems', JSON.stringify(cart));
        showCustomAlert('Cart Updated', `${quantity} x ${name} ticket(s) for "${eventName}" added to your cart!`, 'success');
        
        if (typeof renderCartItems === 'function') {
            renderCartItems();
        }
    }
    
    // Event Details Page Logic (Quantity & Add to Cart)
    if (ticketOptionsList) {
        ticketOptionsList.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('.quantity-btn')) {
                const quantityDisplay = target.closest('.ticket-controls').querySelector('.quantity-display');
                let currentQuantity = parseInt(quantityDisplay.textContent, 10);
                if (target.matches('.plus-btn')) {
                    currentQuantity++;
                } else if (target.matches('.minus-btn') && currentQuantity > 0) {
                    currentQuantity--;
                }
                quantityDisplay.textContent = currentQuantity;
            }
            if (target.matches('.add-to-cart-btn')) {
                const ticketOption = target.closest('.ticket-option');
                const quantity = parseInt(ticketOption.querySelector('.quantity-display').textContent, 10);
                if (quantity === 0) {
                    showCustomAlert('Quantity Error', "Please select a quantity greater than zero to add tickets to your cart.", 'error');
                    return;
                }
                const ticketId = ticketOption.dataset.ticketId;
                const ticketName = ticketOption.dataset.ticketName;
                const ticketPrice = parseFloatSafe(ticketOption.dataset.ticketPrice);
                // Ensure eventName is correctly retrieved from the already loaded eventName element
                const eventNameForCart = eventName ? eventName.textContent : 'Unknown Event';
                
                addTicketToCart(ticketId, ticketName, quantity, ticketPrice, eventNameForCart);
            }
        });
    }

    // Load Event Details from API
    async function loadEventDetails() {
        if (!eventDetailsContainer || !eventInfoBox || !eventImage || !eventName || !eventDateTime || !eventLocation || !eventDescriptionText || !ticketOptionsList) {
            console.error("Missing essential event details HTML elements. Cannot load event details.");
            // Display a critical error if essential elements are missing
            if (eventDetailsContainer) {
                eventDetailsContainer.innerHTML = '<p class="error-msg">A critical page error occurred: Essential elements are missing.</p>';
            }
            showCustomAlert('Page Error', 'Critical error: Required page elements are missing. Please ensure HTML is correct.', 'error');
            return;
        }

        // Create a temporary loading overlay *inside* eventDetailsContainer
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay'; // This class needs CSS
        loadingOverlay.innerHTML = '<p class="loading-message">Loading event details...</p>';
        
        // Append loading overlay
        eventDetailsContainer.appendChild(loadingOverlay);
        // Dim the content and prevent interaction while loading
        eventDetailsContainer.style.opacity = '0.5';
        eventDetailsContainer.style.pointerEvents = 'none';
        eventDetailsContainer.style.position = 'relative'; // Ensure proper positioning context for absolute overlay


        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');

        if (!eventId) {
            // Remove overlay first
            if (loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
            eventDetailsContainer.style.opacity = '1';
            eventDetailsContainer.style.pointerEvents = 'auto';

            // Display error clearly on page and via modal
            eventDetailsContainer.innerHTML = '<p class="error-msg">Error: No event ID provided.</p>';
            showCustomAlert('Missing ID', 'No event ID was provided. Please go back to the homepage and select an event.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Event not found.');
            }
            const event = await response.json();

            // Remove loading overlay and restore container
            if (loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
            eventDetailsContainer.style.opacity = '1';
            eventDetailsContainer.style.pointerEvents = 'auto';

            // Populate event details (elements already exist, just set their values)
            document.title = `${event.eventName} - Click eTickets`;
            // FIX: The leading slash has been removed here.
            eventImage.src = event.flyerImagePath || 'path/to/default-event-image.jpg'; // Add a fallback image if flyerImagePath is empty
            eventName.textContent = event.eventName || '';
            eventDateTime.innerHTML = `
                <i class="fas fa-calendar-alt"></i> ${new Date(event.eventDate).toLocaleDateString()}
                <span class="info-separator"> &bull; </span>
                <i class="fas fa-clock"></i> ${formatTime(event.eventTime)}`;
            eventLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.eventLocation || ''}`;
            eventDescriptionText.textContent = event.eventDescription || 'No description provided.';
            
            // Populate ticket options list
            ticketOptionsList.innerHTML = ''; // Clear previous content
            if (event.tickets && event.tickets.length > 0) {
                event.tickets.forEach(ticket => {
                    const ticketLi = document.createElement('li');
                    ticketLi.className = 'ticket-option glass';
                    ticketLi.dataset.ticketId = `${event._id}-${ticket.type.replace(/\s+/g, '-')}`;
                    ticketLi.dataset.ticketName = ticket.type;
                    ticketLi.dataset.ticketPrice = ticket.price;
                    ticketLi.innerHTML = `
                        <div class="ticket-info">
                            <h4>${ticket.type}</h4>
                            <p class="ticket-price">$${parseFloatSafe(ticket.price).toFixed(2)}</p>
                            <p class="ticket-includes">${ticket.includes || 'No special inclusions.'}</p>
                        </div>
                        <div class="ticket-controls">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus-btn">-</button>
                                <span class="quantity-display">0</span>
                                <button class="quantity-btn plus-btn">+</button>
                            </div>
                            <button class="cta-button add-to-cart-btn">Add to Cart</button>
                        </div>`;
                    ticketOptionsList.appendChild(ticketLi);
                });
            } else {
                ticketOptionsList.innerHTML = '<p class="info-msg">No tickets are available for this event at the moment.</p>';
            }

        } catch (error) {
            console.error('Error loading event details:', error);
            // Remove loading overlay and restore container
            if (loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
            eventDetailsContainer.style.opacity = '1';
            eventDetailsContainer.style.pointerEvents = 'auto';

            // Display error clearly on page and via modal
            if (eventInfoBox) eventInfoBox.innerHTML = `<p class="error-msg">Sorry, we could not load event details: ${error.message}</p>`;
            showCustomAlert('Loading Error', `Sorry, we could not load event details: ${error.message}. Please try again later.`, 'error');
        }
    }

    loadEventDetails();
});