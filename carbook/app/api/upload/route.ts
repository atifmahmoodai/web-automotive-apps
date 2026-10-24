import {getChatGPTUser} from '../../chatgpt-auth';
import {assertSameOrigin} from '../../../lib/validation';
import {json} from '../../../lib/server';
import {uploadMedia} from '../../../lib/upload-service';
export async function POST(request:Request){try{assertSameOrigin(request);}catch{return json({error:'This request must originate from Carbook.'},403);}const user=await getChatGPTUser();if(!user)return json({error:'Sign in to upload media.'},401);return uploadMedia(request,user.userId);}
