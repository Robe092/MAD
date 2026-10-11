#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {ROOT, config, compose, sql} = require('./demo-config.cjs');
async function main() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) fs.copyFileSync(path.join(ROOT, '.env.example'), envPath);
  fs.chmodSync(envPath, 0o600);
  let text = fs.readFileSync(envPath, 'utf8');
  for (const name of ['POSTGRES_ADMIN_PASSWORD', 'POSTGRES_RUNTIME_PASSWORD', 'N8N_ENCRYPTION_KEY', 'PAYFLOW_ENGINE_SECRET']) {
    const pattern = new RegExp(`^${name}=\\s*$`, 'm');
    if (pattern.test(text)) text = text.replace(pattern, `${name}=${crypto.randomBytes(32).toString('hex')}`);
  }
  fs.writeFileSync(envPath, text, {mode: 0o600});
  const c = config();
  for (const name of ['POSTGRES_ADMIN_PASSWORD', 'POSTGRES_RUNTIME_PASSWORD', 'N8N_ENCRYPTION_KEY', 'PAYFLOW_ENGINE_SECRET']) if (!c[name] || /[\r\n]/.test(c[name])) throw new Error('Missing or invalid private configuration.');
  const provision = spawnSync(process.execPath, [path.join(ROOT, 'scripts/payflow_operator_setup.cjs')], {cwd: ROOT, encoding: 'utf8'});
  if (provision.status !== 0) throw new Error('Local operator provisioning failed.');
  compose(['up', '-d', '--wait', 'postgres']);
  const initialized = sql("SELECT CASE WHEN to_regclass('public.payflow_config') IS NULL THEN 'fresh' ELSE 'existing' END;\n").trim();
  const operator = JSON.parse(fs.readFileSync(path.join(ROOT, '.payflow-private/operator.json'), 'utf8'));
  const literal = value => "'" + value.replace(/'/g, "''") + "'";
  const values = {operator_assertion_public_key: operator.publicKey, engine_secret_sha256: crypto.createHash('sha256').update(c.PAYFLOW_ENGINE_SECRET).digest('hex'), public_origin: c.PAYFLOW_PUBLIC_ORIGIN};
  if (initialized === 'fresh') {
    const migrations = ['10_payflow_init.sql', '12_payflow_quote_lifecycle.sql', '11_payflow_stabilization.sql'].map(f => fs.readFileSync(path.join(ROOT, 'sql', f), 'utf8')).join('\n');
    const tables = ['products','orders','order_items','approvals','invoices','payment_operations','events'].map(n => 'payflow_' + n).join(', ');
    const inserts = Object.entries(values).map(([k,v]) => `INSERT INTO payflow_config(config_key,config_value) VALUES (${literal(k)},${literal(v)});`).join('\n');
    sql(`BEGIN;\n${migrations}\nCREATE ROLE payflow_runtime LOGIN PASSWORD ${literal(c.POSTGRES_RUNTIME_PASSWORD)};\nREVOKE CREATE ON SCHEMA public FROM PUBLIC;\nGRANT CONNECT ON DATABASE payflow TO payflow_runtime;\nGRANT USAGE ON SCHEMA public TO payflow_runtime;\nGRANT SELECT,INSERT,UPDATE,DELETE ON ${tables} TO payflow_runtime;\nGRANT SELECT ON payflow_config TO payflow_runtime;\nGRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO payflow_runtime;\nGRANT EXECUTE ON FUNCTION payflow_persist_quote(jsonb),payflow_claim_payment(jsonb),payflow_close_quote(jsonb),payflow_expire_quotes(text) TO payflow_runtime;\n${inserts}\nCOMMIT;\n`);
    console.log('Fresh dedicated database initialized; five catalogue products, no orders or fake payments.');
  } else {
    const matching = sql(`SELECT count(*) FROM payflow_config WHERE ${Object.entries(values).map(([k,v]) => `(config_key=${literal(k)} AND config_value=${literal(v)})`).join(' OR ')};\n`).trim();
    if (matching !== '3') throw new Error('Existing database configuration differs. No credential/configuration overwritten; inspect the private setup manually.');
    console.log('Existing dedicated database/configuration preserved; migrations and catalogue seed not replayed.');
  }
  compose(['up', '-d', 'n8n']);
  console.log('Local services prepared. Complete the n8n owner setup, then run npm run import:n8n. Login details remain in .payflow-private/initial-login.txt; no values printed.');
}
main().catch(e => {console.error(e.message); process.exitCode = 1;});
