import {readFileSync} from 'node:fs';

// The package manifest ships beside dist/ in npm and desktop bundles.
const manifest=JSON.parse(
  readFileSync(new URL('../package.json',import.meta.url),'utf8')
) as {version?:unknown};

if(typeof manifest.version!=='string'||!manifest.version.trim()){
  throw new Error('Easy Local MCP package.json is missing its release version');
}

export const AGENT_VERSION=manifest.version;
