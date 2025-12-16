// server.js - Main Express Server for Plivo IVR System

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const plivo = require('plivo');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Debug: Log environment variables on startup
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('PLIVO_AUTH_ID:', process.env.PLIVO_AUTH_ID ? 'Set ✓' : 'Missing ✗');
console.log('PLIVO_AUTH_TOKEN:', process.env.PLIVO_AUTH_TOKEN ? 'Set ✓' : 'Missing ✗');
console.log('PLIVO_PHONE_NUMBER:', process.env.PLIVO_PHONE_NUMBER);
console.log('PUBLIC_URL:', process.env.PUBLIC_URL);
console.log('===================================\n');

// Plivo Client (for making outbound calls)
const plivoClient = new plivo.Client(
  process.env.PLIVO_AUTH_ID,
  process.env.PLIVO_AUTH_TOKEN
);

// ============================================
// ENDPOINT 1: Initiate Outbound Call
// ============================================
app.post('/make-call', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required' 
      });
    }

    // Validate environment variables
    if (!process.env.PLIVO_PHONE_NUMBER) {
      console.error('❌ PLIVO_PHONE_NUMBER not set in .env');
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: PLIVO_PHONE_NUMBER not set' 
      });
    }

    if (!process.env.PUBLIC_URL) {
      console.error('❌ PUBLIC_URL not set in .env');
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: PUBLIC_URL not set' 
      });
    }

    console.log(`\n📞 Initiating call to: ${phoneNumber}`);
    console.log(`   From: ${process.env.PLIVO_PHONE_NUMBER}`);
    console.log(`   Answer URL: ${process.env.PUBLIC_URL}/answer`);

    // Make outbound call using Plivo API (CORRECTED FORMAT)
    const response = await plivoClient.calls.create(
      process.env.PLIVO_PHONE_NUMBER,  // from
      phoneNumber,                      // to
      `${process.env.PUBLIC_URL}/answer`, // answer_url
      {
        answerMethod: 'POST',
        hangupUrl: `${process.env.PUBLIC_URL}/hangup`,
        hangupMethod: 'POST'
      }
    );

    console.log('✅ Call initiated successfully!');
    console.log('   Request UUID:', response.requestUuid);
    console.log('   Message:', response.message);
    
    res.json({
      success: true,
      message: 'Call initiated successfully',
      callUuid: response.requestUuid,
      apiId: response.apiId
    });

  } catch (error) {
    console.error('❌ Error making call:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate call'
    });
  }
});

// ============================================
// ENDPOINT 2: Answer URL - Level 1 Menu (Language Selection)
// ============================================
app.post('/answer', (req, res) => {
  console.log('\n📞 Call answered. Presenting Level 1 menu...');
  console.log('   Call UUID:', req.body.CallUUID);
  console.log('   From:', req.body.From);
  console.log('   To:', req.body.To);

  // Create Plivo XML Response
  const response = plivo.Response();

  // GetDigits element for capturing user input
  const getDigits = response.addGetDigits({
    action: `${process.env.PUBLIC_URL}/language`,
    method: 'POST',
    numDigits: 1,
    timeout: 10,
    retries: 1,
    validDigits: '12'
  });

  // Speak the menu options
  getDigits.addSpeak(
    'Welcome to Inspire Works. Please select your language. Press 1 for English. Press 2 for Spanish.',
    { language: 'en-US', voice: 'WOMAN' }
  );

  // Fallback if no input received
  response.addSpeak(
    'We did not receive any input. Goodbye.',
    { language: 'en-US', voice: 'WOMAN' }
  );

  response.addHangup();

  // Send XML response
  const xmlResponse = response.toXML();
  console.log('   Sending XML:', xmlResponse);
  
  res.set('Content-Type', 'text/xml');
  res.send(xmlResponse);
});

