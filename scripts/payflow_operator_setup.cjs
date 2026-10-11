#!/usr/bin/env node
// Local operator provisioning. Values are never printed or committed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = path.resolve(__dirname, '..', '.payflow-private');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(dir, '.gitignore'), '*\n!.gitignore\n');
const target = path.join(dir, 'operator.json');
if (fs.existsSync(target)) {
  console.log('Operator already provisioned; existing credentials preserved.');
  process.exit(0);
}
const password = crypto.randomBytes(24).toString('base64url');
const salt = crypto.randomBytes(32).toString('hex');
const keys = crypto.generateKeyPairSync('ed25519');
const config = {
  version: crypto.randomUUID(),
  username: 'payflow-operator',
  subject: 'payflow:' + crypto.randomUUID(),
  role: 'operator',
  salt,
  passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'),
  sessionSecret: crypto.randomBytes(32).toString('hex'),
  privateKey: keys.privateKey.export({type:'pkcs8',format:'pem'}),
  publicKey: keys.publicKey.export({type:'spki',format:'pem'}),
};
fs.writeFileSync(target, JSON.stringify(config, null, 2), { mode: 0o600 });
fs.writeFileSync(path.join(dir, 'initial-login.txt'),
  'Identifiant : ' + config.username + '\nMot de passe initial : ' + password + '\n', {mode:0o600});
console.log('Operator provisioned. Private configuration and initial login saved in .payflow-private/ (0600). No values printed.');
