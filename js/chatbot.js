// chatbot.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { auth, db } from './firebase-config.js';
import { 
    ref, 
    get,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
    getFirestore, 
    doc, 
    getDoc,
    collection,
    addDoc,
    updateDoc,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase configuration for Firestore (chatbot responses only)
const firebaseConfig = {
  apiKey: "AIzaSyCvxPjQyEjn5_vIVgwGhOgAVlIkx5chnWE",
  authDomain: "rcj-firebase-database.firebaseapp.com",
  databaseURL: "https://rcj-firebase-database-default-rtdb.firebaseio.com",
  projectId: "rcj-firebase-database",
  storageBucket: "rcj-firebase-database.firebasestorage.app",
  messagingSenderId: "322419824007",
  appId: "1:322419824007:web:8c797773a13fae041caf22",
};

// Initialize Firebase for Firestore (chatbot responses only)
let firestoreDb;
let lastProcessedMessageCount = 0;

try {
    const app = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app); // For chatbot responses
    console.log('Firebase Firestore initialized successfully for chatbot responses');
} catch (error) {
    console.error('Firebase Firestore initialization error:', error);
}

// Authentication state
let isUserAuthenticated = false;
let isUserVerified = false;
let currentUserId = null;
let userEmail = "guest@example.com";
let userName = "Guest User";

// Live support state
let currentTicketId = null;
let isAdminConnected = false;

// Page routing configuration
const pageRoutes = {
  'home': 'index.html',
  'services': 'services.html',
  'contact': 'contact.html',
  'login': 'login.html',
  'register': 'register.html',
  'profile': 'profile.html'
};

// DOM elements
let chatbotContainer, chatbotTrigger, closeChatbot, chatMessages, userInput, sendButton, suggestionsContainer;

// Language and state management
let currentLanguage = 'english';
let languageSelected = false;
let chatbotResponses = {
  english: null,
  tagalog: null
};

// Confirmation messages for both languages
const confirmations = {
  'english': [
    "Sure! 😊",
    "Of course! 👌",
    "Yes, I can help you with that! 👍",
    "Absolutely! 🙌",
    "Got it! 💪"
  ],
  'tagalog': [
    "Sige! 😊",
    "Syempre! 👌",
    "Oo, matutulungan kita diyan! 👍",
    "Walang problema! 🙌",
    "Nakuha ko! 💪"
  ]
};

// Common Taglish words mapping
const taglishKeywords = {
  'appointment': 'appointment',
  'book': 'book',
  'schedule': 'schedule',
  'hours': 'oras',
  'time': 'oras',
  'open': 'open',
  'close': 'close',
  'location': 'lokasyon',
  'address': 'address',
  'where': 'saan',
  'services': 'serbisyo',
  'service': 'serbisyo',
  'test': 'test',
  'eye exam': 'eye exam',
  'glasses': 'salamin',
  'contact lens': 'contact lens',
  'website': 'website',
  'online': 'online',
  'mobile app': 'mobile app',
  'download': 'download',
  'app': 'app',
  'ano': 'what',
  'saan': 'where',
  'kailan': 'when',
  'paano': 'how',
  'magkano': 'how much',
  'bakit': 'why',
  'pano': 'how',
  'kelan': 'when',
  'san': 'where',
  'pwed': 'can',
  'pwede': 'can'
};

function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            userEmail = user.email;
            isUserAuthenticated = true;
            isUserVerified = user.emailVerified;
            
            // Check if user exists in Realtime Database (mobile registered)
            try {
                const userRef = ref(db, 'users/' + user.uid);
                const userSnapshot = await get(userRef);
                
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    userName = userData.name || user.email.split('@')[0];
                    console.log('Mobile-registered user detected:', userName);
                    
                    if (isUserVerified) {
                        updateChatbotForVerifiedUser();
                    } else {
                        updateChatbotForUnverifiedUser();
                    }
                } else {
                    // User authenticated but not in Realtime Database (not mobile registered)
                    console.log('User not found in Realtime Database - not mobile registered');
                    isUserAuthenticated = false;
                    updateChatbotForGuest();
                }
            } catch (error) {
                console.error('Error checking user data:', error);
                isUserAuthenticated = false;
                updateChatbotForGuest();
            }
        } else {
            currentUserId = null;
            userEmail = "guest@example.com";
            userName = "Guest User";
            isUserAuthenticated = false;
            isUserVerified = false;
            updateChatbotForGuest();
        }
    });
}

