import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvxPjQyEjn5_vIVgwGhOgAVlIkx5chnWE",
  authDomain: "rcj-firebase-database.firebaseapp.com",
  databaseURL: "https://rcj-firebase-database-default-rtdb.firebaseio.com",
  projectId: "rcj-firebase-database",
  storageBucket: "rcj-firebase-database.firebasestorage.app",
  messagingSenderId: "322419824007",
  appId: "1:322419824007:web:8c797773a13fae041caf22",
};

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Page routing configuration
const pageRoutes = {
  'home': 'index.html',
  'services': 'services.html',
  'contact': 'contact.html'
};

// DOM elements - with null checks
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

// Load responses from Firestore
async function loadChatbotResponses() {
  try {
    console.log('Loading chatbot responses from Firestore...');
    
    if (!db) {
      console.error('Firestore not initialized');
      return;
    }
    
    // Load English responses
    const englishDoc = await getDoc(doc(db, "chatbot_responses", "english"));
    if (englishDoc.exists()) {
      chatbotResponses.english = englishDoc.data();
      console.log('English responses loaded:', chatbotResponses.english);
    } else {
      console.error('English responses not found in Firestore');
    }
    
    // Load Tagalog responses
    const tagalogDoc = await getDoc(doc(db, "chatbot_responses", "tagalog"));
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
function detectLanguage(input) {
  const tagalogWords = [
    'po', 'opo', 'salamat', 'kumusta', 'magkano', 'saan', 'kailan', 
    'paano', 'bakit', 'ano', 'meron', 'wala', 'gusto', 'kelangan',
    'pwed', 'pwede', 'paki', 'lang', 'ba', 'naman', 'yata',
    'mga', 'ito', 'iyan', 'iyon', 'dito', 'diyan', 'doon', 'aking',
    'ating', 'natin', 'namin', 'ninyo', 'kanila', 'siya', 'sila', 'tayo',
    'kami', 'kayo', 'ako', 'ikaw', 'ka', 'ko', 'mo', 'niya', 'nila'
  ];

  const englishWords = input.toLowerCase().split(' ');
  let tagalogCount = 0;
  let englishCount = 0;

  englishWords.forEach(word => {
    if (tagalogWords.includes(word)) {
      tagalogCount++;
    } else if (word.length > 2) {
      englishCount++;
    }
  });

  if (tagalogCount > 0 && tagalogCount >= englishCount / 2) {
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
      if (normalizedInput.includes(keyword)) {
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
        if (normalizedInput.includes(keyword)) {
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
    return responses.general ? responses.general.fallback : 
           detectedLanguage === 'english' ? 
           "Sorry, I don't understand. Could you rephrase that? You can ask about appointments, services, location, or hours." : 
           "Paumanhin, hindi ko naiintindihan. Maaari mo bang baguhin ang iyong tanong? Puwede kang magtanong tungkol sa appointments, serbisyo, lokasyon, o oras.";
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

// Show language selection
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
    englishBtn.onclick = () => selectLanguage('english');

    const tagalogBtn = document.createElement("button");
    tagalogBtn.className = "language-btn tagalog";
    tagalogBtn.innerHTML = "🇵🇭 Tagalog";
    tagalogBtn.onclick = () => selectLanguage('tagalog');

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
  
  const welcomeMessages = {
    'english': "Hello! 👋 I'm RCJ Optical's virtual assistant.\n\n💻 **Website:** Information & Details\n📱 **Appointments:** Mobile App Only\n\nI can help you with:\n• <span class='clickable-link' data-page='services'>Our Services</span> 👁️\n• <span class='clickable-link' data-page='contact'>Location & Hours</span> 📍\n• Appointment Booking 📱\n\n<em>Feel free to mix English and Tagalog! 😊</em>",
    'tagalog': "Kumusta! 👋 Ako ang virtual assistant ng RCJ Optical.\n\n💻 **Website:** Impormasyon at Mga Detalye\n📱 **Appointments:** Mobile App Lamang\n\nMaaari kitang tulungan sa:\n• <span class='clickable-link' data-page='services'>Ang Aming Mga Serbisyo</span> 👁️\n• <span class='clickable-link' data-page='contact'>Lokasyon at Oras</span> 📍\n• Pag-book ng Appointment 📱\n\n<em>Puwede mong paghaluin ang English at Tagalog! 😊</em>"
  };
  
  appendMessage(welcomeMessages[language], "bot");
  generateSuggestions();
}

// Send message function
function sendMessage(text) {
  let userText = text || userInput.value.trim();
  if (userText === "") return;
  
  appendMessage(userText, "user");
  userInput.value = "";

  const typingMsg = appendMessage("", "bot", true);

  setTimeout(() => {
    typingMsg.remove();
    const reply = getBotResponse(userText);
    appendMessage(reply, "bot");
  }, 1500);
}

// Append message to chat
function appendMessage(text, sender, isTyping = false) {
  const msg = document.createElement("div");
  msg.className = "chatbot-message " + sender;

  if (isTyping) {
    msg.innerHTML = `<div class="chatbot-typing"><span></span><span></span><span></span></div>`;
    msg.classList.add("typing");
  } else {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    msg.innerHTML = formattedText;
    
    setTimeout(() => {
      const clickableLinks = msg.querySelectorAll('.clickable-link');
      clickableLinks.forEach(link => {
        link.style.cursor = 'pointer';
        link.style.color = '#007bff';
        link.style.textDecoration = 'underline';
        link.addEventListener('click', handlePageNavigation);
      });
    }, 0);
  }

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

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

// Generate interactive suggestion buttons
function generateSuggestions() {
  const sampleQuestions = {
    'english': [
      { text: "Appointment", page: null },
      { text: "Mobile App", page: null },
      { text: "Hours", page: "contact" },
      { text: "Location", page: "contact" },
      { text: "Services", page: "services" },
      { text: "Website", page: "home" }
    ],
    'tagalog': [
      { text: "Appointment", page: null },
      { text: "Mobile App", page: null },
      { text: "Oras", page: "contact" },
      { text: "Lokasyon", page: "contact" },
      { text: "Serbisyo", page: "services" },
      { text: "Website", page: "home" }
    ]
  };
  
  if (!suggestionsContainer) return;
  
  suggestionsContainer.innerHTML = "";
  
  sampleQuestions[currentLanguage].forEach(item => {
    const btn = document.createElement("button");
    btn.className = "quick-reply";
    btn.innerText = item.text;
    btn.onclick = () => {
      sendMessage(item.text.toLowerCase());
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

// Initialize when page loads
window.addEventListener('load', () => {
    console.log('Page loaded - initializing chatbot');
    initializeDOMElements();
    setupEventListeners();
    loadChatbotResponses();
});