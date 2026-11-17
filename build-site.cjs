const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const [production,preview,out]=process.argv.slice(2);if(!production||!preview||!out)throw Error('usage: node build-site.cjs production preview out');
const files=['index.html','engine.js','network.js','ui.js','style.css','peerjs.min.js','tests.html','tests.js','tests-network.js','README.md','RULES.md','DEVICE-CHECKLIST.md','TEST-REPORT.md','RELEASE.md','rollback-v2.html'];
function copy(src,dst){fs.mkdirSync(dst,{recursive:true});for(const f of files){const p=path.join(src,f);if(fs.existsSync(p))fs.copyFileSync(p,path.join(dst,f));}fs.writeFileSync(path.join(dst,'.nojekyll'),'');const n=fs.readFileSync(path.join(src,'network.js'),'utf8'),version=n.match(/VERSION='([^']+)'/)?.[1]||'unknown';fs.writeFileSync(path.join(dst,'build.json'),JSON.stringify({version,commit:execFileSync('git',['-C',src,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),built:new Date().toISOString()},null,2));}
copy(production,out);copy(preview,path.join(out,'preview'));
