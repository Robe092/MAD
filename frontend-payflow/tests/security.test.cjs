const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os'), crypto=require('node:crypto');
const Module=require('node:module'),ts=require('typescript');
const cache={};
const compile=(file)=>{if(cache[file])return cache[file];const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod.require=(id)=>id.startsWith('@/')?compile(path.resolve('src',id.slice(2)+'.ts')):id.startsWith('.')?compile(path.resolve(path.dirname(file),id+'.ts')):Module.prototype.require.call(mod,id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);return cache[file]=mod.exports;};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'payflow-auth-'));
const keys=crypto.generateKeyPairSync('ed25519');const salt=crypto.randomBytes(32).toString('hex');
const config={version:'unit-v1',username:'unit-operator',subject:crypto.randomUUID(),role:'operator',salt,passwordHash:crypto.scryptSync('unit-test-password',salt,64).toString('hex'),sessionSecret:crypto.randomBytes(32).toString('hex'),privateKey:keys.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:keys.publicKey.export({type:'spki',format:'pem'})};
process.env.PAYFLOW_AUTH_CONFIG=path.join(dir,'operator.json');process.env.PAYFLOW_ENGINE_SECRET='unit-engine-placeholder';fs.writeFileSync(process.env.PAYFLOW_AUTH_CONFIG,JSON.stringify(config),{mode:0o600});
after(()=>fs.rmSync(dir,{recursive:true,force:true}));
const auth=compile(path.resolve('src/lib/operator-auth.ts'));
const {POST}=compile(path.resolve('src/app/api/payflow/route.ts'));
const operator=compile(path.resolve('src/app/api/operator/route.ts'));
const {NextRequest}=require('next/server');
const session=auth.authenticate('unit-operator','unit-test-password');const token=auth.signSession(session);
const request=(body,headers={},authenticated=true)=>new NextRequest('http://localhost:3006/api/payflow',{method:'POST',headers:{'Content-Type':'application/json',host:'localhost:3006',origin:'http://localhost:3006',...(authenticated?{cookie:`${auth.SESSION_COOKIE}=${token}`,'x-payflow-csrf':session.csrf}:{}),...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const privileged=['approve_order','reject_order','cancel_order','create_paypal_transaction','create_and_send_invoice','reconcile_payment','verify_payment_status'];
for(const action of privileged) test(`${action}: forged authorization cannot reach upstream`,async()=>{let calls=0;const original=global.fetch;global.fetch=async()=>{calls++;throw Error('unexpected');};try{assert.equal((await POST(request({action,operator_key:'forged',approver_identity:'admin'}, {},false))).status,401);assert.equal(calls,0);}finally{global.fetch=original;}});
test('authentication rejects wrong password and forged, expired, invalid-role and revoked sessions',()=>{assert.equal(auth.authenticate('unit-operator','bad'),null);assert.equal(auth.sessionFromToken(token+'bad'),null);assert.ok(auth.sessionFromToken(token));for(const patch of [{exp:session.iat-1},{role:'admin'},{version:'bad'}])assert.equal(auth.sessionFromToken(auth.signSession({...session,sid:crypto.randomUUID(),...patch})),null);const s=auth.authenticate('unit-operator','unit-test-password');const t=auth.signSession(s);auth.revokeSession(s);assert.equal(auth.sessionFromToken(t),null);});
test('CSRF and cross-origin rejected',async()=>{assert.equal((await POST(request({action:'get_dashboard_state'},{'x-payflow-csrf':'bad'}))).status,403);assert.equal((await POST(request({action:'get_dashboard_state'},{origin:'https://untrusted.example'}))).status,403);});
test('malformed, array, oversized bodies and unknown actions rejected',async()=>{for(const body of ['{',[]])assert.equal((await POST(request(body))).status,400);assert.equal((await POST(request(' '.repeat(20001)))).status,413);assert.equal((await POST(request({action:'delete_all'}))).status,403);});
test('gateway strips credentials and simulation flags; assertion binds canonical body and operator',async()=>{const original=global.fetch;let forwarded;global.fetch=async(url,opts)=>{forwarded=opts;return new Response('{"status":"success"}');};try{assert.equal((await POST(request({action:'approve_order',order_id:'UNIT',operator_key:'forged',_internal_secret:'forged',_test_verified_capture_settlement:true,simulate_paypal_error:true,approval_threshold:0,approver_identity:'admin'}))).status,200);const body=JSON.parse(forwarded.body);assert.deepEqual(body,{action:'approve_order',order_id:'UNIT',approver_identity:session.sub});const [payload,sig]=forwarded.headers['X-PayFlow-Operator-Assertion'].split('.');assert.ok(crypto.verify(null,Buffer.from(payload),config.publicKey,Buffer.from(sig,'base64url')));const c=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(c.sub,session.sub);assert.equal(c.body_sha256,crypto.createHash('sha256').update(forwarded.body).digest('hex'));assert.equal(c.exp-c.iat,90);}finally{global.fetch=original;}});
test('AI requests require non-empty bounded prompts',async()=>{for(const action of ['ai_copilot_quote','ai_studio_agent'])for(const prompt of ['', ' ',42,'a'.repeat(6001)])assert.equal((await POST(request({action,prompt}))).status,400);});
test('logout revokes the actual cookie; cookies are HttpOnly and Strict',async()=>{const req=new NextRequest('http://localhost:3006/api/operator',{method:'DELETE',headers:{host:'localhost:3006',origin:'http://localhost:3006',cookie:`${auth.SESSION_COOKIE}=${token}`,'x-payflow-csrf':session.csrf}});const response=await operator.DELETE(req);assert.equal(response.status,200);assert.equal(auth.sessionFromToken(token),null);assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/SameSite=strict/i);});
const {isCaptured,isSimulated,settlementLabel}=compile(require('node:path').resolve('src/lib/payflow.ts'));
test('only verified captures count as receipts',()=>{
 const order={status:'PAID',invoice:{capture_id:'capture',paypal_status:'COMPLETED'}};
 assert.equal(isCaptured(order),true);
 assert.equal(isCaptured({...order,invoice:{capture_id:'CAP-TEST-123',paypal_status:'COMPLETED'}}),false);
 assert.equal(isCaptured({...order,settlement_mode:'SIMULATED_SQL_TEST_T6C'}),false);
 assert.equal(isCaptured({...order,invoice:{paypal_status:'COMPLETED'}}),false);
 assert.equal(isCaptured({...order,invoice:{capture_id:'capture',paypal_status:'PENDING'}}),false);
 assert.equal(isSimulated({...order,invoice:{capture_id:'CAP-TEST-123'}}),true);
 assert.equal(settlementLabel({...order,invoice:{}}),'Capture needs verification');
});

const {withStatusFilter}=compile(require('node:path').resolve('src/lib/studio-state.ts'));
test('Studio status command filters the selected page and preserves widgets',()=>{
 const widget={type:'value'};const state={selectedPageId:'a',pages:[{id:'a',widgets:{total:widget},filter:{page:[{field:{id:'orders.settlement_label'},model:{operator:'equals',value:'Approuvée'}}]},crossFilter:{test:'fixture'}},{id:'b'}]};
 const filtered=withStatusFilter(state,'PENDING_HITL');
 assert.deepEqual(filtered.pages[0].filter.page,[{field:{id:'orders.status'},model:{operator:'equals',value:'PENDING_APPROVAL'}}]);
 assert.equal(filtered.pages[0].widgets.total,widget);assert.equal(filtered.pages[1],state.pages[1]);assert.equal(filtered.pages[0].crossFilter,undefined);assert.notEqual(filtered,state);assert.equal(state.pages[0].filter.page[0].field.id,'orders.settlement_label');
 assert.equal(withStatusFilter(state,'untrusted-status'),null);
});
test('Studio reset clears page, widget and cross filters',()=>{
 const state={selectedPageId:'a',pages:[{id:'a',crossFilter:{test:'fixture'},filter:{page:[{field:{id:'orders.status'},model:{operator:'equals',value:'PAID'}}],widget:{test:[]}}}]};
 const result=withStatusFilter(state,'ALL');assert.deepEqual(result.pages[0].filter.page,[]);assert.equal(result.pages[0].filter.widget,undefined);assert.equal(result.pages[0].crossFilter,undefined);
});

test('remote-origin cookies require Secure despite internal localhost URL normalization',()=>{const req=new NextRequest('http://localhost:3006/api/operator',{headers:{host:'payflow.example',origin:'https://payflow.example'}});assert.equal(auth.cookieOptions(req).secure,true);});

test('login rate limiting cannot be bypassed with forged forwarded addresses',async()=>{for(let i=0;i<8;i++){const req=new NextRequest('http://localhost:3006/api/operator',{method:'POST',headers:{host:'localhost:3006',origin:'http://localhost:3006','content-type':'application/json','x-forwarded-for':`192.0.2.${i}`},body:JSON.stringify({username:'unit-operator',password:'wrong'})});assert.equal((await operator.POST(req)).status,401);}const req=new NextRequest('http://localhost:3006/api/operator',{method:'POST',headers:{host:'localhost:3006',origin:'http://localhost:3006','x-forwarded-for':'198.51.100.1'},body:JSON.stringify({username:'unit-operator',password:'unit-test-password'})});assert.equal((await operator.POST(req)).status,429);});
