import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AGENT_VERSION} from '../src/version.js';
import {WORKER_RELEASE_VERSION,zoneMcpServerVersion} from '../worker/version.js';
import {reportedAgentVersion} from '../worker/device-version.js';

test('Agent version follows package.json across release bumps',()=>{
  const manifest=JSON.parse(
    readFileSync(new URL('../package.json',import.meta.url),'utf8')
  ) as {version:string};
  assert.equal(AGENT_VERSION,manifest.version);
  assert.doesNotMatch(
    readFileSync(new URL('../src/agent.ts',import.meta.url),'utf8'),
    /x-localmcp-zone-id/
  );

  for(const path of ['../src/agent.ts','../src/server.ts','../src/mcp/loader.ts']){
    const source=readFileSync(new URL(path,import.meta.url),'utf8');
    assert.match(source,/AGENT_VERSION/);
    assert.doesNotMatch(source,/version:\s*['"]\d+\.\d+\.\d+['"]/);
  }
});

test('Worker reports its bundled release version, not a deployment UUID',()=>{
  const manifest=JSON.parse(
    readFileSync(new URL('../package.json',import.meta.url),'utf8')
  ) as {version:string};
  assert.equal(WORKER_RELEASE_VERSION,manifest.version);
  assert.equal(zoneMcpServerVersion(),WORKER_RELEASE_VERSION);
  assert.match(zoneMcpServerVersion(),/^\d+\.\d+\.\d+/);
});

test('reported Agent versions are descriptive, not compatibility restrictions',()=>{
  assert.equal(reportedAgentVersion('0.3.11'),'0.3.11');
  assert.equal(reportedAgentVersion('99.0.0'),'99.0.0');
  assert.equal(reportedAgentVersion(' 0.5.0-beta.1 '),'0.5.0-beta.1');
  assert.equal(reportedAgentVersion(''),undefined);
  assert.equal(reportedAgentVersion(' '.repeat(10)),undefined);
  assert.equal(reportedAgentVersion('x'.repeat(81)),undefined);
  assert.equal(reportedAgentVersion(123),undefined);
});
