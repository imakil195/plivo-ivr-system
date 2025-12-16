# Plivo IVR System - Multi-Level Interactive Voice Response

A professional multi-level Interactive Voice Response (IVR) system built with Plivo Voice API, Node.js, and Express for the InspireWorks Forward Deployed Engineer assignment.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Complete Call Flow](#complete-call-flow)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Running the Application](#running-the-application)
- [Testing the System](#testing-the-system)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Assignment Requirements](#assignment-requirements)

---

## Overview

This IVR system demonstrates a complete implementation of an outbound calling system with interactive menus. Users can make calls that present callers with a two-level menu system: first selecting their language (English or Spanish), then choosing between hearing a message or speaking with an associate.

**Key Capabilities:**
- Programmatic outbound call initiation
- Two-level interactive menu system
- Multi-language support (English and Spanish)
- DTMF (phone keypad) input detection and processing
- Text-to-speech audio playback
- Call routing capabilities
- Error handling and input validation

---

## Features

### Core Functionality

1. **Outbound Calling**
   - Initiate calls via web interface, CLI, or REST API
   - Calls made from your Plivo number to verified numbers
   - Real-time status updates

2. **Multi-Level IVR Menus**
   - Level 1: Language selection (English/Spanish)
   - Level 2: Action selection (play message/transfer call)
   - Dynamic menu generation based on user choices

3. **Language Support**
   - English prompts with female voice
   - Spanish prompts with female voice
   - Language-specific messages throughout flow

4. **Input Handling**
   - DTMF tone detection (phone keypad presses)
   - Input validation (only accept valid options)
   - Automatic retry for invalid inputs
   - Timeout handling for no input

5. **Audio Playback**
   - Text-to-speech for all prompts
   - Custom company message
   - Language-appropriate voices

6. **Call Management**
   - Call transfer capability (demo mode included)
   - Graceful call termination
   - Comprehensive logging

---

## How It Works

### High-Level Process

The system operates through a series of HTTP webhooks between your server and Plivo's API:

**Step 1: Initiation**
User triggers a call through the web interface, CLI script, or API endpoint. The server validates the request and sends it to Plivo's API.

**Step 2: Call Connection**
Plivo receives the request and initiates an outbound call from your Plivo number to the target number. The phone starts ringing.

**Step 3: Answer Webhook**
When the call is answered, Plivo doesn't know what to do next, so it makes an HTTP POST request to your server's /answer endpoint asking for instructions.

**Step 4: XML Instructions**
Your server generates and returns XML instructions telling Plivo to play a welcome message and capture one digit of input (1 or 2) for language selection.

**Step 5: User Input Processing**
When the user presses a button, Plivo captures the DTMF tone and sends it to your /language endpoint. Your server processes this input.

**Step 6: Second Menu**
Based on the language choice, your server returns XML for the second menu in the appropriate language, asking the user to choose an action.

**Step 7: Action Execution**
When the user makes their final choice, your server returns XML that either plays an audio message or demonstrates call transfer functionality.

**Step 8: Call Termination**
After the final action completes, the call ends and Plivo notifies your /hangup endpoint with call details (duration, status, etc.).

### Technical Details

**Webhook Pattern:**
Every interaction follows this pattern:
1. Event occurs (call answered, digit pressed, etc.)
2. Plivo sends HTTP POST to your server
3. Server processes request and generates XML
4. Plivo receives XML and executes instructions
5. Repeat until call ends

**Why ngrok is Required:**
Plivo's servers need to send webhooks to your server, but your server runs on localhost which is not accessible from the internet. ngrok creates a secure tunnel that gives you a public HTTPS URL that forwards to your localhost, allowing Plivo to reach your server.

**State Management:**
Since HTTP is stateless, the call state is managed through:
- URL parameters (e.g., /action?lang=1)
- Plivo's built-in call tracking (CallUUID)
- Sequential webhook calls

---

## System Architecture

### Component Overview

**1. Express Server (server.js)**
- Web server that handles incoming webhooks from Plivo
- Generates dynamic XML responses based on call state
- Implements business logic for menu navigation
- Provides endpoints for call initiation

**2. Plivo API**
- Cloud telephony platform
- Makes actual phone calls
- Processes DTMF input
- Executes XML instructions
- Manages call state

**3. ngrok Tunnel**
- Secure tunnel from internet to localhost
- Provides public HTTPS URL
- Required for Plivo webhooks to reach your server
- Free tier sufficient for development

**4. Web Interface (public/index.html)**
- Simple HTML form for call initiation
- JavaScript for API communication
- Real-time status updates
- User-friendly error messages

**5. CLI Script (initiateCall.js)**
- Command-line alternative to web interface
- Direct Plivo API integration
- Useful for testing and automation

### Data Flow Diagram

```
[User Browser] --HTTP POST--> [Your Server (Express)]
                                      |
                                      | Plivo API Call
                                      v
                                [Plivo Cloud API]
                                      |
                                      | SIP/Phone Network
                                      v
                                [Target Phone]
                                      |
                                      | Answers Call
                                      v
                                [Plivo Cloud API]
                                      |
                                      | HTTP POST (via ngrok)
                                      v
[Internet] <--ngrok tunnel--> [Your Server]
                                      |
                                      | Returns XML
                                      v
                                [Plivo Cloud API]
                                      |
                                      | Executes Instructions
                                      v
                                [Plays Audio to Caller]
                                      |
                                      | User Presses Button
                                      v
                                [Captures DTMF]
                                      |
                                      | HTTP POST with Digits
                                      v
                                [Your Server]
                              (process repeats)
```

### Request Flow Sequence

```
1. POST /make-call
   User → Server
   Body: { phoneNumber: "+919876543210" }
   
2. Plivo API Call
   Server → Plivo API
   Parameters: from, to, answer_url
   
3. Call Initiated
   Plivo → Phone Network
   Status: Ringing
   
4. POST /answer (when answered)
   Plivo → Server (via ngrok)
   Body: CallUUID, From, To, CallStatus
   
5. XML Response (Level 1 Menu)
   Server → Plivo
   Content: <GetDigits> with language menu
   
6. POST /language (after digit pressed)
   Plivo → Server
   Body: Digits=1, CallUUID
   
7. XML Response (Level 2 Menu)
   Server → Plivo
   Content: <GetDigits> with action menu
   
8. POST /action (after second digit)
   Plivo → Server
   Body: Digits=1, lang=1
   
9. XML Response (Final Action)
   Server → Plivo
   Content: <Speak> message + <Hangup>
   
10. POST /hangup (call ends)
    Plivo → Server
    Body: Duration, EndTime, CallUUID
```

---

## Complete Call Flow

### Detailed Step-by-Step Flow

**STAGE 1: CALL INITIATION**

Action: User opens web interface at http://localhost:3000
- User sees phone number input field
- User enters: +919876543210
- User clicks "Initiate Call" button

Server Processing:
- Validates phone number format (must start with +)
- Checks if PLIVO_PHONE_NUMBER is configured
- Checks if PUBLIC_URL is configured
- Calls Plivo API: plivoClient.calls.create()

Plivo API Response:
- Returns: { requestUuid: "xxx", message: "call fired", apiId: "yyy" }
- Server returns success to browser
- Browser shows: "Call initiated successfully! Your phone should ring shortly."

Console Output:
```
📞 Initiating call to: +919876543210
   From: +918031274121
   Answer URL: https://abc123.ngrok-free.app/answer
✅ Call initiated successfully!
   Request UUID: 12345678-1234-1234-1234-123456789abc
```

Phone Network:
- Plivo dials +919876543210 from +918031274121
- Target phone starts ringing

---

**STAGE 2: CALL ANSWER - LEVEL 1 MENU**

Action: User answers the phone

Plivo Processing:
- Detects call was answered
- Makes HTTP POST request to: https://abc123.ngrok-free.app/answer
- Sends parameters: CallUUID, From, To, Direction, CallStatus

Server Processing (/answer endpoint):
1. Receives webhook from Plivo
2. Logs: "Call answered. Presenting Level 1 menu..."
3. Creates Plivo Response object
4. Adds GetDigits element with:
   - action: /language (where to send the digit)
   - numDigits: 1 (capture only one digit)
   - timeout: 10 seconds
   - validDigits: "12" (only 1 or 2 are valid)
5. Inside GetDigits, adds Speak element:
   - Text: "Welcome to Inspire Works. Please select your language. Press 1 for English. Press 2 for Spanish."
   - Language: en-US
   - Voice: WOMAN
6. Adds fallback Speak: "We did not receive any input. Goodbye."
7. Adds Hangup element
8. Converts to XML and returns to Plivo

Generated XML:
```xml
<Response>
  <GetDigits action="https://abc123.ngrok-free.app/language" 
             method="POST" 
             numDigits="1" 
             timeout="10" 
             retries="1" 
             validDigits="12">
    <Speak language="en-US" voice="WOMAN">
      Welcome to Inspire Works. Please select your language. 
      Press 1 for English. Press 2 for Spanish.
    </Speak>
  </GetDigits>
  <Speak language="en-US" voice="WOMAN">
    We did not receive any input. Goodbye.
  </Speak>
  <Hangup/>
</Response>
```

Plivo Processing:
- Receives XML
- Executes GetDigits instruction
- Plays text-to-speech audio to caller
- Waits for one digit of input (up to 10 seconds)

User Experience:
- Hears female voice: "Welcome to Inspire Works. Please select your language. Press 1 for English. Press 2 for Spanish."
- Has 10 seconds to press a button
- If presses 1 or 2: proceeds to next stage
- If presses other digit: repeats menu
- If no input: hears "We did not receive any input. Goodbye." and call ends

Console Output:
```
📞 Call answered. Presenting Level 1 menu...
   Call UUID: 12345678-1234-1234-1234-123456789abc
   From: +919876543210
   To: +918031274121
   Sending XML: <Response>...</Response>
```

---

**STAGE 3: LANGUAGE PROCESSING - LEVEL 2 MENU**

Action: User presses button 1 (English)

Plivo Processing:
- Detects DTMF tone for digit "1"
- Validates it's in validDigits list ("12")
- Makes HTTP POST request to: https://abc123.ngrok-free.app/language
- Sends parameters: Digits=1, CallUUID, From, To

Server Processing (/language endpoint):
1. Receives webhook with Digits parameter
2. Extracts digit: const digit = req.body.Digits; // "1"
3. Logs: "Language selected: 1"
4. Validates input:
   - If digit === "1": English selected
   - If digit === "2": Spanish selected
   - If neither: returns error XML
5. Sets language variables:
   - language = "en-US"
   - languageName = "English"
6. Logs: "Language confirmed: English"
7. Creates Response with GetDigits for Level 2:
   - action: /action?lang=1 (includes language choice)
   - Captures one digit for action selection
8. Adds appropriate Speak based on language:
   - English: "Press 1 to hear a message. Press 2 to speak with an associate."
   - Spanish: "Presione 1 para escuchar un mensaje. Presione 2 para hablar con un asociado."
9. Adds fallback and Hangup
10. Returns XML to Plivo

Generated XML (English):
```xml
<Response>
  <GetDigits action="https://abc123.ngrok-free.app/action?lang=1" 
             method="POST" 
             numDigits="1" 
             timeout="10" 
             retries="1" 
             validDigits="12">
    <Speak language="en-US" voice="WOMAN">
      Press 1 to hear a message. Press 2 to speak with an associate.
    </Speak>
  </GetDigits>
  <Speak language="en-US" voice="WOMAN">
    No input received. Goodbye.
  </Speak>
  <Hangup/>
</Response>
```

Generated XML (if Spanish was selected):
```xml
<Response>
  <GetDigits action="https://abc123.ngrok-free.app/action?lang=2" 
             method="POST" 
             numDigits="1" 
             timeout="10" 
             retries="1" 
             validDigits="12">
    <Speak language="es-ES" voice="WOMAN">
      Presione 1 para escuchar un mensaje. Presione 2 para hablar con un asociado.
    </Speak>
  </GetDigits>
  <Speak language="es-ES" voice="WOMAN">
    No se recibió entrada. Adiós.
  </Speak>
  <Hangup/>
</Response>
```

User Experience:
- Hears: "Press 1 to hear a message. Press 2 to speak with an associate."
- Has 10 seconds to press 1 or 2

Console Output:
```
🌐 Language selected: 1
   Language confirmed: English
   Presenting Level 2 menu...
```

---

**STAGE 4: ACTION EXECUTION - OPTION 1 (AUDIO MESSAGE)**

Action: User presses button 1 (hear message)

Plivo Processing:
- Detects DTMF tone for digit "1"
- Makes HTTP POST to: https://abc123.ngrok-free.app/action?lang=1
- Sends parameters: Digits=1, CallUUID

Server Processing (/action endpoint):
1. Receives webhook
2. Extracts digit from body: req.body.Digits // "1"
3. Extracts language from query: req.query.lang // "1"
4. Determines language: lang === "1" ? "en-US" : "es-ES"
5. Logs: "Action selected: 1 (Language: English)"
6. Logs: "Playing audio message..."
7. Creates Response object
8. Adds Speak element with company message:
   - English: "Thank you for calling Inspire Works. We specialize in building innovative communication solutions. Have a great day!"
   - Spanish: "Gracias por llamar a Inspire Works. Nos especializamos en crear soluciones de comunicación innovadoras. Que tenga un buen día!"
9. Adds closing Speak: "Goodbye!" or "Adiós!"
10. Adds Hangup element
11. Returns XML to Plivo

Generated XML:
```xml
<Response>
  <Speak language="en-US" voice="WOMAN">
    Thank you for calling Inspire Works. We specialize in building 
    innovative communication solutions. Have a great day!
  </Speak>
  <Speak language="en-US" voice="WOMAN">
    Goodbye!
  </Speak>
  <Hangup/>
</Response>
```

Plivo Processing:
- Receives XML
- Plays first Speak message
- Plays goodbye message
- Executes Hangup
- Terminates call
- Sends hangup webhook to server

User Experience:
- Hears complete company message
- Hears goodbye
- Call ends automatically

Console Output:
```
🎬 Action selected: 1 (Language: English)
   🔊 Playing audio message...
```

---

**STAGE 4: ACTION EXECUTION - OPTION 2 (CALL TRANSFER)**

Action: User presses button 2 (speak with associate)

Plivo Processing:
- Detects DTMF tone for digit "2"
- Makes HTTP POST to: https://abc123.ngrok-free.app/action?lang=1
- Sends parameters: Digits=2, CallUUID

Server Processing (/action endpoint):
1. Receives webhook
2. Extracts: digit = "2", lang = "1"
3. Logs: "Action selected: 2 (Language: English)"
4. Logs: "Transferring to associate..."
5. Creates Response object
6. Adds Speak element with transfer message:
   - English: "Please wait while we connect you to an associate."
   - Spanish: "Espere mientras le conectamos con un asociado."
7. Adds demo mode message (explaining this is a demo)
8. In production, would add: response.addDial().addNumber(associateNumber)
9. Adds Hangup element
10. Returns XML to Plivo

Generated XML (Demo Mode):
```xml
<Response>
  <Speak language="en-US" voice="WOMAN">
    Please wait while we connect you to an associate.
  </Speak>
  <Speak language="en-US" voice="WOMAN">
    This is a demo system. In production, you would be connected 
    to a live associate now.
  </Speak>
  <Hangup/>
</Response>
```

Generated XML (Production Mode - when enabled):
```xml
<Response>
  <Speak language="en-US" voice="WOMAN">
    Please wait while we connect you to an associate.
  </Speak>
  <Dial>
    <Number>+1234567890</Number>
  </Dial>
  <Hangup/>
</Response>
```

User Experience:
- Hears: "Please wait while we connect you to an associate."
- Demo: Hears explanation about production mode
- Production: Would be connected to actual associate's phone
- Call ends

Console Output:
```
🎬 Action selected: 2 (Language: English)
   📞 Transferring to associate...
```

---

**STAGE 5: CALL TERMINATION**

Action: Call ends (after audio finishes or transfer completes)

Plivo Processing:
- Detects call has ended
- Records call details (duration, end time, etc.)
- Makes HTTP POST to: https://abc123.ngrok-free.app/hangup
- Sends parameters: Duration, EndTime, CallUUID, HangupCause

Server Processing (/hangup endpoint):
1. Receives webhook
2. Logs: "Call ended"
3. Logs call details: duration, end time, UUID
4. Returns 200 OK to Plivo
5. No XML needed (call already ended)

Console Output:
```
📴 Call ended
   Duration: 45 seconds
   End Time: 2024-12-16 10:30:00
   Call UUID: 12345678-1234-1234-1234-123456789abc
```

Plivo Processing:
- Updates call records
- Deducts call cost from account balance
- Call is complete

---

**ERROR HANDLING FLOWS**

**Scenario: Invalid Digit at Level 1**

User Action: Presses 9 (not 1 or 2)

Server Processing:
- Receives Digits=9 at /language endpoint
- Validates: digit !== "1" && digit !== "2"
- Creates error Response
- Adds Speak: "Invalid selection. Please try again."
- Adds Redirect to /answer (back to Level 1 menu)
- Returns XML

User Experience:
- Hears: "Invalid selection. Please try again."
- Hears Level 1 menu again
- Gets another chance to choose

**Scenario: Timeout (No Input)**

User Action: Doesn't press anything

Plivo Processing:
- Waits for timeout period (10 seconds)
- No input received
- Executes fallback instructions

User Experience:
- After 10 seconds of silence
- Hears: "We did not receive any input. Goodbye."
- Call ends automatically

---

## Prerequisites

### Software Requirements

**1. Node.js (v14.0.0 or higher)**
- JavaScript runtime that executes your server code
- Download from: https://nodejs.org/
- Verify installation: `node --version`

**2. npm (v6.0.0 or higher)**
- Package manager for installing dependencies
- Comes automatically with Node.js
- Verify installation: `npm --version`

**3. ngrok**
- Tunneling tool to expose localhost to internet
- Required for Plivo webhooks to reach your server
- Download from: https://ngrok.com/download
- Free tier is sufficient
- Verify installation: `ngrok --version`

**4. Git (optional but recommended)**
- Version control for code management
- Download from: https://git-scm.com/
- Verify installation: `git --version`

### Account Requirements

**1. Plivo Account**
- Sign up at: https://console.plivo.com/accounts/register/
- Free trial includes $10 credit (sufficient for testing)
- Requires email verification
- No credit card needed for trial

**2. Plivo Phone Number**
- Purchase from Plivo Console
- Cost: approximately $0.80/month
- Comes from trial credit
- Needed to make outbound calls

**3. Verified Phone Number**
- Trial accounts can only call verified numbers
- Verify your personal number via SMS/call
- Process takes 2 minutes
- Required before making test calls

**4. ngrok Account (recommended)**
- Free account at: https://dashboard.ngrok.com/signup
- Provides auth token for stable connections
- Optional but improves reliability

### System Requirements

- Operating System: Windows, macOS, or Linux
- RAM: 2GB minimum
- Disk Space: 100MB for project and dependencies
- Internet: Stable connection required
- Ports: 3000 (server) and 4040 (ngrok web UI) must be available

---

## Installation Steps

### Step 1: Clone or Download the Repository

**Option A: Clone with Git**
```bash
git clone https://github.com/YOUR_USERNAME/plivo-ivr-system.git
cd plivo-ivr-system
```

**Option B: Download ZIP**
1. Download ZIP from GitHub
2. Extract to your desired location
3. Open terminal and navigate to folder:
```bash
cd path/to/plivo-ivr-system
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This command installs:
- **express** (v4.18.2): Web server framework
- **plivo** (v4.58.1): Official Plivo SDK for Node.js
- **dotenv** (v16.3.1): Loads environment variables from .env file
- **body-parser** (v1.20.2): Parses incoming request bodies
- **nodemon** (v3.0.1 - dev only): Auto-restarts server on code changes

Expected output:
```
added 150 packages, and audited 151 packages in 15s
```

### Step 3: Set Up Plivo Account

**3.1 Create Account:**
- Go to: https://console.plivo.com/accounts/register/
- Fill in:  Email, Password, Phone Number
- Verify email address
- Log in to dashboard

**3.2 Get API Credentials:**
- Dashboard shows your Auth ID and Auth Token immediately
- Auth ID format: MAXXXXXXXXXXXXXXXXXX (20 characters)
- Auth Token: Long alphanumeric string
- IMPORTANT: Keep Auth Token secret (never commit to Git)

**3.3 Purchase Phone Number:**
- Click "Phone Numbers" in left sidebar
- Click "Buy Numbers"
- Select country (India: +91, US: +1, etc.)
- Choose number type (local/toll-free)
- Select a number
- Click "Buy" (costs ~$0.80/month from trial credit)
- Note the purchased number (e.g., +918031274121)

**3.4 Verify Your Personal Number:**
- Click "Phone Numbers" → "Verified Caller IDs"
- Click "Add New Number"
- Enter your mobile number with country code: +919876543210
- Select verification method: SMS or Voice Call
- Receive verification code
- Enter code in Plivo dashboard
- Wait for "Verified" status (appears immediately)
- Trial accounts can only call verified numbers

### Step 4: Configure Environment Variables

**4.1 Create .env file from template:**
```bash
cp .env.example .env
```

**4.2 Edit .env file:**

**On Mac/Linux:**
```bash
nano .env
```

**On Windows:**
```bash
notepad .env
```

**Or use any text editor (VS Code, Sublime, etc.)**

**4.3 Fill in your actual values:**

```bash
# Replace these with YOUR actual values from Plivo dashboard
PLIVO_AUTH_ID=MANZJJOGRLNZK0ZMZIMM
PLIVO_AUTH_TOKEN=NmU2ZmRhMjYtOTE1OS00YWRiLWJlNmEtNTIxYzUy
PLIVO_PHONE_NUMBER=+918031274121
TEST_PHONE_NUMBER=+919876543210
PORT=3000
PUBLIC_URL=https://temporary.ngrok-free.app
```

**Important notes:**
- NO spaces around = sign
- NO quotes around values
- PLIVO_PHONE_NUMBER: Use the number you purchased
- TEST_PHONE_NUMBER: Use your verified personal number
- PUBLIC_URL: Temporary for now (will update after starting ngrok)

**4.4 Save the file:**
- nano: Press Ctrl+X, then Y, then Enter
- notepad: Click File → Save
- Other editors: Use their save function

**4.5 Verify .env was created:**
```bash
ls -la | grep .env
```

Should show:
```
-rw-r--r--  1 user  group   256 Dec 16 10:00 .env
-rw-r--r--  1 user  group   512 Dec 16 09:00 .env.example
```

### Step 5: Set Up ngrok

**5.1 Download and Install ngrok:**

**Mac (using Homebrew):**
```bash
brew install ngrok
```

**Mac/Linux (manual):**
```bash
# Download
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Or download directly
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin
```

**Windows:**
1. Download from: https://ngrok.com/download
2. Extract ngrok.exe
3. Move to a folder in your PATH or use from download location

**5.2 Create ngrok account:**
- Go to: https://dashboard.ngrok.com/signup
- Sign up with email or GitHub
- Free account is sufficient

**5.3 Get auth token:**
- After signup, go to: https://dashboard.ngrok.com/get-started/your-authtoken
- Copy your auth token (looks like: 2abc...)

**5.4 Configure ngrok with your token:**
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Example:
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu
```

Expected output:
```
Authtoken saved to configuration file: /Users/yourname/.ngrok2/ngrok.yml
```

**5.5 Verify ngrok works:**
```bash
ngrok --version
```

Should show: `ngrok version 3.x.x`

### Step 6: Verify Installation

**Check all dependencies:**
```bash
node --version    # Should show v14.0.0 or higher
npm --version     # Should show v6.0.0 or higher
ngrok --version   # Should show v3.x.x
```

**Check project files:**
```bash
ls -l
```

Should show:
```
server.js
initiateCall.js
package.json
.env
.env.example
.gitignore
README.md
public/
node_modules/
```

**Check .env file (without exposing secrets):**
```bash
cat .env | grep -v TOKEN | grep -v AUTH_ID
```

Should show your phone numbers and PUBLIC_URL.

---

## Running the Application

### Complete Startup Sequence

You need THREE terminal windows open simultaneously. Follow this order:

---

### Terminal 1: Start ngrok (FIRST)

**Open first terminal window**

```bash
ngrok http 3000
```

**Expected output:**
```
ngrok                                                                    

Session Status                online                                    
Account                       your@email.com (Plan: Free)              
Version                       3.x.x                                     
Region                        India (in)                                
Latency                       78ms                                      
Web Interface                 http://127.0.0.1:4040                     
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:3000
                                     ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                     COPY THIS HTTPS URL

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**ACTION REQUIRED:**
1. Find the "Forwarding" line
2. Copy the HTTPS URL (example: https://abc123-def456.ngrok-free.app)
3. This is your PUBLIC_URL - save it for next step
4. **KEEP THIS TERMINAL RUNNING** - Do not close it!

**Troubleshooting ngrok:**
- If you see "connection refused": Server not running yet (normal at this stage)
- If you see "ERR_NGROK_108": Auth token not configured correctly
- If you see "ERR_NGROK_105": Account limit reached (create new account or upgrade)

---

### Terminal 2: Update .env and Start Server (SECOND)

**Open second terminal window**

**2.1 Navigate to project:**
```bash
cd ~/plivo-ivr-system
```

**2.2 Update .env with ngrok URL:**
```bash
nano
