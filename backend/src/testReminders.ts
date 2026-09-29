import { executeFeeReminderDispatch } from './services/reminderScheduler';

async function test() {
  console.log('Running test for Fee Reminders...');
  try {
    const result = await executeFeeReminderDispatch();
    console.log('Test completed. Result:', JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error('Test failed:', e.message);
  }
}

test();