// Update chatbot for verified mobile users
function updateChatbotForVerifiedUser() {
    const header = document.querySelector('.chatbot-header h4');
    const subheader = document.querySelector('.chatbot-header p');
    
    if (header) header.textContent = `RCJ Optical Assistant - Welcome, ${userName}!`;
    if (subheader) subheader.textContent = "How can we help you today?";
    
    console.log('Verified mobile user detected, live support enabled');
    
    // Add a welcome message for verified users
    if (languageSelected) {
        const welcomeMessage = currentLanguage === 'english' 
            ? `Welcome back, ${userName}! 👋 I'm here to help with your optical needs.`
            : `Maligayang pagbabalik, ${userName}! 👋 Nandito ako para tumulong sa iyong pangangailangan sa optical.`;
        appendMessage(welcomeMessage, "bot");
    }
}

function updateChatbotForUnverifiedUser() {
    const header = document.querySelector('.chatbot-header h4');
    const subheader = document.querySelector('.chatbot-header p');
    
    if (header) header.textContent = "RCJ Optical Assistant";
    if (subheader) subheader.textContent = "Please verify your email to access live support";
    
    console.log('Unverified user detected');
}

// Update chatbot for guests/non-mobile users
function updateChatbotForGuest() {
    const header = document.querySelector('.chatbot-header h4');
    const subheader = document.querySelector('.chatbot-header p');
    
    if (header) header.textContent = "RCJ Optical Assistant";
    if (subheader) subheader.textContent = "How can I help you today?";
    
    console.log('Guest or non-mobile user detected');
}

// Show mobile registration prompt
function showMobileRegistrationPrompt() {
    const mobilePrompt = `
        <div class="mobile-prompt">
            <strong>Mobile App Registration Required</strong><br><br>
            To access live support features, please:<br><br>
            1. Download our mobile app<br>
            2. Create your account<br>
            3. Verify your email<br>
            4. Login here with the same credentials<br><br>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="quick-reply" onclick="continueWithBot()" style="flex: 1; min-width: 120px;">
                    <i class="fas fa-robot"></i> Continue with Bot
                </button>
            </div>
        </div>
    `;
    
    appendMessage(mobilePrompt, "bot");
}

// Show verification reminder
function showVerificationReminder() {
    const reminderMessage = `
        <div class="verification-reminder">
            <strong>Email Verification Required</strong><br><br>
            Please verify your email address to connect with live support.<br><br>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="quick-reply" onclick="openProfilePage()" style="flex: 1; min-width: 120px;">
                    <i class="fas fa-envelope"></i> Check Verification
                </button>
                <button class="quick-reply" onclick="continueWithBot()" style="flex: 1; min-width: 120px;">
                    <i class="fas fa-robot"></i> Continue with Bot
                </button>
            </div>
        </div>
    `;
    
    appendMessage(reminderMessage, "bot");
}

// Show login prompt
function showLoginPrompt() {
    const loginMessage = `
        <div class="login-prompt">
            <strong>Login Required</strong><br><br>
            Please log in to your account to connect with live support.<br><br>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="quick-reply" onclick="openLoginPage()" style="flex: 1; min-width: 120px;">
                    <i class="fas fa-sign-in-alt"></i> Login Now
                </button>
                <button class="quick-reply" onclick="openRegisterPage()" style="flex: 1; min-width: 120px;">
                    <i class="fas fa-user-plus"></i> Create Account
                </button>
                <button class="quick-reply" onclick="continueWithBot()" style="flex: 1; min-width: 120px;">
                    <i class="fas fa-robot"></i> Continue with Bot
                </button>
            </div>
        </div>
    `;
    
    appendMessage(loginMessage, "bot");
}

// Global navigation functions
window.openLoginPage = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    window.location.href = 'login.html';
};

window.openRegisterPage = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    window.location.href = 'register.html';
};

