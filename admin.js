document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('existing-events-list');

    const getSubmissions = async () => {
        if (!listContainer) return;
        listContainer.innerHTML = '<p>Loading submissions...</p>';
        try {
            // NOTE: Using the full URL to the backend server
            const response = await fetch('http://localhost:3000/api/submissions');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const submissions = await response.json();
            listContainer.innerHTML = '';

            if (submissions.length === 0) {
                listContainer.innerHTML = '<p>No event submissions found.</p>';
                return;
            }

            submissions.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'event-admin-item glass';
                const submittedDate = new Date(sub.submittedAt).toLocaleString();

                card.innerHTML = `
                    <div class="event-admin-details">
                        <h4>${sub.eventName}</h4>
                        <p><strong>Submitter:</strong> ${sub.firstName} ${sub.lastName} (${sub.businessName})</p>
                        <p><strong>Status:</strong> <span class="status-indicator status-${sub.status}">${sub.status}</span></p>
                    </div>
                    <div class="event-admin-actions">
                        ${sub.flyerImagePath ? `<a href="http://localhost:3000/${sub.flyerImagePath}" target="_blank" class="cta-button">View Flyer</a>` : ''}
                        <button class="cta-button approve-btn" data-id="${sub._id}">Approve</button>
                        <button class="cta-button deny-btn" data-id="${sub._id}">Deny</button>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Could not fetch submissions:', error);
            listContainer.innerHTML = '<p class="error">Error loading submissions. Please try refreshing the page.</p>';
        }
    };

    listContainer.addEventListener('click', async (event) => {
        const button = event.target;
        
        if (button.matches('.approve-btn') || button.matches('.deny-btn')) {
            const submissionId = button.dataset.id;
            const newStatus = button.matches('.approve-btn') ? 'approved' : 'denied';
            
            try {
                // --- THIS IS THE CORRECTED URL ---
                const response = await fetch(`http://localhost:3000/api/submissions/${submissionId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (!response.ok) {
                    throw new Error('Server responded with an error');
                }

                const updatedSubmission = await response.json();

                const card = button.closest('.event-admin-item');
                const statusIndicator = card.querySelector('.status-indicator');
                statusIndicator.textContent = updatedSubmission.status;
                statusIndicator.className = `status-indicator status-${updatedSubmission.status}`;
                
                card.querySelector('.approve-btn').disabled = true;
                card.querySelector('.deny-btn').disabled = true;

            } catch (error) {
                console.error('Failed to update status:', error);
                alert('There was an error updating the status.');
            }
        }
    });

    getSubmissions();
});