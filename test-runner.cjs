const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const context=vm.createContext({crypto:webcrypto,console});
vm.runInContext(fs.readFileSync(__dirname+'/engine.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/tests.js','utf8'),context);
const r=vm.runInContext('runTests()',context);
console.log(JSON.stringify(r,null,2));
if(r.total!==r.passed)process.exit(1);
