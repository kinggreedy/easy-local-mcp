// Wrangler bundles this manifest into the Worker at deployment time. The
// Agent reads its own installed manifest at runtime, so their reported
// releases can differ when they are deployed independently.
import release from '../package.json' with {type:'json'};

export const WORKER_RELEASE_VERSION=release.version;

export function zoneMcpServerVersion():string{
  return WORKER_RELEASE_VERSION;
}
