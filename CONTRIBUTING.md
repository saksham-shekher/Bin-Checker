# Contributing to Bin Checker

Thank you for your interest! Contributions to BIN data and the Node.js API are both welcome.

## Repository Focus

This project is a **Node.js BIN Checker API**. The primary contribution areas are:

1. **BIN/card data** – adding or correcting card scheme patterns in `data/sources/`
2. **API improvements** – bug fixes or new features in `api/`
3. **Build tooling** – improvements to `scripts/`

---

## Contributing Card Data

### Adding or updating a card scheme

Card data lives in `data/sources/`. Refer to [`data/SCHEMA.md`](./data/SCHEMA.md) for the full schema.

**Single-file scheme (simple brands):**

```bash
# Create a new source file
touch data/sources/newscheme.json

# Or use the interactive CLI
node scripts/create-card.js
```

Minimal example:

```json
{
  "scheme": "newscheme",
  "brand": "New Scheme",
  "patterns": [
    {
      "bin": "^9876",
      "length": [16],
      "luhn": true,
      "cvvLength": 3
    }
  ],
  "type": "credit",
  "countries": ["GLOBAL"]
}
```

**Multi-file scheme (regional BIN data):**

```
data/sources/newscheme/
├── base.json       # scheme, brand, patterns (required)
└── bins-us.json    # additional BINs { "bins": [...] }
```

### Build and verify

```bash
npm run build
npm --prefix libs/javascript test
npm run api:test
```

### Data quality rules

- Cite an official source (card network docs, published BIN ranges, ISO standards)
- Test patterns with real (anonymized) BINs
- Do not break existing patterns without discussion

---

## Contributing Code

### Setup

```bash
git clone https://github.com/saksham-shekher/Bin-Checker.git
cd Bin-Checker
npm install
npm run build
npm --prefix libs/javascript install
```

### Workflow

```bash
git checkout -b fix/my-fix

# ... make changes ...

npm run build
npm --prefix libs/javascript test
npm run api:test

git add .
git commit -m "fix: describe the fix"
git push origin fix/my-fix
```

### Commit style

- Present tense: `add`, `fix`, `remove`, `update`
- Be specific: `fix: correct Visa BIN regex for 16-digit cards`

---

## Reporting Issues

- **Wrong BIN detection** – open an issue with the BIN prefix and expected brand
- **API bug** – include request/response and Node.js version
- **Data gap** – include an official source URL for the missing BIN range

## Code of Conduct

Be respectful, constructive, and assume good intent.
