'use strict';
const path = require('node:path');
const express = require('express');
const routes = require('./src/routes');
const views = require('./src/views');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // Body parsers: HTML forms (urlencoded) and JSON, both size-limited
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(express.json({ limit: '10kb' }));

  // Basic security headers
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'",
    });
    next();
  });

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(routes);

  // 404
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'Not found.' });
    res.status(404).send(views.notFoundPage());
  });

  // Error handler (malformed JSON, oversized body, unexpected failures)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = status === 400 ? 'Malformed request body.' : status === 413 ? 'Request body too large.' : 'Something went wrong on the server.';
    if (status >= 500) console.error(err);
    if (req.path.startsWith('/api/')) return res.status(status).json({ success: false, message });
    res.status(status).send(views.registerPage({ errors: { form: message } }));
  });

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  createApp().listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = { createApp };
