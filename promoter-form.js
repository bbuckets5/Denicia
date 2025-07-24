document.addEventListener('DOMContentLoaded', () => {
    // This part for adding/removing tickets remains the same
    const addTicketBtn = document.getElementById('add-ticket-type');
    const ticketTypesWrapper = document.getElementById('ticket-types-wrapper');

    if (addTicketBtn && ticketTypesWrapper) {
        addTicketBtn.addEventListener('click', () => {
            const newEntry = document.createElement('div');
            newEntry.classList.add('ticket-type-entry');
            newEntry.innerHTML = `
                <input type="text" class="ticket-label" name="ticket_type[]" placeholder="e.g., VIP" required>
                <input type="number" class="ticket-price-input" name="ticket_price[]" placeholder="e.g., $800" required>
                <textarea class="ticket-inclusions" name="ticket_includes[]" placeholder="What's included?"></textarea>
                <button type="button" class="remove-ticket-btn cta-button">Remove</button>
            `;
            ticketTypesWrapper.appendChild(newEntry);
        });

        ticketTypesWrapper.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-ticket-btn')) {
                if (ticketTypesWrapper.children.length > 1) {
                    event.target.closest('.ticket-type-entry').remove();
                } else {
                    alert("You must have at least one ticket type.");
                }
            }
        });
    }

    // --- UPDATED Form Submission Logic ---
    const promoterForm = document.getElementById('event-submission-form');

    if (promoterForm) {
        promoterForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop the form from reloading the page

            const formData = new FormData(promoterForm);
            
            try {
                // Send the form data to your server
                const response = await fetch('http://localhost:3000/api/submit', {
                    method: 'POST',
                    body: formData, // FormData is sent as the body
                    // NOTE: Do NOT set Content-Type header, the browser does it automatically for FormData
                });

                const result = await response.json();

                if (response.ok) {
                    // If the server responds with success
                    alert(`Success: ${result.message}`);
                    promoterForm.reset();
                } else {
                    // If the server responds with an error
                    alert(`Error: ${result.error}`);
                }

            } catch (error) {
                console.error('Submission failed:', error);
                alert('Submission failed. Please check the console for details.');
            }
        });
    }
});