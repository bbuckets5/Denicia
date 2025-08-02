// js/checkout.js
document.addEventListener('DOMContentLoaded', () => {
    // Only run this code on the checkout page
    if (!document.body.classList.contains('checkout-page')) return;

    // --- Selectors ---
    const summaryItemsList = document.querySelector('.summary-items');
    const paymentForm = document.getElementById('payment-form');
    const checkoutEmailInput = document.getElementById('email');
    const checkoutConfirmEmailInput = document.getElementById('confirmEmail');
    const checkoutEmailMessageSpan = document.querySelector('.email-match-message');
    const guestLoginPrompt = document.getElementById('guest-login-prompt');
    const guestEmailForm = document.getElementById('guest-email-form');
    const mainPaymentFormWrapper = document.getElementById('main-payment-form-wrapper');
    const proceedAsGuestBtn = document.getElementById('proceed-as-guest-btn');
    const createProfileBtn = document.getElementById('create-profile-btn');
    const guestEmailConfirmForm = document.getElementById('guest-email-confirm-form');
    const guestEmailInput = document.getElementById('guestEmail');
    const confirmGuestEmailInput = document.getElementById('confirmGuestEmail');

    // NEW Selectors for submit buttons (message containers are no longer directly used by displayMessage, but custom alert)
    const guestEmailSubmitBtn = document.getElementById('guest-email-submit-btn');
    const completePurchaseBtn = document.getElementById('complete-purchase-btn');

    // Note: The local displayMessage helper is no longer needed since we're using window.showCustomAlert.
    // If you need custom, non-modal fading messages in the future, you'd re-implement a local displayMessage
    // that targets specific containers.

    // --- Functions ---
    const renderCheckoutSummary = () => {
        if (!summaryItemsList) return;
        summaryItemsList.innerHTML = '';
        const storedCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        if (storedCartItems.length === 0) {
            summaryItemsList.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
        } else {
            storedCartItems.forEach(item => {
                const summaryItemHTML = `
                    <div class="summary-item">
                        <span class="summary-item-name">${item.eventName} (${item.name}) x${item.quantity}</span>
                        <span class="summary-item-price">$${(window.parseFloatSafe(item.price) * item.quantity).toFixed(2)}</span>
                    </div>`;
                summaryItemsList.insertAdjacentHTML('beforeend', summaryItemHTML);
            });
        }
        // Call the global updateCartTotals from common.js
        if (typeof window.updateCartTotals === 'function') window.updateCartTotals();
    };

    const setupCheckoutForLoggedInUser = async () => {
        guestLoginPrompt.classList.add('hidden');
        guestEmailForm.classList.add('hidden');
        mainPaymentFormWrapper.classList.remove('hidden');

        // Optional: Show loading state while fetching user data
        // Using window.showCustomAlert for temporary loading feedback (will be replaced by success/error later)
        window.showCustomAlert('Loading', "Loading your user information...", 'info');
        // Temporarily disable the purchase button if it's visible while loading
        if (completePurchaseBtn) completePurchaseBtn.disabled = true;

        const authToken = localStorage.getItem('authToken');
        try {
            const response = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    document.getElementById('firstName').value = data.user.firstName || '';
                    document.getElementById('lastName').value = data.user.lastName || '';
                    checkoutEmailInput.value = data.user.email || '';
                    checkoutConfirmEmailInput.value = data.user.email || '';
                    document.getElementById('phone').value = data.user.phone || ''; // Assuming phone exists on profile

                    checkoutEmailInput.readOnly = true;
                    checkoutConfirmEmailInput.readOnly = true;
                    // window.showCustomAlert('Success', "User information loaded.", 'success'); // Too many alerts, remove this one
                }
            } else if (response.status === 403) {
                 window.showCustomAlert('Session Expired', "Your session has expired. Please log in again.", 'error', () => {
                     localStorage.removeItem('authToken');
                     localStorage.removeItem('userRole');
                     window.location.href = 'login.html';
                 });
            } else {
                const errorData = await response.json();
                window.showCustomAlert('Error', `Failed to pre-fill user data: ${errorData.message || 'An error occurred.'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to pre-fill user data:', error);
            window.showCustomAlert('Network Error', 'A network error occurred while loading user data. Please try again.', 'error');
        } finally {
            // Hide the initial loading alert if it's still showing, as a new alert will replace it or process is done
            const currentModalTitle = document.getElementById('custom-modal-title');
            if (currentModalTitle && currentModalTitle.textContent === 'Loading') {
                 document.getElementById('custom-alert-modal').classList.add('hidden');
            }
            if (completePurchaseBtn) completePurchaseBtn.disabled = false; // Re-enable regardless of success/fail
        }
    };
    
    // --- Event Listeners and Initial Logic ---
    if (localStorage.getItem('authToken')) {
        setupCheckoutForLoggedInUser();
    } else {
        if (guestLoginPrompt) guestLoginPrompt.classList.remove('hidden');
    }

    if (proceedAsGuestBtn) {
        proceedAsGuestBtn.addEventListener('click', () => {
            if (guestLoginPrompt) guestLoginPrompt.classList.add('hidden');
            if (guestEmailForm) guestEmailForm.classList.remove('hidden');
        });
    }

    if (createProfileBtn) {
        createProfileBtn.addEventListener('click', () => window.location.href = 'signup.html');
    }

    if (guestEmailConfirmForm) {
        guestEmailConfirmForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Client-side email validation for guest form
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!guestEmailInput.value || !emailRegex.test(guestEmailInput.value)) { // Check for empty or invalid format
                window.showCustomAlert('Invalid Email', 'Please enter a valid email address.', 'error');
                return;
            }

            if (guestEmailInput.value !== confirmGuestEmailInput.value) {
                window.showCustomAlert('Emails Mismatch', 'The email addresses do not match. Please try again.', 'error');
                return;
            }

            // Disable button and show loading for guest email confirmation
            if (guestEmailSubmitBtn) {
                guestEmailSubmitBtn.disabled = true;
                guestEmailSubmitBtn.textContent = 'Proceeding...';
                guestEmailSubmitBtn.classList.add('loading-btn');
            }
            // window.showCustomAlert('Confirming', "Confirming email...", 'info'); // This alert is very brief and might not be needed.

            // If validation passes, move to main payment form
            if (guestEmailForm) guestEmailForm.classList.add('hidden');
            if (mainPaymentFormWrapper) mainPaymentFormWrapper.classList.remove('hidden');
            checkoutEmailInput.value = guestEmailInput.value;
            checkoutConfirmEmailInput.value = guestEmailInput.value;
            
            // Re-enable button
            if (guestEmailSubmitBtn) {
                guestEmailSubmitBtn.disabled = false;
                guestEmailSubmitBtn.textContent = 'Proceed to Payment';
                guestEmailSubmitBtn.classList.remove('loading-btn');
            }
            // window.showCustomAlert('Success', "Email confirmed. Please fill payment details.", 'success'); // This alert is very brief and might not be needed.
        });
    }

    if (paymentForm) {
        const validateCheckoutEmails = () => {
            if (checkoutEmailInput.readOnly) return true; // Skip validation if pre-filled for logged-in user
            if (checkoutEmailInput.value && checkoutEmailInput.value === checkoutConfirmEmailInput.value) {
                checkoutEmailMessageSpan.textContent = 'Emails match!';
                checkoutEmailMessageSpan.className = 'email-match-message match';
                checkoutConfirmEmailInput.setCustomValidity('');
                return true;
            } else {
                checkoutEmailMessageSpan.textContent = 'Emails do not match.';
                checkoutEmailMessageSpan.className = 'email-match-message no-match';
                checkoutConfirmEmailInput.setCustomValidity('Emails do not match');
                return false;
            }
        };
        // Add more robust client-side validation for other fields if needed
        checkoutEmailInput.addEventListener('input', validateCheckoutEmails);
        checkoutConfirmEmailInput.addEventListener('input', validateCheckoutEmails);

        paymentForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Perform client-side validation for the main payment form
            if (!validateCheckoutEmails()) {
                window.showCustomAlert('Email Mismatch', 'Please make sure your email addresses match.', 'error');
                return;
            }
            // Add more specific validation for first name, last name, phone, card number, expiry, cvc
            if (!document.getElementById('firstName').value.trim()) {
                window.showCustomAlert('Required Field', 'First Name is required.', 'error');
                document.getElementById('firstName').focus();
                return;
            }
            if (!document.getElementById('lastName').value.trim()) {
                window.showCustomAlert('Required Field', 'Last Name is required.', 'error');
                document.getElementById('lastName').focus();
                return;
            }
            if (!document.getElementById('phone').value.trim()) {
                window.showCustomAlert('Required Field', 'Telephone Number is required.', 'error');
                document.getElementById('phone').focus();
                return;
            }
            // Basic card validation (ideally this is handled by payment gateway SDK)
            if (!document.getElementById('cardNumber').value.trim()) {
                window.showCustomAlert('Required Field', 'Card Number is required.', 'error');
                document.getElementById('cardNumber').focus();
                return;
            }
            if (!document.getElementById('expiryDate').value.trim()) {
                window.showCustomAlert('Required Field', 'Expiry Date is required.', 'error');
                document.getElementById('expiryDate').focus();
                return;
            }
            if (!document.getElementById('cvc').value.trim()) {
                window.showCustomAlert('Required Field', 'CVC is required.', 'error');
                document.getElementById('cvc').focus();
                return;
            }
            

            const customerInfo = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
            };

            const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            if (cartItems.length === 0) {
                window.showCustomAlert('Cart Empty', 'Your cart is empty. Please add tickets before purchasing.', 'error');
                return;
            }

            const purchasesByEvent = {};
            cartItems.forEach(item => {
                const eventId = item.id.split('-')[0]; 
                if (!purchasesByEvent[eventId]) {
                    purchasesByEvent[eventId] = { eventId, selectedTickets: [] };
                }
                purchasesByEvent[eventId].selectedTickets.push({ ticketType: item.name, quantity: item.quantity });
            });
            const finalPurchaseData = Object.values(purchasesByEvent);

            // Disable button and show loading feedback
            if (completePurchaseBtn) {
                completePurchaseBtn.disabled = true;
                completePurchaseBtn.textContent = 'Completing...';
                completePurchaseBtn.classList.add('loading-btn');
            }
            window.showCustomAlert('Processing', "Processing your purchase. Please wait...", 'info');

            const authToken = localStorage.getItem('authToken');
            const endpoint = '/api/purchase-tickets'; 
            
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchases: finalPurchaseData, customerInfo: customerInfo })
            };
            if (authToken) {
                options.headers['Authorization'] = `Bearer ${authToken}`;
            }

            try {
                const response = await fetch(endpoint, options);
                const result = await response.json();
                if (response.ok) {
                    window.showCustomAlert('Purchase Successful!', result.message || 'Your purchase was completed successfully!', 'success', () => {
                        localStorage.removeItem('cartItems'); // Clear cart on success
                        // Conditional redirect based on authentication
                        const redirectUrl = authToken ? 
                                            'purchase-confirmation.html' : 
                                            'purchase-confirmation.html?guest=true'; // Pass guest flag
                        window.location.href = redirectUrl;
                    });
                } else {
                    window.showCustomAlert('Purchase Failed', `Your purchase could not be completed: ${result.message || 'An unknown error occurred.'}`, 'error');
                }
            } catch (error) {
                console.error('Error during purchase:', error);
                window.showCustomAlert('Network Error', 'A network error occurred during purchase. Please try again.', 'error');
            } finally {
                // Re-enable button and hide loading feedback
                if (completePurchaseBtn) {
                    completePurchaseBtn.disabled = false;
                    completePurchaseBtn.textContent = 'Complete Purchase';
                    completePurchaseBtn.classList.remove('loading-btn');
                }
            }
        });
    }

    renderCheckoutSummary();
});