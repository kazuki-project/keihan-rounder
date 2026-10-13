import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const base='https://kazuki-project.github.io/keihan-rounder/';
const paths=['index.html','styles.css','src/app.mjs','src/engine.mjs','src/stations.mjs','src/storage.mjs','src/adapter.mjs','sw.js','manifest.webmanifest','data-policy.html','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
const hash=b=>createHash('sha256').update(b).digest('hex'),results=[];
for(const p of paths){const r=await fetch(new URL(p,base),{cache:'no-store'});const body=Buffer.from(await r.arrayBuffer()),local=await readFile(`dist/${p}`);results.push({path:p,status:r.status,contentType:r.headers.get('content-type'),bytes:body.length,sha256:hash(body),matchesBuild:hash(body)===hash(local)});}
const record={verifiedAt:new Date().toISOString(),url:base,checks:results,passed:results.every(r=>r.status===200&&r.matchesBuild)};
await mkdir('evidence',{recursive:true});await writeFile('evidence/deployment.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));if(!record.passed)process.exitCode=1;
