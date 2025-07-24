/*
================================================================================
 File: script.js
 Project: Click eTickets
 Description: Handles all client-side interactive functionalities for the
              Click eTickets website.
================================================================================
*/

document.addEventListener('DOMContentLoaded', () => {

    /* ====================================================================== */
    /* SECTION 1: DOM Element Selectors (Cached for Efficiency)             */
    /* ====================================================================== */

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


    // Event Details Page Elements (event-details.html)
    const ticketOptionsList = document.querySelector('.ticket-options-list');

    // Shopping Cart Elements
    const cartItemsList = document.getElementById('cart-items-list');
    const cartCountSpan = document.querySelector('.cart-count');

    // Event Listing Page Elements (index.html)
    const searchInput = document.getElementById('event-search');
    const eventListContainer = document.getElementById('event-list-container');


    // My Tickets Page Elements (mytickets.html)
    const myTicketsList = document.querySelector('.tickets-list');
    const tabsNav = document.querySelector('.tabs-nav');
    const tabButtons = tabsNav ? tabsNav.querySelectorAll('.tab-btn') : null;
    const ticketLists = document.querySelectorAll('.tickets-list');
    // CORRECTED: Specific ticket list containers for dynamic content
    const upcomingTicketsList = document.getElementById('upcoming-tickets');
    const pastTicketsList = document.getElementById('past-tickets');


    // Checkout Form Elements (checkout.html)
    const paymentForm = document.getElementById('payment-form');
    const checkoutEmailInput = document.getElementById('email');
    const checkoutConfirmEmailInput = document.getElementById('confirmEmail');
    const checkoutEmailMessageSpan = document.querySelector('.email-match-message');

    // Sign Up Form Elements (signup.html)
    const signupForm = document.getElementById('signup-form');
    const signupPasswordInput = document.getElementById('password');
    const signupConfirmPasswordInput = document.getElementById('confirmPassword');
    const signupPasswordMessageSpan = document.querySelector('.password-match-message');

    // Login Form Elements (login.html)
    const loginForm = document.getElementById('login-form');


    // Profile Page Elements (myprofile.html)
    const profileAccordion = document.querySelector('.profile-accordion');
    // Elements for displaying user profile details
    const profileFirstNameSpan = document.getElementById('profileFirstName');
    const profileLastNameSpan = document.getElementById('profileLastName');
    const profileEmailSpan = document.getElementById('profileEmail');
    
    // Password Change Form Elements
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');


    // Admin Dashboard Elements (admin-dashboard.html)
    const adminTabsNav = document.querySelector('.main-content > .tabs-nav');
    const adminTabButtons = adminTabsNav ? adminTabsNav.querySelectorAll('.tab-btn') : null;
    const adminSections = document.querySelectorAll('.admin-section');

    const addEventForm = document.getElementById('add-event-form');
    const existingEventsList = document.getElementById('existing-events-list');
    const registeredUsersList = document.getElementById('registered-users-list');


    /* ====================================================================== */
    /* SECTION 2: Utility Functions                                         */
    /* ====================================================================== */

    const parseFloatSafe = (value) => parseFloat(value) || 0;

    const updateCartTotals = () => {
        if (!cartItemsList) return;
        let subtotal = 0;
        const serviceFeeRate = 0.05;
        const currentCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        currentCartItems.forEach(item => {
            subtotal += parseFloatSafe(item.price) * parseInt(item.quantity, 10);
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
        const checkoutSubtotalElement = document.querySelector('.summary-calculations .summary-line:nth-child(1) span:last-child');
        const checkoutServiceFeeElement = document.querySelector('.summary-calculations .summary-line:nth-child(2) span:last-child');
        const checkoutTotalElement = document.querySelector('.summary-total .summary-total-price');
        if (checkoutSubtotalElement && checkoutServiceFeeElement && checkoutTotalElement) {
            checkoutSubtotalElement.textContent = `$${subtotal.toFixed(2)}`;
            checkoutServiceFeeElement.textContent = `$${serviceFee.toFixed(2)}`;
            checkoutTotalElement.textContent = `$${total.toFixed(2)}`;
        }
    };

    const renderCartItems = () => {
        if (!cartItemsList || !cartCountSpan) return;
        cartItemsList.innerHTML = '';
        let totalCartQuantity = 0;
        const storedCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        if (storedCartItems.length === 0) {
            cartItemsList.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
            const existingTotals = cartItemsList.nextElementSibling;
            if (existingTotals && existingTotals.classList.contains('cart-summary-totals')) {
                existingTotals.remove();
            }
        } else {
            storedCartItems.forEach(item => {
                const cartItemHTML = `
                    <div class="cart-item" data-ticket-id="${item.id}">
                        <div class="cart-item-info">
                            <h4>${item.eventName}</h4>
                            <p class="cart-item-details">${item.name} - $${parseFloatSafe(item.price).toFixed(2)}</p>
                            <p class="cart-item-quantity-text">Quantity: <span class="cart-item-quantity">${item.quantity}</span></p>
                        </div>
                        <button class="remove-from-cart-btn" aria-label="Remove item from cart">&times;</button>
                    </div>`;
                cartItemsList.insertAdjacentHTML('beforeend', cartItemHTML);
                totalCartQuantity += item.quantity;
            });
            if (!document.querySelector('.cart-summary-totals')) {
                const totalsHTML = `
                    <div class="cart-summary-totals">
                        <div class="summary-line"><span>Subtotal</span><span class="cart-subtotal-price">$0.00</span></div>
                        <div class="summary-line"><span>Service Fee (5%)</span><span class="cart-service-fee-price">$0.00</span></div>
                        <div class="summary-total"><span>Total</span><span class="cart-total-price">$0.00</span></div>
                    </div>
                `;
                const cartDropdownInner = cartDropdownMenu.querySelector('.cart-dropdown-menu > div:first-child');
                if (cartDropdownInner) {
                    cartDropdownInner.insertAdjacentHTML('afterend', totalsHTML);
                }
            }
        }
        cartCountSpan.textContent = totalCartQuantity;
        updateCartTotals();
    };

    function addTicketToCart(id, name, quantity, price, eventName) {
        let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
        const existingItemIndex = cart.findIndex(item => item.id === id);
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += quantity;
        } else {
            cart.push({ id, name, quantity, price, eventName });
        }
        localStorage.setItem('cartItems', JSON.stringify(cart));
        renderCartItems();
    }

    function removeTicketFromCart(id) {
        let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem('cartItems', JSON.stringify(cart));
        renderCartItems();
    }


    /* ====================================================================== */
    /* SECTION 3: Header Dropdown Menus Logic (User & Shopping Cart)        */
    /* ====================================================================== */

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
            renderCartItems();
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


    /* ====================================================================== */
    /* SECTION 4: Event Details Page Logic (Quantity & Add to Cart)         */
    /* ====================================================================== */

    if (ticketOptionsList) {
        ticketOptionsList.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('.quantity-btn')) {
                const quantityDisplay = target.closest('.ticket-controls').querySelector('.quantity-display');
                let currentQuantity = parseInt(quantityDisplay.textContent, 10);
                if (target.matches('.plus-btn')) {
                    currentQuantity++;
                } else if (target.matches('.minus-btn') && currentQuantity > 1) {
                    currentQuantity--;
                }
                quantityDisplay.textContent = currentQuantity;
            }
            if (target.matches('.add-to-cart-btn')) {
                const ticketOption = target.closest('.ticket-option');
                const quantity = parseInt(ticketOption.querySelector('.quantity-display').textContent, 10);
                const ticketId = ticketOption.dataset.ticketId;
                const ticketName = ticketOption.dataset.ticketName;
                const ticketPrice = parseFloatSafe(ticketOption.dataset.ticketPrice);
                const eventName = document.querySelector('.event-info-box h1').textContent;
                addTicketToCart(ticketId, ticketName, quantity, ticketPrice, eventName);
                alert(`${quantity} x ${ticketName} ticket(s) for ${eventName} added to your cart!`);
            }
        });
    }

    if (cartItemsList) {
        cartItemsList.addEventListener('click', (event) => {
            if (event.target.matches('.remove-from-cart-btn')) {
                const cartItemElement = event.target.closest('.cart-item');
                const ticketIdToRemove = cartItemElement.dataset.ticketId;
                removeTicketFromCart(ticketIdToRemove);
            }
        });
    }


    /* ====================================================================== */
    /* SECTION 5: Event Search Filter Logic (for index.html)                */
    /* ====================================================================== */

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


    /* ====================================================================== */
    /* SECTION 6: My Tickets Page Logic (QR Code Toggle & Tabs)             */
    /* ====================================================================== */

    if (myTicketsList) {
        myTicketsList.addEventListener('click', (event) => {
            if (event.target.matches('.show-qr-btn')) {
                const button = event.target;
                const ticketItem = button.closest('.ticket-item');
                const qrCode = ticketItem.querySelector('.ticket-qr-code');
                qrCode.classList.toggle('hidden');
                button.textContent = qrCode.classList.contains('hidden') ? 'Show QR Code' : 'Hide QR Code';
            }
        });
    }

    if (tabsNav && tabButtons && ticketLists.length > 0) {
        tabsNav.addEventListener('click', (event) => {
            if (event.target.matches('.tab-btn')) {
                const targetId = event.target.dataset.target;
                tabButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                ticketLists.forEach(list => {
                    list.classList.add('hidden');
                });
                document.getElementById(targetId).classList.remove('hidden');
            }
        });
    }


    /* ====================================================================== */
    /* SECTION 7: Form Validations (Client-Side)                            */
    /* ====================================================================== */

    if (paymentForm && checkoutEmailInput && checkoutConfirmEmailInput && checkoutEmailMessageSpan) {
        const validateCheckoutEmails = () => {
            if (checkoutEmailInput.value || checkoutConfirmEmailInput.value) {
                if (checkoutEmailInput.value === checkoutConfirmEmailInput.value) {
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
            }
            checkoutEmailMessageSpan.textContent = '';
            checkoutConfirmEmailInput.setCustomValidity('');
            return true;
        };
        checkoutEmailInput.addEventListener('input', validateCheckoutEmails);
        checkoutConfirmEmailInput.addEventListener('input', validateCheckoutEmails);
        paymentForm.addEventListener('submit', (event) => {
            validateCheckoutEmails();
            if (!checkoutConfirmEmailInput.checkValidity()) {
                event.preventDefault();
                alert('Please make sure your email addresses match before completing the purchase.');
            } else {
                alert('Purchase process initiated! (Backend integration needed)');
            }
        });
    }
    
    if (signupForm && signupPasswordInput && signupConfirmPasswordInput && signupPasswordMessageSpan) {
        const validateSignupPasswords = () => {
            if (signupPasswordInput.value || signupConfirmPasswordInput.value) {
                if (signupPasswordInput.value === signupConfirmPasswordInput.value) {
                    signupPasswordMessageSpan.textContent = 'Passwords match!';
                    signupPasswordMessageSpan.className = 'password-match-message match';
                    signupConfirmPasswordInput.setCustomValidity('');
                    return true;
                } else {
                    signupPasswordMessageSpan.textContent = 'Passwords do not match.';
                    signupPasswordMessageSpan.className = 'password-match-message no-match';
                    signupConfirmPasswordInput.setCustomValidity('Passwords do not match');
                    return false;
                }
            }
            signupPasswordMessageSpan.textContent = '';
            signupConfirmPasswordInput.setCustomValidity('');
            return true;
        };
        signupPasswordInput.addEventListener('input', validateSignupPasswords);
        signupConfirmPasswordInput.addEventListener('input', validateSignupPasswords);
        
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                alert('Please make sure your passwords match.');
                return;
            }

            const firstName = signupForm.querySelector('#firstName').value;
            const lastName = signupForm.querySelector('#lastName').value;
            const email = signupForm.querySelector('#email').value;
            const password = signupForm.querySelector('#password').value;

            try {
                const response = await fetch('http://localhost:3000/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, lastName, email, password })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    window.location.href = 'login.html';
                } else {
                    alert(`Error: ${result.error}`);
                }
            } catch (error) {
                console.error('Registration failed:', error);
                alert('Registration failed due to a network error.');
            }
        });
    }

    // --- NEW: LOGIN FORM LOGIC ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = loginForm.querySelector('#email').value;
            const password = loginForm.querySelector('#password').value;

            try {
                const response = await fetch('http://localhost:3000/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    // Save the token to localStorage to keep the user logged in
                    localStorage.setItem('authToken', result.token);
                    // Update the UI after successful login
                    updateUserNav(); 
                    // Redirect to the user's profile page
                    window.location.href = 'myprofile.html';
                } else {
                    alert(`Error: ${result.error}`);
                }

            } catch (error) {
                console.error('Login failed:', error);
                alert('Login failed due to a network error.');
            }
        });
    }

    // --- NEW: LOGOUT FUNCTIONALITY ---
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior
            
            localStorage.removeItem('authToken'); // Remove the authentication token
            alert('You have been logged out.'); // Notify the user
            updateUserNav(); // Update the navigation UI
            window.location.href = 'index.html'; // Redirect to the home page
        });
    }


    /* ====================================================================== */
    /* SECTION 8: Profile Page Accordion Logic                              */
    /* ====================================================================== */

    if (profileAccordion) {
        profileAccordion.addEventListener('click', (e) => {
            const trigger = e.target.closest('.accordion-trigger');
            if (trigger) {
                const content = trigger.nextElementSibling;
                trigger.classList.toggle('active');
                content.classList.toggle('hidden');
            }
        });
    }


    /* ====================================================================== */
    /* SECTION 9: Admin Dashboard Logic (Client-Side Only for now)          */
    /* ====================================================================== */

    if (adminTabsNav && adminTabButtons && adminSections.length > 0) {
        adminTabsNav.addEventListener('click', (event) => {
            if (event.target.matches('.tab-btn')) {
                const targetId = event.target.dataset.target;
                adminTabButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                adminSections.forEach(section => {
                    section.classList.add('hidden');
                });
                document.getElementById(targetId).classList.remove('hidden');
            }
        });
    }

    if (addEventForm) {
        addEventForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const newEventData = {
                name: document.getElementById('newEventName').value,
                date: document.getElementById('newEventDate').value,
                location: document.getElementById('newEventLocation').value,
                description: document.getElementById('newEventDescription').value,
                price: parseFloat(document.getElementById('newEventPrice').value),
                imageUrl: document.getElementById('newEventImage').value
            };
            console.log('New Event Data (Client-side simulation):', newEventData);
            alert(`Event "${newEventData.name}" submitted! (Requires Backend to save)`);
            addEventForm.reset();
        });
    }

    /* ====================================================================== */
    /* SECTION 10: Initial Load Operations                                  */
    /* ====================================================================== */

    renderCartItems();
    loadPublicEvents();
    updateUserNav(); 
    fetchUserProfile();
    // Call this function to fetch and display tickets on the mytickets.html page
    fetchUserTickets();


    /* ====================================================================== */
    /* SECTION 11: Public Event Listing (for index.html)                    */
    /* ====================================================================== */

    async function loadPublicEvents() {
        if (!eventListContainer) {
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/events');
            if (!response.ok) {
                throw new Error('Failed to fetch events.');
            }
            const events = await response.json();

            eventListContainer.innerHTML = '';

            if (events.length === 0) {
                eventListContainer.innerHTML = '<p>No upcoming events at the moment. Please check back soon!</p>';
                return;
            }

            events.forEach(event => {
                const eventLink = document.createElement('a');
                eventLink.className = 'event-link';
                eventLink.href = `event-details.html?id=${event._id}`;
    
                const displayPrice = event.tickets.length > 0 ? `$${parseFloat(event.tickets[0].price).toFixed(2)}` : 'Click for Price';
                
                eventLink.innerHTML = `
                    <div class="event-card glass">
                        <img src="/${event.flyerImagePath}" alt="${event.eventName} Flyer">
                        <h3>${event.eventName}</h3>
                        <p>Date: ${new Date(event.submittedAt).toLocaleDateString()}</p>
                        <p class="price">${displayPrice}</p>
                    </div>
                `;
                eventListContainer.appendChild(eventLink);
            });

        } catch (error) {
            console.error('Error loading public events:', error);
            eventListContainer.innerHTML = '<p>Sorry, there was an error loading events.</p>';
        }
    }

    /* ====================================================================== */
    /* SECTION 12: Authentication State UI Management                       */
    /* ====================================================================== */

    function updateUserNav() {
        const authToken = localStorage.getItem('authToken');
        const isLoggedIn = !!authToken;

        const loginLink = document.getElementById('loginLink');
        const signupLink = document.getElementById('signupLink');
        const myTicketsLink = document.getElementById('myTicketsLink');
        const profileLink = document.getElementById('profileLink');
        const logoutLink = document.getElementById('logoutLink');

        if (isLoggedIn) {
            if (loginLink) loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';
            if (myTicketsLink) myTicketsLink.style.display = 'block';
            if (profileLink) profileLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'block';
        } else {
            if (loginLink) loginLink.style.display = 'block';
            if (signupLink) signupLink.style.display = 'block';
            if (myTicketsLink) myTicketsLink.style.display = 'none';
            if (profileLink) profileLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'none';
        }
    }

    /* ====================================================================== */
    /* SECTION 13: User Profile Data Fetching (for myprofile.html)          */
    /* ====================================================================== */

    async function fetchUserProfile() {
        if (!profileFirstNameSpan || !profileLastNameSpan || !profileEmailSpan) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.log("No auth token found. Redirecting to login.");
            alert("You need to be logged in to view your profile. Please log in.");
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/users/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                console.log("User profile fetched successfully:", data.user);
                profileFirstNameSpan.textContent = data.user.firstName || '';
                profileLastNameSpan.textContent = data.user.lastName || '';
                profileEmailSpan.textContent = data.user.email || '';
            } else {
                console.error('Failed to fetch user profile:', data.message);
                alert(data.message || 'Failed to load profile. Please log in again.');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Network error fetching user profile:', error);
            alert('A network error occurred while loading your profile. Please check your connection.');
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    }

    /* ====================================================================== */
    /* SECTION 14: Profile Page Functionality (Change Password & Accordion) */
    /* ====================================================================== */

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (newPasswordInput.value !== confirmNewPasswordInput.value) {
                alert("New passwords do not match. Please try again.");
                return;
            }

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const authToken = localStorage.getItem('authToken');

            if (!authToken) {
                alert("You must be logged in to change your password.");
                window.location.href = 'login.html';
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/users/profile/password', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Password updated successfully!");
                    changePasswordForm.reset();
                } else {
                    alert(data.message || 'Failed to change password. Please check your current password.');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                alert('A network error occurred. Please try again later.');
            }
        });
    }

    /* ====================================================================== */
    /* SECTION 15: My Tickets Page Logic (Display Tickets)                  */
    /* ====================================================================== */

    async function fetchUserTickets() {
        // Only run this on the mytickets.html page
        if (!upcomingTicketsList || !pastTicketsList) {
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            upcomingTicketsList.innerHTML = '<p class="error-msg">You must be logged in to view your tickets.</p>';
            return;
        }

        upcomingTicketsList.innerHTML = '<p>Loading your tickets...</p>';
        pastTicketsList.innerHTML = '';

        try {
            const response = await fetch('http://localhost:3000/api/users/tickets', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tickets.');
            }
            
            const tickets = await response.json();
            
            if (tickets.length === 0) {
                upcomingTicketsList.innerHTML = '<p class="info-msg">You have not purchased any tickets yet.</p>';
                return;
            }

            renderTickets(tickets);

        } catch (error) {
            console.error('Error fetching user tickets:', error);
            upcomingTicketsList.innerHTML = '<p class="error-msg">Sorry, there was an error loading your tickets. Please try again later.</p>';
        }
    }
    
    function renderTickets(tickets) {
        // Clear existing lists
        upcomingTicketsList.innerHTML = '';
        pastTicketsList.innerHTML = '';

        const today = new Date();
        let hasUpcoming = false;
        let hasPast = false;

        tickets.forEach(ticket => {
            const eventDate = new Date(ticket.eventDate);

            const ticketHTML = `
                <div class="ticket-item glass">
                    <div class="ticket-details">
                        <h3>${ticket.eventName}</h3>
                        <p><i class="fas fa-calendar-alt"></i> ${eventDate.toLocaleDateString()}</p>
                        <p class="ticket-type-info">${ticket.ticketType}</p>
                    </div>
                    <div class="ticket-actions">
                        <div class="ticket-qr-code hidden">
                            <img src="${ticket.qrCodeImageUrl}" alt="QR Code">
                        </div>
                        <button class="show-qr-btn cta-button">Show QR Code</button>
                    </div>
                </div>
            `;

            if (eventDate >= today) {
                upcomingTicketsList.insertAdjacentHTML('beforeend', ticketHTML);
                hasUpcoming = true;
            } else {
                pastTicketsList.insertAdjacentHTML('beforeend', ticketHTML);
                hasPast = true;
            }
        });

        if (!hasUpcoming) {
            upcomingTicketsList.innerHTML = '<p class="info-msg">No upcoming tickets at the moment.</p>';
        }
        if (!hasPast) {
            pastTicketsList.innerHTML = '<p class="info-msg">No past tickets found.</p>';
        }
    }


}); // End DOMContentLoaded