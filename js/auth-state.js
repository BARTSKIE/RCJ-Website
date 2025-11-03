// // js/navigation.js
// import { auth, db } from './firebase-config.js';
// import { 
//     onAuthStateChanged,
//     signOut 
// } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
// import { 
//     ref,
//     get
// } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// // Update navigation based on auth state
// function updateNavigation() {
//     const authLinks = document.getElementById('authLinks');
//     const userMenu = document.getElementById('userMenu');
//     const userName = document.getElementById('userName');
    
//     if (!authLinks || !userMenu) {
//         console.log('Navigation elements not found');
//         return;
//     }
    
//     onAuthStateChanged(auth, async (user) => {
//         console.log('Auth state changed:', user ? user.email : 'No user');
        
//         if (user && user.emailVerified) {
//             // User is signed in and verified
//             authLinks.style.display = 'none';
//             userMenu.style.display = 'block';
            
//             // Get user data from Realtime Database
//             try {
//                 const userRef = ref(db, 'users/' + user.uid);
//                 const userSnapshot = await get(userRef);
                
//                 if (userSnapshot.exists()) {
//                     const userData = userSnapshot.val();
//                     userName.textContent = userData.name || userData.displayName || user.displayName || user.email.split('@')[0];
//                     console.log('User data loaded:', userName.textContent);
//                 } else {
//                     userName.textContent = user.displayName || user.email.split('@')[0];
//                 }
//             } catch (error) {
//                 console.error('Error fetching user data:', error);
//                 userName.textContent = user.displayName || user.email.split('@')[0];
//             }
            
//             // Setup logout functionality
//             setupLogout();
            
//         } else {
//             // User is signed out or not verified
//             authLinks.style.display = 'block';
//             userMenu.style.display = 'none';
//             console.log('User not authenticated, showing auth links');
//         }
//     });
// }

// // Handle logout
// function setupLogout() {
//     const logoutBtn = document.getElementById('logoutBtn');
//     if (logoutBtn) {
//         // Remove existing event listeners
//         const newLogoutBtn = logoutBtn.cloneNode(true);
//         logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
//         newLogoutBtn.addEventListener('click', async (e) => {
//             e.preventDefault();
//             try {
//                 await signOut(auth);
//                 window.location.href = 'index.html';
//             } catch (error) {
//                 console.error('Logout error:', error);
//             }
//         });
//     }
// }

// // Initialize when DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('Initializing navigation...');
//     updateNavigation();
// });

// // Export for use in other files
// window.navigation = {
//     updateNavigation,
//     getCurrentUser: () => auth.currentUser
// };