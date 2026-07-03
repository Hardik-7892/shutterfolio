var { getFile, putFile } = require('../lib/github');
var { rateLimit } = require('../lib/rate-limit');

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' });
  }

  if (req.method === 'GET') {
    try {
      var result = await getFile('settings.json');
      return res.status(200).json(result.content);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      var settings = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
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
