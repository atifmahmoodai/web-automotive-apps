import {getChatGPTUser} from '../../chatgpt-auth';
import {json,initialise,rateLimit,ApiError} from '../../../lib/server';
import {actionSchema,assertSameOrigin} from '../../../lib/validation';
import {perform} from '../../../lib/actions';
export async function POST(request:Request){try{
 assertSameOrigin(request);const user=await getChatGPTUser();if(!user)return json({error:'Sign in to continue.'},401);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
 if(Number(request.headers.get('content-length')||0)>24000)return json({error:'Request is too large.'},413);
 const text=await request.text();if(text.length>24000)return json({error:'Request is too large.'},413);
 let raw:unknown;try{raw=JSON.parse(text)}catch{return json({error:'Invalid JSON.'},400)}const parsed=actionSchema.safeParse(raw);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check your input.'},400);
 await rateLimit(user.userId,'actions',90);if(parsed.data.action==='init'){await initialise(user);return json({ok:true});}return json(await perform(parsed.data,user.userId));
}catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);if(e instanceof Error&&e.message==='ORIGIN')return json({error:'This request must originate from Carbook.'},403);console.error('Carbook action failed',e instanceof Error?e.message:'unknown');return json({error:'Your change could not be saved. Please try again.'},500);}}
