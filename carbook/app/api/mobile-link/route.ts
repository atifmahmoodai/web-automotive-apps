import {getChatGPTUser} from '../../chatgpt-auth';
import {assertSameOrigin} from '../../../lib/validation';
import {json,ApiError} from '../../../lib/server';
import {createMobileLink} from '../../../lib/mobile-link';
export async function POST(request:Request){try{assertSameOrigin(request);const user=await getChatGPTUser();if(!user)return json({error:'Sign in to connect your mobile app.'},401);return json(await createMobileLink(user.userId));}catch(e){return json({error:e instanceof ApiError?e.message:'The connection code could not be created.'},e instanceof ApiError?e.status:e instanceof Error&&e.message==='ORIGIN'?403:500);}}
