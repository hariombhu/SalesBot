// main.js — Enhanced ZohoBot for Hackathon
// Features: Server-Side Intelligence, Voice, Confetti, Proactive Engagement.

(function () {
    const MESSAGE_KEY = 'zobot_messages_v4';

    // Elements
    const botRoot = document.getElementById('zobot');
    const toggle = botRoot.querySelector('.zobot-toggle');
    const windowEl = botRoot.querySelector('.zobot-window');
    const closeBtn = botRoot.querySelector('.zobot-close');
    const messagesEl = botRoot.querySelector('.zobot-messages');
    const form = botRoot.querySelector('.zobot-form');
    const input = botRoot.querySelector('.zobot-input');
    const quickReplies = botRoot.querySelectorAll('.zobot-quick-replies button');

    // Voice & Upload Elements
    const voiceBtn = document.getElementById('zobot-voice');
    const fileInput = document.getElementById('zobot-file');
    const uploadBtn = document.getElementById('zobot-upload');

    // Dashboard Elements
    const dashboard = document.getElementById('dashboard');
    const dashToggleBtn = document.getElementById('toggle-dashboard');
    const dashIntent = document.getElementById('dash-intent');
    const dashSentiment = document.getElementById('dash-sentiment');
    const dashSentimentFill = document.getElementById('dash-sentiment-fill');
    const dashScore = document.getElementById('dash-score');
    const dashReason = document.getElementById('dash-reason');

    let isVoiceActive = false;
    let recognition = null;
    let synth = window.speechSynthesis;

    // State for Escalation Flow
    let awaitingEscalation = false;

    // Generate a random session ID for this page load
    const sessionId = localStorage.getItem('zobot_sessionId') || 'sess_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('zobot_sessionId', sessionId);
    console.log('Bot Session:', sessionId);

    // API base: prefer localhost during development or file:// pages
    const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:') ? 'http://localhost:3000' : window.location.origin;

    function init() {
        setupVoice();
        setupDashboard();
        // Only show history if user explicitly enabled it
        const showHistory = localStorage.getItem('zobot_showHistory') === 'true';
        if (showHistory) {
            renderHistory();
        } else {
            // Clear messages on fresh page load
            messagesEl.innerHTML = '';
            localStorage.removeItem(MESSAGE_KEY);
        }
        updateHistoryBtn();

        // Proactive Greeting (Advanced Feature)
        setTimeout(() => {
            if (getMessages().length === 0 && windowEl.getAttribute('aria-hidden') === 'true') {
                const toast = document.createElement('div');
                toast.textContent = "👋 Hi! Can I help you increase sales?";
                toast.style.cssText = "position:absolute; bottom:90px; right:20px; background:white; padding:10px 15px; border-radius:10px; box-shadow:0 5px 15px rgba(0,0,0,0.1); font-size:0.9rem; animation: float 3s ease-in-out infinite;";
                botRoot.appendChild(toast);
                toast.onclick = () => { toast.remove(); toggle.click(); };
                setTimeout(() => toast.remove(), 8000);
            }
        }, 3000);
    }

    function setupVoice() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            let recognitionRetries = 0;
            const MAX_RETRIES = 2;

            recognition.onstart = () => { 
                isVoiceActive = true; 
                voiceBtn.classList.add('voice-active');
                voiceBtn.title = 'Stop recording...';
                botSay('🎤 Listening... Please speak now', { type: 'info' });
                recognitionRetries = 0;
            };

            recognition.onend = () => { 
                isVoiceActive = false; 
                voiceBtn.classList.remove('voice-active');
                voiceBtn.title = 'Click to record voice message';
            };

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptSegment = event.results[i][0].transcript;
                    transcript += transcriptSegment;
                }
                
                if (event.isFinal && transcript.trim()) {
                    input.value = transcript.trim();
                    // Auto submit on final result
                    setTimeout(() => {
                        form.dispatchEvent(new Event('submit'));
                    }, 100);
                } else if (transcript.trim()) {
                    input.placeholder = `Heard: "${transcript}"...`;
                }
            };

            recognition.onerror = (event) => {
                isVoiceActive = false;
                voiceBtn.classList.remove('voice-active');
                let errorMsg = 'Voice input error. ';
                let shouldRetry = false;
                
                switch(event.error) {
                    case 'no-speech':
                        errorMsg += 'No speech detected. Please try again.';
                        shouldRetry = true;
                        break;
                    case 'audio-capture':
                        errorMsg += 'No microphone found. Please check your device.';
                        break;
                    case 'network':
                        errorMsg += 'Network error - check your internet connection and try again.';
                        shouldRetry = true;
                        break;
                    case 'permission-denied':
                        errorMsg += 'Microphone permission denied. Please allow access in browser settings.';
                        break;
                    case 'service-not-available':
                        errorMsg += 'Speech service unavailable. Ensure microphone is connected and try again.';
                        shouldRetry = true;
                        break;
                    default:
                        errorMsg += event.error;
                        shouldRetry = true;
                }
                
                botSay(errorMsg, { type: 'error' });
                console.error('Speech recognition error:', event.error);
                
                // Auto-retry for transient errors
                if (shouldRetry && recognitionRetries < MAX_RETRIES) {
                    recognitionRetries++;
                    setTimeout(() => {
                        if (isVoiceActive) {
                            try {
                                recognition.start();
                            } catch (err) {
                                console.log('Retry failed:', err);
                            }
                        }
                    }, 2000);
                }
            };

            voiceBtn.style.display = 'block';
            voiceBtn.title = 'Click to record voice message';
            
            voiceBtn.addEventListener('click', (e) => { 
                e.preventDefault();
                e.stopPropagation();
                try {
                    if (isVoiceActive) {
                        recognition.stop();
                    } else {
                        input.placeholder = 'Listening... (requires internet for speech processing)';
                        recognition.start();
                    }
                } catch (err) {
                    console.error('Voice control error:', err);
                    botSay('Unable to access microphone. Please check permissions and try again.', { type: 'error' });
                }
            });
        } else {
            voiceBtn.style.display = 'none';
            console.warn('Speech Recognition API not supported in this browser');
        }
    }

    function setupDashboard() {
        if (dashToggleBtn) {
            dashToggleBtn.addEventListener('click', () => {
                const isHidden = dashboard.getAttribute('aria-hidden') === 'true';
                dashboard.setAttribute('aria-hidden', !isHidden);
                dashToggleBtn.textContent = !isHidden ? 'Show Live Intelligence' : 'Hide Live Intelligence';
            });
        }
        updateDashboard('Waiting...', 'Neutral', getLeadScore(), 'System Ready');
    }

    function updateDashboard(intent, sentiment, score, reason) {
        if (dashIntent) dashIntent.textContent = intent;
        if (dashSentiment) {
            dashSentiment.textContent = sentiment;
            const colors = { positive: '#4cea94', negative: '#ef4444', neutral: '#3b82f6' };
            dashSentimentFill.style.backgroundColor = colors[sentiment] || '#ccc';
            dashSentimentFill.style.width = sentiment === 'positive' ? '90%' : sentiment === 'negative' ? '10%' : '50%';
        }
        if (dashScore) dashScore.textContent = score;
        if (dashReason) {
            const log = `[${new Date().toLocaleTimeString()}] ${reason}\n`;
            dashReason.textContent = log + dashReason.textContent;
        }
    }

    function getMessages() { return JSON.parse(localStorage.getItem(MESSAGE_KEY) || '[]'); }
    function saveMessages(msgs) { localStorage.setItem(MESSAGE_KEY, JSON.stringify(msgs)); }
    function getLeadScore() { return Number(localStorage.getItem('zobot_score') || 0); }
    function setLeadScore(n) { localStorage.setItem('zobot_score', n); updateLeadBadge(n); }
    function updateLeadBadge(n) { const b = document.getElementById('lead-score-badge'); if (b) b.textContent = `Lead: ${n}`; }

    function addLeadScore(points, reason) {
        const n = getLeadScore() + points;
        setLeadScore(n);
        return n;
    }

    function addMessage(sender, text, opts = {}) {
        const msgs = getMessages();
        msgs.push({ sender, text, opts });
        saveMessages(msgs);
        renderMessage(sender, text, opts);
        if (sender === 'bot' && synth) synth.speak(new SpeechSynthesisUtterance(text));
    }

    function renderMessage(sender, text, opts = {}) {
        const div = document.createElement('div');
        div.className = `message ${sender} ${opts.type || ''}`;

        if (opts.html) div.innerHTML = opts.html; // Allow HTML for images/carousel
        else div.textContent = text;

        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderHistory() {
        messagesEl.innerHTML = '';
        getMessages().forEach(m => renderMessage(m.sender, m.text, m.opts));
        updateLeadBadge(getLeadScore());
    }

    function clearHistory() {
        localStorage.removeItem(MESSAGE_KEY);
        messagesEl.innerHTML = '';
        addMessage('bot', 'Welcome! Message history has been cleared. How can I help you today?', { type: 'info' });
    }

    function toggleHistoryVisibility() {
        const showHistory = localStorage.getItem('zobot_showHistory') === 'true';
        localStorage.setItem('zobot_showHistory', !showHistory);
        if (!showHistory) {
            renderHistory();
        } else {
            messagesEl.innerHTML = '';
        }
        updateHistoryBtn();
    }

    function updateHistoryBtn() {
        const historyBtn = document.getElementById('zobot-history-toggle');
        if (historyBtn) {
            const showHistory = localStorage.getItem('zobot_showHistory') === 'true';
            historyBtn.textContent = showHistory ? '📜' : '📜';
            historyBtn.title = showHistory ? 'Hide history' : 'Show history';
        }
    }

    function botSay(text, opts = {}) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot typing';
        typingIndicator.textContent = '...';
        messagesEl.appendChild(typingIndicator);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        setTimeout(() => {
            typingIndicator.remove();
            addMessage('bot', text, opts);
        }, 600);
    }

    // --- Advanced Features ---
    function triggerConfetti() {
        const end = Date.now() + 1000;
        const colors = ['#bb0000', '#ffffff'];
        (function frame() {
            // Simple confetti simulation using squares
            if (Date.now() > end) return;
            const c = document.createElement('div');
            c.style.cssText = `position:fixed; top:0; left:${Math.random() * 100}vw; width:10px; height:10px; background:${colors[Math.floor(Math.random() * 2)]}; z-index:10000; pointer-events:none;`;
            document.body.appendChild(c);
            let top = 0;
            const fall = setInterval(() => {
                top += 5;
                c.style.top = top + 'px';
                if (top > window.innerHeight) { clearInterval(fall); c.remove(); }
            }, 20);
            setTimeout(frame, 50);
        }());
    }

    function renderProductCarousel() {
        const html = `
            <div style="display:flex; overflow-x:auto; gap:10px; padding:10px 0;">
                <div style="min-width:140px; border:1px solid #eee; border-radius:8px; padding:10px; text-align:center;">
                    <div style="font-weight:bold; color:#333;">Alpha Widget</div>
                    <div style="color:#0b5ed7; margin:5px 0;">$29</div>
                    <button onclick="document.querySelector('.zobot-input').value='Alpha Widget'; document.querySelector('.zobot-form').dispatchEvent(new Event('submit')); return false;" style="background:#0b5ed7; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">Select</button>
                </div>
                <div style="min-width:140px; border:1px solid #eee; border-radius:8px; padding:10px; text-align:center;">
                    <div style="font-weight:bold; color:#333;">Beta Pack</div>
                    <div style="color:#0b5ed7; margin:5px 0;">$79</div>
                    <button onclick="document.querySelector('.zobot-input').value='Beta Pack'; document.querySelector('.zobot-form').dispatchEvent(new Event('submit')); return false;" style="background:#0b5ed7; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">Select</button>
                </div>
            </div>`;
        return html;
    }

    // --- CORE SERVER INTELLIGENCE LOGIC ---
    async function handleUserMessage(text) {
        addMessage('user', text);

        // Escalation Flow: Check if we are waiting for contact details
        if (awaitingEscalation) {
            awaitingEscalation = false; // Reset state
            if (text.length < 5) {
                botSay("That doesn't look like a valid email or phone number. Please try again or click the Escalate icon to restart.", { type: 'info' });
                return;
            }
            botSay(`Thanks! I've captured your contact details (${text}). A senior agent has been notified.`, { type: 'success' });
            // Show escalation popup with executive ready to contact
            setTimeout(() => {
                showEscalationPopup(text);
            }, 1000);
            return;
        }

        // Image Upload Logic (Client Side handling before sending 'intent' to server)
        if (text.startsWith("I uploaded an image:")) {
            botSay("Scanning image...", { type: 'info' });
            setTimeout(() => {
                const html = `
                    <div style="margin-top:5px; display:flex; gap:5px;">
                        <button onclick="document.querySelector('.zobot-input').value='Find similar to buy'; document.querySelector('.zobot-form').dispatchEvent(new Event('submit'));" style="background:#0b5ed7; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;">🛍️ Find Similar (Buy)</button>
                        <button onclick="document.querySelector('.zobot-input').value='List this for sale'; document.querySelector('.zobot-form').dispatchEvent(new Event('submit'));" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;">💰 List Item (Sell)</button>
                    </div>
                `;
                botSay("Image analyzed! What would you like to do with this item?", { html });
            }, 1000);
            return;
        }

        // 1. Prepare Payload for Server
        const payload = {
            userMessage: text,
            sessionId: sessionId
        };

        try {
            // 2. Call External Server
            botSay("Thinking...", { type: 'typing' }); // Temporary feedback

            const res = await fetch(API_BASE + '/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Server responded with ' + res.status);

            const data = await res.json();

            // Remove typing indicator (last bot message if it is typing)
            const lastMsg = messagesEl.lastElementChild;
            if (lastMsg && lastMsg.classList.contains('typing')) lastMsg.remove();

            // 3. Process Response
            const { replyText, intent, action, leadScore } = data;

            // Update Dashboard with Server insights
            updateDashboard(
                intent ? intent.toUpperCase() : 'UNKNOWN',
                'Analyzed',
                leadScore,
                `Server Action: ${action ? action.type : 'None'}`
            );

            // Sync Lead Score
            if (leadScore) setLeadScore(leadScore);

            // Handle Actions
            const opts = {};
            if (action) {
                if (action.type === 'show_products') {
                    opts.html = renderProductCarousel();
                    triggerConfetti();
                }
                else if (action.type === 'prompt_upload') {
                    opts.type = 'info';
                    const btn = document.getElementById('zobot-upload');
                    if (btn) {
                        btn.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.4)";
                        setTimeout(() => btn.style.boxShadow = "none", 1500);
                    }
                }
                else if (action.type === 'support_mode') {
                    opts.type = 'empathy';
                }
            }

            botSay(replyText, opts);

        } catch (err) {
            console.error("Server Error:", err);
            // Fallback for Demo Safety if server is offline
            const lastMsg = messagesEl.lastElementChild;
            if (lastMsg && lastMsg.classList.contains('typing')) lastMsg.remove();

            botSay("I'm having trouble connecting to the brain server. Please ensure 'node demo_server.js' is running.", { type: 'error' });
        }
    }

    toggle.addEventListener('click', () => {
        const isHidden = windowEl.getAttribute('aria-hidden') === 'true';
        windowEl.setAttribute('aria-hidden', !isHidden);
        if (!isHidden) renderHistory();
    });

    if (closeBtn) closeBtn.addEventListener('click', () => windowEl.setAttribute('aria-hidden', 'true'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) { input.value = ''; handleUserMessage(text); }
    });

    quickReplies.forEach(btn => btn.addEventListener('click', () => handleUserMessage(btn.innerText)));
    document.querySelectorAll('.buy-now').forEach(btn => btn.addEventListener('click', () => {
        windowEl.setAttribute('aria-hidden', 'false');
        setTimeout(() => handleUserMessage(`I want to buy ${btn.dataset.product}`), 500);
    }));

    // FIXED UPLOAD LOGIC
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const imgHTML = `<img src="${ev.target.result}" style="max-width:100%; border-radius:8px;">`;
                addMessage('user', `I uploaded an image: ${f.name}`, { html: imgHTML });
                handleUserMessage(`I uploaded an image: ${f.name}`);
            };
            reader.readAsDataURL(f);
            fileInput.value = '';
        });
    }

    // FIXED: Escalate Button (Administrator Icon)
    const escalateBtn = document.getElementById('zobot-escalate');
    if (escalateBtn) {
        escalateBtn.addEventListener('click', () => {
            const html = `🚨 <b>Escalation Initiated</b><br>To connect you with the right senior agent, please share your <b>Phone Number</b> or <b>Email ID</b> below.`;
            addMessage('bot', 'Escalation initiated...', { html });
            // Set state to wait for input
            awaitingEscalation = true;
            // Focus input
            if (input) input.focus();
        });
    }

    // Show escalation popup with random executive
    function showEscalationPopup(contactInfo) {
        const executives = [
            'Sarah Johnson',
            'Michael Chen',
            'Emma Rodriguez',
            'James Wilson',
            'Priya Patel',
            'David Anderson',
            'Lisa Thompson',
            'Marcus Jackson'
        ];
        
        const randomExecutive = executives[Math.floor(Math.random() * executives.length)];
        
        const modal = document.getElementById('escalation-modal');
        const nameEl = document.getElementById('escalation-name');
        const textEl = document.getElementById('escalation-text');
        
        if (modal && nameEl) {
            nameEl.textContent = randomExecutive;
            textEl.textContent = `Your executive ${randomExecutive} is ready to contact you now. Initiate talk whenever you're free!`;
            modal.classList.add('show');
            
            // Add event listeners
            const closeBtn = modal.querySelector('.escalation-close');
            const initiateBtn = document.getElementById('escalation-initiate');
            const laterBtn = document.getElementById('escalation-later');
            
            if (closeBtn) {
                closeBtn.onclick = () => modal.classList.remove('show');
            }
            
            if (initiateBtn) {
                initiateBtn.onclick = () => {
                    addMessage('bot', `Great! ${randomExecutive} will reach out to you shortly at ${contactInfo}. Stay tuned! 📞`, { type: 'success' });
                    modal.classList.remove('show');
                    awaitingEscalation = false;
                };
            }
            
            if (laterBtn) {
                laterBtn.onclick = () => {
                    addMessage('bot', `Perfect! We've saved your contact details. ${randomExecutive} will contact you when you're ready.`, { type: 'info' });
                    modal.classList.remove('show');
                    awaitingEscalation = false;
                };
            }
        }
    }

    // FIXED: Footer Support Icon
    const supportBtn = document.getElementById('support-icon');
    if (supportBtn) {
        supportBtn.addEventListener('click', () => {
            windowEl.setAttribute('aria-hidden', 'false');
            toggle.click(); // Ensure it's open if using toggle logic or just set display
            // Since we use aria-hidden for state, just ensuring it's false is enough, but might need to scroll
            windowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            handleUserMessage("I need support");
        });
    }

    // FIXED: History Toggle Button
    const historyToggleBtn = document.getElementById('zobot-history-toggle');
    if (historyToggleBtn) {
        historyToggleBtn.addEventListener('click', () => {
            toggleHistoryVisibility();
        });
    }

    init();
})();
