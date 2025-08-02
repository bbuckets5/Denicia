// js/signup.js
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
        // --- Selectors ---
        const signupEmailInput = document.getElementById('email');
        const signupPasswordInput = document.getElementById('password');
        const signupConfirmPasswordInput = document.getElementById('confirmPassword');
        const signupPasswordMessageSpan = document.querySelector('.password-match-message');
        const passwordStrengthIndicator = document.getElementById('password-strength-indicator');
        const signupSubmitBtn = signupForm.querySelector('button[type="submit"]');
        // formMessageContainer is no longer directly used by displayMessage, as we're using window.showCustomAlert
        // const formMessageContainer = document.getElementById('form-message-container');

        // The local displayMessage helper is no longer needed since we're using window.showCustomAlert.
        // function displayMessage(container, message, type = 'info') { ... }

        // --- Client-side Email Validation ---
        function validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                signupEmailInput.setCustomValidity('Please enter a valid email address.');
                return false;
            } else {
                signupEmailInput.setCustomValidity('');
                return true;
            }
        }
        signupEmailInput.addEventListener('input', () => {
            validateEmail(signupEmailInput.value);
        });


        // --- Password Strength Checker ---
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

            if (passwordStrengthIndicator) {
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
            return strength;
        }

        // --- Validate New Passwords Match (for signup) ---
        const validateSignupPasswords = () => {
            if (signupPasswordInput.value === '' || signupConfirmPasswordInput.value === '') {
                signupPasswordMessageSpan.textContent = '';
                signupPasswordMessageSpan.className = 'password-match-message';
                signupConfirmPasswordInput.setCustomValidity('Please confirm your password.');
                return false;
            }
            if (signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupPasswordMessageSpan.textContent = 'Passwords do not match.';
                signupPasswordMessageSpan.className = 'password-match-message no-match';
                signupConfirmPasswordInput.setCustomValidity('Passwords do not match');
                return false;
            } else {
                signupPasswordMessageSpan.textContent = 'Passwords match!';
                signupPasswordMessageSpan.className = 'password-match-message match';
                signupConfirmPasswordInput.setCustomValidity('');
                return true;
            }
        };

        // Event listeners for real-time feedback
        signupPasswordInput.addEventListener('input', () => {
            checkPasswordStrength(signupPasswordInput.value);
            validateSignupPasswords();
        });
        signupConfirmPasswordInput.addEventListener('input', validateSignupPasswords);


        // --- Signup Form Submission ---
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Perform client-side validations
            if (!validateEmail(signupEmailInput.value)) {
                window.showCustomAlert('Invalid Email', "Please enter a valid email address.", 'error'); // Using custom alert
                return;
            }

            if (!validateSignupPasswords()) {
                window.showCustomAlert('Passwords Mismatch', "Please make sure your passwords match.", 'error'); // Using custom alert
                return;
            }
            
            // Client-side password strength check
            let currentPasswordStrength = checkPasswordStrength(signupPasswordInput.value);
            if (currentPasswordStrength < 3) { // Require at least "medium" strength
                window.showCustomAlert('Weak Password', "Password is too weak. Please use a stronger password (min 8 characters, include uppercase, numbers, and symbols).", 'error'); // Using custom alert
                return;
            }

            // Disable button and show loading feedback
            if (signupSubmitBtn) {
                signupSubmitBtn.disabled = true;
                signupSubmitBtn.textContent = 'Signing Up...';
                signupSubmitBtn.classList.add('loading-btn');
            }
            window.showCustomAlert('Processing', "Registering your account. Please wait...", 'info'); // Using custom alert

            const formData = {
                firstName: signupForm.querySelector('#firstName').value,
                lastName: signupForm.querySelector('#lastName').value,
                email: signupForm.querySelector('#email').value,
                password: signupForm.querySelector('#password').value,
            };

            try {
                const response = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    window.showCustomAlert('Registration Successful!', result.message || 'Account created successfully! Redirecting to login...', 'success', () => { // Using custom alert
                        signupForm.reset(); // Clear the form
                        // Clear password feedback as well
                        if (signupPasswordMessageSpan) {
                            signupPasswordMessageSpan.textContent = '';
                            signupPasswordMessageSpan.className = 'password-match-message';
                        }
                        if (passwordStrengthIndicator) {
                            passwordStrengthIndicator.textContent = '';
                            passwordStrengthIndicator.className = 'password-strength-indicator';
                        }

                        // Redirect after user clicks OK
                        window.location.href = 'login.html';
                    });
                } else {
                    window.showCustomAlert('Registration Failed', result.error || result.message || 'An error occurred during registration. Please try again.', 'error'); // Using custom alert
                }
            } catch (error) {
                console.error('Registration failed due to a network error:', error);
                window.showCustomAlert('Network Error', 'Registration failed due to a network error. Please check your internet connection and try again.', 'error'); // Using custom alert
            } finally {
                // Re-enable button and hide loading feedback
                if (signupSubmitBtn) {
                    signupSubmitBtn.disabled = false;
                    signupSubmitBtn.textContent = 'Create Account';
                    signupSubmitBtn.classList.remove('loading-btn');
                }
            }
        });
    }
});