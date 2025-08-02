// js/edit-event.js
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT SELECTORS ---
    const editForm = document.getElementById('edit-event-form');
    const formContainer = document.querySelector('.form-container'); // Added for loading state
    const eventNameInput = document.getElementById('eventName');
    const eventDateInput = document.getElementById('eventDate');
    const eventLocationInput = document.getElementById('eventLocation');
    const eventTimeInput = document.getElementById('eventTime');
    const ticketCountInput = document.getElementById('ticketCount');
    const eventDescriptionInput = document.getElementById('eventDescription'); // Assuming you want to edit description too

    const ticketTypesWrapper = document.getElementById('ticket-types-wrapper');
    const addTicketBtn = document.getElementById('add-ticket-type');
    
    // For form submission feedback
    const editSubmitBtn = editForm ? editForm.querySelector('button[type="submit"]') : null;
    // formMessageContainer is no longer directly used by displayMessage, but custom alert
    // const formMessageContainer = document.getElementById('form-message-container'); 

    // Flyer elements
    const flyerInput = document.getElementById('flyer');
    const flyerPreviewImg = document.getElementById('flyer-preview-img');
    const noFlyerMsg = document.getElementById('no-flyer-msg');
    const removeFlyerCheckbox = document.getElementById('remove-flyer-checkbox'); // Checkbox to remove current flyer

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        if (formContainer) {
            formContainer.innerHTML = '<h1>Error: No event ID specified for editing.</h1><p>Please go back to the admin dashboard and select an event to edit.</p>';
        } else {
            document.body.innerHTML = '<h1>Error: No event ID specified for editing.</h1>';
        }
        // No custom alert here as modal elements might not be ready, and it's a critical page load error
        return;
    }

    // The local displayMessage helper is no longer needed since we're using window.showCustomAlert.
    // function displayMessage(container, message, type = 'info') { ... }

    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    // --- Client-side Validation Helper ---
    function validateFormInputs() {
        let isValid = true;
        // Basic check for required text/number inputs
        const requiredInputs = [eventNameInput, eventDateInput, eventLocationInput, eventTimeInput, ticketCountInput, eventDescriptionInput];
        requiredInputs.forEach(input => {
            if (input && input.value.trim() === '') {
                input.reportValidity(); // Show native browser validation message
                isValid = false;
            }
        });

        // Validate ticket types
        const ticketEntries = ticketTypesWrapper.querySelectorAll('.ticket-type-entry');
        if (ticketEntries.length === 0) {
            window.showCustomAlert('Validation Error', "You must define at least one ticket type.", 'error'); // Using custom alert
            isValid = false;
        }
        ticketEntries.forEach(entry => {
            const typeInput = entry.querySelector('[name="ticket_type"]');
            const priceInput = entry.querySelector('[name="ticket_price"]');
            
            if (typeInput && typeInput.value.trim() === '') {
                typeInput.reportValidity();
                isValid = false;
            }
            if (priceInput && (priceInput.value.trim() === '' || parseFloat(priceInput.value) < 0)) {
                priceInput.reportValidity();
                isValid = false;
            }
        });

        // Ensure ticketCount is a positive number
        if (ticketCountInput && (parseInt(ticketCountInput.value) <= 0 || isNaN(parseInt(ticketCountInput.value)))) {
            ticketCountInput.setCustomValidity('Ticket count must be a positive number.');
            ticketCountInput.reportValidity();
            isValid = false;
        } else {
            ticketCountInput?.setCustomValidity(''); // Clear custom validity if valid
        }

        return isValid;
    }


    // --- Fetch existing event data and populate the form ---
    async function loadEventForEditing() {
        if (!formContainer) return;

        formContainer.innerHTML = '<p class="loading-message">Loading event data...</p>'; // Loading state
        formContainer.classList.add('loading'); // Add a loading class for styling

        try {
            const token = getAuthToken(); // Assuming admin token is needed to load event for editing
            const response = await fetch(`/api/events/${eventId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // Handle unauthorized/expired token
                if (response.status === 403) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userRole');
                    window.showCustomAlert('Unauthorized', "Your session has expired. Please log in again.", 'error', () => {
                        window.location.href = 'login.html';
                    });
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch event data.');
            }
            
            const event = await response.json();

            // Clear loading message and class
            formContainer.innerHTML = ''; // This will remove the loading message
            formContainer.classList.remove('loading');
            
            // Populate main form fields
            eventNameInput.value = event.eventName || '';
            eventDateInput.value = event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '';
            eventLocationInput.value = event.eventLocation || '';
            eventTimeInput.value = event.eventTime || '';
            ticketCountInput.value = event.ticketCount || '';
            eventDescriptionInput.value = event.eventDescription || ''; // Populate description

            // Populate current flyer image
            if (event.flyerImagePath) {
                flyerPreviewImg.src = `/${event.flyerImagePath}`; // Assuming path is relative to server root
                flyerPreviewImg.style.display = 'block';
                noFlyerMsg.style.display = 'none';
                removeFlyerCheckbox.checked = false; // Ensure checkbox is unchecked initially
            } else {
                flyerPreviewImg.style.display = 'none';
                noFlyerMsg.style.display = 'block';
                removeFlyerCheckbox.checked = true; // If no flyer, implicitly "remove"
            }

            // Populate the ticket types
            ticketTypesWrapper.innerHTML = ''; // Clear wrapper
            if (event.tickets && event.tickets.length > 0) {
                event.tickets.forEach(ticket => {
                    addTicketEntry(ticket);
                });
            } else {
                // If no tickets exist, add one blank entry to start
                addTicketEntry();
            }

        } catch (error) {
            console.error('Error loading event data:', error);
            if (formContainer) {
                // Restore generic form elements if they were wiped by a prior loading message
                // This is a workaround if innerHTML='<p>Loading...</p>' overwrites the form itself.
                // A better approach would be to have a div for messages/loaders that doesn't replace the whole form.
                // For now, let's just use the custom alert.
                window.showCustomAlert('Error', `Could not load event data: ${error.message}. Please try again later.`, 'error');
            }
            formContainer.classList.remove('loading'); // Always remove loading class
        }
    }

    // --- Handle adding and removing ticket type entries in the form ---
    function addTicketEntry(ticket = {}) {
        const newEntry = document.createElement('div');
        newEntry.classList.add('ticket-type-entry');
        newEntry.innerHTML = `
            <input type="text" class="ticket-label" name="ticket_type" placeholder="e.g., General Admission" value="${ticket.type || ''}" required>
            <input type="number" class="ticket-price-input" name="ticket_price" placeholder="40.00" min="0" step="0.01" value="${ticket.price !== undefined ? parseFloat(ticket.price).toFixed(2) : ''}" required>
            <textarea class="ticket-inclusions" name="ticket_includes" placeholder="What's included?">${ticket.includes || ''}</textarea>
            <button type="button" class="remove-ticket-btn cta-button">Remove</button>
        `;
        ticketTypesWrapper.appendChild(newEntry);
    }

    // Event listener for "Add Ticket Type" button
    if (addTicketBtn) {
        addTicketBtn.addEventListener('click', () => {
            addTicketEntry();
        });
    }

    // Event listener for "Remove Ticket Type" buttons (delegated)
    if (ticketTypesWrapper) {
        ticketTypesWrapper.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-ticket-btn')) {
                if (ticketTypesWrapper.children.length > 1) {
                    event.target.closest('.ticket-type-entry').remove();
                } else {
                    window.showCustomAlert('Cannot Remove', "You must have at least one ticket type.", 'info'); // Using custom alert
                }
            }
        });
    }

    // --- Flyer Preview on Change ---
    if (flyerInput) {
        flyerInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // Basic file type validation for immediate feedback
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']; // Add more if your Multer allows them
                if (!allowedTypes.includes(file.type)) {
                    window.showCustomAlert('Invalid File Type', 'Please upload a JPG or PNG image file.', 'error');
                    flyerInput.value = ''; // Clear the input
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    flyerPreviewImg.src = e.target.result;
                    flyerPreviewImg.style.display = 'block';
                    noFlyerMsg.style.display = 'none';
                    removeFlyerCheckbox.checked = false; // If new flyer uploaded, uncheck remove option
                };
                reader.readAsDataURL(file);
            } else {
                // If user clears selection, revert to showing 'No Flyer' message or previous flyer
                flyerPreviewImg.style.display = 'none';
                noFlyerMsg.style.display = 'block';
                // Note: The checkbox and original flyer state needs more robust handling if user "unselects"
                // For simplicity, this just hides the preview. Full revert would involve storing original path.
            }
        });
    }

    // --- Handle "Remove Flyer" checkbox ---
    if (removeFlyerCheckbox) {
        removeFlyerCheckbox.addEventListener('change', () => {
            if (removeFlyerCheckbox.checked) {
                flyerPreviewImg.style.display = 'none';
                noFlyerMsg.style.display = 'block';
                flyerInput.value = ''; // Clear the file input as well
            } else {
                // If unchecked, reload event data to restore original flyer state
                // This is a bit heavy, but ensures correct state.
                loadEventForEditing(); 
            }
        });
    }


    // --- Handle the form submission to update the event ---
    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!validateFormInputs()) {
                window.showCustomAlert('Validation Error', "Please correct the errors in the form.", 'error');
                return;
            }

            // Disable button and show loading feedback
            if (editSubmitBtn) {
                editSubmitBtn.disabled = true;
                editSubmitBtn.textContent = 'Updating...';
                editSubmitBtn.classList.add('loading-btn'); // Add this class for spinner/loading styles
            }
            window.showCustomAlert('Processing', "Updating event. Please wait...", 'info'); // Using custom alert

            const formData = new FormData();

            formData.append('eventName', eventNameInput.value);
            formData.append('eventDate', eventDateInput.value);
            formData.append('eventLocation', eventLocationInput.value);
            formData.append('eventTime', eventTimeInput.value);
            formData.append('ticketCount', ticketCountInput.value);
            formData.append('eventDescription', eventDescriptionInput.value); // Ensure description is sent

            // Append dynamic ticket types
            const ticketEntries = ticketTypesWrapper.querySelectorAll('.ticket-type-entry');
            ticketEntries.forEach((entry, index) => {
                formData.append(`tickets[${index}][type]`, entry.querySelector('[name="ticket_type"]').value);
                formData.append(`tickets[${index}][price]`, entry.querySelector('[name="ticket_price"]').value);
                formData.append(`tickets[${index}][includes]`, entry.querySelector('[name="ticket_includes"]').value);
            });

            // Handle flyer: new file, remove existing, or keep existing
            if (flyerInput.files[0]) {
                formData.append('flyer', flyerInput.files[0]);
            } else if (removeFlyerCheckbox && removeFlyerCheckbox.checked) {
                formData.append('removeFlyer', 'true'); // Signal to backend to remove flyer
            }
            // If no new file and not set to remove, backend should assume keeping existing flyer.

            try {
                const token = getAuthToken();
                const response = await fetch(`/api/submissions/${eventId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}` 
                    },
                    body: formData // Send FormData directly
                });

                const result = await response.json();

                if (response.ok) {
                    window.showCustomAlert('Success!', result.message || 'Event updated successfully!', 'success', () => {
                        // No form reset on edit, but reload data to ensure UI is in sync with backend
                        loadEventForEditing(); 
                        // Redirect after a short delay to allow message to be seen
                        setTimeout(() => {
                            window.location.href = 'admin-dashboard.html'; 
                        }, 2000); // Redirect after 2 seconds
                    });
                } else {
                    window.showCustomAlert('Update Failed', result.error || result.message || 'An error occurred while updating the event.', 'error');
                }

            } catch (error) {
                console.error('Error updating event:', error);
                window.showCustomAlert('Network Error', 'A network error occurred. Please try again.', 'error');
            } finally {
                // Re-enable button and hide loading feedback
                if (editSubmitBtn) {
                    editSubmitBtn.disabled = false;
                    editSubmitBtn.textContent = 'Save Changes';
                    editSubmitBtn.classList.remove('loading-btn');
                }
            }
        });
    }

    // --- Initial call to load the event data into the form ---
    loadEventForEditing();
});