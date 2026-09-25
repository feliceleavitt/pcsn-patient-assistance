const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path=require('node:path'), Module=require('node:module'), ts=require('typescript');
const root=path.resolve(__dirname,'..'), original=Module._load;
let session=null, calls=[], consent=false, startedAt=null;
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
Module._load=function(request,parent,main){
 if(request==='@/lib/security/patient') return {getPatientSession:async()=>session};
 if(request==='@/lib/supabase/server') return {createServiceClient:()=>({from:table=>{
  const q={select:columns=>{calls.push(['select',table,columns]);return q},eq:(k,v)=>{calls.push(['eq',k,v]);return q},gte:(k,v)=>{calls.push(["gte",k,v]);return q},order:async()=>({data:[],error:null}),maybeSingle:async()=>({data:{payload:{_requestStartedAt:startedAt,consent:{volunteerAccessConsent:consent}}}})};return q;
 }})};
 if(request.startsWith('@/')) request=path.join(root,request.slice(2));
 return original.call(this,request,parent,main);
};
const {GET,POST,DELETE}=require('../app/api/intake/documents/route.ts');
const {documentMime}=require('../lib/intake/documents.ts');
test('anonymous reads, writes and removals fail before storage',async()=>{
 for(const fn of [GET,POST,DELETE]) assert.equal((await fn(new Request('https://portal.example/api/intake/documents'))).status,401);
 assert.deepEqual(calls,[]);
});
test('document listing is owner-scoped and exposes no storage path or encryption metadata',async()=>{
 session={user:{id:'synthetic-owner'}};
 assert.equal((await GET()).status,200);
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='synthetic-owner'));
 assert.ok(calls.every(c=>c[0]!=='select'||!c[2].includes('storage_path')));
});
test('internal-only categories are rejected and patient uploads require saved consent',async()=>{
 const request=type=>{const f=new FormData();f.append('documentType',type);f.append('file',new File(['%PDF- synthetic'], 'synthetic.pdf',{type:'application/pdf'}));return new Request('https://portal.example/api/intake/documents',{method:'POST',headers:{origin:'https://portal.example'},body:f});};
 assert.equal((await POST(request('internal_record:private'))).status,400);
 assert.equal((await POST(request('photo_id'))).status,403);
});
test('file format is checked from bytes, not the caller-provided extension',()=>{
 assert.equal(documentMime(Buffer.from('<script>bad</script>')),null);
 assert.equal(documentMime(Buffer.from('%PDF-1.7 synthetic')),'application/pdf');
});

test('cross-origin draft mutations are rejected',async()=>{
 session={user:{id:'synthetic-owner'}};
 for(const fn of [POST,DELETE]) assert.equal((await fn(new Request('https://portal.example/api/intake/documents',{headers:{origin:'https://untrusted.example'}}))).status,403);
});

test('blank request only lists documents uploaded for its new start time',async()=>{startedAt='2026-09-23T00:00:00Z';calls=[];assert.equal((await GET()).status,200);assert.ok(calls.some(c=>c[0]==='gte'&&c[1]==='uploaded_at'&&c[2]===startedAt));});
