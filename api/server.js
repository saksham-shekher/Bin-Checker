'use strict';

const http = require('http');
const { createHandler } = require('./app');

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(createHandler());

server.listen(PORT, () => {
  console.log(`BIN Checker API listening on port ${PORT}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
