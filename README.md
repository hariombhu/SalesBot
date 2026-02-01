Zoho Hackathon – AI Chatbot Demo
Overview
This project demonstrates a simple business website with an AI-powered chatbot integrated using Zoho SalesIQ.

The chatbot:

Assists users in real time
Answers FAQs
Captures leads
Integrates with Zoho CRM
Reduces manual customer support effort
Tech Stack
HTML5
CSS3
JavaScript
Zoho SalesIQ (Free Plan)
Project Structure
zoho-hackathon-chatbot/ │ ├── README.md │ ├── index.html │ ├── assets/ │ ├── css/ │ │ └── style.css │ │ │ ├── images/ │ │ └── hero.png (optional) │ │ └── js/ │ └── main.js │ └── docs/ └── architecture.png (optional, for hackathon submission)

Local Zobot (Built-in) — Enhanced Hackathon Edition
A lightweight local chatbot is included and appears as a chat icon at the bottom-right of the site. It is demo-focused, rule-based, and intentionally explainable for judges.

New features (implemented):

Smart Intent Detection (keyword + lightweight heuristics): categories include pricing, product_inquiry, demo_request, support, faq, and contact.
Dynamic Lead Scoring (explainable rules): points awarded for demo requests, pricing inquiries, contact requests, etc. Stored in localStorage under zobot_lead_score_v2 and visible in the chat header badge during demo.
Context-Aware Responses: remembers the last ~3 interactions to avoid repeating questions and to tailor follow-ups.
Sentiment-Based Escalation: detects negative words (example: "frustrated", "not working") and escalates tone and suggests human handover.
Auto Follow-Up Simulation: when the user provides an email, a simulated follow-up is scheduled (logged to localStorage key zobot_followups_v2 and shown as a simulated message in chat).
Explainability Mode (hidden): type why this answer (or explain) to reveal which intent was detected, why the response was chosen, and the current lead score — great for judges.
To test (demo script):

Open index.html and click the chat icon.
Ask a demo: "I want a demo" → bot will ask for your name → provide name → provide an email like alice@example.com → bot shows simulated follow-up after a moment and lead score increases.
Ask pricing: "What is your pricing?" → lead score increases and bot offers a quote.
Express frustration: "This feature is not working, I'm frustrated" → the bot uses an empathetic tone and offers to escalate to a human.
For judges: type why this answer to show the detection details and lead score.
Storage keys (for developers / judges):

zobot_messages_v2 — conversation log
zobot_leads_v2 — captured leads (demo-only)
zobot_lead_score_v2 — numeric lead score
zobot_followups_v2 — simulated follow-ups log
No paid services used: implementation is rule-based and stores demo data locally; it is fully compatible with the Zoho SalesIQ free widget (no premium features or paid ML APIs required).

New: Buy & Sell (Commerce) Flow ✅
The demo includes a simple Buy & Sell flow to showcase commerce interest and seller onboarding.
Buyers: start by clicking a product's Buy button or type "I want to buy". The bot will collect product, quantity, and email, simulate an order, and schedule a demo follow-up. Orders are saved as demo leads under zobot_leads_v2.
Sellers: click Sell in the chat or type "I want to sell" to provide product details and contact info. The bot will save a seller lead for follow-up.
Commerce flow increases lead scores (e.g., purchase interest and order completed), which is visible in the chat header.
Simulated Zoho API integration (CRM & Inventory)
To show judges what real integration would look like, the repo includes demo_server.js, a small Express server that simulates these endpoints:
POST /api/crm/createContact — payload example: { name, email, note }
POST /api/inventory/createOrder — payload example: { order }
POST /api/feedback — capture ratings/comments
This server is optional (the front-end works without it) but lets you demonstrate: "This payload would be sent to Zoho CRM / Zoho Inventory."
To run it locally: in the project root run npm install then npm start. The server writes demo logs to crm_contacts.json, inventory_orders.json, and feedback.json.
Notes on real Zoho integration: for production you would implement a secure server-side token exchange (Zoho OAuth), then call the Zoho REST APIs to create contacts or inventory items. This demo avoids storing any secrets on the client and keeps the hackathon free-tier friendly.
Customer Feedback (end of chat)
After key flows (order completed), the bot asks for a short rating (1–5) and an optional comment. Feedback is saved under zobot_feedbacks_v1 (localStorage) and sent to the demo server endpoint /api/feedback when available.
This is handy to show judges that the bot closes the loop on customer satisfaction during the demo.
Product image uploads (Buy or Sell)
During the conversation you can upload a picture of a product (click the 📎 upload button in the chat input). The bot will show a preview of the image, try to match it to the demo catalog using the image's filename heuristics, and either show pricing or offer to collect seller details.
When the demo server is running, images are saved to ./uploads and logged by the demo server (no external services used).
Demo steps:
Open the chat and click 📎 to upload an image of a product or click a product's Buy button.
If matched, the bot will show price and offer to buy; if unmatched, the bot will ask if you want to become a seller or request a price estimate.
The upload is optional and stored locally; you can show the uploads/ folder contents to judges when the demo server is running.
