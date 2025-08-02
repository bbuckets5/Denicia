// js/purchase-confirmation.js
document.addEventListener('DOMContentLoaded', () => {
    const viewMyTicketsButton = document.getElementById('view-my-tickets-btn');

    // Ensure showCustomAlert is available globally from common.js
    const showCustomAlert = window.showCustomAlert;

    // Check if it's a guest purchase by looking at URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestPurchase = urlParams.get('guest') === 'true';

    // Show the custom alert only if it's a guest purchase AND the 'alertShown' flag isn't in sessionStorage
    // This prevents the alert from showing again if the page is reloaded
    if (isGuestPurchase && !sessionStorage.getItem('purchaseAlertShown')) {
        showCustomAlert(
            "Tickets Sent!",
            "Please check your email, including junk/spam folders, for your tickets and confirmation.",
            "info"
        );
        sessionStorage.setItem('purchaseAlertShown', 'true'); // Set flag so it doesn't repeat
    }

    if (viewMyTicketsButton) {
        if (isGuestPurchase) {
            // If it's a guest purchase, hide the button
            viewMyTicketsButton.style.display = 'none';
        } else {
            // For logged-in users, ensure it's visible (default HTML might already do this)
            viewMyTicketsButton.style.display = 'inline-block'; // Or whatever display type it should normally have
        }
    }

    // Clear the sessionStorage flag when the user leaves the page or browser tab/window is closed
    // This ensures a new purchase flow will trigger the alert again.
    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem('purchaseAlertShown');
    });
});