window.openProfilePage = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    window.location.href = 'profile.html';
};
// Initialize DOM elements
function initializeDOMElements() {
    chatbotContainer = document.getElementById('chatbot-container');
    chatbotTrigger = document.getElementById('chatbot-trigger');
    closeChatbot = document.getElementById('close-chatbot');
    chatMessages = document.getElementById('chatbot-messages');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-message');
    suggestionsContainer = document.getElementById('chatbot-quick-replies');

    console.log('DOM elements initialized:', {
        chatbotContainer: !!chatbotContainer,
        chatbotTrigger: !!chatbotTrigger,
        closeChatbot: !!closeChatbot,
        chatMessages: !!chatMessages,
        userInput: !!userInput,
        sendButton: !!sendButton,
        suggestionsContainer: !!suggestionsContainer
    });
}

// Load responses from Firestore (keep this for chatbot responses)
async function loadChatbotResponses() {
  try {
    console.log('Loading chatbot responses from Firestore...');
    
    if (!firestoreDb) {
      console.error('Firestore not initialized');
      return;
    }
    
    // Load English responses from Firestore
    const englishDoc = await getDoc(doc(firestoreDb, "chatbot_responses", "english"));
    if (englishDoc.exists()) {
      chatbotResponses.english = englishDoc.data();
      console.log('English responses loaded:', chatbotResponses.english);
    } else {
      console.error('English responses not found in Firestore');
    }
    
    // Load Tagalog responses from Firestore  
    const tagalogDoc = await getDoc(doc(firestoreDb, "chatbot_responses", "tagalog"));
    if (tagalogDoc.exists()) {
      chatbotResponses.tagalog = tagalogDoc.data();
      console.log('Tagalog responses loaded:', chatbotResponses.tagalog);
    } else {
      console.error('Tagalog responses not found in Firestore');
    }
    
  } catch (error) {
    console.error('Error loading chatbot responses:', error);
  }
}

// Detect language from user input
// Improved language detection
function detectLanguage(input) {
    const tagalogWords = [
        'po', 'opo', 'salamat', 'kumusta', 'magkano', 'saan', 'kailan', 
        'paano', 'bakit', 'ano', 'meron', 'wala', 'gusto', 'kelangan',
        'pwed', 'pwede', 'paki', 'lang', 'ba', 'naman', 'yata', 'mga',
        'ito', 'iyan', 'iyon', 'dito', 'diyan', 'doon', 'aking', 'ating',
        'natin', 'namin', 'ninyo', 'kanila', 'siya', 'sila', 'tayo', 'kami',
        'kayo', 'ako', 'ikaw', 'ka', 'ko', 'mo', 'niya', 'nila', 'pang', 'ng'
    ];

    const inputLower = input.toLowerCase();
    const words = inputLower.split(/\s+/);
    
    let tagalogCount = 0;
    let totalWords = 0;

    words.forEach(word => {
        if (word.length > 1) { // Only count words with more than 1 character
            totalWords++;
            if (tagalogWords.includes(word)) {
                tagalogCount++;
            }
        }
    });

    console.log('Language detection:', {
        input: input,
        tagalogCount: tagalogCount,
        totalWords: totalWords,
        ratio: tagalogCount / totalWords
    });

    // If at least 30% of words are Tagalog, consider it Tagalog
    if (totalWords > 0 && tagalogCount / totalWords >= 0.3) {
        return 'tagalog';
    }
    
    return currentLanguage;
}

// Normalize Taglish input to find matching keywords
function normalizeTaglishInput(input) {
  let normalizedInput = input.toLowerCase();
  
  const replacements = {
    'pano mag book': 'how to book',
    'pano mag schedule': 'how to book',
    'pano mag appointment': 'how to book',
    'saan location': 'where location',
    'ano oras': 'what time',
    'ano hours': 'what time',
    'kelan close': 'when close',
    'kelan open': 'when open',
    'magkano appointment': 'how much appointment',
    'pwed mag book': 'can book',
    'pwede mag book': 'can book',
    'gusto mag pa appointment': 'want appointment',
    'kelangan mag pa eye exam': 'need eye exam'
  };

  Object.keys(replacements).forEach(taglishPhrase => {
    if (normalizedInput.includes(taglishPhrase)) {
      normalizedInput = normalizedInput.replace(taglishPhrase, replacements[taglishPhrase]);
    }
  });

  return normalizedInput;
}

