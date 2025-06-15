// Authentication functions
const Auth = {
    // Get the current user's token
    getToken: function() {
        return localStorage.getItem('access_token');
    },
    
    // Check if user is logged in
    isLoggedIn: function() {
        return !!this.getToken();
    },
    
    // Set the auth token
    setToken: function(token) {
        localStorage.setItem('access_token', token);
    },
    
    // Remove the auth token (logout)
    removeToken: function() {
        localStorage.removeItem('access_token');
    },
    
    // Get the current user's data
    getCurrentUser: async function() {
        if (!this.isLoggedIn()) {
            return null;
        }
        
        try {
            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                this.removeToken();
                return null;
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    },
    
    // Check if the current user has a specific role
    hasRole: async function(role) {
        const user = await this.getCurrentUser();
        return user && user.role === role;
    },
    
    // Redirect to login if not authenticated
    requireAuth: function(to, from, next) {
        if (!this.isLoggedIn()) {
            next({
                path: '/login',
                query: { redirect: to.fullPath }
            });
        } else {
            next();
        }
    },
    
    // Redirect to home if already authenticated
    requireGuest: function(to, from, next) {
        if (this.isLoggedIn()) {
            next({ path: '/' });
        } else {
            next();
        }
    }
};

// Add token to all fetch requests
const originalFetch = window.fetch;
window.fetch = async function(resource, config = {}) {
    // Add authorization header if token exists
    const token = Auth.getToken();
    if (token && !resource.endsWith('/api/auth/login') && !resource.endsWith('/api/auth/signup')) {
        config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    // Make the request
    const response = await originalFetch(resource, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
        Auth.removeToken();
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    
    return response;
};

// Logout function
function logout() {
    Auth.removeToken();
    window.location.href = '/login';
}

// Initialize auth state when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add logout button event listeners
    const logoutButtons = document.querySelectorAll('.logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
    
    // Update UI based on auth state
    const authElements = document.querySelectorAll('[data-auth]');
    const guestElements = document.querySelectorAll('[data-guest]');
    
    if (Auth.isLoggedIn()) {
        // Show authenticated elements
        authElements.forEach(el => el.style.display = '');
        guestElements.forEach(el => el.style.display = 'none');
        
        // Load user data
        Auth.getCurrentUser().then(user => {
            if (user) {
                // Update user info in the UI
                const userElements = document.querySelectorAll('[data-user]');
                userElements.forEach(el => {
                    const field = el.getAttribute('data-user');
                    if (field === 'username') {
                        el.textContent = user.username;
                    } else if (field === 'email') {
                        el.textContent = user.email;
                    } else if (field === 'avatar' && user.avatar_url) {
                        el.src = user.avatar_url;
                    }
                });
            }
        });
    } else {
        // Show guest elements
        authElements.forEach(el => el.style.display = 'none');
        guestElements.forEach(el => el.style.display = '');
    }
});
