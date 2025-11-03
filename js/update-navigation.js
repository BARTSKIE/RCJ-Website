// js/update-navigation.js
import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    ref,
    get
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Simple function to update navigation on all pages
function updateNavigation() {
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (!authLinks || !userMenu) {
        console.log('Navigation elements not found on this page');
        return;
    }
    
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        console.log('Email verified:', user ? user.emailVerified : 'N/A');
        
        // Force a re-check after a short delay to catch any state changes
        setTimeout(() => {
            const currentUser = auth.currentUser;
            console.log('Current user after delay:', currentUser ? currentUser.email : 'No user');
        }, 1000);
        
        if (user && user.emailVerified) {
            // User is signed in and verified
            console.log('User is authenticated and verified, showing user menu');
            authLinks.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Get user data from Realtime Database
            try {
                const userRef = ref(db, 'users/' + user.uid);
                const userSnapshot = await get(userRef);
                
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    userName.textContent = userData.name || userData.displayName || user.displayName || user.email.split('@')[0];
                    console.log('User data loaded:', userName.textContent);
                } else {
                    userName.textContent = user.displayName || user.email.split('@')[0];
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                userName.textContent = user.displayName || user.email.split('@')[0];
            }
            
            // Setup logout functionality
            setupLogout();
            
        } else {
            // User is signed out or not verified
            console.log('User not authenticated or not verified, showing auth links');
            authLinks.style.display = 'block';
            userMenu.style.display = 'none';
        }
    });
}

// Handle logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                console.log('Logging out...');
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing navigation...');
    
    // Check immediate auth state
    const currentUser = auth.currentUser;
    console.log('Immediate auth check:', currentUser ? currentUser.email : 'No user');
    
    updateNavigation();
});