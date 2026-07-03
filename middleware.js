var auth = require('./lib/auth');
var { rateLimit, getClientIp } = require('./lib/rate-limit');

export const config = {
  matcher: '/manage/:path*'
};

export default async function middleware(request) {
  var url = new URL(request.url);
  var path = url.pathname;

  if (path === '/manage/login.html') {
    return;
  }

  if (path === '/manage/login') {
    if (request.method === 'GET') {
      return Response.redirect(new URL('/manage/login.html', request.url));
    }

    if (request.method === 'POST') {
      var ip = getClientIp(request) || 'unknown';
      if (!rateLimit(ip)) {
        return new Response('Too many login attempts. Please wait before trying again.', { status: 429 });
      }

      try {
        var formData = await request.formData();
        var username = formData.get('username');
        var password = formData.get('password');

        var session = await auth.generateSessionToken(username, password);
        if (session) {
          return new Response(null, {
            status: 302,
            headers: {
              'Location': '/manage/',
              'Set-Cookie': 'shutterfolio_session=' + session + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400'
            }
          });
        }
      } catch (e) {}

      return Response.redirect(new URL('/manage/login.html?failed=1', request.url));
    }

    return new Response('Method not allowed', { status: 405 });
  }

  if (path === '/manage/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': 'shutterfolio_session=; Path=/; Max-Age=0'
      }
    });
  }

  var cookie = request.headers.get('cookie') || '';
  var user = await auth.isAuthenticatedFromCookie(cookie);
  if (user) {
    return;
  }

  return Response.redirect(new URL('/manage/login.html', request.url));
}
