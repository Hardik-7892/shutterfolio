var { getFile, putFile } = require('../lib/github');
var { rateLimit, getClientIp } = require('../lib/rate-limit');
var auth = require('../lib/auth');

function validateSettings(data) {
  if (!data || typeof data !== 'object') return 'Invalid settings data';
  if (data.photographer && typeof data.photographer.name === 'string' && data.photographer.name.length > 100) return 'Photographer name exceeds 100 characters';
  if (data.photographer && typeof data.photographer.bio === 'string' && data.photographer.bio.length > 2000) return 'Bio exceeds 2000 characters';
  if (data.contact && data.contact.email && typeof data.contact.email === 'string' && data.contact.email.length > 254) return 'Email exceeds 254 characters';
  if (Array.isArray(data.services)) {
    for (var i = 0; i < data.services.length; i++) {
      if (data.services[i].title && data.services[i].title.length > 100) return 'Service title exceeds 100 characters';
    }
  }
  return null;
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  var ip = getClientIp(req);
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' });
  }

  var cookie = req.headers.cookie || '';
  var user = await auth.isAuthenticatedFromCookie(cookie);

  if (req.method === 'GET') {
    try {
      var result = await getFile('settings.json');
      return res.status(200).json(result.content);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      var settings = req.body;
      var validationError = validateSettings(settings);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      var sha = null;
      try {
        var current = await getFile('settings.json');
        sha = current.sha;
      } catch (e) {
        sha = null;
      }

      var result = await putFile('settings.json', settings, sha, 'Update settings [skip ci]');
      return res.status(200).json({ sha: result.content.sha, success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