// Get bot response with Taglish support
function getBotResponse(input) {
  if (!languageSelected) {
    return "Please select a language first.";
  }
  
  if (!chatbotResponses[currentLanguage]) {
    return currentLanguage === 'english' 
      ? "I'm still loading my responses. Please try again in a moment."
      : "Naglo-load pa ang aking mga sagot. Pakisubukan muli sa ilang sandali.";
  }
  
  const normalizedInput = normalizeTaglishInput(input);
  const detectedLanguage = detectLanguage(input);
  const responses = chatbotResponses[detectedLanguage];
  
  let matches = [];

  // Search for matches in the detected language's responses
  for (const category in responses) {
    for (const keyword in responses[category]) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        matches.push({
          category: category,
          keyword: keyword,
          length: keyword.length,
          reply: responses[category][keyword],
          language: detectedLanguage
        });
      }
    }
  }

  // If no matches found in detected language, try the other language
  if (matches.length === 0 && detectedLanguage !== currentLanguage) {
    const otherLanguage = detectedLanguage === 'english' ? 'tagalog' : 'english';
    const otherResponses = chatbotResponses[otherLanguage];
    
    for (const category in otherResponses) {
      for (const keyword in otherResponses[category]) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          matches.push({
            category: category,
            keyword: keyword,
            length: keyword.length,
            reply: otherResponses[category][keyword],
            language: otherLanguage
          });
        }
      }
    }
  }

  if (matches.length === 0) {
    return detectedLanguage === 'english' 
      ? "Sorry, I don't understand. Could you rephrase that? You can ask about appointments, services, location, or hours."
      : "Paumanhin, hindi ko naiintindihan. Maaari mo bang baguhin ang iyong tanong? Puwede kang magtanong tungkol sa appointments, serbisyo, lokasyon, o oras.";
  }

  matches.sort((a, b) => b.length - a.length);
  const match = matches[0];

  const confirmLanguage = match.language || detectedLanguage;
  const confirm = confirmations[confirmLanguage][Math.floor(Math.random() * confirmations[confirmLanguage].length)];

  if (match.category === "greetings") {
    return match.reply;
  } else {
    return `${confirm}\n\n${match.reply}`;
  }
}

// Update language button event handlers in showLanguageSelection
function showLanguageSelection() {
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    const languageMessage = document.createElement("div");
    languageMessage.className = "chatbot-message bot";
    languageMessage.innerHTML = `
        <strong>Welcome to RCJ Optical! 👋</strong><br><br>
        <strong>Maligayang pagdating sa RCJ Optical! 👋</strong><br><br>
        Please choose your language / Mangyaring piliin ang iyong wika:
        <br><br>
        <em>You can also mix English and Tagalog! / Puwede ring paghaluin ang English at Tagalog!</em>
    `;
    chatMessages.appendChild(languageMessage);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "language-selection";
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "10px";
    buttonContainer.style.justifyContent = "center";

    const englishBtn = document.createElement("button");
    englishBtn.className = "language-btn english";
    englishBtn.innerHTML = "🇺🇸 English";
    englishBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectLanguage('english');
    };

    const tagalogBtn = document.createElement("button");
    tagalogBtn.className = "language-btn tagalog";
    tagalogBtn.innerHTML = "🇵🇭 Tagalog";
    tagalogBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectLanguage('tagalog');
    };

    buttonContainer.appendChild(englishBtn);
    buttonContainer.appendChild(tagalogBtn);
    chatMessages.appendChild(buttonContainer);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Select language
