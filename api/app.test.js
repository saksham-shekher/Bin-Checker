'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createHandler } = require('./app');

async function withServer(run) {
  const server = http.createServer(createHandler());
  await new Promise(resolve => server.listen(0, resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

test('GET /health returns ok', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok' });
  });
});

test('GET /brands returns non-empty list', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/brands');
    assert.equal(response.status, 200);
    assert.equal(Array.isArray(response.body.brands), true);
    assert.equal(response.body.brands.includes('visa'), true);
  });
});

test('POST /check returns detailed card check result', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/check', {
      method: 'POST',
      body: JSON.stringify({
        cardNumber: '4111 1111 1111 1111',
        cvv: '123',
        detailed: true
      })
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.supported, true);
    assert.equal(response.body.luhnValid, true);
    assert.equal(response.body.cvvValid, true);
    assert.equal(response.body.brand.scheme, 'visa');
  });
});

test('POST /check handles unsupported card number', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/check', {
      method: 'POST',
      body: JSON.stringify({ cardNumber: '1234567890123456' })
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.supported, false);
    assert.equal(response.body.brand, null);
    assert.equal(response.body.cvvValid, null);
  });
});

test('GET /bin/:bin returns brand metadata for a valid BIN', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/bin/401200');

    assert.equal(response.status, 200);
    assert.equal(response.body.valid, true);
    assert.equal(response.body.supported, true);
    assert.equal(response.body.brand, 'visa');
    assert.equal(response.body.cardLengths.includes(16), true);
    assert.equal(response.body.luhnRequired, true);
    assert.equal(response.body.cvvLength, 3);
  });
});

test('POST /bin returns invalid result for invalid bin length', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/bin', {
      method: 'POST',
      body: JSON.stringify({ bin: '123' })
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.valid, false);
    assert.equal(response.body.supported, false);
    assert.equal(response.body.brand, null);
  });
});

test('POST /support returns bad request when cardNumber is missing', async () => {
  await withServer(async baseUrl => {
    const response = await request(baseUrl, '/support', {
      method: 'POST',
      body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'cardNumber is required' });
  });
});
