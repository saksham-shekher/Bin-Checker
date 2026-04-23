'use strict';

const { URL } = require('url');
const checker = require('../libs/javascript');

const JSON_CONTENT_TYPE = { 'Content-Type': 'application/json; charset=utf-8' };
const MAX_REQUEST_BODY_SIZE = 1_000_000;
const BIN_MIN_LENGTH = 6;
const BIN_MAX_LENGTH = 8;

const compiledBinMatchers = checker.brands.map(brand => ({
  ...brand,
  regexpBin: new RegExp(brand.regexpBin)
}));

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, JSON_CONTENT_TYPE);
  res.end(JSON.stringify(payload));
}

function normalizeDigits(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodySize = 0;
    let completed = false;

    function done(err, payload) {
      if (completed) return;
      completed = true;
      if (err) {
        reject(err);
        return;
      }
      resolve(payload);
    }

    req.on('data', chunk => {
      if (completed) return;
      chunks.push(chunk);
      bodySize += chunk.length;

      if (bodySize > MAX_REQUEST_BODY_SIZE) {
        done(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (completed) return;
      if (bodySize === 0) {
        done(null, {});
        return;
      }

      try {
        const body = Buffer.concat(chunks).toString('utf8');
        done(null, JSON.parse(body));
      } catch (error) {
        done(new Error('Invalid JSON body'));
      }
    });

    req.on('error', err => done(err));
  });
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    return lowered === 'true' || lowered === '1';
  }
  return defaultValue;
}

function readCardNumber(body) {
  return normalizeDigits(body && body.cardNumber);
}

function readBin(body, pathname) {
  if (body && body.bin !== undefined) {
    return normalizeDigits(body.bin);
  }

  if (pathname && pathname.startsWith('/bin/')) {
    const binFromPath = decodeURIComponent(pathname.slice('/bin/'.length));
    return normalizeDigits(binFromPath);
  }

  return null;
}

function pickPriorityBrand(candidates) {
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  const candidateNames = candidates.map(candidate => candidate.name);

  for (const candidate of candidates) {
    if (candidate.priorityOver.some(other => candidateNames.includes(other))) {
      return candidate;
    }
  }

  return candidates[0];
}

function getBinInfo(bin) {
  const valid = /^\d+$/.test(bin) && bin.length >= BIN_MIN_LENGTH && bin.length <= BIN_MAX_LENGTH;
  if (!valid) {
    return {
      bin,
      valid: false,
      supported: false,
      brand: null,
      cardLengths: [],
      luhnRequired: null,
      cvvLength: null
    };
  }

  const matches = compiledBinMatchers.filter(brand => brand.regexpBin.test(bin));
  const selected = pickPriorityBrand(matches);

  if (!selected) {
    return {
      bin,
      valid: true,
      supported: false,
      brand: null,
      cardLengths: [],
      luhnRequired: null,
      cvvLength: null
    };
  }

  const detailed = checker.getBrandInfoDetailed(selected.name);

  return {
    bin,
    valid: true,
    supported: true,
    brand: selected.name,
    cardLengths: detailed?.number?.lengths || [],
    luhnRequired: detailed?.number?.luhn ?? null,
    cvvLength: detailed?.cvv?.length ?? null
  };
}

function createHandler() {
  return async function handler(req, res) {
    const method = req.method || 'GET';
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const pathname = requestUrl.pathname;

    if (method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (method === 'GET' && pathname === '/brands') {
      sendJson(res, 200, { brands: checker.listBrands() });
      return;
    }

    if (
      (method === 'POST' && pathname === '/bin') ||
      (method === 'GET' && pathname.startsWith('/bin/'))
    ) {
      try {
        const body = method === 'POST' ? await readJsonBody(req) : null;
        const bin = readBin(body, pathname);

        if (!bin) {
          sendJson(res, 400, { error: 'bin is required' });
          return;
        }

        sendJson(res, 200, getBinInfo(bin));
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (method === 'GET' && pathname.startsWith('/brands/')) {
      const scheme = decodeURIComponent(pathname.slice('/brands/'.length));
      const detailed = parseBoolean(requestUrl.searchParams.get('detailed'), false);
      const brand = detailed ? checker.getBrandInfoDetailed(scheme) : checker.getBrandInfo(scheme);

      if (!brand) {
        sendJson(res, 404, { error: 'Brand not found' });
        return;
      }

      sendJson(res, 200, brand);
      return;
    }

    if (method === 'POST' && pathname === '/support') {
      try {
        const body = await readJsonBody(req);
        const cardNumber = readCardNumber(body);

        if (!cardNumber) {
          sendJson(res, 400, { error: 'cardNumber is required' });
          return;
        }

        sendJson(res, 200, { supported: checker.isSupported(cardNumber) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (method === 'POST' && pathname === '/luhn') {
      try {
        const body = await readJsonBody(req);
        const cardNumber = readCardNumber(body);

        if (!cardNumber) {
          sendJson(res, 400, { error: 'cardNumber is required' });
          return;
        }

        sendJson(res, 200, { valid: checker.luhn(cardNumber) });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (method === 'POST' && pathname === '/check') {
      try {
        const body = await readJsonBody(req);
        const cardNumber = readCardNumber(body);

        if (!cardNumber) {
          sendJson(res, 400, { error: 'cardNumber is required' });
          return;
        }

        const detailed = parseBoolean(body.detailed, false);
        const supported = checker.isSupported(cardNumber);
        const luhnValid = checker.luhn(cardNumber);

        if (!supported) {
          sendJson(res, 200, {
            supported: false,
            luhnValid,
            brand: null,
            cvvValid: null
          });
          return;
        }

        const brand = checker.findBrand(cardNumber, detailed);
        const response = {
          supported: true,
          luhnValid,
          brand,
          cvvValid: null
        };

        const cvv = normalizeDigits(body.cvv);
        if (cvv) {
          response.cvvValid = checker.validateCvv(cvv, brand);
        }

        sendJson(res, 200, response);
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  };
}

module.exports = {
  createHandler
};
