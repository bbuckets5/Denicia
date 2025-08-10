document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT SELECTORS ---
    const editEventForm = document.getElementById('edit-event-form');
    const formMessageContainer = document.getElementById('form-message-container');
    const ticketTypesWrapper = document.getElementById('ticket-types-wrapper');
    const addTicketBtn = document.getElementById('add-ticket-type');
    const flyerPreviewImg = document.getElementById('flyer-preview-img');
    const noFlyerMsg = document.getElementById('no-flyer-msg');
    const removeFlyerCheckbox = document.getElementById('remove-flyer-checkbox');

    const showCustomAlert = window.showCustomAlert;

    // --- GET EVENT ID FROM URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        showCustomAlert('Error', 'No event ID provided. Redirecting to admin dashboard.', 'error', () => {
            window.location.href = 'admin-dashboard.html';
        });
        return;
    }

    // --- HELPER FUNCTIONS ---
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    function addTicketEntry(ticket = {}) {
        const newEntry = document.createElement('div');
        newEntry.classList.add('ticket-type-entry');
        newEntry.innerHTML = `
            <input type="text" class="ticket-label" name="ticket_type[]" placeholder="e.g., General Admission" value="${ticket.type || ''}" required>
            <input type="number" class="ticket-price-input" name="ticket_price[]" placeholder="40.00" min="0" step="0.01" value="${ticket.price || ''}" required>
            <textarea class="ticket-inclusions" name="ticket_includes[]" placeholder="What's included?">${ticket.includes || ''}</textarea>
            <button type="button" class="remove-ticket-btn cta-button">Remove</button>
        `;
        ticketTypesWrapper.appendChild(newEntry);
    }

    function populateForm(event) {
        // Populate standard text/number/time inputs
        document.getElementById('eventName').value = event.eventName;
        document.getElementById('eventTime').value = event.eventTime;
        document.getElementById('eventLocation').value = event.eventLocation;
        document.getElementById('ticketCount').value = event.ticketCount;
        document.getElementById('eventDescription').value = event.eventDescription;
        
        // Format date for the date input field (YYYY-MM-DD)
        if (event.eventDate) {
            const date = new Date(event.eventDate);
            const formattedDate = date.toISOString().split('T')[0];
            document.getElementById('eventDate').value = formattedDate;
        }

        // Populate ticket types
        ticketTypesWrapper.innerHTML = ''; // Clear any existing
        if (event.tickets && event.tickets.length > 0) {
            event.tickets.forEach(ticket => addTicketEntry(ticket));
        } else {
            addTicketEntry(); // Add one empty one if none exist
        }

        // Show current flyer
        if (event.flyerImageThumbnailPath) {
            flyerPreviewImg.src = event.flyerImageThumbnailPath.replace(/\\/g, '/');
            flyerPreviewImg.style.display = 'block';
            noFlyerMsg.style.display = 'none';
        } else {
            flyerPreviewImg.style.display = 'none';
            noFlyerMsg.style.display = 'block';
        }
    }

    // --- DATA FETCHING ---
    async function loadEventData() {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                throw new Error('Event not found or failed to load.');
            }
            const event = await response.json();
            populateForm(event);
        } catch (error) {
            console.error('Error fetching event data:', error);
            showCustomAlert('Error', error.message, 'error', () => {
                window.location.href = 'admin-dashboard.html';
            });
        }
    }

    // --- EVENT LISTENERS ---
    addTicketBtn?.addEventListener('click', () => addTicketEntry());

    ticketTypesWrapper?.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-ticket-btn')) {
            if (ticketTypesWrapper.children.length > 1) {
                event.target.closest('.ticket-type-entry').remove();
            } else {
                showCustomAlert('Cannot Remove', "You must have at least one ticket type.", 'info');
            }
        }
    });

    editEventForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = document.getElementById('edit-event-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const formData = new FormData(editEventForm);
        
        // The server expects ticket data in a specific array format
        // FormData doesn't handle this well, so we remove the flat keys
        // and append them in the correct format.
        formData.delete('ticket_type[]');
        formData.delete('ticket_price[]');
        formData.delete('ticket_includes[]');

        // Explicitly set the updated ticketCount to the FormData
        // This ensures the value is sent to the server.
        const newTicketCount = document.getElementById('ticketCount').value;
        formData.set('ticketCount', newTicketCount); // ✅ THE FIX IS HERE

        const ticketEntries = ticketTypesWrapper.querySelectorAll('.ticket-type-entry');
        ticketEntries.forEach((entry, index) => {
            formData.append(`tickets[${index}][type]`, entry.querySelector('.ticket-label').value);
            formData.append(`tickets[${index}][price]`, entry.querySelector('.ticket-price-input').value);
            formData.append(`tickets[${index}][includes]`, entry.querySelector('.ticket-inclusions').value);
        });

        // Add the removeFlyer flag if the checkbox is checked
        if (removeFlyerCheckbox.checked) {
            formData.append('removeFlyer', 'true');
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`/api/submissions/${eventId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.errors || result.message || 'Failed to update event.');
            }

            showCustomAlert('Success!', 'Event updated successfully.', 'success', () => {
                window.location.href = 'admin-dashboard.html';
            });

        } catch (error) {
            console.error('Error updating event:', error);
            showCustomAlert('Update Failed', error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Event';
        }
    });

    // --- INITIALIZATION ---
    loadEventData();
});