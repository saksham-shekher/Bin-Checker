# Bin Checker

A lightweight Node.js HTTP API for identifying credit/debit card brands and validation metadata from a BIN (Bank Identification Number / IIN).

## Features

- Identify card brand from a 6–8 digit BIN (e.g. `401200` → `visa`)
- Returns card lengths, Luhn requirement, and CVV length
- Full card number check: brand, Luhn validity, CVV validation
- Zero external runtime dependencies — uses only Node.js built-ins
- BIN data sourced from `data/sources/` and compiled at build time

## Quick Start

```bash
# 1. Install build dependency (js-yaml) and generate JS data files
npm install
npm run build

# 2. Install the library's own dependencies (mocha/chai for tests)
npm --prefix libs/javascript install

# 3. Start the API
npm run api:start
# Listening on http://localhost:3000

# 4. Look up a BIN
curl http://localhost:3000/bin/401200
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/brands` | List all supported brand names |
| `GET` | `/brands/:scheme` | Brand metadata (add `?detailed=true` for full info) |
| `GET` | `/bin/:bin` | BIN info by path parameter |
| `POST` | `/bin` | BIN info via JSON body |
| `POST` | `/support` | Check whether a card number is supported |
| `POST` | `/luhn` | Validate a card number with the Luhn algorithm |
| `POST` | `/check` | Full card check (brand + Luhn + optional CVV) |

### POST body shapes

```jsonc
// POST /bin
{ "bin": "401200" }

// POST /support
{ "cardNumber": "4111111111111111" }

// POST /luhn
{ "cardNumber": "4111111111111111" }

// POST /check  (cvv and detailed are optional)
{ "cardNumber": "4111 1111 1111 1111", "cvv": "123", "detailed": true }
```

### Example responses

```bash
$ curl http://localhost:3000/bin/401200
{
  "bin": "401200",
  "valid": true,
  "supported": true,
  "brand": "visa",
  "cardLengths": [13, 16, 19],
  "luhnRequired": true,
  "cvvLength": 3
}

$ curl -X POST http://localhost:3000/check \
    -H 'Content-Type: application/json' \
    -d '{"cardNumber":"4111111111111111","cvv":"123","detailed":true}'
{
  "supported": true,
  "luhnValid": true,
  "cvvValid": true,
  "brand": { "scheme": "visa", "brand": "Visa", ... }
}

$ curl http://localhost:3000/brands/mastercard?detailed=true
{ "scheme": "mastercard", "brand": "Mastercard", "type": "credit", ... }
```

## Configuration

| Environment variable | Default | Description |
|----------------------|---------|-------------|
| `PORT` | `3000` | Port for the HTTP server |

```bash
PORT=8080 npm run api:start
```

## Project Structure

```
bin-checker/
├── api/
│   ├── app.js          # HTTP handler (no framework, zero deps)
│   ├── index.js        # Vercel serverless entry point
│   ├── server.js       # Local HTTP server entry point
│   └── app.test.js     # Integration tests (node:test)
├── data/
│   ├── sources/        # Editable BIN source files (JSON)
│   ├── compiled/       # Auto-generated compiled output
│   └── SCHEMA.md       # Source file schema documentation
├── libs/
│   └── javascript/     # Core BIN matching library
├── scripts/
│   ├── build.js        # Compiles sources → JS data files
│   ├── validate.js     # Validates source files
│   └── create-card.js  # Interactive CLI to add a new card scheme
├── vercel.json         # Vercel deployment configuration
├── .vercelignore       # Files excluded from Vercel deployment
├── package.json
└── README.md
```

## Deploy to Vercel

The API is ready to deploy on [Vercel](https://vercel.com) as a serverless function with zero-config.

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/saksham-shekher/Bin-Checker)

### CLI deploy

```bash
npm i -g vercel
vercel
```

Vercel automatically:
1. Runs `npm install --ignore-scripts` (installs build deps)
2. Runs `npm run build` (compiles BIN source data → `libs/javascript/data/`)
3. Deploys `api/index.js` as a single serverless function
4. Routes all requests (`/*`) to that function

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| _(none required)_ | — | All configuration is self-contained |

> **Note:** `PORT` is ignored on Vercel — the platform assigns the port automatically.

### Vercel configuration summary (`vercel.json`)

| Setting | Value |
|---------|-------|
| Function entry | `api/index.js` |
| Memory | 128 MB |
| Max duration | 10 s |
| Build command | `npm run build` |
| Install command | `npm install --ignore-scripts` |

## Development

### Build the data

```bash
npm run build
```

Reads `data/sources/`, validates, and writes:
- `data/compiled/cards.json` (simplified)
- `data/compiled/cards-detailed.json` (full)
- `libs/javascript/data/brands.js` (used by the API)

### Validate source data

```bash
npm run validate
# or validate a specific file / directory:
node scripts/validate.js data/sources/visa
```

### Add a new card scheme

```bash
node scripts/create-card.js   # interactive CLI
# or edit data/sources/<scheme>.json manually (see data/SCHEMA.md)
npm run build
```

### Run tests

```bash
# JS library unit tests (brand matching, Luhn, CVV)
npm --prefix libs/javascript test

# API integration tests
npm run api:test
```

## Supported Card Brands

See [`data/compiled/BRANDS.md`](./data/compiled/BRANDS.md) for the auto-generated list generated by `npm run build`.

## License

MIT
