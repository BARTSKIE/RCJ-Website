// js/auth.js
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    ref,
    get,
    set,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// DOM Elements
let loginForm;

// Initialize based on current page
function initializeAuth() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'login.html') {
        initializeLoginPage();
    }
    
    // Always check auth state
    checkAuthState();
}

// Initialize Login Page
function initializeLoginPage() {
    loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    
    // Auto-fill from URL parameters if they exist
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    const passwordFromUrl = urlParams.get('password');
    
    // In initializeLoginPage(), after auto-filling from URL:
    if (emailFromUrl && emailInput) {
        emailInput.value = decodeURIComponent(emailFromUrl);
        // Clear the URL parameters for security
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (passwordFromUrl && passwordInput) {
        passwordInput.value = decodeURIComponent(passwordFromUrl);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => togglePasswordVisibility(passwordInput, togglePassword));
    }
    
    // Remove registration link if exists
    const registerLink = document.querySelector('a[href="register.html"]');
    if (registerLink) {
        registerLink.style.display = 'none';
    }
    
    // Update text to indicate mobile registration
    const authDivider = document.querySelector('.auth-divider');
    if (authDivider) {
        authDivider.innerHTML = '<span>Don\'t have an account?</span>';
    }
    
    const mobileAppNote = document.createElement('div');
    mobileAppNote.className = 'mobile-app-note';
    mobileAppNote.innerHTML = `
        <p style="text-align: center; margin-top: 15px; font-size: 0.9rem; color: #666;">
            <i class="fas fa-mobile-alt"></i>
            Account registration is available through our mobile app only
        </p>
    `;
    
    if (loginForm) {
        loginForm.appendChild(mobileAppNote);
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('errorMessage');
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    // Basic validation
    if (!email || !password) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    // Show loading state
    setButtonLoading(loginBtn, true);
    hideMessage(errorDiv);
    
    try {
        console.log('Attempting Firebase login...');
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Firebase login successful!');
        console.log('User ID:', user.uid);
        console.log('Email verified:', user.emailVerified);
        console.log('Current auth state:', auth.currentUser);
        
        // Check if user is verified
        if (!user.emailVerified) {
            console.log('❌ User email not verified');
            showVerificationModal(user.email);
            await signOut(auth);
            setButtonLoading(loginBtn, false);
            return;
        }
        
        // Check if user exists in Realtime Database (users node)
        try {
            const userRef = ref(db, 'users/' + user.uid);
            const userSnapshot = await get(userRef);
            console.log('Realtime DB user check:', userSnapshot.exists());
            
            if (!userSnapshot.exists()) {
                console.log('❌ User not found in Realtime Database');
                showMessage('Account not found in our system. Please register through our mobile app.', 'error');
                await signOut(auth);
                setButtonLoading(loginBtn, false);
                return;
            }
            
            // Update user data in Realtime Database
            await updateUserData(user);
            
            // Wait a moment for auth state to propagate
            console.log('🔄 Waiting for auth state to update...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Double-check auth state before redirect
            console.log('Final auth check before redirect:', auth.currentUser);
            
            // Redirect to homepage or intended page
            const redirectTo = getRedirectUrl();
            console.log('🎯 Redirecting to:', redirectTo);
            window.location.href = redirectTo;
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            showMessage('Error accessing user data. Please try again.', 'error');
            setButtonLoading(loginBtn, false);
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'An error occurred during login.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please register through our mobile app.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
                errorMessage = 'Invalid login credentials. Please check your email and password.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
        }
        
        showMessage(errorMessage, 'error');
        setButtonLoading(loginBtn, false);
    }
}

// Update user data in Realtime Database
async function updateUserData(user) {
    try {
        const userRef = ref(db, 'users/' + user.uid);
        
        // Get current user data first
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
            // Update last login timestamp
            await set(ref(db, 'users/' + user.uid + '/lastLogin'), serverTimestamp());
            await set(ref(db, 'users/' + user.uid + '/updatedAt'), serverTimestamp());
        }
    } catch (error) {
        console.error('Error updating user data:', error);
    }
}
// Show verification modal for unverified users
function showVerificationModal(email) {
    const modal = document.getElementById('verificationModal');
    const userEmail = document.getElementById('userEmail');
    const continueBtn = document.getElementById('continueToHome');
    const closeBtn = document.querySelector('.close-modal');
    
    userEmail.textContent = email;
    modal.style.display = 'flex';
    
    continueBtn.onclick = () => {
        window.location.href = 'index.html';
    };
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Check authentication state
function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            // User is signed in and verified
            updateUIForAuthenticatedUser(user);
        } else {
            // User is signed out or not verified
            updateUIForUnauthenticatedUser();
        }
    });
}

// Update UI for authenticated user
async function updateUIForAuthenticatedUser(user) {
    // Add user info to navbar if exists
    const nav = document.querySelector('nav ul');
    if (nav && !document.getElementById('userMenu')) {
        let displayName = 'User';
        
        // Try to get user data from Realtime Database
        try {
            const userRef = ref(db, 'users/' + user.uid);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                displayName = userData.name || userData.displayName || user.displayName || user.email.split('@')[0];
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            displayName = user.displayName || user.email.split('@')[0];
        }
        
        const userMenu = document.createElement('li');
        userMenu.id = 'userMenu';
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <div class="user-dropdown">
                <button class="user-btn">
                    <i class="fas fa-user-circle"></i>
                    ${displayName}
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="dropdown-content">
                    <a href="profile.html"><i class="fas fa-user"></i> My Profile</a>
                    <a href="support.html"><i class="fas fa-headset"></i> Customer Support</a>
                    <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </div>
        `;
        nav.appendChild(userMenu);
        
        // Add logout functionality
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    }
}

// Update UI for unauthenticated user
function updateUIForUnauthenticatedUser() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.remove();
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Utility functions
function togglePasswordVisibility(passwordInput, toggleBtn) {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

function setButtonLoading(button, isLoading) {
    const span = button.querySelector('span');
    const spinner = button.querySelector('.loading-spinner');
    
    if (isLoading) {
        button.disabled = true;
        span.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        button.disabled = false;
        span.style.display = 'block';
        spinner.style.display = 'none';
    }
}

function showMessage(message, type) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (type === 'error') {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
    } else {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
    }
}

function hideMessage(element) {
    if (element) {
        element.style.display = 'none';
    }
}

function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let redirect = urlParams.get('redirect');
    
    // Prevent redirecting back to login page
    if (redirect && redirect.includes('login.html')) {
        redirect = 'index.html';
    }
    
    return redirect || 'index.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAuth);

// Export for use in other files
window.authModule = {
    auth,
    db,
    getCurrentUser: () => auth.currentUser,
    requireAuth: (redirectUrl = 'login.html') => {
        return new Promise((resolve, reject) => {
            onAuthStateChanged(auth, (user) => {
                if (user && user.emailVerified) {
                    resolve(user);
                } else {
                    window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.href)}`;
                    reject(new Error('User not authenticated'));
                }
            });
        });
    }
};

// Test login function
async function testLogin(email, password) {
    const auth = getAuth();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Login successful:', userCredential.user.uid);
        
        // Check Realtime Database
        const db = getDatabase();
        const userRef = ref(db, 'users/' + userCredential.user.uid);
        const snapshot = await get(userRef);
        console.log('✅ User exists in Realtime DB:', snapshot.exists());
        console.log('✅ User data:', snapshot.val());
        
        return userCredential.user;
    } catch (error) {
        console.error('❌ Login failed:', error.code, error.message);
        return null;
    }
}

// Usage: testLogin('user@example.com', 'password')