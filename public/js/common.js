// js/common.js

// ======================================================================
// COMMON Utility Functions (Globally Accessible)
// These functions are attached to the window object so other scripts can use them.
// ======================================================================

window.parseFloatSafe = (value) => parseFloat(value) || 0;

window.formatTime = function(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    const hourInt = parseInt(hour, 10);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    const formattedHour = hourInt % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
};

// ======================================================================
// Shopping Cart Management Functions (Globally Accessible)
// These are made global because multiple pages interact with the cart.
// ======================================================================

window.updateCartTotals = () => {
    // Selectors are inside this function as they might not exist on all pages.
    const cartItemsList = document.getElementById('cart-items-list');
    const cartDropdownMenu = document.querySelector('.cart-dropdown-menu');

    if (!cartItemsList) return;

    let subtotal = 0;
    const serviceFeeRate = 0.05;
    const currentCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    currentCartItems.forEach(item => {
        subtotal += window.parseFloatSafe(item.price) * parseInt(item.quantity, 10);
    });

    const serviceFee = subtotal * serviceFeeRate;
    const total = subtotal + serviceFee;

    const cartSubtotalElement = cartDropdownMenu ? cartDropdownMenu.querySelector('.cart-subtotal-price') : null;
    const cartServiceFeeElement = cartDropdownMenu ? cartDropdownMenu.querySelector('.cart-service-fee-price') : null;
    const cartTotalElement = cartDropdownMenu ? cartDropdownMenu.querySelector('.cart-total-price') : null;

    if (cartSubtotalElement && cartServiceFeeElement && cartTotalElement) {
        cartSubtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        cartServiceFeeElement.textContent = `$${serviceFee.toFixed(2)}`;
        cartTotalElement.textContent = `$${total.toFixed(2)}`;
    }

    // Also update checkout totals if they exist on the page
    const checkoutSubtotalElement = document.querySelector('.summary-calculations .summary-line:nth-child(1) span:last-child');
    const checkoutServiceFeeElement = document.querySelector('.summary-calculations .summary-line:nth-child(2) span:last-child');
    const checkoutTotalElement = document.querySelector('.summary-total .summary-total-price');

    if (checkoutSubtotalElement && checkoutServiceFeeElement && checkoutTotalElement) {
        checkoutSubtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        checkoutServiceFeeElement.textContent = `$${serviceFee.toFixed(2)}`;
        checkoutTotalElement.textContent = `$${total.toFixed(2)}`;
    }
};

window.renderCartItems = () => {
    const cartItemsList = document.getElementById('cart-items-list');
    const cartCountSpan = document.querySelector('.cart-count');
    const cartDropdownMenu = document.querySelector('.cart-dropdown-menu'); // Needed here to add totals HTML

    if (!cartItemsList || !cartCountSpan || !cartDropdownMenu) return; // All needed elements must exist

    cartItemsList.innerHTML = '';
    let totalCartQuantity = 0;
    const storedCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    if (storedCartItems.length === 0) {
        cartItemsList.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
        // Remove existing totals HTML if cart becomes empty
        const existingTotals = cartDropdownMenu.querySelector('.cart-summary-totals');
        if (existingTotals) {
            existingTotals.remove();
        }
    } else {
        storedCartItems.forEach(item => {
            const cartItemHTML = `
                <div class="cart-item" data-ticket-id="${item.id}">
                    <div class="cart-item-info">
                        <h4>${item.eventName}</h4>
                        <p class="cart-item-details">${item.name} - $${window.parseFloatSafe(item.price).toFixed(2)}</p>
                        <p class="cart-item-quantity-text">Quantity: <span class="cart-item-quantity">${item.quantity}</span></p>
                    </div>
                    <button class="remove-from-cart-btn" aria-label="Remove item from cart">&times;</button>
                </div>`;
            cartItemsList.insertAdjacentHTML('beforeend', cartItemHTML);
            totalCartQuantity += parseInt(item.quantity, 10);
        });

        // Add totals HTML only if it doesn't already exist and cart is not empty
        if (!cartDropdownMenu.querySelector('.cart-summary-totals')) {
            const totalsHTML = `
                <div class="cart-summary-totals">
                    <div class="summary-line"><span>Subtotal</span><span class="cart-subtotal-price">$0.00</span></div>
                    <div class="summary-line"><span>Service Fee (5%)</span><span class="cart-service-fee-price">$0.00</span></div>
                    <div class="summary-total"><span>Total</span><span class="cart-total-price">$0.00</span></div>
                </div>
            `;
            const cartFooter = cartDropdownMenu.querySelector('.cart-footer');
            if (cartFooter) {
                cartFooter.insertAdjacentHTML('beforebegin', totalsHTML);
            }
        }
    }
    cartCountSpan.textContent = totalCartQuantity;
    window.updateCartTotals();
};

window.removeTicketFromCart = function(id) {
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cartItems', JSON.stringify(cart));
    window.renderCartItems();
};


