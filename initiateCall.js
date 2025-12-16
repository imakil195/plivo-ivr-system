// initiateCall.js - Script to initiate outbound calls via Plivo

require('dotenv').config();
const plivo = require('plivo');
const readline = require('readline');

// Create Plivo client
const client = new plivo.Client(
  process.env.PLIVO_AUTH_ID,
  process.env.PLIVO_AUTH_TOKEN
);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(50));
console.log('   PLIVO IVR CALL INITIATOR');
console.log('='.repeat(50));
console.log();

// Function to make the call
async function makeCall(phoneNumber) {
  try {
    console.log(`\n📞 Initiating call to: ${phoneNumber}`);
    console.log('⏳ Please wait...\n');

    // Make the call
    const response = await client.calls.create(
      process.env.PLIVO_PHONE_NUMBER,      // From number (your Plivo number)
      phoneNumber,                          // To number (target)
      `${process.env.PUBLIC_URL}/answer`,   // Answer URL
      `${process.env.PUBLIC_URL}/answer`,   // Fallback URL
      {
        answerMethod: 'POST',
        hangupUrl: `${process.env.PUBLIC_URL}/hangup`,
        hangupMethod: 'POST'
      }
    );

    console.log('✅ Call initiated successfully!');
    console.log('📋 Call Details:');
    console.log(`   - Call UUID: ${response.requestUuid}`);
    console.log(`   - Message: ${response.message}`);
    console.log(`   - API ID: ${response.apiId}`);
    console.log();
    console.log('📱 The phone should start ringing shortly...');
    console.log('🎧 Follow the IVR prompts when you answer.');
    console.log();

  } catch (error) {
    console.error('❌ Error initiating call:');
    console.error(`   ${error.message}`);
    
    if (error.status) {
      console.error(`   Status Code: ${error.status}`);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check your .env file has correct credentials');
    console.log('   2. Ensure phone number includes country code (e.g., +1234567890)');
    console.log('   3. Verify the number is in your verified caller IDs (for trial accounts)');
    console.log('   4. Check if your ngrok tunnel is running');
    console.log('   5. Ensure PUBLIC_URL in .env matches your ngrok URL');
  }
}

// Validate phone number format
function isValidPhoneNumber(number) {
  // Basic validation: starts with + and has 10-15 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(number);
}

// Prompt user for phone number
function promptForNumber() {
  rl.question('Enter phone number (with country code, e.g., +919876543210): ', (phoneNumber) => {
    const trimmedNumber = phoneNumber.trim();
    
    if (!trimmedNumber) {
      console.log('❌ Phone number cannot be empty');
      rl.close();
      return;
    }

    if (!isValidPhoneNumber(trimmedNumber)) {
      console.log('❌ Invalid phone number format');
      console.log('💡 Use format: +[country code][number] (e.g., +919876543210 or +14155552671)');
      rl.close();
      return;
    }

    makeCall(trimmedNumber).finally(() => {
      rl.close();
    });
  });
}

// Check if required environment variables are set
function checkEnvironment() {
  const required = [
    'PLIVO_AUTH_ID',
    'PLIVO_AUTH_TOKEN',
    'PLIVO_PHONE_NUMBER',
    'PUBLIC_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n💡 Make sure your .env file is configured correctly');
    return false;
  }

  console.log('✅ Environment variables loaded');
  console.log(`   From Number: ${process.env.PLIVO_PHONE_NUMBER}`);
  console.log(`   Server URL: ${process.env.PUBLIC_URL}`);
  console.log();

  return true;
}

// Main execution
if (checkEnvironment()) {
  promptForNumber();
} else {
  rl.close();
  process.exit(1);
}