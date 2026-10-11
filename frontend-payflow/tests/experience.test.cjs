const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache={};
function compile(file){if(cache[file])return cache[file];const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod.require=id=>id==='./payflow'?compile(path.resolve('src/lib/payflow.ts')):Module.prototype.require.call(mod,id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return cache[file]=mod.exports;}
const {nextOrderStep,orderJourney}=compile(path.resolve('src/lib/experience.ts'));
const invoice={resource_type:'PAYPAL_ORDER_V2',paypal_status:'COMPLETED',capture_id:'real-capture'};
test('journey requires verified capture before declaring payment complete',()=>{
 const captured={status:'PAID',invoice};
 assert.equal(nextOrderStep(captured).title,'Paiement confirmé');
 assert.equal(orderJourney(captured)[3].state,'done');
 for(const order of [{status:'PAID'},{status:'PAID',invoice:{...invoice,capture_id:null}},{status:'PAID',invoice:{...invoice,paypal_status:'PENDING'}},{status:'INVOICE_SENT',invoice}])assert.notEqual(orderJourney(order)[3].state,'done');
 assert.equal(nextOrderStep({status:'PAID'}).title,'Paiement à vérifier');
});
test('simulations never imply buyer authorization or confirmed receipt',()=>{
 for(const order of [{status:'PAID',invoice:{...invoice,capture_id:'CAP-TEST-123'}},{status:'PAID',invoice,settlement_mode:'SIMULATED_SQL_TEST_T6C'}]){
  assert.equal(nextOrderStep(order).title,'Règlement simulé');
  assert.equal(orderJourney(order)[2].state,'waiting');
  assert.equal(orderJourney(order)[3].state,'waiting');
 }
});
test('internal approval is distinct from buyer authorization',()=>{
 const order={status:'APPROVED'};
 assert.equal(nextOrderStep(order).title,'Préparer le paiement PayPal');
 assert.equal(orderJourney(order)[1].state,'done');
 assert.equal(orderJourney(order)[2].state,'waiting');
 const authorized={status:'INVOICE_SENT',invoice:{...invoice,paypal_status:'APPROVED',capture_id:null}};
 assert.equal(nextOrderStep(authorized).title,'Confirmer la capture');
 assert.equal(orderJourney(authorized)[2].state,'done');
 assert.equal(orderJourney(authorized)[3].state,'current');
 const invoicing={...authorized,invoice:{...authorized.invoice,resource_type:'PAYPAL_INVOICE'}};
 assert.notEqual(nextOrderStep(invoicing).title,'Confirmer la capture');
 assert.notEqual(orderJourney(invoicing)[2].state,'done');
});
test('closed and blocked orders do not suggest a new financial action',()=>{
 for(const status of ['CANCELLED','OVERDUE','REJECTED'])assert.equal(nextOrderStep({status,invoice:{...invoice,paypal_status:'APPROVED'}}).title,'Commande clôturée');
 assert.equal(nextOrderStep({status:'BLOCKED_ANOMALY'}).title,'Examiner les contrôles');
 assert.equal(orderJourney({status:'BLOCKED_ANOMALY'})[0].state,'stop');
 assert.equal(nextOrderStep({status:'PENDING_APPROVAL'}).title,'Valider le devis en interne');
});
