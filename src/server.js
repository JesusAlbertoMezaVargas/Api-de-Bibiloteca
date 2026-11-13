'use strict';
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const { createApp } = require('./app');

const app = createApp();
const { host, port, nodeEnv, tlsKeyPath, tlsCertPath } = app.locals.config;
const { redis } = app.locals;
const protocolo = tlsKeyPath ? 'https' : 'http';

const direccionesLocales = Object.entries(os.networkInterfaces())
  .flatMap(([nombre, interfaces]) => (interfaces || [])
    .filter((interfaz) => interfaz.family === 'IPv4' && !interfaz.internal)
    .map((interfaz) => ({
      nombre,
      address: interfaz.address,
      virtual: /virtual|vEthernet|wsl|tailscale|loopback/i.test(nombre),
    })));

// 02: servidor Express ejecutable (npm start / npm run dev)
const server = tlsKeyPath
  ? https.createServer({
    key: fs.readFileSync(tlsKeyPath),
    cert: fs.readFileSync(tlsCertPath),
  }, app)
  : app;

server.listen(port, host, () => {
  console.log(`biblioteca-api escuchando en ${protocolo}://localhost:${port} (${nodeEnv})`);
  for (const { nombre, address, virtual } of direccionesLocales) {
    const nota = virtual ? ' (adaptador virtual; no usar desde otros dispositivos)' : '';
    console.log(`Interfaz ${nombre}: ${protocolo}://${address}:${port}${nota}`);
  }
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
