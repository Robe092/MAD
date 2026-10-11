#!/usr/bin/env node
const path = require('node:path');
const {spawn} = require('node:child_process');
const {ROOT,config} = require('./demo-config.cjs');
const c = config();
const mode = process.argv[2];
if (!['dev','start'].includes(mode)) throw new Error('Expected dev or start.');
const port = new URL(c.PAYFLOW_PUBLIC_ORIGIN).port || '80';
const child = spawn(process.execPath, [path.join(ROOT, 'frontend-payflow/node_modules/next/dist/bin/next'), mode, '--hostname', '127.0.0.1', '--port', port], {cwd:path.join(ROOT,'frontend-payflow'), stdio:'inherit', env:{...process.env, PAYFLOW_AUTH_CONFIG:path.join(ROOT,'.payflow-private/operator.json'),PAYFLOW_ENGINE_SECRET:c.PAYFLOW_ENGINE_SECRET,N8N_URL:c.N8N_URL,PAYFLOW_PUBLIC_ORIGIN:c.PAYFLOW_PUBLIC_ORIGIN,NEXT_TELEMETRY_DISABLED:'1'}});
child.on('exit', code => {process.exitCode = code || 0;});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