function selectLanguage(language) {
    currentLanguage = language;
    languageSelected = true;
    
    chatMessages.innerHTML = '';
    
    // Personalized welcome for logged-in users
    let welcomeMessages;
    
    if (isUserAuthenticated && isUserVerified) {
        welcomeMessages = {
            'english': `Welcome back, ${userName}! 👋 I'm RCJ Optical's virtual assistant.\n\n💻 **Website:** Information & Details\n📱 **Appointments:** Mobile App Only\n\nI can help you with:\n• <span class='clickable-link' data-page='services'>Our Services</span> 👁️\n• <span class='clickable-link' data-page='contact'>Location & Hours</span> 📍\n• Appointment Booking 📱\n\n<em>Feel free to mix English and Tagalog! 😊</em>`,
            'tagalog': `Maligayang pagbabalik, ${userName}! 👋 Ako ang virtual assistant ng RCJ Optical.\n\n💻 **Website:** Impormasyon at Mga Detalye\n📱 **Appointments:** Mobile App Lamang\n\nMaaari kitang tulungan sa:\n• <span class='clickable-link' data-page='services'>Ang Aming Mga Serbisyo</span> 👁️\n• <span class='clickable-link' data-page='contact'>Lokasyon at Oras</span> 📍\n• Pag-book ng Appointment 📱\n\n<em>Puwede mong paghaluin ang English at Tagalog! 😊</em>`
        };
    } else {
        welcomeMessages = {
            'english': "Hello! 👋 I'm RCJ Optical's virtual assistant.\n\n💻 **Website:** Information & Details\n📱 **Appointments:** Mobile App Only\n\nI can help you with:\n• <span class='clickable-link' data-page='services'>Our Services</span> 👁️\n• <span class='clickable-link' data-page='contact'>Location & Hours</span> 📍\n• Appointment Booking 📱\n\n<em>Feel free to mix English and Tagalog! 😊</em>",
            'tagalog': "Kumusta! 👋 Ako ang virtual assistant ng RCJ Optical.\n\n💻 **Website:** Impormasyon at Mga Detalye\n📱 **Appointments:** Mobile App Lamang\n\nMaaari kitang tulungan sa:\n• <span class='clickable-link' data-page='services'>Ang Aming Mga Serbisyo</span> 👁️\n• <span class='clickable-link' data-page='contact'>Lokasyon at Oras</span> 📍\n• Pag-book ng Appointment 📱\n\n<em>Puwede mong paghaluin ang English at Tagalog! 😊</em>"
        };
    }
    
    appendMessage(welcomeMessages[language], "bot");
    generateSuggestions();
}

// Generate a guest ID for anonymous users
function generateGuestId() {
    return 'guest_' + Math.random().toString(36).substr(2, 9);
}

// Create support ticket - FIXED VERSION
async function createSupportTicket(userMessage) {
    try {
        // Check if user is authenticated, verified, and mobile-registered
        if (!isUserAuthenticated) {
            showMobileRegistrationPrompt();
            return false;
        }
        
        if (!isUserVerified) {
            showVerificationReminder();
            return false;
        }
        
        console.log('Creating support ticket for verified mobile user:', userName);
        
        const supportTicket = {
            userId: currentUserId,
            userName: userName,
            userEmail: userEmail,
            issueType: "General Inquiry",
            status: "pending",
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            messages: [
                {
                    sender: "user",
                    content: userMessage, // Store raw message, not formatted
                    timestamp: new Date().toISOString(),
                    messageType: "text"
                }
            ],
            adminId: null,
            adminName: null,
            userType: "mobile_registered"
        };

        const docRef = await addDoc(collection(firestoreDb, "supportTickets"), supportTicket);
        currentTicketId = docRef.id;
        console.log('Support ticket created with raw message:', userMessage);
        
        return true;
    } catch (error) {
        console.error('Error creating support ticket:', error);
        appendMessage("Sorry, there was an error connecting to support. Please try again later.", "system");
        return false;
    }
}

// In chatbot.js - update the sendMessageToAdmin function
// In the sendMessageToAdmin function, update how messages are created:
async function sendMessageToAdmin(message) {
    if (!currentTicketId) return;

    try {
        // **FIX: Store only the raw message content, not formatted**
        const userMessage = {
            sender: "user",
            content: message, // Store only the raw message
            timestamp: new Date().toISOString(),
            messageType: "text"
        };

        const ticketRef = doc(firestoreDb, "supportTickets", currentTicketId);
        const ticketSnap = await getDoc(ticketRef);
        
        if (ticketSnap.exists()) {
            const ticketData = ticketSnap.data();
            const updatedMessages = [...(ticketData.messages || []), userMessage];
            
            await updateDoc(ticketRef, {
                messages: updatedMessages,
                lastActivity: new Date().toISOString(),
                status: "active"
            });
            
            console.log('Raw message sent to admin:', message);
        }
    } catch (error) {
        console.error('Error sending message to admin:', error);
        appendMessage("Failed to send message. Please try again.", "system");
    }
}

// Show admin support suggestion (with mobile registration check)
function showAdminSupportSuggestion() {
    const suggestionMessage = `
        I couldn't find a specific answer for that. Would you like to connect with a live support agent for more help?
        
        <div class="admin-suggestion-buttons" style="margin-top: 10px;">
            <button class="quick-reply live-support" onclick="requestLiveSupport()">
                👥 Connect to Live Support
            </button>
            <button class="quick-reply continue-bot" onclick="continueWithBot()">
                🤖 Continue with Chatbot
            </button>
        </div>
        
        <div style="margin-top: 10px; font-size: 0.8rem; color: #666;">
            <i class="fas fa-info-circle"></i>
            Live support requires mobile app registration & email verification
        </div>
    `;
    
    appendMessage(suggestionMessage, "bot");
}

