import 'dotenv/config';
import {spawn} from 'node:child_process';

const port=39001,base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),CLIENT_ORIGIN:base,PUBLIC_APP_URL:base},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
try{
  let ok=false;
  for(let i=0;i<60;i++){
    if(child.exitCode!==null)throw Error(`Servidor terminado: ${output}`);
    try{const page=await fetch(base);const html=await page.text();if(page.ok&&html.includes('root')){const response=await fetch(base+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Producción'})});if(!response.ok)throw Error('API no disponible');ok=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ok)throw Error(`Servidor no disponible: ${output}`);
  console.log('Producción: frontend compilado y API servidos por Node, correcto.');
}finally{child.kill();}
