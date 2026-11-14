// Uses the existing Git credential manager. Credentials stay in process memory.
import { spawnSync } from 'node:child_process';
const repository='rfunes98/estudio-de-paracaidismo';
const command=process.argv[2]||'status';
const credential=spawnSync('git',['-c','credential.interactive=never','credential','fill'],{
  input:'protocol=https\nhost=github.com\nusername=rfunes98\n\n',encoding:'utf8',
  env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}
});
const token=credential.stdout?.match(/^password=(.*)$/m)?.[1];
if(!token){console.error('No hay una credencial de GitHub disponible en el administrador de credenciales.');process.exit(2);}
const headers={'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
async function api(endpoint,method='GET',body){
  const response=await fetch('https://api.github.com/repos/'+repository+endpoint,{method,headers,body:body?JSON.stringify(body):undefined});
  const data=response.status===204?{}:await response.json();return {status:response.status,data};
}
if(command==='enable'){
  const current=await api('/pages');
  if(current.status===404){const result=await api('/pages','POST',{build_type:'workflow'});console.log(JSON.stringify({status:result.status,url:result.data.html_url,message:result.data.message}));if(result.status>=400)process.exitCode=1;}
  else if(current.status===200&&current.data.build_type!=='workflow'){const result=await api('/pages','PUT',{build_type:'workflow'});console.log(JSON.stringify({status:result.status,message:result.data.message}));if(result.status>=400)process.exitCode=1;}
  else{console.log(JSON.stringify({status:current.status,url:current.data.html_url,build_type:current.data.build_type,message:current.data.message}));if(current.status>=400)process.exitCode=1;}
}else if(command==='logs'){
  const runs=await api('/actions/workflows/pages.yml/runs?per_page=1');
  const run=runs.data.workflow_runs?.[0];
  if(run){
    const jobs=await api(`/actions/runs/${run.id}/jobs`);
    for(const job of jobs.data.jobs||[]){
      console.log(JSON.stringify({name:job.name,status:job.status,conclusion:job.conclusion,steps:job.steps.map(s=>({name:s.name,conclusion:s.conclusion}))}));
      if(job.conclusion==='failure'){
        const response=await fetch(`https://api.github.com/repos/${repository}/actions/jobs/${job.id}/logs`,{headers});
        const text=await response.text();console.log(text.slice(-16000));
      }
    }
  }
}else if(command==='dispatch'){
  const response=await fetch('https://api.github.com/repos/'+repository+'/actions/workflows/pages.yml/dispatches',{method:'POST',headers,body:JSON.stringify({ref:'main'})});
  console.log(JSON.stringify({status:response.status}));if(response.status>=400)process.exitCode=1;
}else{
  const pages=await api('/pages');
  const runs=await api('/actions/workflows/pages.yml/runs?per_page=3');
  console.log(JSON.stringify({pages:{status:pages.status,url:pages.data.html_url,build_type:pages.data.build_type,message:pages.data.message},runs:(runs.data.workflow_runs||[]).map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha}))},null,2));
}
