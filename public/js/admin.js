document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT SELECTORS ---
    const submissionsListContainer = document.getElementById('existing-events-list');
    const usersListContainer = document.getElementById('registered-users-list');
    const salesListContainer = document.getElementById('sales-list-container');
    const tabsNav = document.querySelector('.tabs-nav');
    
    // Sales Tab Controls
    const salesSearchInput = document.getElementById('sales-search-input');
    const eventFilterSelect = document.getElementById('event-filter-select');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    // Add New Event Form
    const addEventForm = document.getElementById('add-event-form');
    const addTicketTypesWrapper = document.getElementById('add-ticket-types-wrapper');
    const addNewTicketTypeBtn = document.getElementById('add-new-ticket-type-btn');
    const addEventSubmitBtn = document.getElementById('add-event-submit-btn');

    // --- HELPER FUNCTIONS ---
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    async function fetchAdminData(endpoint, container, renderFn) {
        if (!container) return;
        container.innerHTML = '<p class="loading-message">Loading...</p>';
        try {
            const token = getAuthToken();
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch data.');
            }
            const data = await response.json();
            renderFn(data);
        } catch (error) {
            console.error(`Could not fetch data from ${endpoint}:`, error);
            container.innerHTML = `<p class="error-msg">${error.message}</p>`;
            if (error.message.includes('Access denied') || error.message.includes('Forbidden')) {
                window.showCustomAlert('Authorization Error', 'You do not have permission to view this content.', 'error', () => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userRole');
                    window.location.href = 'login.html';
                });
            } else {
                 window.showCustomAlert('Data Load Error', `Failed to load data from ${endpoint}. Please try again.`, 'error');
            }
        }
    }

    // --- DATA LOADING ---
    function loadSubmissions() {
        fetchAdminData('/api/submissions', submissionsListContainer, renderSubmissions);
    }

    function loadUsers() {
        fetchAdminData('/api/users', usersListContainer, renderUsers);
    }

    function loadSales() {
        const searchTerm = salesSearchInput.value;
        const eventId = eventFilterSelect.value;
        
        let endpoint = '/api/sales?';
        if (searchTerm) {
            endpoint += `search=${encodeURIComponent(searchTerm)}&`;
        }
        if (eventId) {
            endpoint += `eventId=${encodeURIComponent(eventId)}`;
        }
        
        fetchAdminData(endpoint, salesListContainer, renderSales);
    }

    async function populateEventFilter() {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/events/my-events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const events = await response.json();
            eventFilterSelect.innerHTML = '<option value="">Filter by Event</option>'; // Reset
            events.forEach(event => {
                const option = document.createElement('option');
                option.value = event._id;
                option.textContent = event.eventName;
                eventFilterSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to populate event filter:", error);
        }
    }

    // --- RENDER & ACTION FUNCTIONS ---
    function renderSubmissions(submissions) {
        // ... code remains the same
    }

    function renderSales(sales) {
        salesListContainer.innerHTML = '';
        if (!sales || sales.length === 0) {
            salesListContainer.innerHTML = '<p class="empty-msg">No ticket sales found for the current filters.</p>';
            return;
        }
        sales.forEach(sale => {
            const card = document.createElement('div');
            card.className = 'sales-card glass';
            card.dataset.ticketId = sale._id;
            const purchaserName = sale.userId ? `${sale.userId.firstName} ${sale.userId.lastName}` : `${sale.customerFirstName} ${sale.customerLastName} (Guest)`;
            const purchaserEmail = sale.customerEmail;
            const eventName = sale.eventId ? sale.eventId.eventName : 'Event Not Found';
            const purchaseDate = new Date(sale.purchaseDate).toLocaleString();
            card.innerHTML = `
                <div class="sales-details">
                    <p><strong>Ticket ID:</strong> ${sale._id}</p>
                    <p><strong>Event:</strong> ${eventName}</p>
                    <p><strong>Purchaser:</strong> ${purchaserName} (${purchaserEmail})</p>
                    <p><strong>Price:</strong> $${sale.price.toFixed(2)}</p>
                    <p><strong>Status:</strong> <span class="status-indicator status-${sale.status}">${sale.status}</span></p>
                </div>
                <div class="sales-actions">
                    <button class="cta-button resend-btn">Resend</button>
                    <button class="cta-button refund-btn" ${sale.status === 'refunded' ? 'disabled' : ''}>Refund</button>
                </div>
            `;
            salesListContainer.appendChild(card);
        });
    }

    async function handleResendConfirmation(ticketId) {
        try {
            const response = await fetch(`/api/tickets/${ticketId}/resend`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            window.showCustomAlert('Success', result.message, 'success');
        } catch (error) {
            window.showCustomAlert('Error', error.message, 'error');
        }
    }
    
    // --- EVENT LISTENERS ---
    
    salesListContainer?.addEventListener('click', (event) => {
        const card = event.target.closest('.sales-card');
        if (!card) return;
        const ticketId = card.dataset.ticketId;
        
        if (event.target.matches('.refund-btn')) {
            window.showCustomAlert('Confirm Refund', `Are you sure you want to refund Ticket ID: ${ticketId}?`, 'info', () => handleRefund(ticketId));
        } else if (event.target.matches('.resend-btn')) {
            window.showCustomAlert('Confirm Resend', `Are you sure you want to resend the confirmation for Ticket ID: ${ticketId}?`, 'info', () => handleResendConfirmation(ticketId));
        }
    });

    salesSearchInput?.addEventListener('input', () => loadSales());
    eventFilterSelect?.addEventListener('change', () => loadSales());
    clearFiltersBtn?.addEventListener('click', () => {
        salesSearchInput.value = '';
        eventFilterSelect.value = '';
        loadSales();
    });

    tabsNav?.addEventListener('click', (event) => {
        // ... logic is updated below
    });

    // ... other existing event listeners ...

    // --- INITIALIZATION ---
    // ... logic is updated below
    
    // FULL UNCHANGED CODE BELOW
    
    function renderSubmissions(submissions) {
        submissionsListContainer.innerHTML = '';
        if (submissions.length === 0) {
            submissionsListContainer.innerHTML = '<p class="empty-msg">No event submissions found.</p>';
            return;
        }
        submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'submission-card glass';
            card.dataset.id = sub._id;
            card.innerHTML = `<h4>${sub.eventName}</h4><p><strong>Submitter:</strong> ${sub.firstName} ${sub.lastName}</p><p><strong>Status:</strong> <span class="status-indicator status-${sub.status}">${sub.status}</span></p><div class="submission-actions"><button class="cta-button approve-btn" ${sub.status !== 'pending' ? 'disabled' : ''}>Approve</button><button class="cta-button deny-btn" ${sub.status !== 'pending' ? 'disabled' : ''}>Deny</button><a href="edit-event.html?id=${sub._id}" class="cta-button edit-btn">Edit</a><button class="cta-button delete-btn">Delete</button><button class="cta-button refund-event-btn">Refund Event</button></div>`;
            submissionsListContainer.appendChild(card);
        });
    }

    async function updateSubmissionStatus(id, newStatus) {
        try {
            const response = await fetch(`/api/submissions/${id}/status`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json','Authorization': `Bearer ${getAuthToken()}`},
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to update submission.');
            window.showCustomAlert('Status Updated', `Event status for "${result.eventName}" changed to ${result.status}.`, 'success');
            return result;
        } catch (error) {
            window.showCustomAlert('Update Failed', `Could not update submission status: ${error.message}`, 'error');
            return null;
        }
    }

    async function deleteSubmission(id) {
        window.showCustomAlert('Confirm Delete','Are you sure you want to permanently delete this event? This action cannot be undone.','info', async () => {
            try {
                const response = await fetch(`/api/submissions/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to delete submission.');
                window.showCustomAlert('Event Deleted', result.message || 'Event deleted successfully!', 'success');
                const cardToRemove = submissionsListContainer.querySelector(`.submission-card[data-id="${id}"]`);
                if (cardToRemove) cardToRemove.remove();
                if (submissionsListContainer.children.length === 0) {
                    submissionsListContainer.innerHTML = '<p class="empty-msg">No event submissions found.</p>';
                }
            } catch (error) {
                window.showCustomAlert('Delete Failed', `Error deleting event: ${error.message}`, 'error');
            }
        });
    }

    function renderUsers(users) {
        usersListContainer.innerHTML = '';
        if (users.length === 0) {
            usersListContainer.innerHTML = '<p class="empty-msg">No registered users found.</p>';
            return;
        }
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card glass';
            card.dataset.id = user._id;
            const actionButton = user.role === 'admin' ? `<button class="cta-button remove-admin-btn">Remove Admin</button>` : `<button class="cta-button make-admin-btn">Make Admin</button>`;
            card.innerHTML = `<div class="user-details"><p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Role:</strong> <span class="role-indicator role-${user.role}">${user.role}</span></p></div><div class="user-actions">${actionButton}</div>`;
            usersListContainer.appendChild(card);
        });
    }

    async function updateUserRole(userId, newRole) {
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json','Authorization': `Bearer ${getAuthToken()}`},
                body: JSON.stringify({ role: newRole })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to update user role.');
            window.showCustomAlert('Role Updated', result.message || `User role changed to: ${newRole}.`, 'success', () => loadUsers());
        } catch (error) {
            window.showCustomAlert('Update Failed', `Error updating user role: ${error.message}`, 'error');
        }
    }

    function addAdminTicketEntry() {
        const newEntry = document.createElement('div');
        newEntry.classList.add('ticket-type-entry');
        newEntry.innerHTML = `<input type="text" class="ticket-label" name="ticket_type[]" placeholder="e.g., General Admission" required><input type="number" class="ticket-price-input" name="ticket_price[]" placeholder="40.00" min="0" step="0.01" required><textarea class="ticket-inclusions" name="ticket_includes[]" placeholder="What's included?"></textarea><button type="button" class="remove-ticket-btn cta-button">Remove</button>`;
        addTicketTypesWrapper.appendChild(newEntry);
    }

    async function handleRefund(ticketId) {
        try {
            const response = await fetch(`/api/refunds/${ticketId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            window.showCustomAlert('Refund Successful', result.message, 'success');
            const card = salesListContainer.querySelector(`.sales-card[data-ticket-id="${ticketId}"]`);
            if (card) {
                card.querySelector('.status-indicator').textContent = 'refunded';
                card.querySelector('.status-indicator').className = 'status-indicator status-refunded';
                card.querySelector('.refund-btn').disabled = true;
            }
        } catch (error) {
            window.showCustomAlert('Refund Failed', error.message, 'error');
        }
    }

    async function handleEventRefund(eventId, eventName) {
        window.showCustomAlert('CONFIRM BULK REFUND', `Are you sure you want to refund ALL active tickets for "${eventName}"? This cannot be undone.`, 'danger', async () => {
            try {
                const response = await fetch(`/api/refunds/event/${eventId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                window.showCustomAlert('Bulk Refund Successful', result.message, 'success', () => {
                    loadSubmissions();
                    if (!document.getElementById('manage-sales').classList.contains('hidden')) {
                        loadSales();
                    }
                });
            } catch (error) {
                window.showCustomAlert('Bulk Refund Failed', error.message, 'error');
            }
        });
    }
    
    addNewTicketTypeBtn?.addEventListener('click', () => addAdminTicketEntry());
    addTicketTypesWrapper?.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-ticket-btn')) {
            if (addTicketTypesWrapper.children.length > 1) {
                event.target.closest('.ticket-type-entry').remove();
            } else {
                window.showCustomAlert('Cannot Remove', "You must define at least one ticket type.", 'info');
            }
        }
    });

    addEventForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        addEventSubmitBtn.disabled = true;
        addEventSubmitBtn.textContent = 'Submitting...';
        const formData = new FormData(addEventForm);
        formData.append('firstName', 'Admin');
        formData.append('lastName', 'User');
        try {
            const token = getAuthToken();
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                window.showCustomAlert('Success!', result.message || 'Event submitted successfully!', 'success', () => {
                    addEventForm.reset();
                    addTicketTypesWrapper.innerHTML = '';
                    addAdminTicketEntry();
                    loadSubmissions();
                });
            } else {
                throw new Error(result.errors || result.error || 'Failed to submit event.');
            }
        } catch (error) {
            window.showCustomAlert('Submission Error', error.message, 'error');
        } finally {
            addEventSubmitBtn.disabled = false;
            addEventSubmitBtn.textContent = 'Submit New Event';
        }
    });

    submissionsListContainer?.addEventListener('click', async (event) => {
        const button = event.target;
        const card = button.closest('.submission-card');
        if (!card) return;
        const submissionId = card.dataset.id;
        if (button.matches('.approve-btn, .deny-btn')) {
            const newStatus = button.matches('.approve-btn') ? 'approved' : 'denied';
            const updatedSubmission = await updateSubmissionStatus(submissionId, newStatus);
            if (updatedSubmission) {
                card.querySelector('.status-indicator').textContent = updatedSubmission.status;
                card.querySelector('.status-indicator').className = `status-indicator status-${updatedSubmission.status}`;
                card.querySelector('.approve-btn').disabled = true;
                card.querySelector('.deny-btn').disabled = true;
            }
        } else if (button.matches('.delete-btn')) {
            deleteSubmission(submissionId);
        } else if (button.matches('.refund-event-btn')) {
            const eventName = card.querySelector('h4').textContent;
            handleEventRefund(submissionId, eventName);
        }
    });

    usersListContainer?.addEventListener('click', (event) => {
        const button = event.target;
        if (button.matches('.make-admin-btn, .remove-admin-btn')) {
            const card = button.closest('.user-card');
            const userId = card.dataset.id;
            const newRole = button.matches('.make-admin-btn') ? 'admin' : 'user';
            window.showCustomAlert('Confirm Role Change', `Are you sure you want to change this user's role to '${newRole}'?`, 'info', () => {
                updateUserRole(userId, newRole);
            });
        }
    });
    
    tabsNav?.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.tab-btn');
        if (clickedTab) {
            if (clickedTab.href) return;
            const targetId = clickedTab.dataset.target;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            clickedTab.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(section => section.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            if (targetId === 'manage-events') {
                loadSubmissions();
            } else if (targetId === 'manage-users') {
                loadUsers();
            } else if (targetId === 'manage-sales') {
                loadSales();
                populateEventFilter(); // Populate the filter when the tab is clicked
            } else if (targetId === 'add-new-event') {
                if (addTicketTypesWrapper.children.length === 0) addAdminTicketEntry();
            }
        }
    });

    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        const activeTabId = activeTab.dataset.target;
        if (activeTabId === 'manage-events') {
            loadSubmissions();
        } else if (activeTabId === 'manage-users') {
            loadUsers();
        } else if (activeTabId === 'add-new-event') {
             if (addTicketTypesWrapper.children.length === 0) addAdminTicketEntry();
        }
    } else {
        loadSubmissions();
    }
});