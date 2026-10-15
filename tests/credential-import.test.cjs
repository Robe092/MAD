const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/import-n8n.cjs'), 'utf8');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/10_payflow_hackathon/13_PayFlow_PayPal_Invoicing_Sandbox.json'), 'utf8'));

function imported(providerConfig) {
  let payload;
  let removed = false;
  const commands = [];
  const fakeProcess = {};
  vm.runInNewContext(source, {
    process: fakeProcess, console: {log() {}, error(message) {throw new Error(message);}},
    require(name) {
      if (name === 'node:path') return path;
      if (name === 'node:fs') return {
        writeFileSync(file, data, options) {payload = JSON.parse(data); assert.equal(options.mode, 0o600);},
        rmSync() {removed = true;},
      };
      if (name === './demo-config.cjs') return {
        ROOT: root, config: () => ({POSTGRES_RUNTIME_PASSWORD:'synthetic-db', PAYFLOW_ENGINE_SECRET:'synthetic-engine', ...providerConfig}),
        compose(args) {commands.push(Array.from(args));},
      };
      throw new Error('Unexpected dependency');
    },
  });
  assert.equal(fakeProcess.exitCode, undefined);
  assert.equal(removed, true);
  assert.ok(commands.some(args => args.includes('rm') && args.includes('/tmp/payflow-credentials.json')));
  return payload;
}

test('Configured Sandbox and Gemini credentials satisfy actual workflow bindings', () => {
  const rows = imported({PAYPAL_CLIENT_ID:'synthetic-client',PAYPAL_CLIENT_SECRET:'synthetic-secret',GEMINI_API_KEY:'synthetic-primary',GEMINI_API_KEY_FALLBACK:'synthetic-secondary'});
  for (const nodeName of ['PayPal Sandbox OAuth2','Gemini Copilot API','Gemini Fallback API']) {
    const node = workflow.nodes.find(node => node.name === nodeName);
    assert.ok(node, nodeName);
    const [type, binding] = Object.entries(node.credentials)[0];
    const credential = rows.find(row => row.id === binding.id);
    assert.ok(credential, nodeName + ' requires ' + binding.id);
    assert.equal(credential.type, type);
  }
  assert.equal(rows.find(row => row.id === 'payflow-demo-paypal').data.user, 'synthetic-client');
  assert.equal(rows.find(row => row.id === 'payflow-demo-paypal').data.password, 'synthetic-secret');
  assert.equal(rows.find(row => row.id === 'payflow-demo-gemini-fallback').data.apiKey, 'synthetic-secondary');
});

test('No incomplete PayPal credential is imported and Gemini single-key fallback is explicit', () => {
  const rows = imported({PAYPAL_CLIENT_ID:'synthetic-client',GEMINI_API_KEY:'synthetic-primary'});
  assert.equal(rows.some(row => row.id === 'payflow-demo-paypal'), false);
  assert.equal(rows.find(row => row.id === 'payflow-demo-gemini-fallback').data.apiKey, 'synthetic-primary');
});
