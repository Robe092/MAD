const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
function config() {
  const values = {};
  for (const raw of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) throw new Error('Invalid .env line.');
    const key = line.slice(0, index);
    if (!/^[A-Z0-9_]+$/.test(key)) throw new Error('Invalid configuration key.');
    values[key] = line.slice(index + 1).replace(/^(["'])(.*)\1$/, '$2');
  }
  if (!/^payflow-[a-z0-9-]+$/.test(values.COMPOSE_PROJECT_NAME || '')) throw new Error('Use a dedicated payflow-* Compose project.');
  const port = Number(values.N8N_BIND_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid n8n port.');
  if (values.N8N_URL !== `http://127.0.0.1:${port}`) throw new Error('Local n8n URL must match the isolated Compose port.');
  const origin = new URL(values.PAYFLOW_PUBLIC_ORIGIN);
  if (!['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.protocol !== 'http:' || origin.origin !== values.PAYFLOW_PUBLIC_ORIGIN) throw new Error('This bootstrap only supports a local HTTP origin without a path.');
  return values;
}
function compose(args, input) {
  const c = config();
  const result = spawnSync('docker', ['compose', '-p', c.COMPOSE_PROJECT_NAME, '--env-file', path.join(ROOT, '.env'), '-f', path.join(ROOT, 'compose.yaml'), ...args], {cwd: ROOT, env:{...process.env,...c}, input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  if (result.status !== 0) {
    // Database/CLI diagnostics can contain SQL or secrets: keep them private.
    const dir = path.join(ROOT, '.payflow-private');
    fs.mkdirSync(dir, {recursive: true, mode: 0o700});
    fs.writeFileSync(path.join(dir, 'last-bootstrap-error.log'), String(result.stderr || result.stdout || result.error || 'Command failed'), {mode: 0o600});
    throw new Error('Docker command failed; details saved privately in .payflow-private/last-bootstrap-error.log.');
  }
  return result.stdout;
}
function sql(input) { return compose(['exec', '-T', 'postgres', 'psql', '-X', '-U', 'payflow_admin', '-d', 'payflow', '-v', 'ON_ERROR_STOP=1', '-At'], input); }
module.exports = {ROOT, config, compose, sql};
