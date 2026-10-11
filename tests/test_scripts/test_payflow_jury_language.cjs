const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const workflow=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../workflows/10_payflow_hackathon/13_PayFlow_PayPal_Invoicing_Sandbox.json'),'utf8'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const product={id:'LANG-PRODUCT',sku:'LANG-SKU',name:'Language test product',currency:'USD',unit_price:240,unit_cost:120,max_discount_pct:10,min_margin_pct:20,stock_on_hand:15,stock_reserved:0,is_active:true};
for(const [language,prompt] of [['English','Client: Language QA (language@example.invalid). Order 1 case of LANG-SKU with an 18% discount.'],['French','Client: Language QA (language@example.invalid). Commande : 1 caisse de LANG-SKU avec 18% de remise.']]){
 test(`Gemini request preserves ${language} input and JSON contract with English output instructions`,async()=>{
  const node=workflow.nodes.find(n=>n.name==='Préparer la demande Gemini');
  const selector=name=>({first:()=>({json:name==='Webhook PayFlow Engine'?{body:{action:'ai_copilot_quote',prompt}}:{catalog:[product],portfolio:{total_orders:0}}})});
  const result=await new AsyncFunction('$',node.parameters.jsCode)(selector);
  const request=JSON.parse(result[0].json.gemini_request),text=request.contents[0].parts[0].text;
  assert.ok(text.includes(JSON.stringify(prompt)));assert.ok(text.includes(JSON.stringify([product])));
  assert.match(text,/Understand requests in French or English/);assert.match(text,/write all explanatory text in English/);
  const schemas=[...text.matchAll(/\{[^\n]+\}/g)].map(m=>{try{return JSON.parse(m[0])}catch{return null}}).filter(Boolean);
  const quote=schemas.find(s=>Array.isArray(s.items));assert.deepEqual(Object.keys(quote),['customer_name','customer_company','customer_email','discount_pct','items','executive_reasoning']);
  assert.deepEqual(Object.keys(quote.items[0]),['sku','quantity','discount_pct']);
  const studio=schemas.find(s=>s.studio_command);assert.deepEqual(Object.keys(studio.studio_command),['recommended_view','status_filter','assistant_reply']);
  assert.equal(request.generationConfig.responseMimeType,'application/json');
 });
}
test('English generated quote explanation preserves values, anomaly codes and internal-review outcome',async()=>{
 const body={action:'ai_copilot_quote',order_id:'LANG-ORDER',prompt:'Client: Language QA (language@example.invalid). Order 1 case of LANG-SKU with an 18% discount.'};
 const records={'Webhook PayFlow Engine':{body,headers:{'x-payflow-secret':'language-unit-fixture'}},'Postgres: Load Context & State':{secret_hash:crypto.createHash('sha256').update('language-unit-fixture').digest('hex'),catalog:[product],target_order:null},'Vérifier la session opérateur':{auth_valid:true,operator_identity:'language-unit'},'Gemini Copilot API':{candidates:[{content:{parts:[{text:JSON.stringify({customer_name:'Language QA',customer_company:'Language QA',customer_email:'language@example.invalid',discount_pct:18,items:[{sku:'LANG-SKU',quantity:1,discount_pct:18}],executive_reasoning:'One catalogue case with the requested discount.'})}]}}]}};
 const selector=name=>({isExecuted:Object.hasOwn(records,name),first:()=>({json:records[name]||{}}),all:()=>Object.hasOwn(records,name)?[{json:records[name]}]:[]});
 const node=workflow.nodes.find(n=>n.name.startsWith('Stage 1:'));
 const result=(await new AsyncFunction('$input','$','require','Buffer',node.parameters.jsCode)({first:()=>({json:body})},selector,require,Buffer))[0].json;
 assert.equal(result.order_status,'PENDING_APPROVAL');assert.equal(result.llm_proof.llm_invoked,true);
 assert.match(result.copilot_explanation,/Quote .*196\.80 USD.*Issues detected \[DISCOUNT_LIMIT_EXCEEDED\].*internal human review/s);
 assert.doesNotMatch(result.copilot_explanation,/Devis|marge nette|validation humaine/);
 assert.equal(result.total_amount,196.8);
});
