const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const file = path.resolve('src/lib/display-message.ts');
const mod = new Module(file, module);
mod.filename = file;
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, file);
const {displayMessage} = mod.exports;

test('English error presentation preserves the original customer refusal and payload', () => {
    const response = {status:'error', code:'CUSTOMER_INFORMATION_REQUIRED', missing_fields:['customer_email'], message:'Précisez l’adresse email du client dans votre demande. Aucun devis ni réservation créé.'};
    const original = JSON.stringify(response);
    assert.match(displayMessage(response.message), /customer email.*No quote or reservation/);
    assert.equal(JSON.stringify(response), original);
});

test('uncertain remote capture remains uncertain in English', () => {
    const text = displayMessage('La capture distante est observée mais le règlement local doit être vérifié.');
    assert.match(text, /local settlement needs verification/);
    assert.doesNotMatch(text, /payment confirmed|order is paid/i);
});

test('unknown diagnostics and provider analysis are preserved, never fabricated or interpreted', () => {
    for (const raw of ['Future provider diagnostic', 'Analyse libre du fournisseur', '__proto__', 'constructor', '<img src=x onerror=alert(1)>']) assert.equal(displayMessage(raw), raw);
    for (const raw of [null, undefined, {}, 0, '', ' ']) assert.equal(displayMessage(raw, 'Unavailable'), 'Unavailable');
});
