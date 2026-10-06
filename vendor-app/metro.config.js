const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);
const backend = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const target = new URL(backend);

config.server.enhanceMiddleware = metroMiddleware => {
  return (req, res, next) => {
    const path = req.url || '';
    if (!path.startsWith('/api/') && !path.startsWith('/uploads/')) {
      return metroMiddleware(req, res, next);
    }

    const headers = { ...req.headers, host: `${target.hostname}:${target.port || 80}` };
    delete headers.origin;
    delete headers.referer;
    delete headers['access-control-request-method'];
    delete headers['access-control-request-headers'];
    const proxyReq = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path,
        method: req.method,
        headers,
      },
      proxyRes => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on('error', error => {
      res.statusCode = 502;
      res.end(String(error));
    });
    req.pipe(proxyReq);
  };
};

module.exports = config;
