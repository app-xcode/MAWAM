
function base64UrlEncode(buf: Uint8Array) {
  let str = btoa(String.fromCharCode(...Array.from(buf)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signJwt(unsigned: string, privateKeyPem: string) {
  // Convert PEM to ArrayBuffer (PKCS8)
  const pem = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(pem);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    buf.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  return base64UrlEncode(signature);
}

async function getAccessToken(sa: any) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;
  const sig = await signJwt(unsigned, sa.private_key);
  const jwt = `${unsigned}.${sig}`;

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', jwt);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    throw new Error(`token request failed: ${tokenRes.status} ${txt}`);
  }
  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

Deno.serve(async (req: Request) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FIREBASE_SERVICE_ACCOUNT) {
      console.error('missing env secrets');
      return new Response(JSON.stringify({ ok: false, error: 'missing_env' }), { status: 500 });
    }

    const sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const projectId = sa.project_id;
    if (!projectId) throw new Error('service account missing project_id');

    const body = await req.json();
    const { tokens, notification, data } = body;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'no_tokens' }), { status: 400 });
    }

    const accessToken = await getAccessToken(sa);

    const badTokens: string[] = [];

    // send per token (v1 does not support multicast in single request)
    for (const token of tokens) {
      const fcmBody: any = {
        message: {
          token,
          notification: notification || {},
          data: {},
        },
      };

      // FCM v1 data must be string key-values
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((k) => {
          const v = data[k];
          fcmBody.message.data[k] = typeof v === 'string' ? v : JSON.stringify(v);
        });
      }

      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(fcmBody),
      });

      if (!res.ok) {
        // consider token invalid/unregistered
        badTokens.push(token);
        const txt = await res.text();
        console.error('fcm send failed', res.status, txt);
      }
    }

    // deactivate bad tokens via Supabase REST using service_role
    if (badTokens.length) {
      try {
        const inList = badTokens.map((t) => encodeURIComponent(t)).join(',');
        // Use REST patch to update matching tokens
        await fetch(`${SUPABASE_URL}/rest/v1/notification_tokens?token=in.(${inList})`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ is_active: false }),
        });
      } catch (err) {
        console.error('failed deactivating bad tokens', err);
      }
    }

    return new Response(JSON.stringify({ ok: true, badTokens }), { status: 200 });
  } catch (err) {
    console.error('send-fcm function error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
