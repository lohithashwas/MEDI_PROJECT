export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = {'Cache-Control':'no-store'};
  try {
    const response=await fetch('http://127.0.0.1:3021/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error();
    return Response.json(await response.json(),{headers});
  } catch {return Response.json({status:'unavailable',error:'Start Ganache CLI and the blockchain collector.',records:[]},{status:503,headers});}
}
