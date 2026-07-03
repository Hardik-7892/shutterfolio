var { getFile, putFile } = require('../lib/github');
var { rateLimit, getClientIp } = require('../lib/rate-limit');
var auth = require('../lib/auth');

function validatePhotos(photos) {
  if (!Array.isArray(photos)) return 'photos must be an array';
  for (var i = 0; i < photos.length; i++) {
    var p = photos[i];
    if (!p.title || typeof p.title !== 'string') return 'each photo must have a title';
    if (p.title.length > 100) return 'title exceeds 100 characters';
    if (p.category && typeof p.category !== 'string') return 'category must be a string';
    if (p.category && p.category.length > 50) return 'category exceeds 50 characters';
    if (p.description && typeof p.description !== 'string') return 'description must be a string';
    if (p.description && p.description.length > 500) return 'description exceeds 500 characters';
    if (p.image && typeof p.image !== 'string') return 'image must be a string';
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
  var user = auth.isAuthenticatedFromCookie(cookie);

  if (req.method === 'GET') {
    try {
      var result = await getFile('gallery.json');
      return res.status(200).json({ photos: result.content.photos || [], sha: result.sha });
    } catch (err) {
      if (err.message.indexOf('404') !== -1 || err.message.indexOf('Not Found') !== -1) {
        return res.status(200).json({ photos: [], sha: null });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      var photos = req.body.photos;
      var sha = req.body.sha;

      var validationError = validatePhotos(photos);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      if (!sha) {
        try {
          var current = await getFile('gallery.json');
          sha = current.sha;
        } catch (e) {
          sha = null;
        }
      }

      var result = await putFile('gallery.json', { photos: photos }, sha, 'Update gallery [skip ci]');
      return res.status(200).json({ sha: result.content.sha, success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
