import readline from 'readline';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID) || 0;
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
  console.error('❌ Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env file!');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('====================================================');
  console.log('📲 LINK YOUR PERSONAL TELEGRAM ACCOUNT (MTProto API)');
  console.log('====================================================\n');

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await askQuestion('📱 Enter your Telegram Mobile Number (with country code, e.g. +919876543210): '),
    password: async () => await askQuestion('🔑 Enter Two-Step Verification Password (if enabled, else press Enter): '),
    phoneCode: async () => await askQuestion('📩 Enter the 5-digit login code Telegram sent to your app: '),
    onError: (err) => console.error('Error during auth:', err),
  });

  console.log('\n✅ Successfully authenticated with your Personal Telegram Account!');
  const sessionString = client.session.save() as unknown as string;

  // Append or replace TELEGRAM_SESSION in .env
  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  if (envContent.includes('TELEGRAM_SESSION=')) {
    envContent = envContent.replace(/TELEGRAM_SESSION=.*/, `TELEGRAM_SESSION="${sessionString}"`);
  } else {
    envContent += `\nTELEGRAM_SESSION="${sessionString}"\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('🎉 TELEGRAM_SESSION key saved to backend/.env!\n');
  console.log('All future daily 7 PM fee reminders will now be sent directly from YOUR personal Telegram account!');
  
  await client.disconnect();
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Login failed:', err);
  rl.close();
  process.exit(1);
});
