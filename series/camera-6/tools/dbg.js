const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..');
(async()=>{const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(`http://localhost:${srv.address().port}/camera-6/${process.argv[2]}/index.html`);await p.waitForFunction('window.READY===true',null,{timeout:120000});
for(const t of process.argv[3].split(',').map(Number)){await p.evaluate(t=>window.renderAt(t),t);console.log(t,await p.evaluate(()=>JSON.stringify(window.DBG())));}
await b.close();srv.close();})();
