import { supabase } from '../lib/supabase.js';

const args = process.argv.slice(2);
const token = args[0];
if (!token) {
  console.error('Usage: node scripts/send-fcm-test.mjs <FCM_TOKEN> [title] [body]');
  process.exit(1);
}

const title = args[1] || 'Test Notification';
const body = args[2] || 'This is a test message from repo script.';

(async () => {
  try {
    const res = await supabase.functions.invoke('send-fcm', {
      body: JSON.stringify({
        tokens: [token],
        notification: { title, body },
        data: { test: '1' },
      }),
    });
    console.log('send-fcm response:', res);
  } catch (err) {
    console.error('invoke error', err);
  }
})();
