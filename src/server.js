'use strict';
const { createApp } = require('./app');

const app = createApp();
const { port, nodeEnv } = app.locals.config;
const { redis } = app.locals;

// 02: servidor Express ejecutable (npm start / npm run dev)
const server = app.listen(port, () => {
  console.log(`biblioteca-api escuchando en http://localhost:${port} (${nodeEnv})`);
});

function apagar(senal) {
  console.log(`${senal} recibido: cerrando el servidor...`);
  server.close(() => {
    if (redis) redis.quit().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