// Show live chat interface with admin styling
function showLiveChatInterface() {
    // Change the header to show live support
    const header = document.querySelector('.chatbot-header h4');
    const subheader = document.querySelector('.chatbot-header p');
    
    if (header) header.textContent = "RCJ Optical - Live Support";
    if (subheader) subheader.textContent = "Connected with support agent";
    
    // Update status indicator
    const existingStatus = document.querySelector('.live-support-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'live-support-status';
    statusIndicator.innerHTML = '🟢 Live Support Active - You\'re chatting with our support team';
    
    const headerElement = document.querySelector('.chatbot-header');
    if (headerElement) {
        headerElement.appendChild(statusIndicator);
    }
    
    // Add a welcome message from the system
    appendMessage("You are now connected with our support team. Please describe your issue and we'll assist you shortly.", "system");
}

function listenForAdminResponses() {
    if (!currentTicketId) return;

    console.log('Listening for admin responses on ticket:', currentTicketId);
    
    const ticketRef = doc(firestoreDb, "supportTickets", currentTicketId);
    
    let lastMessageCount = 0;
    
    const unsubscribe = onSnapshot(ticketRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const ticketData = docSnapshot.data();
            console.log('Ticket update received:', ticketData);
            
            // Check if admin joined
            if (ticketData.adminId && !isAdminConnected) {
                isAdminConnected = true;
                appendMessage(`Admin ${ticketData.adminName} has joined the chat and will assist you.`, "system");
                showLiveChatInterface();
            }

            // Then update the message processing part:
            if (ticketData.messages && Array.isArray(ticketData.messages)) {
                console.log(`Total messages: ${ticketData.messages.length}, Last processed: ${lastProcessedMessageCount}`);
                
                // If we have new messages
                if (ticketData.messages.length > lastProcessedMessageCount) {
                    const newMessages = ticketData.messages.slice(lastProcessedMessageCount);ticketData.messages
                    console.log('New messages to process:', newMessages.length);
                    
                    newMessages.forEach((message, index) => {
                        console.log(`Processing message ${lastProcessedMessageCount + index}:`, {
                            sender: message.sender,
                            content: message.content,
                            timestamp: message.timestamp
                        });
                        
                        // Only process messages that aren't from the current user
                        if (message.sender === "admin" && message.content) {
                            console.log('Displaying admin message:', message.content);
                            appendMessage(message.content.trim(), "admin");
                        } else if (message.sender === "system" && message.content) {
                            console.log('Displaying system message:', message.content);
                            appendMessage(message.content.trim(), "system");
                        }
                        // Note: user messages are handled by sendMessage function
                    });
                    
                    // Update the last processed count
                    lastProcessedMessageCount = ticketData.messages.length;
                }
            }

            // Check if resolved
            if (ticketData.status === "resolved") {
                appendMessage("Support session has been completed. Thank you for contacting RCJ Optical support!", "system");
                isAdminConnected = false;
                currentTicketId = null;
                showNormalChatInterface();
                unsubscribe(); // Stop listening
            }
        }
    }, (error) => {
        console.error('Error listening for admin responses:', error);
    });
}

// Show normal chat interface
function showNormalChatInterface() {
    // Restore normal header
    const header = document.querySelector('.chatbot-header h4');
    const subheader = document.querySelector('.chatbot-header p');
    const statusIndicator = document.querySelector('.live-support-status');
    
    if (header) header.textContent = "RCJ Optical Assistant";
    if (subheader) subheader.textContent = "How can we help you today?";
    if (statusIndicator) statusIndicator.remove();
}

