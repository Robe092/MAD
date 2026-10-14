# Evaluate quote controls without provider keys

Complete README setup, publish the engine, start the cockpit and keep the generated private operator login on this machine. The main quote form uses Gemini; the helper below exercises the actual deterministic gateway instead. It creates two synthetic unpaid quotes and performs no AI call or PayPal transaction.

Run from the repository root while `npm start` is running:

```sh
node <<'JS'
const fs = require('node:fs');
const crypto = require('node:crypto');
const loginText = fs.readFileSync('.payflow-private/initial-login.txt', 'utf8');
const username = loginText.match(/^Identifiant\s*:\s*(.+)$/m)[1].trim();
const password = loginText.match(/^Mot de passe initial\s*:\s*(.+)$/m)[1].trim();
const origin = fs.readFileSync('.env', 'utf8').match(/^PAYFLOW_PUBLIC_ORIGIN=(.+)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
(async () => {
  const login = await fetch(origin + '/api/operator', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!login.ok) throw new Error('Operator sign-in failed');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const { csrf } = await login.json();
  const headers = { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, 'X-PayFlow-CSRF': csrf };
  try {
    for (const [sku, quantity, discount_pct] of [['SPIRIT-RHUM-XO', 1, 0], ['VIN-CHATEAU-2018', 3, 5]]) {
      const order_id = 'JUDGE-' + crypto.randomUUID().slice(0, 18);
      const response = await fetch(origin + '/api/payflow', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'evaluate_order', order_id, customer_name: 'Judge Evaluator',
          customer_email: 'judge@example.invalid', payment_channel: 'ORDERS_V2',
          items: [{ sku, quantity, discount_pct }] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Quote refused: ' + (data.code || response.status));
      console.log(JSON.stringify({ order_id, status: data.order_status, amount: data.total_amount }));
    }
  } finally {
    await fetch(origin + '/api/operator', { method: 'DELETE', headers });
  }
})().catch(() => { console.error('Evaluation stopped; inspect local configuration and available catalogue stock.'); process.exitCode = 1; });
JS
```

With sufficient seeded inventory, expected results are USD240 APPROVED and USD 1,282.50 PENDING_APPROVAL. Sign into the cockpit separately, refresh Orders, inspect the high-value quote and approve internally. Repeated approval with a consumed token is refused. Cancel the synthetic quotes afterwards to release their reservations.

This is an evaluation recipe. The actual executed deterministic approval evidence is described in [the 15 October qualification update](QUALIFICATION_20261015.md). It does not substitute for the live Gemini form, Studio analysis or buyer checkout/capture.
