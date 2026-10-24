import Carbook from './carbook';
import {getChatGPTUser} from './chatgpt-auth';
import {demoState} from '../lib/demo';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();return <Carbook initial={demoState()} user={user?{id:user.userId,name:user.fullName||user.email.split('@')[0]}:null}/>;}
