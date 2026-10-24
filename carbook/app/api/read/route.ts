import {getChatGPTUser} from '../../chatgpt-auth';
import {json} from '../../../lib/server';
import {readResource} from '../../../lib/read-service';
export const dynamic='force-dynamic';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to continue.'},401);return readResource(request,user.userId);}
