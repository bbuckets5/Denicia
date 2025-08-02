// js/my-profile.js
document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const profileAccordion = document.querySelector('.profile-accordion');
    const profileInfoContainer = document.getElementById('profile-info-container');
    // NEW/UPDATED: Selectors for the specific elements within profile-info-container
    const profileLoadingMessage = document.getElementById('profile-loading-message');
    const profileErrorMessage = document.getElementById('profile-error-message');
    const profileUserInfo = profileInfoContainer ? profileInfoContainer.querySelector('.user-info') : null;

    const profileFirstNameSpan = document.getElementById('profileFirstName');
    const profileLastNameSpan = document.getElementById('profileLastName');
    const profileEmailSpan = document.getElementById('profileEmail');

    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const passwordStrengthIndicator = document.getElementById('password-strength-indicator');
    const passwordMatchMessage = document.getElementById('password-match-message');
    const changePasswordSubmitBtn = document.getElementById('change-password-submit-btn');
    // passwordMessageContainer is no longer directly used by displayMessage, but custom alert
    // const passwordMessageContainer = document.getElementById('password-message-container');

    // Accordion Logic
    if (profileAccordion) {
        profileAccordion.addEventListener('click', (e) => {
            const trigger = e.target.closest('.accordion-trigger');
            if (trigger) {
                trigger.classList.toggle('active');
                trigger.nextElementSibling.classList.toggle('hidden');
            }
        });
    }

    // The local displayMessage helper is no longer needed since we're using window.showCustomAlert.
    // function displayMessage(container, message, type = 'info') { ... }

    // Password Strength Checker (Client-side)
    function checkPasswordStrength(password) {
        let strength = 0;
        let feedback = '';

        if (password.length < 8) {
            feedback = 'Too short (min 8 characters)';
            strength = 0;
        } else {
            strength = 1; // Base strength for length
            if (password.match(/[a-z]/)) strength++;
            if (password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++; // Special characters

            if (strength < 3) feedback = 'Weak: Try adding uppercase, numbers, or symbols.';
            else if (strength === 3) feedback = 'Medium: Can be stronger.';
            else feedback = 'Strong password!';
        }

        if (passwordStrengthIndicator) { // Ensure element exists before manipulating
            passwordStrengthIndicator.textContent = feedback;
            passwordStrengthIndicator.className = 'password-strength-indicator'; // Reset classes
            if (strength === 0) {
                passwordStrengthIndicator.classList.add('strength-none');
            } else if (strength < 3) {
                passwordStrengthIndicator.classList.add('strength-weak');
            } else if (strength === 3) {
                passwordStrengthIndicator.classList.add('strength-medium');
            } else {
                passwordStrengthIndicator.classList.add('strength-strong');
            }
        }
        return strength; // Return strength level for validation logic
    }

    // Validate New Passwords Match
    function validateNewPasswords() {
        if (!newPasswordInput || !confirmNewPasswordInput || !passwordMatchMessage) return false; // Ensure elements exist

        if (newPasswordInput.value === '' || confirmNewPasswordInput.value === '') {
            passwordMatchMessage.textContent = '';
            passwordMatchMessage.className = 'password-match-message';
            confirmNewPasswordInput.setCustomValidity('Please enter and confirm your new password.');
            return false;
        }
        if (newPasswordInput.value === confirmNewPasswordInput.value) {
            passwordMatchMessage.textContent = 'Passwords match!';
            passwordMatchMessage.className = 'password-match-message match';
            confirmNewPasswordInput.setCustomValidity(''); // Clear validity for submission
            return true;
        } else {
            passwordMatchMessage.textContent = 'Passwords do not match.';
            passwordMatchMessage.className = 'password-match-message no-match';
            confirmNewPasswordInput.setCustomValidity('Passwords do not match'); // Set custom validity
            return false;
        }
    }


    // Fetch Profile Data
    async function fetchUserProfile() {
        // Ensure all necessary elements for this section exist before proceeding
        if (!profileInfoContainer || !profileFirstNameSpan || !profileUserInfo || !profileLoadingMessage || !profileErrorMessage) {
            console.error("Missing profile detail elements in HTML for fetchUserProfile.");
            return;
        }

        // Show loading message and hide user info / error message
        profileLoadingMessage.classList.remove('hidden');
        profileUserInfo.classList.add('hidden');
        profileErrorMessage.classList.add('hidden');
        profileInfoContainer.classList.add('loading'); // Add a loading class for styling

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            // If no token, hide loading, show error, then redirect
            profileLoadingMessage.classList.add('hidden');
            profileErrorMessage.textContent = 'You are not logged in. Redirecting to login...'; // Fallback text
            profileErrorMessage.classList.remove('hidden');
            profileInfoContainer.classList.remove('loading');
            
            // Use custom alert for this critical redirect
            window.showCustomAlert('Not Logged In', 'You must be logged in to view your profile. Redirecting to login page.', 'error', () => {
                window.location.href = 'login.html';
            });
            return;
        }

        try {
            const response = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await response.json();

            if (response.ok) {
                profileFirstNameSpan.textContent = data.user.firstName || '';
                profileLastNameSpan.textContent = data.user.lastName || '';
                profileEmailSpan.textContent = data.user.email || '';
                
                // Hide loading, show user info
                profileLoadingMessage.classList.add('hidden');
                profileUserInfo.classList.remove('hidden');
                profileInfoContainer.classList.remove('loading');
            } else if (response.status === 403) {
                // Token invalid/expired, force re-login
                localStorage.removeItem('authToken');
                localStorage.removeItem('userRole');
                profileLoadingMessage.classList.add('hidden');
                profileErrorMessage.textContent = 'Session expired or unauthorized. Redirecting to login...'; // Fallback text
                profileErrorMessage.classList.remove('hidden');
                profileInfoContainer.classList.remove('loading');
                
                // Use custom alert for this critical redirect
                window.showCustomAlert('Session Expired', 'Your session has expired or you are unauthorized. Please log in again.', 'error', () => {
                    window.location.href = 'login.html';
                });
            } else {
                // Other server errors
                profileLoadingMessage.classList.add('hidden');
                profileErrorMessage.textContent = `Failed to load profile: ${data.message || 'An error occurred.'}`; // Fallback text
                profileErrorMessage.classList.remove('hidden');
                profileInfoContainer.classList.remove('loading');
                window.showCustomAlert('Profile Load Error', `Failed to load your profile: ${data.message || 'An unknown error occurred.'}`, 'error');
            }
        } catch (error) {
            // Network or parsing errors
            console.error('Network error fetching profile:', error);
            profileLoadingMessage.classList.add('hidden');
            profileErrorMessage.textContent = 'Network error loading profile. Please try again.'; // Fallback text
            profileErrorMessage.classList.remove('hidden');
            profileInfoContainer.classList.remove('loading');
            window.showCustomAlert('Network Error', 'A network error occurred while loading your profile. Please check your connection and try again.', 'error');
        }
    }

    // Change Password Form
    if (changePasswordForm) {
        // Real-time password strength and match feedback
        newPasswordInput.addEventListener('input', () => {
            checkPasswordStrength(newPasswordInput.value);
            validateNewPasswords();
        });
        confirmNewPasswordInput.addEventListener('input', validateNewPasswords);

        changePasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Perform client-side validations
            if (!validateNewPasswords()) {
                window.showCustomAlert('Validation Error', "New passwords do not match. Please correct them.", 'error');
                return;
            }

            // Basic strength check before submission
            let passwordValue = newPasswordInput.value;
            let currentPasswordStrength = checkPasswordStrength(passwordValue); // Get the strength value
            if (currentPasswordStrength < 3) { // Require at least "medium" strength by our client-side definition
                window.showCustomAlert('Weak Password', "New password is too weak. Please use a stronger password (min 8 characters, include uppercase, numbers, or symbols).", 'error');
                return;
            }

            // Disable button and show loading
            if (changePasswordSubmitBtn) { // Ensure button exists
                changePasswordSubmitBtn.disabled = true;
                changePasswordSubmitBtn.textContent = 'Changing...';
                changePasswordSubmitBtn.classList.add('loading-btn'); // Add a class for loading spinner/styles
            }
            window.showCustomAlert('Processing', "Updating your password. Please wait...", 'info');

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const authToken = localStorage.getItem('authToken');

            if (!authToken) {
                // Should ideally be caught by fetchUserProfile() but a safety check
                window.showCustomAlert('Authentication Error', "You are not authenticated. Please log in.", 'error', () => {
                    window.location.href = 'login.html';
                });
                // Re-enable button immediately if redirecting
                if (changePasswordSubmitBtn) {
                    changePasswordSubmitBtn.disabled = false;
                    changePasswordSubmitBtn.textContent = 'Change Password';
                    changePasswordSubmitBtn.classList.remove('loading-btn');
                }
                return;
            }

            try {
                const response = await fetch('/api/users/profile/password', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await response.json();

                if (response.ok) {
                    window.showCustomAlert('Success!', data.message || 'Password changed successfully!', 'success', () => {
                        changePasswordForm.reset();
                        // Clear password strength and match messages after successful reset
                        if (passwordStrengthIndicator) {
                            passwordStrengthIndicator.textContent = '';
                            passwordStrengthIndicator.className = 'password-strength-indicator';
                        }
                        if (passwordMatchMessage) {
                            passwordMatchMessage.textContent = '';
                            passwordMatchMessage.className = 'password-match-message';
                        }
                    });
                } else {
                    window.showCustomAlert('Password Change Failed', data.message || data.error || 'An error occurred while changing password.', 'error');
                }
            } catch (error) {
                console.error('Network error changing password:', error);
                window.showCustomAlert('Network Error', 'A network error occurred. Please try again.', 'error');
            } finally {
                // Re-enable button and hide loading feedback
                if (changePasswordSubmitBtn) {
                    changePasswordSubmitBtn.disabled = false;
                    changePasswordSubmitBtn.textContent = 'Update Password';
                    changePasswordSubmitBtn.classList.remove('loading-btn');
                }
            }
        });
    }

    // Initial load
    fetchUserProfile();
});