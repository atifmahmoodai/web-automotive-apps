import React,{useCallback,useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {useCarbook} from '../core/store';
import {premium,parseAmount,type Insight,type Offer} from '../core/premium';
import {money} from '../core/garage';
import type {Listing} from '../core/types';
import {Button,Card,ErrorNotice,Field,Label,Skeleton,tap,textStyles,useTask} from './ui';
import {colors,radius} from './theme';
import {Icon} from './Icon';
const STATUS:Record<Offer['status'],string>={pending:'Awaiting seller',countered:'Counter-offer',accepted:'Accepted',declined:'Declined',withdrawn:'Withdrawn'};
export function PriceInsight({listing}:{listing:Listing}){const {client}=useCarbook(),[data,setData]=useState<Insight|null>(null),[error,setError]=useState<string|null>(null);
 useEffect(()=>{premium.insight(client,listing.id).then(setData).catch(e=>setError(e.message))},[listing.id,listing.price]);
 if(error)return null;if(!data)return <Skeleton height={110} round={20}/>;const s=data.stats;
 return <Card><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="chart" size={20}/><Text style={[textStyles.subtitle,{flex:1}]}>Price insight</Text><View style={{paddingHorizontal:8,paddingVertical:3,borderRadius:radius.pill,backgroundColor:colors.leaf}}><Text style={{fontSize:11,fontWeight:'700',color:colors.forest}}>CARBOOK LISTINGS ONLY</Text></View></View>
  {s?<><Text style={{color:colors.ink,fontSize:15}}>{`Typical: ${money(s.low,data.currency)} – ${money(s.high,data.currency)} · median ${money(s.median,data.currency)}`}</Text>
   <View style={{height:12,borderRadius:6,backgroundColor:colors.leaf,overflow:'hidden'}}>{(()=>{const span=Math.max(1,s.max-s.min),l=(s.low-s.min)/span*100,w=Math.max(4,(s.high-s.low)/span*100),pos=Math.min(100,Math.max(0,(listing.price-s.min)/span*100));return <><View style={{position:'absolute',left:`${l}%`,width:`${w}%`,top:0,bottom:0,backgroundColor:colors.forest+'55'}}/><View style={{position:'absolute',left:`${pos}%`,marginLeft:-3,width:6,top:0,bottom:0,borderRadius:3,backgroundColor:colors.orange}}/></>})()}</View>
   {s.position&&<Label>{s.position==='below'?'This price is below the typical range of comparable Carbook listings.':s.position==='above'?'This price is above the typical range of comparable Carbook listings.':'This price is within the typical range of comparable Carbook listings.'}</Label>}</>
   :<Label muted>Not enough comparable Carbook listings yet to show a range.</Label>}
  <Text style={{fontSize:12,color:colors.muted,lineHeight:17}}>{data.source}</Text></Card>}
export function OfferPanel({listing,own}:{listing:Listing;own:boolean}){const {client}=useCarbook(),[offers,setOffers]=useState<Offer[]|null>(null),[amount,setAmount]=useState(''),[message,setMessage]=useState(''),[counter,setCounter]=useState<Record<string,string>>({}),task=useTask();
 const load=useCallback(()=>{premium.offers(client,listing.id).then(setOffers).catch(()=>setOffers([]))},[client,listing.id]);useEffect(load,[load]);
 const respond=(o:Offer,decision:'accept'|'decline'|'counter'|'withdraw')=>void task.run(async()=>{const n=decision==='counter'?parseAmount(counter[o.id]||''):undefined;if(decision==='counter'&&!n)throw new Error('Enter a whole-number counter-offer.');await premium.respond(client,o.id,decision,n??undefined);tap('success');load()});
 if(!offers)return <Skeleton height={90} round={20}/>;
 const mine=offers.find(o=>o.buyer_id!==listing.seller_id&&!own),open=mine&&['pending','countered'].includes(mine.status);
 if(own)return <Card><Text style={textStyles.subtitle}>Offers</Text>{!offers.length&&<Label muted>No offers yet. Buyers can send offers from this page.</Label>}
  {offers.map(o=><View key={o.id} style={{gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:colors.line}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'700',color:colors.ink}}>{o.buyer_name}</Text><Text style={{color:o.status==='accepted'?colors.forest:colors.muted,fontWeight:'600'}}>{STATUS[o.status]}</Text></View>
   <Text style={{fontSize:18,fontWeight:'800',color:colors.ink}}>{money(o.amount,o.currency)}{o.counter?<Text style={{fontSize:14,fontWeight:'600',color:colors.orange}}>{`  · you countered ${money(o.counter,o.currency)}`}</Text>:null}</Text>{!!o.message&&<Label muted>{`“${o.message}”`}</Label>}
   {o.status==='pending'&&listing.status==='active'&&<><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title="Accept" icon="check" loading={task.busy} onPress={()=>respond(o,'accept')}/><Button title="Decline" secondary onPress={()=>respond(o,'decline')}/></View><Field label="Counter-offer" value={counter[o.id]||''} onChangeText={v=>setCounter(c=>({...c,[o.id]:v}))} keyboardType="number-pad" maxLength={14}/><Button title="Send counter-offer" secondary disabled={!counter[o.id]} onPress={()=>respond(o,'counter')}/></>}</View>)}
  <ErrorNotice message={task.error}/></Card>;
 if(listing.status!=='active'&&!mine)return null;
 return <Card><Text style={textStyles.subtitle}>{mine?'Your offer':'Make an offer'}</Text>
  {mine&&<><Text style={{fontSize:18,fontWeight:'800',color:colors.ink}}>{money(mine.amount,mine.currency)} <Text style={{fontSize:14,fontWeight:'600',color:colors.muted}}>{`· ${STATUS[mine.status]}`}</Text></Text>
   {mine.status==='countered'&&mine.counter&&<><Label>{`The seller countered with ${money(mine.counter,mine.currency)}.`}</Label><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title={`Accept ${money(mine.counter,mine.currency)}`} icon="check" loading={task.busy} onPress={()=>respond(mine,'accept')}/><Button title="Decline" secondary onPress={()=>respond(mine,'decline')}/></View></>}
   {mine.status==='accepted'&&<Label>Offer accepted. Message the seller to arrange inspection, payment and handover.</Label>}
   {open&&<Button title="Withdraw offer" danger onPress={()=>respond(mine,'withdraw')}/>}</>}
  {listing.status==='active'&&mine?.status!=='accepted'&&<><Field label={mine?'New offer amount':`Your offer (${listing.currency})`} value={amount} onChangeText={setAmount} keyboardType="number-pad" maxLength={14} placeholder={listing.price.toLocaleString('en-US')}/><Field label="Message (optional)" value={message} onChangeText={setMessage} maxLength={500}/>
   <Button title={mine?'Update offer':'Send offer'} icon="tag" loading={task.busy} disabled={!parseAmount(amount)} onPress={()=>void task.run(async()=>{await premium.offer(client,listing.id,parseAmount(amount)!,message.trim());setAmount('');setMessage('');tap('success');load()})}/></>}
  <ErrorNotice message={task.error}/><Label muted>Offers are not binding. Never pay before seeing the car and its documents.</Label></Card>}