// ============================================
// ENDPOINT 3: Language Selection Handler - Level 2 Menu
// ============================================
app.post('/language', (req, res) => {
  const digit = req.body.Digits;
  console.log(`\n🌐 Language selected: ${digit}`);

  const response = plivo.Response();

  // Validate input
  if (digit !== '1' && digit !== '2') {
    console.log('   ⚠️  Invalid language selection');
    response.addSpeak(
      'Invalid selection. Please try again.',
      { language: 'en-US', voice: 'WOMAN' }
    );
    response.addRedirect(`${process.env.PUBLIC_URL}/answer`);
    res.set('Content-Type', 'text/xml');
    return res.send(response.toXML());
  }

  // Determine language
  const language = digit === '1' ? 'en-US' : 'es-ES';
  const languageName = digit === '1' ? 'English' : 'Spanish';

  console.log(`   Language confirmed: ${languageName}`);
  console.log('   Presenting Level 2 menu...');

  // Level 2 Menu
  const getDigits = response.addGetDigits({
    action: `${process.env.PUBLIC_URL}/action?lang=${digit}`,
    method: 'POST',
    numDigits: 1,
    timeout: 10,
    retries: 1,
    validDigits: '12'
  });

  // Menu options based on language
  if (digit === '1') {
    // English menu
    getDigits.addSpeak(
      'Press 1 to hear a message. Press 2 to speak with an associate.',
      { language: 'en-US', voice: 'WOMAN' }
    );
  } else {
    // Spanish menu
    getDigits.addSpeak(
      'Presione 1 para escuchar un mensaje. Presione 2 para hablar con un asociado.',
      { language: 'es-ES', voice: 'WOMAN' }
    );
  }

  // Fallback
  response.addSpeak(
    digit === '1' ? 'No input received. Goodbye.' : 'No se recibió entrada. Adiós.',
    { language: language, voice: 'WOMAN' }
  );
  response.addHangup();

  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// ENDPOINT 4: Action Handler (Play Audio or Transfer Call)
// ============================================
app.post('/action', (req, res) => {
  const digit = req.body.Digits;
  const lang = req.query.lang || '1';
  const language = lang === '1' ? 'en-US' : 'es-ES';
  const languageName = lang === '1' ? 'English' : 'Spanish';

  console.log(`\n🎬 Action selected: ${digit} (Language: ${languageName})`);

  const response = plivo.Response();

  if (digit === '1') {
    // Play audio message
    console.log('   🔊 Playing audio message...');
    
    response.addSpeak(
      lang === '1' 
        ? 'Thank you for calling Inspire Works. We specialize in building innovative communication solutions. Have a great day!'
        : 'Gracias por llamar a Inspire Works. Nos especializamos en crear soluciones de comunicación innovadoras. Que tenga un buen día!',
      { language: language, voice: 'WOMAN' }
    );

    // Alternative: Play MP3 file (uncomment if you have a hosted audio file)
    // response.addPlay('https://your-domain.com/audio/message.mp3');

    response.addSpeak(
      lang === '1' ? 'Goodbye!' : 'Adiós!',
      { language: language, voice: 'WOMAN' }
    );
    response.addHangup();

  } else if (digit === '2') {
    // Transfer to associate
    console.log('   📞 Transferring to associate...');
    
    response.addSpeak(
      lang === '1'
        ? 'Please wait while we connect you to an associate.'
        : 'Espere mientras le conectamos con un asociado.',
      { language: language, voice: 'WOMAN' }
    );

    // For demo purposes, using a placeholder message
    response.addSpeak(
      'This is a demo system. In production, you would be connected to a live associate now.',
      { language: 'en-US', voice: 'WOMAN' }
    );

    // In production, uncomment and replace with actual number:
    // response.addDial().addNumber(process.env.ASSOCIATE_PHONE_NUMBER || '+1234567890');

    response.addHangup();

  } else {
    // Invalid selection
    console.log('   ⚠️  Invalid action selection');
    response.addSpeak(
      lang === '1' ? 'Invalid selection.' : 'Selección inválida.',
      { language: language, voice: 'WOMAN' }
    );
    response.addRedirect(`${process.env.PUBLIC_URL}/language`);
  }

  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// ENDPOINT 5: Invalid Input Handler
// ============================================
app.post('/invalid', (req, res) => {
  console.log('\n⚠️  Invalid input received');
  
  const response = plivo.Response();
  response.addSpeak(
    'Invalid input. Please try again.',
    { language: 'en-US', voice: 'WOMAN' }
  );
  response.addRedirect(`${process.env.PUBLIC_URL}/answer`);

  res.set('Content-Type', 'text/xml');
  res.send(response.toXML());
});

// ============================================
// ENDPOINT 6: Hangup Handler
// ============================================
app.post('/hangup', (req, res) => {
  console.log('\n📴 Call ended');
  console.log('   Duration:', req.body.Duration, 'seconds');
  console.log('   End Time:', req.body.EndTime);
  console.log('   Call UUID:', req.body.CallUUID);
  res.sendStatus(200);
});

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Plivo IVR Server is running',
    config: {
      port: PORT,
      plivoNumber: process.env.PLIVO_PHONE_NUMBER || 'Not configured',
      publicUrl: process.env.PUBLIC_URL || 'Not configured'
    },
    endpoints: {
      makeCall: 'POST /make-call',
      answer: 'POST /answer',
      language: 'POST /language',
      action: 'POST /action',
      invalid: 'POST /invalid',
      hangup: 'POST /hangup'
    }
  });
});

// ============================================
// Root endpoint - redirect to health or serve UI
// ============================================
app.get('/', (req, res) => {
  // If public/index.html exists, it will be served automatically
  // Otherwise, redirect to health endpoint
  res.redirect('/health');
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Plivo IVR Server Started Successfully!');
  console.log('='.repeat(50));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Public URL: ${process.env.PUBLIC_URL || 'NOT SET - Configure in .env'}`);
  console.log(`📞 Plivo Number: ${process.env.PLIVO_PHONE_NUMBER || 'NOT SET'}`);
  console.log('='.repeat(50));
  console.log('\n💡 Next steps:');
  console.log('   1. Make sure ngrok is running: ngrok http 3000');
  console.log('   2. Update PUBLIC_URL in .env with ngrok URL');
  console.log('   3. Test: http://localhost:3000');
  console.log('\n');
});