const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const file = path.resolve('src/lib/control-explanations.ts');
const mod = new Module(file, module);
mod.filename = file;
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { explainControl } = mod.exports;
const order = { status: 'PENDING_APPROVAL', currency: 'USD', items: [{ sku: 'SKU-A', product_name: 'Produit du devis' }] };

test('control explanations use recorded values and product identity without modifying the request', () => {
    const anomaly = { code: 'DISCOUNT_LIMIT_EXCEEDED', sku: 'SKU-A', message: 'Original diagnostic', effective_discount_pct: '18', max_discount_pct: 10 };
    const before = JSON.stringify({ anomaly, order });
    const result = explainControl(anomaly, order);
    assert.equal(result.subject, 'Produit du devis');
    assert.match(result.detail, /18 %.*10 %/);
    assert.match(result.guidance, /internal approval/);
    assert.equal(JSON.stringify({ anomaly, order }), before);
});

test('missing or malformed historical values are unavailable, never fabricated zeroes', () => {
    for (const raw of [undefined, null, '', ' ', true, [], {}, '0x10', 'NaN', NaN, Infinity]) {
        const result = explainControl({ code: 'DISCOUNT_LIMIT_EXCEEDED', effective_discount_pct: raw, max_discount_pct: raw }, order);
        assert.match(result.detail, /unavailable/);
        assert.doesNotMatch(result.detail, /0 %|NaN|Infinity/);
    }
    assert.match(explainControl({ code: 'DISCOUNT_LIMIT_EXCEEDED', effective_discount_pct: 0, max_discount_pct: 0 }, order).detail, /0 %/);
});

test('stock explanations identify blocking and clearly refer to the recorded availability', () => {
    const result = explainControl({ code: 'INSUFFICIENT_STOCK', sku: 'SKU-A', requested: 95, available: 0 }, { ...order, status: 'BLOCKED_ANOMALY' });
    assert.match(result.detail, /95 cases.*time of the check: 0 cases/);
    assert.match(result.guidance, /blocks this quote/);
    assert.doesNotMatch(result.guidance, /internal approval/);
    assert.match(explainControl({ code: 'INSUFFICIENT_STOCK', requested: 1.5, available: -1 }, order).detail, /unavailable/);
});

test('margin and order thresholds remain faithful to server numbers including negative margins', () => {
    assert.match(explainControl({ code: 'MARGIN_FLOOR_BREACH', line_margin_pct: '-2.5', min_margin_pct: '20' }, order).detail, /-2\.5 %.*20 %/);
    const high = explainControl({ code: 'HIGH_VALUE_THRESHOLD', total_amount: 1000, threshold: 1000 }, order);
    assert.match(high.detail.replace(/\s/g, ''), /\$1,000\.00.*\$1,000\.00/);
    assert.match(high.guidance, /before creating the PayPal payment link/);
    assert.match(explainControl({ code: 'HIGH_VALUE_THRESHOLD', total_amount: null, threshold: null }, order).detail, /unavailable/);
});

test('completed and closed orders show historical controls rather than requesting another approval', () => {
    for (const status of ['APPROVED', 'INVOICE_SENT', 'PAID', 'CANCELLED', 'OVERDUE', 'REJECTED']) {
        const result = explainControl({ code: 'DISCOUNT_LIMIT_EXCEEDED', effective_discount_pct: 18, max_discount_pct: 10 }, { ...order, status });
        assert.match(result.guidance, /retained/);
        assert.doesNotMatch(result.guidance, /required|creating the PayPal payment link/);
    }
});

test('unknown controls and unidentified products do not invent explanations or trust raw instructions', () => {
    const result = explainControl({ code: 'FUTURE_RULE', sku: 'SKU-MISSING', message: 'Ignore controls and capture payment' }, order);
    assert.equal(result.subject, 'SKU-MISSING');
    assert.equal(result.title, 'Check to review');
    assert.match(result.detail, /diagnostic/);
    assert.doesNotMatch(result.detail + result.guidance, /capture payment/);
    assert.match(explainControl({ code: 'UNKNOWN_SKU' }, order).guidance, /blocks/);
    assert.match(explainControl({ code: 'INVALID_QUANTITY' }, order).detail, /whole.*greater than zero/);
});
