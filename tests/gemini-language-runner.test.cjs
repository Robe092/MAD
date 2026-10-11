const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {endpoint,request,validate,redact,scenarios} = require('../scripts/check-gemini-language.cjs');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname,'../workflows/10_payflow_hackathon/13_PayFlow_PayPal_Invoicing_Sandbox.json'),'utf8'));
test('Offline harness uses candidate prompt and FR/EN quote/Studio fixtures without networking',async()=>{
  assert.equal(scenarios.length,4);
  assert.equal(endpoint(workflow).hostname,'generativelanguage.googleapis.com');
  for (const s of scenarios) {
    const body=await request(workflow,s);
    const text=body.contents[0].parts[0].text;
    assert.ok(text.includes(JSON.stringify(s.prompt)));
    assert.match(text,/write all explanatory text in English/);
    assert.match(text,/LANG-SKU/);
    const portfolioLine=text.split('\n').find(line=>line.startsWith('Actual portfolio'));
    const actualPortfolio=JSON.parse(portfolioLine.slice(portfolioLine.indexOf(': ')+2));
    assert.equal(actualPortfolio.length,3);
    assert.deepEqual(Object.keys(actualPortfolio[0]),['id','customer_company','status','total_amount','computed_margin_pct']);
    assert.equal(body.generationConfig.responseMimeType,'application/json');
  }
});
test('Runner refuses non-Google destinations, redirects/auth in URL and altered contracts',()=>{
  for(const url of ['http://generativelanguage.googleapis.com/v1beta/models/x:generateContent','https://example.invalid/v1beta/models/x:generateContent','https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=test','https://user:pass@generativelanguage.googleapis.com/v1beta/models/x:generateContent']){
    const changed=structuredClone(workflow);changed.nodes.find(n=>n.name==='Gemini Copilot API').parameters.url=url;
    assert.throws(()=>endpoint(changed));
  }
  const quote={customer_name:'Language QA',customer_company:'Language QA',customer_email:'language@example.invalid',discount_pct:18,items:[{sku:'LANG-SKU',quantity:1,discount_pct:18}],executive_reasoning:'One case with the requested discount; internal controls still apply.'};
  assert.ok(validate(scenarios[0],quote).executive_reasoning);
  assert.throws(()=>validate(scenarios[0],{...quote,discount_pct:10}));
  assert.throws(()=>validate(scenarios[0],{...quote,unexpected:'field'}));
  assert.throws(()=>validate(scenarios[0],{...quote,items:[{...quote.items[0],sku:'invented'}]}));
  assert.throws(()=>validate(scenarios[0],{...quote,executive_reasoning:''}));
});
test('Studio response contract and private excerpt redaction do not certify English automatically',()=>{
  const studio={executive_reasoning:'Three orders are recorded.',studio_command:{recommended_view:'studio',status_filter:'PENDING_APPROVAL',assistant_reply:'Show pending internal approvals; no receipt total is supplied.'}};
  assert.ok(validate(scenarios[2],studio).assistant_reply);
  assert.throws(()=>validate(scenarios[2],{...studio,studio_command:{...studio.studio_command,status_filter:'PAID'}}));
  assert.equal(redact('before fixture-secret after fixture-secret','fixture-secret'),'before [REDACTED] after [REDACTED]');
});