// Global function for live support request
window.requestLiveSupport = async function(event) {
    // Prevent event from interfering
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const lastUserMessage = userInput.value.trim() || 
                           Array.from(chatMessages.querySelectorAll('.chatbot-message.user'))
                                .pop()?.textContent;
    
    if (lastUserMessage) {
        // Check authentication first
        if (!isUserAuthenticated) {
            showMobileRegistrationPrompt();
            return;
        }
        
        // Check verification
        if (!isUserVerified) {
            showVerificationReminder();
            return;
        }
        
        appendMessage("🔄 Connecting you with a live support agent...", "system");
        
        // Reset message count when starting new support session
        lastProcessedMessageCount = 0;
        
        const success = await createSupportTicket(lastUserMessage);
        if (success) {
            appendMessage("Support request sent! An admin will join the chat shortly. Please wait...", "system");
            listenForAdminResponses();
        } else {
            appendMessage("Sorry, there was an error connecting to support. Please try again later.", "system");
        }
    }
};

window.continueWithBot = function(event) {
    // Prevent event from interfering
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    appendMessage("No problem! Feel free to ask me anything else. 😊", "bot");
};

window.continueWithBot = function() {
    appendMessage("No problem! Feel free to ask me anything else. 😊", "bot");
};

function sendMessage(text) {
    // Handle both string input and event objects
    let userText = '';
    
    if (typeof text === 'string') {
        userText = text.trim();
    } else if (text && text.target) {
        // It's an event object, get the value from input
        userText = userInput.value.trim();
    } else {
        // Fallback to input value
        userText = userInput.value.trim();
    }
    
    if (userText === "") return;
    
    console.log('Sending message:', {
        text: userText,
        currentLanguage: currentLanguage,
        languageSelected: languageSelected
    });
    
    appendMessage(userText, "user");
    userInput.value = "";

    // If in live support mode, send to admin
    if (isAdminConnected && currentTicketId) {
        sendMessageToAdmin(userText);
        return;
    }

    // Otherwise, process with chatbot
    const typingMsg = appendMessage("", "bot", true);

    setTimeout(async () => {
        typingMsg.remove();
        
        if (isAdminConnected && currentTicketId) {
            // If we switched to live support while typing, send to admin
            sendMessageToAdmin(userText);
        } else {
            const reply = getBotResponse(userText);
            
            console.log('Bot response:', {
                input: userText,
                response: reply,
                currentLanguage: currentLanguage
            });
            
            // Check if we should suggest live support
            if (reply.includes("Sorry, I don't understand") || 
                reply.includes("Paumanhin, hindi ko naiintindihan")) {
                appendMessage(reply, "bot");
                setTimeout(() => {
                    showAdminSupportSuggestion();
                }, 1000);
            } else {
                appendMessage(reply, "bot");
            }
        }
    }, 1500);
}

// Append message to chat with proper styling
function appendMessage(text, sender, isTyping = false) {
    const msg = document.createElement("div");
    msg.className = `chatbot-message ${sender}`;

    if (isTyping) {
        msg.innerHTML = `
            <div class="chatbot-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        msg.classList.add("typing");
    } else {
        // Clean up the text - remove extra whitespace and newlines
        let cleanText = text.trim().replace(/\n\s+/g, '\n');
        let formattedText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Add sender label for admin and system messages
        let senderLabel = '';
        if (sender === 'admin') {
            senderLabel = '<div class="message-sender">👨‍💼 Support Agent</div>';
        } else if (sender === 'system') {
            senderLabel = '<div class="message-sender">📢 System</div>';
        } else if (sender === 'user') {
            senderLabel = '<div class="message-sender">👤 You</div>';
        }
        
        msg.innerHTML = `
            ${senderLabel}
            <div class="message-content">${formattedText}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        
        // Add clickable links functionality
        setTimeout(() => {
            const clickableLinks = msg.querySelectorAll('.clickable-link');
            clickableLinks.forEach(link => {
                link.style.cursor = 'pointer';
                link.style.color = sender === 'user' || sender === 'admin' ? 'rgba(255, 255, 255, 0.9)' : '#007bff';
                link.style.textDecoration = 'underline';
                link.style.fontWeight = 'bold';
                link.addEventListener('click', handlePageNavigation);
            });
        }, 0);
    }

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    console.log(`Appended ${sender} message:`, text);
    return msg;
}
// Add this for testing - you can call it from browser console
window.forceCheckAdminMessages = function() {
    if (currentTicketId) {
        console.log('Manually checking for admin messages...');
        const ticketRef = doc(firestoreDb, "supportTickets", currentTicketId);
        getDoc(ticketRef).then(docSnapshot => {
            if (docSnapshot.exists()) {
                const ticketData = docSnapshot.data();
                console.log('Current ticket data:', ticketData);
                if (ticketData.messages) {
                    console.log('All messages:', ticketData.messages);
                    ticketData.messages.forEach((msg, index) => {
                        console.log(`Message ${index}:`, msg.sender, '-', msg.content);
                    });
                }
            }
        });
    } else {
        console.log('No current ticket ID');
    }
};

