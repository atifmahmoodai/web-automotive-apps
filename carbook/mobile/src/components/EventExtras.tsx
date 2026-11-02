import React,{useCallback,useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useCarbook} from '../core/store';
import {premium,type Checkins} from '../core/premium';
import {geocode,parseCoords,type GeoResult} from '../core/geo';
import {openDirections} from '../core/directions';
import type {Meetup} from '../core/types';
import {TileMap} from './TileMap';
import {Avatar,Button,Card,ErrorNotice,Field,Label,Skeleton,tap,textStyles,useTask} from './ui';
import {colors,radius} from './theme';
import {Icon} from './Icon';
export function EventPlace({event,own}:{event:Meetup;own:boolean}){const {client}=useCarbook(),[info,setInfo]=useState<Checkins|null>(null),[editing,setEditing]=useState(false),[query,setQuery]=useState(`${event.location}, ${event.city}`),[results,setResults]=useState<GeoResult[]|null>(null),task=useTask(),now=Date.now();
 const load=useCallback(()=>{premium.checkins(client,event.id).then(setInfo).catch(()=>{})},[client,event.id]);useEffect(load,[load]);
 if(!info)return <Skeleton height={120} round={20}/>;const place=info.place,window=now>=info.opensAt&&now<=info.closesAt&&event.status==='published';
 const pin=(lat:number|null,lng:number|null)=>void task.run(async()=>{await premium.setPlace(client,event.id,lat,lng);tap('success');setEditing(false);setResults(null);load()});
 return <>
  {place&&<TileMap height={200} initial={{center:place,zoom:15}} markers={[{id:event.id,lat:place.lat,lng:place.lng,label:event.title,active:true}]}/>}
  <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>{place&&<Button title="Directions" icon="navigate" onPress={()=>void task.run(async()=>{if(!await openDirections(place.lat,place.lng,event.title))throw new Error('No maps app could open these directions.')})}/>}{own&&<Button title={place?'Move pin':'Pin meeting point'} icon="pin" secondary onPress={()=>setEditing(!editing)}/>}</View>
  {editing&&<Card><Text style={textStyles.subtitle}>Meeting point</Text><Label muted>Search an address (OpenStreetMap Nominatim) or paste coordinates like 31.5204, 74.3587.</Label><Field label="Address or coordinates" value={query} onChangeText={setQuery} maxLength={160}/>
   <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}><Button title="Search" icon="search" loading={task.busy} onPress={()=>{const c=parseCoords(query);if(c)return pin(c.lat,c.lng);void task.run(async()=>setResults(await geocode(query)))}}/>{place&&<Button title="Remove pin" danger onPress={()=>pin(null,null)}/>}</View>
   {results&&!results.length&&<Label muted>No matches. Try a nearby landmark or paste coordinates.</Label>}
   {results?.map(r=><Pressable key={`${r.lat},${r.lng}`} accessibilityRole="button" onPress={()=>pin(r.lat,r.lng)} style={{flexDirection:'row',gap:10,padding:12,borderRadius:radius.md,borderWidth:1,borderColor:colors.line}}><Icon name="pin" size={18}/><Text style={{flex:1,color:colors.ink}}>{r.label}</Text></Pressable>)}
   <Text style={{fontSize:11,color:colors.muted}}>Search results © OpenStreetMap contributors.</Text></Card>}
  <Card><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="check"/><Text style={[textStyles.subtitle,{flex:1}]}>Check-ins</Text><Text style={{fontWeight:'800',fontSize:20,color:colors.forest}}>{info.count}</Text></View>
   {info.checkedIn?<Label>You’re checked in. Enjoy the meet!</Label>:window?<Button title="Check in" icon="pin" loading={task.busy} onPress={()=>void task.run(async()=>{await premium.checkIn(client,event.id);tap('success');load()})}/>:<Label muted>{now<info.opensAt?`Check-in opens ${new Date(info.opensAt).toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'})}, two hours before the start.`:'Check-in has closed for this event.'}</Label>}
   {!!info.members.length&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{info.members.slice(0,12).map(m=><View key={m.id} style={{alignItems:'center',width:60,gap:4}}><Avatar name={m.name} path={m.avatar} size={40}/><Text numberOfLines={1} style={{fontSize:11,color:colors.muted}}>{m.name.split(' ')[0]}</Text></View>)}</View>}</Card>
  <ErrorNotice message={task.error}/></>}
