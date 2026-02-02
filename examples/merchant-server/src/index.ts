/**
 * Merchant Server Example
 *
 * A simple weather API that requires x402r escrow payments.
 *
 * Usage:
 *   1. Deploy an operator: PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts
 *   2. Copy addresses to .env
 *   3. Run: pnpm dev
 *   4. Test: curl http://localhost:3000/weather
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadConfig, createClients, buildPaymentRequirements, PRICE_USDC, NETWORK_ID } from './config.js';
import { x402Middleware, createFacilitatorSigner, EscrowFacilitatorScheme } from './middleware.js';

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, '..', '.env') });

// Initialize configuration
const config = loadConfig();
const { publicClient, walletClient, account } = createClients(config);

console.log('Merchant Server Configuration:');
console.log('  Address:', account.address);
console.log('  Operator:', config.operatorAddress);
console.log('  Freeze:', config.freezeAddress);
console.log('  Network:', NETWORK_ID);
console.log('  Price:', PRICE_USDC, 'units ($0.01 USDC)');

// Build payment requirements
const requirements = buildPaymentRequirements(account.address, config.operatorAddress);

// Create facilitator for payment verification and settlement
const facilitatorSigner = createFacilitatorSigner(walletClient, publicClient);
const facilitator = new EscrowFacilitatorScheme(facilitatorSigner);

// Create Hono app
const app = new Hono();

// Enable CORS for browser clients
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    name: 'x402r Weather API',
    version: '1.0.0',
    endpoints: {
      '/': 'This endpoint (health check)',
      '/weather': 'Get weather data (requires payment)',
      '/info': 'Get payment info (no payment required)',
    },
  });
});

// Payment info endpoint (no payment required)
app.get('/info', (c) => {
  return c.json({
    network: NETWORK_ID,
    operator: config.operatorAddress,
    merchant: account.address,
    freeze: config.freezeAddress,
    escrowPeriod: config.escrowPeriodAddress,
    price: {
      amount: PRICE_USDC,
      currency: 'USDC',
      formatted: '$0.01',
    },
    requirements,
  });
});

// Protected weather endpoint
app.get(
  '/weather',
  x402Middleware({ requirements, facilitator }),
  (c) => {
    // Get payment info from context
    const x402 = c.get('x402') as {
      payer: string;
      transaction: string;
      paymentPayload: unknown;
    };

    // Generate mock weather data
    const weather = {
      location: 'San Francisco, CA',
      temperature: {
        value: 68,
        unit: 'F',
      },
      conditions: 'Partly Cloudy',
      humidity: 65,
      wind: {
        speed: 12,
        direction: 'NW',
        unit: 'mph',
      },
      forecast: [
        { day: 'Today', high: 72, low: 58, conditions: 'Partly Cloudy' },
        { day: 'Tomorrow', high: 75, low: 60, conditions: 'Sunny' },
        { day: 'Wednesday', high: 70, low: 55, conditions: 'Cloudy' },
      ],
      // Include payment info in response
      payment: {
        payer: x402.payer,
        transaction: x402.transaction,
        amount: PRICE_USDC,
        operator: config.operatorAddress,
      },
    };

    return c.json(weather);
  }
);

// Start server
const port = config.port;
console.log(`\nStarting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
}, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('\nEndpoints:');
  console.log(`  GET http://localhost:${port}/         - Health check`);
  console.log(`  GET http://localhost:${port}/info     - Payment info`);
  console.log(`  GET http://localhost:${port}/weather  - Weather data (requires payment)`);
  console.log('\nTest payment flow:');
  console.log(`  curl http://localhost:${port}/weather`);
  console.log('  # Returns 402 with payment requirements');
});
