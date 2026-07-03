var webcrypto;
try { webcrypto = require('crypto').webcrypto; }
catch (e) { webcrypto = globalThis.crypto; }

var cachedKey = null;

function hex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function fromHex(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function getSigningKey() {
  if (cachedKey) return cachedKey;
  var secret;
  if (process.env.SESSION_SECRET) {
    secret = process.env.SESSION_SECRET;
  } else {
    var hash = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'shutterfolio-insecure-fallback'));
    secret = hex(hash);
  }
  cachedKey = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return cachedKey;
}

var SESSION_TTL = 24 * 60 * 60 * 1000;

async function generateSessionToken(username, password) {
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    var payload = JSON.stringify({ user: username, exp: Date.now() + SESSION_TTL });
    var encoded = btoa(payload);
    var key = await getSigningKey();
    var sig = hex(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded)));
    return encoded + '.' + sig;
  }
  return null;
}

async function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    var parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    var encoded = parts[0];
    var sig = parts[1];
    var key = await getSigningKey();
    var valid = await webcrypto.subtle.verify('HMAC', key, fromHex(sig), new TextEncoder().encode(encoded));
    if (!valid) return null;
    var payload = JSON.parse(atob(encoded));
    if (payload.exp < Date.now()) return null;
    return payload.user;
  } catch (e) {
    return null;
  }
}

function verifyLegacy(cookieValue) {
  if (!cookieValue) return null;
  try {
    var decoded = atob(cookieValue);
    var colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;
    var user = decoded.slice(0, colonIndex);
    var pass = decoded.slice(colonIndex + 1);
    if (user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD) {
      return user;
    }
  } catch (e) {}
  return null;
}

function getCookieValue(cookieString, name) {
  var match = cookieString.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

async function isAuthenticatedFromCookie(cookieString) {
  var sessionValue = getCookieValue(cookieString, 'shutterfolio_session');
  return (await verifySession(sessionValue)) || verifyLegacy(sessionValue);
}

module.exports = {
  generateSessionToken: generateSessionToken,
  verifySession: verifySession,
  isAuthenticatedFromCookie: isAuthenticatedFromCookie,
  getCookieValue: getCookieValue,
  SESSION_TTL: SESSION_TTL
};
