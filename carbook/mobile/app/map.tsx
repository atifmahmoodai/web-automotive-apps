import React,{useCallback,useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import Animated,{FadeInDown,FadeInUp} from 'react-native-reanimated';
import {useCarbook} from '../src/core/store';
import {premium,type Place} from '../src/core/premium';
import {fitBounds} from '../src/core/geo';
import {openDirections} from '../src/core/directions';
import {TileMap} from '../src/components/TileMap';
import {Button,Card,Empty,ErrorNotice,Label,Screen,Skeleton,textStyles,useTask} from '../src/components/ui';
import {colors,radius} from '../src/components/theme';
import {Icon} from '../src/components/Icon';
const when=(ms:number)=>new Date(ms).toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export default function MeetupMap(){const {client}=useCarbook(),[places,setPlaces]=useState<Place[]|null>(null),[error,setError]=useState<string|null>(null),[selected,setSelected]=useState<string|null>(null),task=useTask();
 const load=useCallback(()=>{premium.places(client).then(p=>{setPlaces(p);setError(null)}).catch(e=>setError(e.message))},[client]);useFocusEffect(load);
 const initial=useMemo(()=>places?fitBounds(places,360,340):null,[places]),active=places?.find(p=>p.id===selected)||null;
 return <Screen title="Meetups map" back>
  <ErrorNotice message={error} retry={load}/>
  {!places&&!error&&<Skeleton height={340} round={20}/>}
  {places&&initial&&<TileMap key={places.map(p=>p.id).join()} height={340} initial={initial} markers={places.map(p=>({id:p.id,lat:p.lat,lng:p.lng,label:p.title,active:p.id===selected}))} onSelect={setSelected}/>}
  {active&&<Animated.View entering={FadeInUp}><Card><Text style={textStyles.subtitle}>{active.title}</Text><Label muted>{`${when(active.starts)} · ${active.location}, ${active.city}`}</Label><Label muted>{`${active.checkins} checked in${active.checked_in?' · including you':''}`}</Label><View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}><Button title="Directions" icon="navigate" onPress={()=>void task.run(async()=>{if(!await openDirections(active.lat,active.lng,active.title))throw new Error('No maps app could open these directions.')})}/><Button title="Event details" secondary onPress={()=>router.push({pathname:'/detail',params:{kind:'event',id:active.id}})}/></View></Card></Animated.View>}
  <ErrorNotice message={task.error}/>
  {places&&!places.length&&<Empty icon="map" title="No pinned meetups yet" description="Organizers can pin an event’s meeting point from the event page. Pinned upcoming events appear here."/>}
  {places?.map((p,i)=><Animated.View key={p.id} entering={FadeInDown.delay(i*50)}><Pressable accessibilityRole="button" onPress={()=>setSelected(p.id)} style={{flexDirection:'row',gap:12,alignItems:'center',padding:14,borderRadius:radius.md,backgroundColor:p.id===selected?colors.leaf:colors.surface,borderWidth:1,borderColor:colors.line}}><Icon name="pin" color={p.id===selected?colors.orange:colors.forest}/><View style={{flex:1}}><Text style={{fontWeight:'700',color:colors.ink}}>{p.title}</Text><Text style={{color:colors.muted,fontSize:13}}>{`${when(p.starts)} · ${p.city}`}</Text></View>{p.checked_in&&<Icon name="check" size={18}/>}</Pressable></Animated.View>)}
  <Label muted>Map tiles © OpenStreetMap contributors. Carbook never reads your device location.</Label>
 </Screen>}
