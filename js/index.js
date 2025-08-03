document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('event-search');
    const eventListContainer = document.getElementById('event-list-container');

    const formatTime = window.formatTime;
    const parseFloatSafe = window.parseFloatSafe;

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

    async function loadPublicEvents() {
        if (!eventListContainer) return;
        eventListContainer.innerHTML = '<p class="loading-message">Loading events...</p>';

        try {
            const response = await fetch('/api/events');
            if (!response.ok) {
                throw new Error('Failed to fetch events.');
            }
            const events = await response.json();
            
            eventListContainer.innerHTML = '';

            if (events.length === 0) {
                eventListContainer.innerHTML = '<p class="info-msg">No upcoming events at the moment.</p>';
                return;
            }
            
            events.forEach(event => {
                const eventLink = document.createElement('a');
                eventLink.className = 'event-link';
                eventLink.href = `event-details.html?id=${event._id}`;
                const displayPrice = (event.tickets && event.tickets.length > 0) 
                                        ? `$${parseFloatSafe(event.tickets[0].price).toFixed(2)}` 
                                        : 'Click for Price';

                // Use placeholder for src and put the high-quality thumbnail in data-src
                const placeholderPath = event.flyerImagePlaceholderPath ? event.flyerImagePlaceholderPath.replace(/\\/g, '/') : '';
                const thumbnailPath = event.flyerImageThumbnailPath ? event.flyerImageThumbnailPath.replace(/\\/g, '/') : 'https://placehold.co/600x400/2c5364/ffffff?text=No+Image';

                eventLink.innerHTML = `
                    <div class="event-card glass">
                        <img src="${placeholderPath}" data-src="${thumbnailPath}" alt="${event.eventName} Flyer" class="lazy-image">
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

            // After rendering, initialize the lazy loading
            initLazyLoad();

        } catch (error) {
            console.error('Error loading public events:', error);
            eventListContainer.innerHTML = `<p class="error-msg">Sorry, there was an error loading events.</p>`;
        }
    }

    function initLazyLoad() {
        const lazyImages = document.querySelectorAll('.lazy-image');

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const highQualitySrc = img.dataset.src;

                    // Load the high-quality image in the background
                    const tempImg = new Image();
                    tempImg.src = highQualitySrc;
                    tempImg.onload = () => {
                        // Once loaded, set the src and add the 'loaded' class for fade-in
                        img.src = highQualitySrc;
                        img.classList.add('loaded');
                    };
                    
                    // Stop observing this image once we've started loading it
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(image => {
            observer.observe(image);
        });
    }

    loadPublicEvents();
});