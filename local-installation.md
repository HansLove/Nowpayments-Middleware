# Local Installation Guide

This guide explains how to install and use the `@taloon/nowpayments-middleware` library locally before it's published to npm.

## Prerequisites

Before installing, ensure the library is built:

```bash
cd /path/to/NowpaymentsMiddleware
pnpm run build
```

## Installation Methods

### Method 1: Install from Local Directory (Recommended)

This is the simplest method for testing the library locally.

```bash
# From your project directory
pnpm add file:/path/to/NowpaymentsMiddleware

# Or with npm
npm install file:/path/to/NowpaymentsMiddleware
```

**Pros:**
- Simple and direct
- No global links needed
- Works with any package manager

**Cons:**
- Changes to the library require reinstalling

### Method 2: Global Link for Development

Use this method when actively developing the library and need live updates.

```bash
# 1. In the middleware directory, create global link
cd /path/to/NowpaymentsMiddleware
pnpm link --global

# 2. In your project, link to the global package
cd /path/to/your-project
pnpm link --global @taloon/nowpayments-middleware
```

**Pros:**
- Live updates when library changes
- Good for active development

**Cons:**
- Requires managing global links
- Peer dependency warnings (normal behavior)

### Method 3: Pack and Install

Create a tarball and install it like a regular npm package.

```bash
# 1. In the middleware directory, create tarball
cd /path/to/NowpaymentsMiddleware
pnpm pack

# 2. Install the generated tarball
cd /path/to/your-project
pnpm add /path/to/NowpaymentsMiddleware/taloon-nowpayments-middleware-1.0.0.tgz
```

**Pros:**
- Closest to real npm installation
- No global state

**Cons:**
- Manual process for updates
- Need to track tarball files

## Usage After Installation

Once installed using any method, use the library normally:

```typescript
import { NowPaymentsMiddleware } from '@taloon/nowpayments-middleware';

// Configure
NowPaymentsMiddleware.configure({
  apiKey: 'your-api-key',
  sandbox: true
});

// Use middleware
app.post('/payment', NowPaymentsMiddleware.createPayment({
  mapRequest: (req) => ({
    price_amount: req.body.amount,
    price_currency: req.body.currency,
    pay_currency: req.body.cryptoCurrency,
  })
}));
```

## Installing Peer Dependencies

Don't forget to install the required peer dependency:

```bash
pnpm add express
# Or
npm install express
```

## Troubleshooting

### Peer Dependency Warnings

When using Method 2 (global link), you may see warnings about peer dependencies. This is normal behavior - just ensure Express.js is installed in your project.

### TypeScript Support

If using TypeScript, the library includes built-in type definitions. No additional `@types/*` packages needed.

### Path Issues

If you encounter path resolution issues, ensure:
1. The library is properly built (`pnpm run build`)
2. Your project's `tsconfig.json` is configured correctly
3. For Method 1, use absolute paths in the file: protocol

## Next Steps

After successful installation, refer to the [main README](README.md) for:
- Configuration options
- API reference
- Usage examples
- Error handling patterns