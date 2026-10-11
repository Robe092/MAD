#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {ROOT, config, compose} = require('./demo-config.cjs');
try {
  const c = config();
  const credentials = [
    {id:'payflow-demo-postgres',name:'PayFlow PostgreSQL',type:'postgres',data:{host:'postgres',database:'payflow',user:'payflow_runtime',password:c.POSTGRES_RUNTIME_PASSWORD,port:5432,ssl:'disable'}},
    {id:'payflow-demo-header',name:'PayFlow Engine Header',type:'httpHeaderAuth',data:{name:'X-PayFlow-Secret',value:c.PAYFLOW_ENGINE_SECRET}}
  ];
  if (c.PAYPAL_CLIENT_ID && c.PAYPAL_CLIENT_SECRET) credentials.push({id:'payflow-demo-paypal',name:'PayFlow PayPal Sandbox',type:'httpBasicAuth',data:{user:c.PAYPAL_CLIENT_ID,password:c.PAYPAL_CLIENT_SECRET}});
  if (c.GEMINI_API_KEY) credentials.push({id:'payflow-demo-gemini',name:'PayFlow Gemini',type:'googlePalmApi',data:{apiKey:c.GEMINI_API_KEY}});
  const file = path.join(ROOT, '.payflow-private/n8n-credentials.json');
  fs.writeFileSync(file, JSON.stringify(credentials), {mode:0o600});
  try {
    compose(['cp', file, 'n8n:/tmp/payflow-credentials.json']);
    compose(['exec', '-T', '-u', 'root', 'n8n', 'chown', 'node:node', '/tmp/payflow-credentials.json']);
    compose(['exec', '-T', '-u', 'root', 'n8n', 'chmod', '600', '/tmp/payflow-credentials.json']);
    compose(['exec', '-T', 'n8n', 'n8n', 'import:credentials', '--input=/tmp/payflow-credentials.json']);
    compose(['exec', '-T', 'n8n', 'n8n', 'import:workflow', '--input=/bootstrap/workflows/10_payflow_hackathon/13_PayFlow_PayPal_Invoicing_Sandbox.json']);
  } finally {
    fs.rmSync(file, {force:true});
    compose(['exec', '-T', '-u', 'root', 'n8n', 'rm', '-f', '/tmp/payflow-credentials.json']);
  }
  console.log('Demo-only credentials and inactive engine imported. Refresh n8n, check credential bindings and publish the engine in its editor. No provider request or payment was made.');
} catch(e) {console.error(e.message); process.exitCode = 1;}
