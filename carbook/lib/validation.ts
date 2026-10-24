import { z } from 'zod';
import {TOPICS} from './carbook-data';
const id=z.string().min(1).max(160),text=(max:number,min=0)=>z.string().trim().min(min).max(max);
const image=z.string().max(180).regex(/^\/(?:cars\/(?:hero|porsche)\.jpg|api\/media\/[a-zA-Z0-9-]+)$/).nullable().optional();
const audience=z.enum(['community','friends','private']);
const attachments=z.array(z.object({url:z.string().max(180).regex(/^\/(?:cars\/(?:hero|porsche)\.jpg|api\/media\/[a-zA-Z0-9-]+)$/),type:z.enum(['image','video'])})).max(6).default([]);
const website=z.union([z.literal(''),z.string().url().max(250).refine(v=>/^https?:\/\//.test(v),'Use an https:// website.')]).default('');
const color=z.enum(['forest','orange','blue','sand','purple']);
export const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('init')}),
 z.object({action:z.literal('moderate'),reportId:id,decision:z.enum(['dismiss','remove'])}),
 z.object({action:z.literal('post'),body:text(4000,1),image,attachments,topic:z.enum(TOPICS as [string,...string[]]),groupId:id.nullable().optional(),audience:audience.default('community'),pageId:id.nullable().optional(),sharedPostId:id.nullable().optional(),poll:z.array(text(100,1)).min(2).max(4).optional()}),
 z.object({action:z.literal('editPost'),postId:id,body:text(4000,1),audience}),
 z.object({action:z.literal('comment'),postId:id,body:text(1200,1),parentId:id.nullable().optional()}),
 z.object({action:z.literal('editComment'),commentId:id,body:text(1200,1)}),
 z.object({action:z.literal('deleteComment'),commentId:id}),
 z.object({action:z.literal('vote'),postId:id,optionId:id}),
 z.object({action:z.literal('react'),postId:id,kind:z.enum(['like','love','wow','support','celebrate'])}),
 z.object({action:z.literal('like'),postId:id}),z.object({action:z.literal('save'),postId:id}),z.object({action:z.literal('deletePost'),postId:id}),
 z.object({action:z.literal('follow'),targetId:id}),z.object({action:z.literal('block'),targetId:id}),
 z.object({action:z.literal('friend'),targetId:id,decision:z.enum(['request','accept','decline','cancel','remove'])}),
 z.object({action:z.literal('join'),groupId:id}),
 z.object({action:z.literal('group'),id:id.optional(),name:text(80,3),description:text(1000,10),privacy:z.enum(['open','private']),rules:text(2000),color,image}),
 z.object({action:z.literal('groupMember'),groupId:id,targetId:id,decision:z.enum(['approve','reject','remove'])}),
 z.object({action:z.literal('deleteGroup'),groupId:id}),
 z.object({action:z.literal('rsvp'),eventId:id,status:z.enum(['going','interested','none']).optional()}),
 z.object({action:z.literal('event'),id:id.optional(),title:text(100,3),description:text(2000,10),city:text(80,2),location:text(200,3),starts:z.number().int().positive(),capacity:z.number().int().min(1).max(10000),image}),
 z.object({action:z.literal('cancelEvent'),eventId:id}),
 z.object({action:z.literal('readNotifications')}),
 z.object({action:z.literal('profile'),name:text(70,2),bio:text(300),city:text(70),avatar:image,cover:image,website,onboarded:z.boolean().optional()}),
 z.object({action:z.literal('preferences'),defaultAudience:audience,messagePolicy:z.enum(['everyone','friends','none']),notificationsEnabled:z.boolean(),showExamples:z.boolean()}),
 z.object({action:z.literal('deactivate'),confirmation:z.literal('DEACTIVATE')}),z.object({action:z.literal('reactivate')}),
 z.object({action:z.literal('car'),id:id.optional(),name:text(90,2),year:z.number().int().min(1900).max(2030),story:text(1000),image}),
 z.object({action:z.literal('deleteCar'),carId:id}),
 z.object({action:z.literal('report'),postId:id,reason:text(500,5)}),
 z.object({action:z.literal('story'),body:text(500,1),image,color,audience:audience.default('community')}),
 z.object({action:z.literal('viewStory'),storyId:id}),z.object({action:z.literal('deleteStory'),storyId:id}),
 z.object({action:z.literal('listing'),id:id.optional(),title:text(100,3),description:text(3000,10),price:z.number().int().min(0).max(100000000000),currency:z.enum(['PKR','USD','AED','GBP','EUR']),category:z.enum(['Cars','Parts','Accessories','Services']),city:text(80,2),image}),
 z.object({action:z.literal('listingStatus'),listingId:id,status:z.enum(['active','sold','deleted'])}),z.object({action:z.literal('saveListing'),listingId:id}),
 z.object({action:z.literal('page'),id:id.optional(),name:text(80,3),description:text(1500,10),city:text(80),category:z.enum(['Car club','Workshop','Dealership','Creator','Brand']),website,image}),z.object({action:z.literal('followPage'),pageId:id}),z.object({action:z.literal('deletePage'),pageId:id}),
 z.object({action:z.literal('conversation'),targetId:id}),
 z.object({action:z.literal('message'),conversationId:id,body:text(4000),image,clientId:z.string().uuid()}),
 z.object({action:z.literal('readConversation'),conversationId:id}),z.object({action:z.literal('deleteMessage'),messageId:id}),
 z.object({action:z.literal('reportContent'),entityType:z.enum(['profile','story','listing','message','group','event','page']),entityId:id,reason:text(500,5)}),
 z.object({action:z.literal('reviewReport'),reportId:id,decision:z.enum(['dismiss','remove'])}),
 z.object({action:z.literal('memberStatus'),targetId:id,status:z.enum(['active','suspended'])}),
 z.object({action:z.literal('memberRole'),targetId:id,role:z.enum(['member','moderator'])})
]);
export type Action= z.infer<typeof actionSchema>;
export function assertSameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new Error('ORIGIN');}
export function validImage(bytes:Uint8Array,type:string){if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(type==='image/png')return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);if(type==='image/webp')return new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';return false;}
export function validMedia(bytes:Uint8Array,type:string){if(type.startsWith('image/'))return validImage(bytes,type);if(type==='video/mp4')return bytes.length>12&&new TextDecoder().decode(bytes.slice(4,8))==='ftyp';if(type==='video/webm')return [26,69,223,163].every((b,i)=>bytes[i]===b);return false;}
