var { uploadFile } = require('../lib/github');
var { validateFile } = require('../lib/validation');
var { rateLimit, getClientIp } = require('../lib/rate-limit');
var auth = require('../lib/auth');

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var cookie = req.headers.cookie || '';
  if (!(await auth.isAuthenticatedFromCookie(cookie))) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    var name = req.body.name;
    var type = req.body.type;
    var content = req.body.content;

    if (!name || !type || !content) {
      return res.status(400).json({ error: 'name, type, and content (base64) are required' });
    }

    var buffer = Buffer.from(content, 'base64');
    var validation = validateFile(buffer, type, name);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    var parts = name.split('.');
    var ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
    var filename = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext;
    var path = 'assets/images/' + filename;

    await uploadFile(path, content, 'Upload ' + filename);

    return res.status(200).json({ path: path });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
