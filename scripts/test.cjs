const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend-payflow');
const suites = [
  {cwd:root, files:fs.readdirSync(path.join(root,'tests/test_scripts')).filter(f=>f.startsWith('test_payflow_') && f.endsWith('.cjs')).map(f=>'tests/test_scripts/'+f)},
  {cwd:frontend, files:fs.readdirSync(path.join(frontend,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f)},
  {cwd:root, files:fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f)}
];
for (const suite of suites) {
  if (!suite.files.length) continue;
  const result = spawnSync(process.execPath, ['--test', ...suite.files], {cwd:suite.cwd,stdio:'inherit'});
  if (result.status !== 0) {process.exitCode=result.status || 1;break;}
}
