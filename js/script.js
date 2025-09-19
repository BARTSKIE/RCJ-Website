document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav ul');
    
    menuToggle.addEventListener('click', function() {
        nav.classList.toggle('active');
        this.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });
    
    // Close mobile menu when clicking on a link
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            menuToggle.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });
    
    // Header scroll effect
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Smooth scrolling for all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== faqItem) {
                    item.classList.remove('active');
                }
            });
            
            // Toggle current item
            if (!isActive) {
                faqItem.classList.add('active');
            } else {
                faqItem.classList.remove('active');
            }
        });
    });
    
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // Simple validation
            if (!name || !email || !message) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Here you would typically send the form data to a server
            // For this template, we'll just show an alert
            alert(`Thank you, ${name}! Your message has been sent. We'll contact you within 24 hours.`);
            
            // Reset the form
            contactForm.reset();
        });
    }
    
    // Add active class to current page in navigation
    const currentPage = location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        
        if (currentPage === linkHref || 
            (currentPage === '' && linkHref === 'index.html')) {
            link.parentElement.classList.add('active');
        } else {
            link.parentElement.classList.remove('active');
        }
    });
    
    // ======================
    // Enhanced Chatbot
    // ======================
    const botResponses = {
        "hi": "Hello! 👋 Welcome to RCJ Optical Clinic. How can we assist you today?",
        "hello": "Hi there! Need help with eye exams, glasses, or contacts?",
        "hours": "Our clinic hours are:\n\nMon-Fri: 9AM - 7PM\nSat: 9AM - 5PM\nSun: Closed\n\nWe're happy to accommodate after-hours appointments for emergencies.",
        "appointment": "To schedule an appointment:\n1. Call us at 0956 347 8586\n2. Visit our online booking portal at rcjoptical.com/book\n3. Reply 'book' and I'll connect you with our scheduling team",
        "insurance": "We accept most major insurance plans including:\n- VSP\n- EyeMed\n- Medicare\n- Blue Cross Blue Shield\n- Aetna\n\nCall us to verify your specific coverage!",
        "location": "Our clinic is located at:\n\nPrimark Double L , Rodriguez, Philippines\n\nWe offer free parking and are ADA accessible.",
        "price": "Our comprehensive eye exam starts at $125. Glasses and contact lens prices vary based on your prescription and frame selection. Would you like pricing for a specific service?",
        "book": "Great! Let me connect you with our scheduling team. Please provide:\n1. Your full name\n2. Preferred date/time\n3. Reason for visit\n\nOr call us directly at 0956 347 8586",
        "default": "I'm still learning! For detailed assistance, please call us at 0956 347 8586 or visit rcjoptical.com. How else can I help?"
    };
    
    // DOM Elements
    const chatTrigger = document.querySelector('.chatbot-trigger');
    const chatContainer = document.querySelector('.chatbot-container');
    const chatHeader = document.querySelector('.chatbot-header');
    const chatMessages = document.querySelector('.chatbot-messages');
    const chatInput = document.querySelector('.chatbot-input input');
    const chatSendBtn = document.querySelector('.chatbot-input button');
    const closeBtn = document.querySelector('.close-chatbot');
    const quickReplies = document.querySelector('.chatbot-quick-replies');
    
    // Toggle Chat
    chatTrigger.addEventListener('click', () => {
        chatContainer.style.display = 'block';
        setTimeout(() => {
            chatContainer.classList.add('active');
        }, 10);
        chatTrigger.style.display = 'none';
        addBotMessage(botResponses.hi);
    });
    
    closeBtn.addEventListener('click', () => {
        chatContainer.classList.remove('active');
        setTimeout(() => {
            chatContainer.style.display = 'none';
            chatTrigger.style.display = 'flex';
        }, 300);
    });
    
    // Add Message to Chat
    function addMessage(text, isBot) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${isBot ? 'bot' : 'user'}`;
        
        // Add timestamp
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <p>${text.replace(/\n/g, '<br>')}</p>
            <span class="timestamp">${time}</span>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
    }
    
    // Simulate Bot "Typing"
    function addBotMessage(text) {
        setTimeout(() => {
            chatMessages.innerHTML += `
                <div class="chatbot-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Replace typing indicator with message after delay
            setTimeout(() => {
                document.querySelector('.chatbot-typing')?.remove();
                addMessage(text, true);
                
                // Suggest quick replies for certain responses
                if (text.includes('appointment')) {
                    updateQuickReplies(['What insurance do you accept?', 'What are your hours?', 'Where are you located?']);
                } else if (text.includes('insurance')) {
                    updateQuickReplies(['Book an appointment', 'Location', 'Emergency care']);
                }
            }, 1500);
        }, 500);
    }
    
    // Update quick reply buttons
    function updateQuickReplies(replies) {
        quickReplies.innerHTML = '';
        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply';
            btn.textContent = reply;
            btn.addEventListener('click', () => {
                chatInput.value = reply;
                sendMessage();
            });
            quickReplies.appendChild(btn);
        });
    }
    
    // Send Message
    function sendMessage() {
        const text = chatInput.value.trim();
        if (text) {
            addMessage(text, false);
            chatInput.value = '';
            
            // Bot response logic
            const lowerText = text.toLowerCase();
            let response = botResponses.default;
            
            if (lowerText.includes('hi') || lowerText.includes('hello')) {
                response = botResponses.hi;
            } else if (lowerText.includes('hour') || lowerText.includes('open') || lowerText.includes('close')) {
                response = botResponses.hours;
            } else if (lowerText.includes('appointment') || lowerText.includes('book') || lowerText.includes('schedule')) {
                response = botResponses.appointment;
            } else if (lowerText.includes('insurance') || lowerText.includes('cover') || lowerText.includes('vsp') || lowerText.includes('eyemed')) {
                response = botResponses.insurance;
            } else if (lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('directions') || lowerText.includes('map')) {
                response = botResponses.location;
            } else if (lowerText.includes('emergency') || lowerText.includes('urgent') || lowerText.includes('hurt')) {
                response = botResponses.emergency;
            } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('fee')) {
                response = botResponses.price;
            } else if (lowerText.includes('book')) {
                response = botResponses.book;
            }
            
            addBotMessage(response);
        }
    }
    
    // Event Listeners
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Initial quick replies
    updateQuickReplies(["Book an appointment", "Hours & location", "Insurance questions"]);
});