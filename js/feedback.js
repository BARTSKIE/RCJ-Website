// feedback.js - Updated to use shared Firebase config
import { auth, db } from './firebase-config.js'; // Use shared config
import { ref, push } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';

// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const feedbackForm = document.getElementById('feedbackForm');
    const thankYouMessage = document.getElementById('thankYouMessage');
    const charCount = document.getElementById('charCount');
    const comments = document.getElementById('comments');
    const stars = document.querySelectorAll('.star-rating input');
    
    console.log('Feedback form initialized');
    
    // Set timestamp - WITH NULL CHECK
    const timestampField = document.getElementById('timestamp');
    if (timestampField) {
        timestampField.value = Date.now();
        console.log('Timestamp set successfully');
    } else {
        console.log('Timestamp field not found - check for duplicate IDs');
    }
    
    // Character count for comments - WITH NULL CHECK
    if (comments && charCount) {
        comments.addEventListener('input', function() {
            const count = this.value.length;
            charCount.textContent = count;
            
            if (count > 450) {
                charCount.classList.add('warning');
                charCount.classList.remove('error');
            } else if (count > 500) {
                charCount.classList.add('error');
                charCount.classList.remove('warning');
            } else {
                charCount.classList.remove('warning', 'error');
            }
        });
        console.log('Character count initialized');
    } else {
        console.log('Comments or charCount elements not found');
    }

    // Star rating hover effects - WITH NULL CHECK
    if (stars.length > 0) {
        stars.forEach(star => {
            star.addEventListener('change', function() {
                updateStarDisplay(this.value);
            });
        });
        console.log('Star rating initialized');
    }

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rating = document.querySelector('input[name="rating"]:checked');
            if (!rating) {
                showError('Please select a rating');
                return;
            }

            if (comments.value.trim().length < 10) {
                showError('Please provide more detailed comments (minimum 10 characters)');
                return;
            }

            // Disable submit button
            const submitBtn = this.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

            try {
                // Prepare data matching your mobile app structure
                const feedbackData = {
                    app_version: "1.0.0",
                    comments: comments.value.trim(),
                    date: new Date().toISOString(),
                    platform: "website",
                    rating: parseInt(rating.value),
                    source: "website",
                    status: "new",
                    timestamp: Date.now(),
                    user_email: document.getElementById('user_email').value.trim() || "",
                    user_id: "website_user_" + Date.now()
                };

                console.log('Submitting feedback data:', feedbackData);

                // Send to BOTH Formspree and Firebase Realtime Database
                const [formspreeResult, firebaseResult] = await Promise.allSettled([
                    // 1. Send to Formspree (for email notifications)
                    fetch('https://formspree.io/f/mjkpgkyz', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(feedbackData)
                    }),
                    
                    // 2. Send to Firebase Realtime Database (for your admin dashboard)
                    push(ref(db, 'feedbacks'), feedbackData)
                ]);

                console.log('Formspree result:', formspreeResult);
                console.log('Firebase result:', firebaseResult);

                // Check results
                let successMessage = "Thank you for your feedback!";
                let warnings = [];

                if (formspreeResult.status === 'rejected') {
                    console.warn('Formspree submission failed:', formspreeResult.reason);
                    warnings.push("Email notification failed");
                } else if (formspreeResult.value && !formspreeResult.value.ok) {
                    console.warn('Formspree submission failed with status:', formspreeResult.value.status);
                    warnings.push("Email notification failed");
                }

                if (firebaseResult.status === 'rejected') {
                    console.error('Firebase submission failed:', firebaseResult.reason);
                    warnings.push("Database storage failed");
                }

                // If both failed, show error
                if (formspreeResult.status === 'rejected' && firebaseResult.status === 'rejected') {
                    throw new Error('Both submissions failed');
                }

                // Show success with warnings if any
                if (warnings.length > 0) {
                    successMessage += " (Note: " + warnings.join(", ") + ")";
                }

                // Show success message
                feedbackForm.style.display = 'none';
                thankYouMessage.style.display = 'block';
                
                // Update success message if there were warnings
                if (warnings.length > 0) {
                    const successText = thankYouMessage.querySelector('p');
                    successText.innerHTML = successMessage + "<br><small>But don't worry, your feedback was received.</small>";
                }
                
                thankYouMessage.scrollIntoView({ behavior: 'smooth' });
                
            } catch (error) {
                console.error('Error submitting feedback:', error);
                showError('There was an error submitting your feedback. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
            }
        });
    }
    
    // Test Firebase connection
    async function testFirebaseConnection() {
        try {
            const testData = {
                test: "connection_test",
                timestamp: Date.now()
            };
            const testRef = await push(ref(db, 'test_connection'), testData);
            console.log("✅ Firebase Realtime Database connection successful!");
            console.log("Test data written with key:", testRef.key);
            return true;
        } catch (error) {
            console.error("❌ Firebase connection failed:", error);
            return false;
        }
    }

    // Run the test when page loads
    document.addEventListener('DOMContentLoaded', function() {
        testFirebaseConnection();
    });

    function updateStarDisplay(rating) {
        const labels = document.querySelectorAll('.star-rating label');
        labels.forEach((label, index) => {
            const starValue = 5 - index; // Because of flex-direction: row-reverse
            if (starValue <= rating) {
                label.style.color = 'var(--secondary)';
            } else {
                label.style.color = 'var(--light-gray)';
            }
        });
    }

    function showError(message) {
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: var(--danger);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            animation: fadeIn 0.3s ease;
        `;
        errorDiv.textContent = message;
        
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Add new error message
        if (feedbackForm) {
            feedbackForm.insertBefore(errorDiv, feedbackForm.firstChild);
        }
        
        // Remove error after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Initialize star display based on default checked state
    const defaultRating = document.querySelector('input[name="rating"]:checked');
    if (defaultRating) {
        updateStarDisplay(defaultRating.value);
    }
});