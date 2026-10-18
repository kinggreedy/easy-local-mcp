// Relay Durable Objects accept this metadata only on an authenticated Agent
// connection. Versions are descriptive labels, never compatibility gates.
export function reportedAgentVersion(value:unknown):string|undefined{
  if(typeof value!=='string')return undefined;
  const version=value.trim();
  return version&&version.length<=80?version:undefined;
}

export async function readDeviceStatus(
  relayNamespace:DurableObjectNamespace,
  deviceId:string
):Promise<{online:boolean;version?:string}>{
  const response=await relayNamespace.get(
    relayNamespace.idFromName(deviceId)
  ).fetch(
    new Request('https://relay.internal/status',{
      headers:{'x-localmcp-internal':'1'}
    })
  );

  if(!response.ok)return {online:false};

  const data=await response.json() as {online?:unknown;version?:unknown};
  const version=reportedAgentVersion(data.version);
  return {
    online:data.online===true,
    ...(version?{version}:{})
  };
}
