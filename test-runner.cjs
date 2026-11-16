const fs=require('node:fs');const vm=require('node:vm');const {webcrypto}=require('node:crypto');
const engine=fs.readFileSync(__dirname+'/engine.js','utf8'),network=fs.readFileSync(__dirname+'/network.js','utf8');
const context=vm.createContext({crypto:webcrypto,console,URL,URLSearchParams});
vm.runInContext(engine,context);vm.runInContext(fs.readFileSync(__dirname+'/tests.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/tests-network.js','utf8'),context);
context.engineSource=engine;context.networkSource=network;
const r=vm.runInContext('({engine:runTests(),network:runNetworkTests(engineSource,networkSource)})',context);console.log(JSON.stringify(r,null,2));
if(Object.values(r).some(s=>s.total!==s.passed))process.exit(1);