// ======================================================================
// CUSTOM ALERT MODAL FUNCTION (Globally Accessible)
// ======================================================================
window.showCustomAlert = function(title, message, type = 'info', onCloseCallback = null) {
    const modalOverlay = document.getElementById('custom-alert-modal');
    const modalContent = modalOverlay ? modalOverlay.querySelector('.custom-modal-content') : null;
    const modalTitle = document.getElementById('custom-modal-title');
    const modalMessage = document.getElementById('custom-modal-message');
    const modalOkBtn = document.getElementById('custom-modal-ok-btn');

    if (!modalOverlay || !modalContent || !modalTitle || !modalMessage || !modalOkBtn) {
        console.error('Custom alert modal elements not found in DOM. Falling back to native alert.');
        alert(`${title}\n\n${message}`);
        if (onCloseCallback) onCloseCallback();
        return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalContent.className = 'custom-modal-content glass';
    modalContent.classList.add(type);
    modalOverlay.classList.remove('hidden');

    const handleOkClick = () => {
        modalOverlay.classList.add('hidden');
        modalOkBtn.removeEventListener('click', handleOkClick);
        if (onCloseCallback) {
            onCloseCallback();
        }
    };

    modalOkBtn.addEventListener('click', handleOkClick);
};


// ======================================================================
// DOMContentLoaded Listener: For elements and logic specific to initial page load.
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {

    // Header Dropdowns
    const userIconToggle = document.getElementById('user-icon-toggle');
    const userDropdownMenu = document.querySelector('.user-dropdown-menu');
    const cartIconToggle = document.getElementById('cart-icon-toggle');
    const cartDropdownMenu = document.querySelector('.cart-dropdown-menu');

    // User Authentication Header Links
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    const myTicketsLink = document.getElementById('myTicketsLink');
    const profileLink = document.getElementById('profileLink');
    const logoutLink = document.getElementById('logoutLink');
    const adminDashboardButtonOnProfile = document.getElementById('admin-dashboard-link'); 

    const cartItemsList = document.getElementById('cart-items-list');

    if (userIconToggle && userDropdownMenu) {
        userIconToggle.addEventListener('click', (event) => {
            event.preventDefault();
            userDropdownMenu.classList.toggle('active');
            if (cartDropdownMenu) cartDropdownMenu.classList.remove('active');
        });
    }

    if (cartIconToggle && cartDropdownMenu) {
        cartIconToggle.addEventListener('click', (event) => {
            event.preventDefault();
            cartDropdownMenu.classList.toggle('active');
            window.renderCartItems();
            if (userDropdownMenu) userDropdownMenu.classList.remove('active');
        });
    }

    document.addEventListener('click', (event) => {
        if (userDropdownMenu && userIconToggle && !userIconToggle.contains(event.target) && !userDropdownMenu.contains(event.target)) {
            userDropdownMenu.classList.remove('active');
        }
        if (cartDropdownMenu && cartIconToggle && !cartIconToggle.contains(event.target) && !cartDropdownMenu.contains(event.target)) {
            cartDropdownMenu.classList.remove('active');
        }
    });

    if (cartItemsList) {
        cartItemsList.addEventListener('click', (event) => {
            if (event.target.matches('.remove-from-cart-btn')) {
                const cartItemElement = event.target.closest('.cart-item');
                const ticketIdToRemove = cartItemElement.dataset.ticketId;
                window.removeTicketFromCart(ticketIdToRemove);
            }
        });
    }

    function updateUserNav() {
        const authToken = localStorage.getItem('authToken');
        const userRole = localStorage.getItem('userRole');
        const isLoggedIn = !!authToken;

        if (loginLink) loginLink.style.display = isLoggedIn ? 'none' : 'block';
        if (signupLink) signupLink.style.display = isLoggedIn ? 'none' : 'block';
        if (myTicketsLink) myTicketsLink.style.display = isLoggedIn ? 'block' : 'none';
        if (profileLink) profileLink.style.display = isLoggedIn ? 'block' : 'none';
        if (logoutLink) logoutLink.style.display = isLoggedIn ? 'block' : 'none';

        if (adminDashboardButtonOnProfile) {
            adminDashboardButtonOnProfile.style.display = (isLoggedIn && userRole === 'admin') ? 'block' : 'none';
        }
    }
    
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            window.showCustomAlert('Logged Out', 'You have been successfully logged out.', 'info', () => {
                updateUserNav();
                window.location.href = 'index.html';
            });
        });
    }

    // Initial Load Operations
    window.renderCartItems();
    updateUserNav();

    // ======================================================================
    // NEW: Cleave.js Auto-formatting Initialization
    // ======================================================================
    if (typeof Cleave !== 'undefined') {
        // Auto-formatting for phone numbers
        const phoneInputs = document.querySelectorAll('.phone-format');
        phoneInputs.forEach(input => {
            new Cleave(input, {
                phone: true,
                phoneRegionCode: 'US'
            });
        });

        // Auto-formatting for credit card numbers
        const cardInputs = document.querySelectorAll('.card-number-format');
        cardInputs.forEach(input => {
            new Cleave(input, {
                creditCard: true
            });
        });

        // Auto-formatting for card expiration date
        const expiryInputs = document.querySelectorAll('.card-expiry-format');
        expiryInputs.forEach(input => {
            new Cleave(input, {
                date: true,
                datePattern: ['m', 'y']
            });
        });

        // Auto-formatting for card CVC
        const cvcInputs = document.querySelectorAll('.card-cvc-format');
        cvcInputs.forEach(input => {
            new Cleave(input, {
                numeral: true,
                blocks: [3]
            });
        });
    }
});