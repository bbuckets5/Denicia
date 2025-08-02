// js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        // Selectors for form feedback and submit button
        const loginSubmitBtn = document.getElementById('login-submit-btn'); // Assuming you have this ID on your submit button
        // The formMessageContainer is no longer directly used by displayMessage, as we're using window.showCustomAlert

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Disable button and show loading feedback
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = true;
                loginSubmitBtn.textContent = 'Logging In...';
                loginSubmitBtn.classList.add('loading-btn'); // Add this class for spinner/loading styles
            }
            // Show initial processing message
            window.showCustomAlert('Processing', "Attempting to log in. Please wait...", 'info');

            const email = loginForm.querySelector('#email').value;
            const password = loginForm.querySelector('#password').value;

            try {
                const response = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();

                if (response.ok) {
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('userRole', result.role);
                    
                    window.showCustomAlert('Login Successful!', result.message || 'You have successfully logged in!', 'success', () => {
                        // Redirect after user clicks OK on the custom alert
                        window.location.href = result.role === 'admin' ? 'admin-dashboard.html' : 'myprofile.html';
                    });
                } else {
                    window.showCustomAlert('Login Failed', `Error: ${result.message || result.error || 'Invalid credentials.'}`, 'error');
                }
            } catch (error) {
                console.error('Login failed due to a network error:', error);
                window.showCustomAlert('Network Error', 'Login failed due to a network error. Please try again.', 'error');
            } finally {
                // Re-enable button and hide loading feedback regardless of success or failure
                if (loginSubmitBtn) {
                    loginSubmitBtn.disabled = false;
                    loginSubmitBtn.textContent = 'Log In';
                    loginSubmitBtn.classList.remove('loading-btn');
                }
            }
        });
    }
});