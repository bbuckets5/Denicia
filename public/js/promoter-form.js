// At the top of the file, we import the new library.
import imageCompression from 'browser-image-compression';

document.addEventListener('DOMContentLoaded', () => {
    const showCustomAlert = window.showCustomAlert;
    const promoterForm = document.getElementById('event-submission-form');
    const addTicketBtn = document.getElementById('add-ticket-type');
    const ticketTypesWrapper = document.getElementById('ticket-types-wrapper');
    const submitButton = document.getElementById('submit-event-btn');
    // We need to select the file input to get the image
    const flyerInput = document.getElementById('flyer');

    /**
     * Creates and appends a new ticket type entry to the form.
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
        submitButton.textContent = 'Processing...';
        showCustomAlert("Processing", "Compressing image and submitting. Please wait...", 'info');

        const imageFile = flyerInput.files[0];
        if (!imageFile) {
            showCustomAlert("Validation Error", "Please select an event flyer.", 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Event';
            return;
        }

        // --- NEW: IMAGE COMPRESSION LOGIC ---
        const options = {
            maxSizeMB: 2,          // Max file size in megabytes
            maxWidthOrHeight: 1920, // Max width or height
            useWebWorker: true,
        };

        try {
            console.log(`Original file size: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
            const compressedFile = await imageCompression(imageFile, options);
            console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

            // Build the FormData and replace the original file with the compressed one
            const formData = new FormData(promoterForm);
            formData.set('flyer', compressedFile, compressedFile.name); 

            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData,
            });
            
            // --- MODIFIED: Better error handling ---
            if (!response.ok) {
                // If the server sends back a non-JSON error (like the 413 error page)
                const errorText = await response.text();
                throw new Error(errorText || 'An unknown error occurred.');
            }

            const result = await response.json();
            showCustomAlert("Success!", result.message || 'Event submitted successfully!', 'success', () => {
                promoterForm.reset();
                ticketTypesWrapper.innerHTML = '';
                addTicketEntry();
            });

        } catch (error) { {
            console.error('A critical error occurred during submission:', error);
            // Check if the error is a JSON parsing error, which means we got a text/html response
            if (error instanceof SyntaxError) {
                showCustomAlert("Submission Error", "The server returned an unexpected response. The file might be too large.", 'error');
            } else {
                showCustomAlert("Submission Error", error.message, 'error');
            }
        }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Event';
        }
    });

    // --- INITIALIZATION ---
    if (ticketTypesWrapper) {
        addTicketEntry();
    }
});