// Handle page navigation from clickable links
function handlePageNavigation(event) {
    const target = event.target;
    const page = target.getAttribute('data-page');
    
    if (page && pageRoutes[page]) {
        const confirmMessages = {
            'english': `Taking you to ${page.replace('-', ' ')}...`,
            'tagalog': `Dinadala ka sa ${page.replace('-', ' ')}...`
        };
        const confirmMsg = appendMessage(confirmMessages[currentLanguage], "bot");
        
        setTimeout(() => {
            window.location.href = pageRoutes[page];
        }, 1000);
    }
}
// Add this function to debug the Firestore connection
function debugFirestoreConnection() {
    console.log('Firestore debug info:', {
        firestoreDb: !!firestoreDb,
        currentTicketId: currentTicketId,
        isAdminConnected: isAdminConnected,
        isUserAuthenticated: isUserAuthenticated,
        isUserVerified: isUserVerified
    });
    
    // Test Firestore connection
    if (firestoreDb) {
        const testRef = doc(firestoreDb, "supportTickets", "test");
        getDoc(testRef).catch(error => {
            console.log('Firestore connection test - expected error for non-existent doc:', error.message);
        });
    }
}

// Call this when initializing or when issues occur
 debugFirestoreConnection();

// Generate interactive suggestion buttons - FIXED VERSION
function generateSuggestions() {
    const sampleQuestions = {
        'english': [
            { text: "Appointment", keyword: "appointment" },
            { text: "Mobile App", keyword: "mobile app" },
            { text: "Hours", keyword: "hours" },
            { text: "Location", keyword: "location" },
            { text: "Services", keyword: "services" },
            { text: "Website", keyword: "website" }
        ],
        'tagalog': [
            { text: "Appointment", keyword: "appointment" },
            { text: "Mobile App", keyword: "mobile app" },
            { text: "Oras", keyword: "hours" },
            { text: "Lokasyon", keyword: "location" },
            { text: "Serbisyo", keyword: "services" },
            { text: "Website", keyword: "website" }
        ]
    };
    
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = "";
    
    const questions = sampleQuestions[currentLanguage];
    
    questions.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "quick-reply";
        btn.innerText = item.text;
        btn.onclick = (event) => {
            // Prevent the event from being passed as text
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Quick reply clicked:', {
                text: item.keyword,
                currentLanguage: currentLanguage
            });
            
            // Send the keyword directly, not the event
            sendMessage(item.keyword);
            
            // Visual feedback
            btn.style.backgroundColor = '#007bff';
            btn.style.color = 'white';
            setTimeout(() => {
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }, 300);
        };
        suggestionsContainer.appendChild(btn);
    });
}

// Setup event listeners
function setupEventListeners() {
    if (chatbotTrigger) {
        chatbotTrigger.addEventListener('click', async () => {
            console.log('Chatbot opened');
            if (chatbotContainer) {
                chatbotContainer.style.display = 'block';
                setTimeout(() => {
                    chatbotContainer.classList.add('active');
                }, 10);
                
                if (!chatbotResponses.english || !chatbotResponses.tagalog) {
                    await loadChatbotResponses();
                }
                
                if (!languageSelected) {
                    showLanguageSelection();
                }
            }
        });
    }

    if (closeChatbot) {
        closeChatbot.addEventListener('click', () => {
            console.log('Chatbot closed');
            if (chatbotContainer) {
                chatbotContainer.classList.remove('active');
                setTimeout(() => {
                    chatbotContainer.style.display = 'none';
                }, 300);
            }
        });
    }

    if (userInput) {
        userInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }
}

// Add this to your chatbot.js initialization
window.addEventListener('load', () => {
    console.log('Page loaded - initializing chatbot');
    
    // Check if Firestore is available
    if (typeof firestoreDb === 'undefined') {
        console.error('Firestore not initialized');
        appendMessage("Chat service is temporarily unavailable. Please refresh the page.", "system");
        return;
    }
    
    initializeDOMElements();
    setupEventListeners();
    loadChatbotResponses();
    checkAuthState();
});