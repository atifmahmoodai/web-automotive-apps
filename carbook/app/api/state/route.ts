import {getChatGPTUser} from '../../chatgpt-auth';
import {getState,json,ApiError} from '../../../lib/server';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getChatGPTUser();if(!user)return json({error:'Sign in to access your community.'},401);return json(await getState(user.userId));}catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('State load failed',e instanceof Error?e.message:'unknown');return json({error:'We could not load your community. Please try again.'},503);}}
