import {getChatGPTUser} from '../../../chatgpt-auth';
import {json} from '../../../../lib/server';
import {serveMedia} from '../../../../lib/media-service';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){const user=await getChatGPTUser();if(!user)return json({error:'Sign in required.'},401);return serveMedia(request,user.userId,(await context.params).id);}
