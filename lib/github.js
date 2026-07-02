var API_BASE = 'https://api.github.com';

function getOwner() { return process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER; }
function getRepo() { return process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG; }
function getBranch() { return process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main'; }
function getToken() { return process.env.GITHUB_PAT; }

function getHeaders() {
  return {
    Authorization: 'token ' + getToken(),
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'photobase-vercel'
  };
}

const MAX_RETRIES = 3;

async function githubFetch(url, options) {
  options = options || {};
  var headers = Object.assign({}, getHeaders(), options.headers || {});

  for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    var res = await fetch(url, Object.assign({}, options, { headers: headers }));

    if (res.status === 403 || res.status === 429) {
      var remaining = parseInt(res.headers.get('X-RateLimit-Remaining') || '1', 10);
      var resetTime = parseInt(res.headers.get('X-RateLimit-Reset') || '0', 10);

      if (remaining === 0 && resetTime > 0 && attempt < MAX_RETRIES) {
        var waitMs = Math.max((resetTime * 1000) - Date.now(), 0) + 1000;
        await new Promise(function(r) { return setTimeout(r, waitMs); });
        continue;
      }
    }

    if (!res.ok) {
      var errBody = await res.json().catch(function() { return {}; });
      throw new Error(errBody.message || 'GitHub API: ' + res.status);
    }

    return res;
  }

  throw new Error('GitHub API rate limit exceeded');
}

async function getFile(path) {
  var url = API_BASE + '/repos/' + getOwner() + '/' + getRepo() + '/contents/' + encodeURIComponent(path) + '?ref=' + getBranch();
  var res = await githubFetch(url);
  var data = await res.json();
  var content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  return { sha: data.sha, content: content };
}

async function putFile(path, content, sha, message) {
  var url = API_BASE + '/repos/' + getOwner() + '/' + getRepo() + '/contents/' + encodeURIComponent(path);
  var body = {
    message: message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    branch: getBranch()
  };
  if (sha) body.sha = sha;

  var res = await githubFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function uploadFile(path, base64Content, message) {
  var url = API_BASE + '/repos/' + getOwner() + '/' + getRepo() + '/contents/' + encodeURIComponent(path);
  var res = await githubFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      content: base64Content,
      branch: getBranch()
    })
  });
  return res.json();
}

module.exports = { getFile: getFile, putFile: putFile, uploadFile: uploadFile };
