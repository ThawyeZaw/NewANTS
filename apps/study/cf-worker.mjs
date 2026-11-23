/* global URL, Request */

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith('/curriculum/')) {
      const fallbackUrl = new URL('/curriculum/ial-maths-suite', url.origin);
      return env.ASSETS.fetch(new Request(fallbackUrl, request));
    }

    return response;
  },
};
