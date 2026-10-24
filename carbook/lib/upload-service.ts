import {env} from 'cloudflare:workers';
import {validMedia} from './validation';
import {database,json,rateLimit,requireActive,ApiError} from './server';
export async function uploadMedia(request:Request,uid:string){try{
 await requireActive(uid);await rateLimit(uid,'uploads',12);
 if(!env.BUCKET)return json({error:'Media storage is unavailable.'},503);
 if(Number(request.headers.get('content-length')||0)>21*1024*1024)return json({error:'Choose a video smaller than 20 MB or a photo smaller than 5 MB.'},413);
 const data=await request.formData(),file=data.get('file');if(!(file instanceof File)||!file.size)return json({error:'Choose a file.'},400);
 const video=['video/mp4','video/webm'].includes(file.type);if(file.size>(video?20:5)*1024*1024)return json({error:video?'Videos must be under 20 MB.':'Photos must be under 5 MB.'},413);
 const quota=await database().prepare('SELECT COUNT(*) count,COALESCE(SUM(size),0) bytes FROM media WHERE owner_id=?').bind(uid).first<{count:number;bytes:number}>();if((quota?.count||0)>=2000||(quota?.bytes||0)+file.size>2*1024*1024*1024)return json({error:'Your media allowance is full. Contact the community owner.'},409);
 const bytes=new Uint8Array(await file.arrayBuffer());if(!validMedia(bytes,file.type))return json({error:'Choose a JPG, PNG, WebP, MP4 or WebM file.'},415);
 const id=crypto.randomUUID(),key=`media/${uid}/${id}`;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:file.type}});
 try{await database().prepare('INSERT INTO media(id,owner_id,key,type,size,created) VALUES(?,?,?,?,?,?)').bind(id,uid,key,file.type,file.size,Date.now()).run();}catch(e){await env.BUCKET.delete(key);throw e;}
 return json({url:`/api/media/${id}`,type:video?'video':'image'});
}catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);return json({error:'Media upload failed. Try again.'},e instanceof Error&&e.message==='ORIGIN'?403:500);}}
