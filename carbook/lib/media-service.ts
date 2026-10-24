import {env} from 'cloudflare:workers';
import {database,json,requireActive,WITH,V,postAccess,activeOwner,audienceAccess,ApiError} from './server';
export async function serveMedia(request:Request,uid:string,id:string){try{
 await requireActive(uid);const db=database();const row=await db.prepare('SELECT key,type,owner_id,size FROM media WHERE id=?').bind(id).first<{key:string;type:string;owner_id:string;size:number}>();if(!row)return new Response('Not found',{status:404});
 if(row.owner_id!==uid){const url='/api/media/'+id;const allowed=await db.prepare(WITH+`SELECT 1 WHERE
 EXISTS(SELECT 1 FROM posts p WHERE (p.image=? OR EXISTS(SELECT 1 FROM json_each(p.attachments) a WHERE json_extract(a.value,'$.url')=?)) AND ${postAccess()})
 OR EXISTS(SELECT 1 FROM profiles p WHERE (p.avatar=? OR p.cover=?) AND ${activeOwner('p.id')})
 OR EXISTS(SELECT 1 FROM cars c WHERE c.image=? AND ${activeOwner('c.owner_id')})
 OR EXISTS(SELECT 1 FROM stories s WHERE s.image=? AND s.expires>? AND ${activeOwner('s.author_id')} AND ${audienceAccess('s')})
 OR EXISTS(SELECT 1 FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.image=? AND m.deleted=0 AND (c.user_a=${V} OR c.user_b=${V}) AND ${activeOwner(`CASE WHEN c.user_a=${V} THEN c.user_b ELSE c.user_a END`)})
 OR EXISTS(SELECT 1 FROM listings l WHERE l.image=? AND l.status!='deleted' AND ${activeOwner('l.seller_id')})
 OR EXISTS(SELECT 1 FROM pages p WHERE p.image=? AND ${activeOwner('p.owner_id')})
 OR EXISTS(SELECT 1 FROM meetups e WHERE e.image=? AND (e.organizer_id IS NULL OR ${activeOwner('e.organizer_id')}))
 OR EXISTS(SELECT 1 FROM circles c WHERE c.image=? AND (c.owner_id IS NULL OR ${activeOwner('c.owner_id')}))`).bind(uid,url,url,url,url,url,url,Date.now(),url,url,url,url,url).first();if(!allowed)return new Response('Not found',{status:404});}
 const rangeHeader=request.headers.get('range');let range:{offset:number;length:number}|undefined;
 if(rangeHeader&&row.size){const m=/^bytes=(\d*)-(\d*)$/.exec(rangeHeader);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${row.size}`}});const start=m[1]?Number(m[1]):Math.max(0,row.size-Number(m[2])),end=m[1]?(m[2]?Math.min(Number(m[2]),row.size-1):row.size-1):row.size-1;if(start>=row.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${row.size}`}});range={offset:start,length:end-start+1};}
 const file=await env.BUCKET?.get(row.key,range?{range}:undefined);if(!file)return new Response('Not found',{status:404});const headers:Record<string,string>={'Content-Type':row.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Accept-Ranges':'bytes'};
 if(range){headers['Content-Range']=`bytes ${range.offset}-${range.offset+range.length-1}/${row.size}`;headers['Content-Length']=String(range.length);}else if(row.size)headers['Content-Length']=String(row.size);
 return new Response(file.body,{status:range?206:200,headers});
}catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);return new Response('Unavailable',{status:503});}}
