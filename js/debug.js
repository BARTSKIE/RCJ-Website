console.log('=== QUICK DEBUG ===');
        console.log('Chatbot container:', document.getElementById('chatbot-container'));
        console.log('Chatbot trigger:', document.getElementById('chatbot-trigger'));

        // Simple test
        const trigger = document.getElementById('chatbot-trigger');
        const container = document.getElementById('chatbot-container');

        if (trigger && container) {
            trigger.addEventListener('click', function() {
                console.log('✅ Chatbot button clicked!');
                container.style.display = 'block';
                setTimeout(() => {
                    container.classList.add('active');
                }, 10);
            });
        } else {
            console.log('❌ Problem found:');
            if (!trigger) console.log(' - Chatbot trigger button not found');
            if (!container) console.log(' - Chatbot container not found');
        }