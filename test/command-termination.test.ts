import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runCommand} from '../src/command.js';

const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

test('a timed-out shell command also terminates its nested child', {
  timeout: 12000
}, async t=>{
  const root=await mkdtemp(join(tmpdir(),'localmcp-command-timeout-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const started=join(root,'started.txt');
  const finished=join(root,'finished.txt');
  const script=`const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(started)},'started');setTimeout(()=>fs.writeFileSync(${JSON.stringify(finished)},'finished'),3500)`;
  const command=JSON.stringify(process.execPath)+' -e '+JSON.stringify(script);
  const result=await runCommand(command,root,1500);
  assert.equal(result.timedOut,true);
  assert.equal(await readFile(started,'utf8'),'started','nested child must start before the timeout');
  // A Windows shell can exit while the actual Node command survives and
  // writes this marker later. Killing the complete tree prevents that.
  await pause(2300);
  await assert.rejects(readFile(finished,'utf8'),{code:'ENOENT'});
});
