'use strict';

/**
 * Vercel serverless entry point.
 * Exports the request handler directly so Vercel can invoke it as a function.
 * Local development uses api/server.js instead.
 */
const { createHandler } = require('./app');

module.exports = createHandler();
