import {ApiError} from '../../lib/server';
export async function readJson(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError('JSON required.',415);
 const max=24000;if(Number(request.headers.get('content-length')||0)>max)throw new ApiError('Request too large.',413);
 const reader=request.body?.getReader();if(!reader)throw new ApiError('Invalid JSON.');
 const decoder=new TextDecoder();let text='',size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new ApiError('Request too large.',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 try{const result=JSON.parse(text);if(!result||typeof result!=='object'||Array.isArray(result))throw new Error();return result as Record<string,unknown>;}catch{throw new ApiError('Invalid JSON.');}
}
