# Plivo IVR Demo

## Description
This project is a simple multi-level IVR system built using **Plivo Voice API** and **Node.js**.  
It demonstrates outbound calling, DTMF-based IVR navigation, audio playback, and call forwarding.

---

## IVR Flow

### Level 1: Language Selection
- Press 1 for English  
- Press 2 for Spanish  

### Level 2: Action Menu
- Press 1 to play an audio message  
- Press 2 to connect to a live associate  

Invalid inputs are handled by repeating the menu.

---

## Tech Stack
- Node.js
- Express.js
- Plivo Node SDK
- Plivo XML
- ngrok (for local webhook exposure)

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
PLIVO_AUTH_ID=your_auth_id
PLIVO_AUTH_TOKEN=your_auth_token
PLIVO_FROM_NUMBER=+1XXXXXXXXXX
ASSOCIATE_NUMBER=+91XXXXXXXXXX
BASE_URL=https://your-ngrok-url.ngrok-free.app
PORT=3000
3. Run the Server
node server.js

4. Expose Server Using ngrok
ngrok http 3000


Update BASE_URL in .env with the ngrok HTTPS URL.

How to Test

Trigger an outbound call:

curl -X POST http://localhost:3000/make-call \
-d "to=+91XXXXXXXXXX"


Answer the call and navigate through the IVR menus.

Features Demonstrated

Outbound call using Plivo API

Multi-level IVR using Plivo XML

DTMF input handling

Audio playback

Call forwarding to an associate

Notes

Audio files are publicly hosted for demo purposes

Associate number can be a placeholder or test number

Author

Akil S



