var crypto = require('crypto');

function getSigningKey() {
  return process.env.SESSION_SECRET || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'shutterfolio-insecure-fallback').digest('hex');
}

var SESSION_TTL = 24 * 60 * 60 * 1000;

function generateSessionToken(username, password) {
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    var payload = JSON.stringify({ user: username, exp: Date.now() + SESSION_TTL });
    var encoded = Buffer.from(payload).toString('base64');
    var sig = crypto.createHmac('sha256', getSigningKey()).update(encoded).digest('hex');
    return encoded + '.' + sig;
  }
  return null;
}

function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    var parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    var encoded = parts[0];
    var sig = parts[1];
    var expectedSig = crypto.createHmac('sha256', getSigningKey()).update(encoded).digest('hex');
    if (sig !== expectedSig) return null;
    var payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    return payload.user;
  } catch (e) {
    return null;
  }
}

function verifyLegacy(cookieValue) {
  if (!cookieValue) return null;
  try {
    var decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
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

function isAuthenticatedFromCookie(cookieString) {
  var sessionValue = getCookieValue(cookieString, 'shutterfolio_session');
  return verifySession(sessionValue) || verifyLegacy(sessionValue);
}

module.exports = {
  generateSessionToken: generateSessionToken,
  verifySession: verifySession,
  isAuthenticatedFromCookie: isAuthenticatedFromCookie,
  getCookieValue: getCookieValue,
  SESSION_TTL: SESSION_TTL
};
