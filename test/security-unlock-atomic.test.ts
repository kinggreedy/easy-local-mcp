import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

test('unlock state updates atomically while privileged requests renew it',{timeout:20000},async()=>{
  const home=await mkdtemp(join(tmpdir(),'localmcp-unlock-atomic-'));
  try{
    // Import in a child process so the security module resolves an isolated HOME.
    const script=`
      import assert from 'node:assert/strict';
      import {open,readFile} from 'node:fs/promises';
      const security=await import(process.env.SECURITY_MODULE_URL);
      const config={
        alwaysUnlocked:false,
        renewUnlockOnPrivilegedUse:true,
        unlockIdleMinutes:5,
        unlockMaxSessionMinutes:240
      };

      await security.unlockLocal(5);
      assert.equal((await security.getUnlockStatus()).locked,false);

      // An already-open reader must still see the complete old lease.
      // In-place writes overwrite that reader's file; atomic rename does not.
      if(process.platform!=='win32'){
        const oldContent=await readFile(security.unlockFile,'utf8');
        const oldHandle=await open(security.unlockFile,'r');
        try{
          await security.unlockLocal(15);
          assert.equal(await oldHandle.readFile('utf8'),oldContent);
        }finally{
          await oldHandle.close();
        }
      }

      await security.unlockLocal(5);
      // Privileged MCP operations are serialized by the HTTP mutation gate,
      // while status reads may overlap a renewal. Exercise that workload
      // rather than 64 simultaneous writers to one Windows destination.
      for(let round=0;round<12;round++){
        const statuses=await Promise.all([
          security.renewUnlockLease(config),
          ...Array.from({length:7},()=>security.getUnlockStatus())
        ]);
        assert.ok(statuses.every(status=>!status.locked),
          'A renewal overlapping status reads must preserve unlock (round '+round+')');
      }
      assert.equal((await security.getUnlockStatus()).locked,false);

      await security.lockLocal('test');
      assert.equal((await security.getUnlockStatus()).locked,true);
      await security.unlockLocal(5);
      assert.equal((await security.getUnlockStatus()).locked,false);
    `;

    const result=await new Promise<{code:number|null;output:string}>((resolveResult,reject)=>{
      const child=spawn(process.execPath,['--input-type=module','-e',script],{
        cwd:process.cwd(),
        env:{
          ...process.env,
          HOME:home,
          USERPROFILE:home,
          SECURITY_MODULE_URL:pathToFileURL(resolve('dist/security.js')).href
        },
        windowsHide:process.platform==='win32',
        stdio:['ignore','pipe','pipe']
      });
      let output='';
      child.stdout?.on('data',chunk=>{output+=chunk.toString();});
      child.stderr?.on('data',chunk=>{output+=chunk.toString();});
      child.once('error',reject);
      child.once('close',code=>resolveResult({code,output}));
    });
    assert.equal(result.code,0,result.output);
  }finally{
    await rm(home,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
