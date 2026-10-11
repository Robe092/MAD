#!/usr/bin/env node
// Isolated prompt/provider check. Never imports demo-config or the reference .env.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const PRIVATE = path.join(ROOT, '.payflow-private');
const WORKFLOW = path.join(ROOT, 'workflows/10_payflow_hackathon/13_PayFlow_PayPal_Invoicing_Sandbox.json');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const product = {id:'LANG-PRODUCT',sku:'LANG-SKU',name:'Language test product',currency:'USD',unit_price:240,unit_cost:120,max_discount_pct:10,min_margin_pct:20,stock_on_hand:15,stock_reserved:0,is_active:true};
const portfolio = [
  {id:'LANG-PAID',customer_company:'Language QA',status:'PAID',total_amount:200,computed_margin_pct:50},
  {id:'LANG-PENDING',customer_company:'Language QA',status:'PENDING_APPROVAL',total_amount:200,computed_margin_pct:50},
  {id:'LANG-BLOCKED',customer_company:'Language QA',status:'BLOCKED_ANOMALY',total_amount:200,computed_margin_pct:50}
];
const scenarios = [
  {id:'quote-en',action:'ai_copilot_quote',input_language:'English',prompt:'Client: Language QA (language@example.invalid). Order 1 case of LANG-SKU with an 18% discount.'},
  {id:'quote-fr',action:'ai_copilot_quote',input_language:'French',prompt:'Client: Language QA (language@example.invalid). Commande : 1 caisse de LANG-SKU avec 18% de remise.'},
  {id:'studio-en',action:'ai_studio_agent',input_language:'English',prompt:'Show the pending internal approval orders and explain this portfolio. Do not treat order volumes as confirmed payment receipts.'},
  {id:'studio-fr',action:'ai_studio_agent',input_language:'French',prompt:'Affiche les commandes en attente de validation interne et explique ce portefeuille. Ne confonds pas le volume des commandes avec des encaissements confirmés.'}
];
function assert(ok, message) {if (!ok) throw new Error(message);}
function endpoint(workflow) {
  const node = workflow.nodes.find(n=>n.name==='Gemini Copilot API');
  assert(node && node.type==='n8n-nodes-base.httpRequest', 'Candidate primary Gemini node missing.');
  const url = new URL(node.parameters.url);
  assert(url.origin==='https://generativelanguage.googleapis.com' && !url.username && !url.password && !url.search && !url.hash && /^\/v1beta\/models\/[a-z0-9.-]+:generateContent$/.test(url.pathname), 'Candidate provider URL is not the fixed Google endpoint.');
  return url;
}
async function request(workflow, scenario) {
  const node = workflow.nodes.find(n=>n.name==='Préparer la demande Gemini');
  assert(node && typeof node.parameters.jsCode==='string','Candidate prompt node missing.');
  // Execute only this trusted local export's existing prompt-construction node.
  const selector = name => {
    assert(['Webhook PayFlow Engine','Postgres: Load Context & State'].includes(name),'Unexpected prompt dependency.');
    return {first:()=>({json:name==='Webhook PayFlow Engine'?{body:{action:scenario.action,prompt:scenario.prompt}}:{catalog:[product],portfolio}})};
  };
  const result = await new AsyncFunction('$',node.parameters.jsCode)(selector);
  const body = JSON.parse(result[0].json.gemini_request);
  assert(body.generationConfig.responseMimeType==='application/json','Candidate JSON response contract changed.');
  return body;
}
function exactKeys(value, keys) {
  assert(value && typeof value==='object' && !Array.isArray(value),'Expected a JSON object.');
  assert(JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()),'Unexpected JSON keys.');
}
function explanation(value) {assert(typeof value==='string' && value.trim().length>0 && value.length<=8192,'Missing or oversized explanatory text.');}
function validate(scenario, json) {
  if (scenario.action==='ai_copilot_quote') {
    exactKeys(json,['customer_name','customer_company','customer_email','discount_pct','items','executive_reasoning']);
    assert(json.customer_name==='Language QA' && typeof json.customer_company==='string' && json.customer_email==='language@example.invalid','Synthetic customer extraction changed.');
    assert(json.discount_pct===18 && Array.isArray(json.items) && json.items.length===1,'Requested discount or item count changed.');
    exactKeys(json.items[0],['sku','quantity','discount_pct']);
    assert(json.items[0].sku==='LANG-SKU' && json.items[0].quantity===1 && json.items[0].discount_pct===18,'Catalogue SKU, cases or requested discount changed.');
    explanation(json.executive_reasoning);
    return {executive_reasoning:json.executive_reasoning};
  }
  exactKeys(json,['executive_reasoning','studio_command']);
  exactKeys(json.studio_command,['recommended_view','status_filter','assistant_reply']);
  assert(json.studio_command.recommended_view==='studio' && json.studio_command.status_filter==='PENDING_APPROVAL','Studio view/filter contract changed.');
  explanation(json.executive_reasoning); explanation(json.studio_command.assistant_reply);
  return {executive_reasoning:json.executive_reasoning,assistant_reply:json.studio_command.assistant_reply};
}
function privateDirectory() {
  if (!fs.existsSync(PRIVATE)) fs.mkdirSync(PRIVATE,{mode:0o700});
  const stat = fs.lstatSync(PRIVATE);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077)===0,'Use a real, owner-private .payflow-private directory (0700).');
}
function loadKey() {
  privateDirectory();
  const filename = path.join(PRIVATE,'gemini-language-test.key');
  const stat = fs.lstatSync(filename);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size>0 && stat.size<=512 && (stat.mode & 0o077)===0,'Use an owner-private key file (0600), never a symlink.');
  const key = fs.readFileSync(filename,'utf8').trim();
  assert(/^[A-Za-z0-9_-]{20,256}$/.test(key),'Invalid private test key format.');
  return key;
}
function redact(value, key) {
  return String(value).split(key).join('[REDACTED]').slice(0,8192);
}
async function main(args = process.argv.slice(2)) {
  assert(args.length===0 || (args.length===1 && args[0]==='--live'),'Usage: node scripts/check-gemini-language.cjs [--live]');
  const live = args[0]==='--live';
  const source = fs.readFileSync(WORKFLOW,'utf8'), workflow = JSON.parse(source), url = endpoint(workflow);
  const bodies = await Promise.all(scenarios.map(s=>request(workflow,s)));
  const model = url.pathname.split('/').pop().split(':')[0];
  if (!live) {
    console.log(JSON.stringify({mode:'OFFLINE_PLAN',model,scenario_ids:scenarios.map(s=>s.id),maximum_calls:4,automatic_retries:0,financial_calls:0,language:'NOT_VERIFIED'},null,2));
    return;
  }
  const key = loadKey();
  const report = {class:'INTEGRATION_TEST',scope:'Isolated runner/direct Gemini provider prompt/JSON check with synthetic context; not n8n/database/PayPal end-to-end',started_at:new Date().toISOString(),workflow_sha256:crypto.createHash('sha256').update(source).digest('hex'),model,language_verdict:'NOT_VERIFIED',human_review_required:true,cases:[]};
  let failure = false;
  for (let index=0; index<scenarios.length;index++) {
    const s = scenarios[index], body = JSON.stringify(bodies[index]);
    const item = {id:s.id,input_language:s.input_language,action:s.action,request_sha256:crypto.createHash('sha256').update(body).digest('hex'),contract:'NOT_VERIFIED',language:'NOT_VERIFIED'};
    report.cases.push(item);
    try {
      const response = await fetch(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-goog-api-key':key},body,signal:AbortSignal.timeout(25000)});
      item.http_status = response.status;
      if (!response.ok) {item.error='Provider rejected request; no raw provider diagnostic exported.'; failure=true;break;}
      const envelope = await response.json();
      const candidate = envelope.candidates?.[0];
      assert(candidate?.finishReason==='STOP','Provider did not complete a normal response.');
      const output = candidate.content?.parts?.filter(p=>typeof p.text==='string' && p.thought!==true).map(p=>p.text).join('');
      assert(output && output.length<=32768,'Provider returned missing or oversized JSON text.');
      const excerpts = validate(s,JSON.parse(output));
      item.contract = 'PASS';
      item.excerpts_for_private_human_review = Object.fromEntries(Object.entries(excerpts).map(([k,v])=>[k,redact(v,key)]));
    } catch {
      item.error='Request, response parsing or contract check failed; no raw diagnostic exported.';
      item.contract='FAIL'; failure=true;break;
    }
  }
  report.finished_at = new Date().toISOString();
  report.provider_contract_verdict = failure?'FAIL':'PASS';
  const filename = path.join(PRIVATE,`gemini-language-proof-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
  fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({provider_contract:report.provider_contract_verdict,completed_requests:report.cases.length,language:'NOT_VERIFIED',human_review_required:true,report_file:path.relative(ROOT,filename),payment_calls:0},null,2));
  if (failure) process.exitCode=1;
}
if (require.main===module) main().catch(()=>{console.error('Isolated test refused or failed. Check the documented candidate-only key configuration; no secret or raw diagnostic displayed.');process.exitCode=1;});
module.exports={endpoint,request,validate,redact,scenarios};
