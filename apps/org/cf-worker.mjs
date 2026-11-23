/* global URL, Request */

const DYNAMIC_ROUTE_FALLBACKS = [
  ['/activities/', '/activities/edtech-students-hackathon-2026'],
  ['/articles/', '/articles/edexcel-ial-ums-mastery-guide'],
  ['/team/', '/team/thawyezaw'],
];

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }

    const url = new URL(request.url);
    for (const [prefix, fallbackPath] of DYNAMIC_ROUTE_FALLBACKS) {
      if (url.pathname.startsWith(prefix)) {
        const fallbackUrl = new URL(fallbackPath, url.origin);
        return env.ASSETS.fetch(new Request(fallbackUrl, request));
      }
    }

    return response;
  },
};
