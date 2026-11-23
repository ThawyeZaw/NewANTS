/* global URL, Request, Headers, Response */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    if (
      response.status === 404 &&
      (url.pathname.startsWith('/@') || url.pathname.startsWith('/%40'))
    ) {
      const fallbackUrl = new URL('/@zaylynnhtet', url.origin);
      response = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    }

    if (url.pathname === '/sw.js' && response.ok) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Service-Worker-Allowed', '/');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
