// js/index.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('event-search');
    const eventListContainer = document.getElementById('event-list-container');

    // Ensure common.js functions are available
    const formatTime = window.formatTime;
    const parseFloatSafe = window.parseFloatSafe;
    const showCustomAlert = window.showCustomAlert;

    // Event Search Filter Logic
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const eventLinks = document.querySelectorAll('.event-link');
            eventLinks.forEach(link => {
                const title = link.querySelector('h3').textContent.toLowerCase();
                link.style.display = title.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Public Event Listing
    async function loadPublicEvents() {
        if (!eventListContainer) return;

        // Show loading message
        eventListContainer.innerHTML = '<p class="loading-message">Loading events...</p>';

        try {
            const response = await fetch('/api/events');
            if (!response.ok) {
                const errorData = await response.json(); // Try to get message from response
                throw new Error(errorData.message || 'Failed to fetch events.');
            }
            const events = await response.json();
            
            eventListContainer.innerHTML = ''; // Clear loading message

            if (events.length === 0) {
                eventListContainer.innerHTML = '<p class="info-msg">No upcoming events at the moment. Please check back soon!</p>';
                return;
            }
            
            events.forEach(event => {
                const eventLink = document.createElement('a');
                eventLink.className = 'event-link';
                eventLink.href = `event-details.html?id=${event._id}`;
                const displayPrice = (event.tickets && event.tickets.length > 0) 
                                     ? `$${parseFloatSafe(event.tickets[0].price).toFixed(2)}` 
                                     : 'Click for Price';
                eventLink.innerHTML = `
                    <div class="event-card glass">
                        <img src="/${event.flyerImagePath}" alt="${event.eventName} Flyer">
                        <h3>${event.eventName}</h3>
                        <p>
                            <i class="fas fa-calendar-alt"></i> ${new Date(event.eventDate).toLocaleDateString()}
                            <span class="info-separator"> &bull; </span>
                            <i class="fas fa-clock"></i> ${formatTime(event.eventTime)}
                        </p>
                        <p><i class="fas fa-map-marker-alt"></i> ${event.eventLocation}</p>
                        <p class="price">${displayPrice}</p>
                    </div>`;
                eventListContainer.appendChild(eventLink);
            });
        } catch (error) {
            console.error('Error loading public events:', error);
            eventListContainer.innerHTML = `<p class="error-msg">Sorry, there was an error loading events: ${error.message}</p>`;
            showCustomAlert('Loading Error', `Failed to load events: ${error.message}. Please try again later.`, 'error');
        }
    }

    loadPublicEvents();
});