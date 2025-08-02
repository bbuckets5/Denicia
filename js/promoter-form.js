document.addEventListener('DOMContentLoaded', () => {
    const showCustomAlert = window.showCustomAlert;
    const promoterForm = document.getElementById('event-submission-form');
    const addTicketBtn = document.getElementById('add-ticket-type');
    const ticketTypesWrapper = document.getElementById('ticket-types-wrapper');
    const submitButton = document.getElementById('submit-event-btn');

    /**
     * Creates and appends a new ticket type entry to the form.
     * This function is now the single source for creating these fields.
     */
    function addTicketEntry() {
        const newEntry = document.createElement('div');
        newEntry.classList.add('ticket-type-entry');
        newEntry.innerHTML = `
            <input type="text" class="ticket-label" name="ticket_type[]" placeholder="e.g., General Admission" required>
            <input type="number" class="ticket-price-input" name="ticket_price[]" placeholder="e.g., 40.00" step="0.01" required>
            <textarea class="ticket-inclusions" name="ticket_includes[]" placeholder="What's included?"></textarea>
            <button type="button" class="remove-ticket-btn cta-button">Remove</button>
        `;
        ticketTypesWrapper.appendChild(newEntry);
    }

    // --- EVENT LISTENERS ---

    // Add another ticket type
    addTicketBtn?.addEventListener('click', () => {
        addTicketEntry();
    });

    // Remove a ticket type
    ticketTypesWrapper?.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-ticket-btn')) {
            if (ticketTypesWrapper.children.length > 1) {
                event.target.closest('.ticket-type-entry').remove();
            } else {
                showCustomAlert("Validation Error", "You must define at least one ticket type.", 'error');
            }
        }
    });

    // Handle the main form submission
    promoterForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        showCustomAlert("Processing", "Submitting your event. Please wait...", 'info');

        const formData = new FormData(promoterForm);
        
        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                showCustomAlert("Success!", result.message || 'Event submitted successfully!', 'success', () => {
                    promoterForm.reset();
                    ticketTypesWrapper.innerHTML = ''; // Clear all ticket entries
                    addTicketEntry(); // Add one fresh, empty entry back
                });
            } else {
                throw new Error(result.error || result.errors || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('A critical error occurred during submission:', error);
            showCustomAlert("Submission Error", error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Event';
        }
    });

    // --- INITIALIZATION ---
    // Ensure at least one ticket type entry is present when the page loads.
    if (ticketTypesWrapper) {
        addTicketEntry();
    }
});