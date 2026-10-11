const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
// Only the public template is read. All subprocesses and private-file reads are stubbed.
const template = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'scripts/demo-config.cjs'), 'utf8');
const frontendSource = fs.readFileSync(path.join(root, 'scripts/frontend.cjs'), 'utf8');

function loadConfig(text = template) {
  let spawned;
  const module = {exports: {}};
  vm.runInNewContext(configSource, {
    module, __dirname: path.join(root, 'scripts'), URL,
    process: {env: {COMPOSE_PROJECT_NAME: 'unrelated-existing-stack', N8N_BIND_PORT: '5678', N8N_URL: 'http://127.0.0.1:5678'}},
    require(name) {
      if (name === 'node:fs') return {readFileSync(file) {
        assert.equal(file, path.join(root, '.env'));
        return text;
      }};
      if (name === 'node:child_process') return {spawnSync(command, args, options) {
        spawned = {command, args, options};
        return {status: 0, stdout: 'stubbed'};
      }};
      if (name === 'node:path') return path;
      throw new Error('Unexpected module in isolated test');
    },
  });
  return {api: module.exports, capture: () => spawned};
}

test('Compose uses the validated candidate project and config despite conflicting shell values', () => {
  const {api, capture} = loadConfig();
  const expected = api.config();
  api.compose(['up', '-d', 'postgres']);
  const result = capture();
  assert.equal(result.command, 'docker');
  assert.equal(result.args[result.args.indexOf('-p') + 1], expected.COMPOSE_PROJECT_NAME);
  for (const key of ['COMPOSE_PROJECT_NAME', 'N8N_BIND_PORT', 'N8N_URL']) {
    assert.equal(result.options.env[key], expected[key]);
  }
  assert.equal(result.options.cwd, root);
});

test('Frontend pins candidate auth and engine configuration despite conflicting shell values', () => {
  let spawned;
  const {api} = loadConfig();
  const expected = api.config();
  vm.runInNewContext(frontendSource, {
    URL,
    process: {execPath: 'node', argv: ['node', 'frontend.cjs', 'start'], env: {
      PAYFLOW_AUTH_CONFIG: 'other-project/operator.json',
      N8N_URL: 'http://127.0.0.1:5678', PAYFLOW_ENGINE_SECRET: 'conflicting-test-value',
    }, on() {}},
    require(name) {
      if (name === 'node:path') return path;
      if (name === './demo-config.cjs') return {ROOT: root, config: () => expected};
      if (name === 'node:child_process') return {spawn(command, args, options) {
        spawned = {command, args, options};
        return {on() {}, kill() {}};
      }};
      throw new Error('Unexpected module in isolated test');
    },
  });
  assert.equal(spawned.options.env.PAYFLOW_AUTH_CONFIG, path.join(root, '.payflow-private/operator.json'));
  for (const key of ['N8N_URL', 'PAYFLOW_ENGINE_SECRET', 'PAYFLOW_PUBLIC_ORIGIN']) {
    assert.equal(spawned.options.env[key], expected[key]);
  }
  assert.equal(spawned.options.cwd, path.join(root, 'frontend-payflow'));
  assert.equal(spawned.args[spawned.args.indexOf('--hostname') + 1], '127.0.0.1');
});

test('Config rejects an unrelated project before any subprocess is invoked', () => {
  const {api, capture} = loadConfig(template.replace('COMPOSE_PROJECT_NAME=payflow-ai-demo', 'COMPOSE_PROJECT_NAME=unrelated-project'));
  assert.throws(() => api.compose(['up', '-d', 'postgres']), /dedicated payflow-/);
  assert.equal(capture(), undefined);
});
