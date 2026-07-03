var WINDOW_MS = 60 * 1000;
var MAX_REQUESTS_PER_WINDOW = 60;

var requests = {};

function getClientIp(req) {
  var forwarded;
  if (typeof req.headers.get === 'function') {
    forwarded = req.headers.get('x-forwarded-for');
  } else {
    forwarded = req.headers['x-forwarded-for'];
  }
  if (forwarded) {
    var parts = forwarded.split(',');
    return parts[0].trim();
  }
  if (req.socket) {
    return req.socket.remoteAddress || 'unknown';
  }
  return 'unknown';
}

function rateLimit(ip) {
  var now = Date.now();
  var windowStart = now - WINDOW_MS;

  var keys = Object.keys(requests);
  for (var i = 0; i < keys.length; i++) {
    if (requests[keys[i]] < windowStart) {
      delete requests[keys[i]];
    }
  }

  var count = requests[ip] || 0;
  if (count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  requests[ip] = count + 1;
  return true;
}

module.exports = { rateLimit: rateLimit, getClientIp: getClientIp, WINDOW_MS: WINDOW_MS, MAX_REQUESTS_PER_WINDOW: MAX_REQUESTS_PER_WINDOW };
