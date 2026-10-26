'use strict';
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { loadConfig } = require('./config');
const requestId = require('./middleware/requestId');
const { createLimiters } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { createRedis } = require('./redis');
const healthRouter = require('./routes/health');
const apiRouter = require('./routes/api');

function createApp(overrides = {}) {
  const cfg = loadConfig(process.env, overrides);
  const redis = createRedis(cfg);
  const limiters = createLimiters(cfg, redis);
  const app = express();

  app.disable('x-powered-by');
  if (cfg.trustProxy) app.set('trust proxy', 1);

  app.use(requestId);

  //  02: configuración inicial de Helmet (CSP, nosniff, frameAncestors) y X-Powered-By oculto
  // Cabeceras de seguridad. La política de contenido es estricta: solo recursos propios,
  // más Google Fonts para las tipografías del frontend.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }));

  // Frontend (HTML/CSS/JS con módulos ES) servido desde el mismo origen que la API.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  //  02: ruta de salud GET /api/health
  // La ruta de salud va antes del límite global para que el monitoreo nunca se bloquee.
  app.use('/api', healthRouter({ redis }));
  // si cumple 02: límite de intentos global para toda la API (express-rate-limit)
  app.use('/api', limiters.global);
  app.use('/api', apiRouter({ limiters, redis, config: cfg }));

  //  02: manejo uniforme de errores (404 + formato único { error: { code, message, details, requestId } })
  app.use(notFoundHandler);
  app.use(errorHandler);
  app.locals.config = cfg;
  app.locals.redis = redis;
  return app;
}

module.exports = { createApp };
