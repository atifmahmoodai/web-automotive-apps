import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,ScrollView,Text,TextInput,View,Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import Animated,{FadeInDown,FadeIn} from 'react-native-reanimated';
import {useCarbook} from '../src/core/store';
import {premium,type ChatMessage} from '../src/core/premium';
import {Banner,Chip,Empty,ErrorNotice,IconButton,Skeleton,tap,textStyles} from '../src/components/ui';
import {colors,radius} from '../src/components/theme';
import {Icon} from '../src/components/Icon';
const STARTERS=['What should a 60,000 km service include?','My brakes squeal when cold. Is that normal?','How do I prepare my car for a long highway trip?','What should I check before buying a used car?'];
export default function Assistant(){const p=useLocalSearchParams<{carId?:string}>(),{data,client}=useCarbook(),cars=(data?.cars||[]).filter(c=>c.owner_id===data?.userId),[carId,setCarId]=useState<string|undefined>(p.carId&&cars.some(c=>c.id===p.carId)?p.carId:undefined),[status,setStatus]=useState<boolean|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 useEffect(()=>{void premium.status(client).then(s=>setStatus(s.assistant)).catch(()=>setStatus(false))},[client]);
 async function send(value=text){const content=value.trim().slice(0,1500);if(!content||busy)return;tap();const next=[...messages,{role:'user' as const,content}];setMessages(next);setText('');setBusy(true);setError(null);
  try{const {reply}=await premium.ask(client,next.slice(-12),carId);setMessages([...next,{role:'assistant',content:reply}])}catch(e){setError(e instanceof Error?e.message:'The assistant is unavailable.');setMessages(messages);setText(content)}finally{setBusy(false);setTimeout(()=>scroll.current?.scrollToEnd({animated:true}),80)}}
 return <SafeAreaView edges={['top','left','right','bottom']} style={{flex:1,backgroundColor:colors.paper}}>
  <View style={{paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:10}}><IconButton name="back" label="Back" onPress={()=>router.canGoBack()?router.back():router.replace('/')}/><View style={{flex:1}}><Text style={textStyles.subtitle}>Car assistant</Text><Text style={{color:colors.muted,fontSize:12}}>AI guidance · not a mechanic</Text></View>{!!messages.length&&<IconButton name="refresh" label="New conversation" onPress={()=>{setMessages([]);setError(null)}}/>}</View>
  <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
   <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,gap:12,paddingBottom:24,maxWidth:760,width:'100%',alignSelf:'center'}}>
    <Banner icon="alert" title="Not a substitute for a mechanic" tone="peach">Answers are general guidance and can be wrong. For brakes, steering, tyres, airbags, fuel leaks or warning lights, stop driving and have a qualified mechanic inspect the car.</Banner>
    {status===null&&<Skeleton height={60} round={14}/>}
    {status===false&&<Empty icon="sparkle" title="Assistant not configured" description="The Carbook service has no AI provider set up yet. An administrator needs to set AI_API_KEY, AI_BASE_URL and AI_MODEL on the mobile API."/>}
    {status&&<>{!!cars.length&&<View style={{gap:8}}><Text style={textStyles.caption}>Vehicle context</Text><View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}><Chip title="General" selected={!carId} onPress={()=>setCarId(undefined)}/>{cars.map(c=><Chip key={c.id} title={c.name} selected={carId===c.id} onPress={()=>setCarId(c.id)}/>)}</View>{carId&&<Text style={{color:colors.muted,fontSize:12}}>Shares this car’s name, year and recent service and fuel records with the assistant.</Text>}</View>}
     {!messages.length&&<Animated.View entering={FadeIn} style={{gap:8}}><Text style={textStyles.caption}>Try asking</Text>{STARTERS.map(s=><Pressable key={s} accessibilityRole="button" onPress={()=>void send(s)} style={{padding:14,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,flexDirection:'row',gap:10,alignItems:'center'}}><Icon name="sparkle" size={18} color={colors.orange}/><Text style={{flex:1,color:colors.ink}}>{s}</Text></Pressable>)}</Animated.View>}
     {messages.map((m,i)=>{const own=m.role==='user';return <Animated.View key={i} entering={FadeInDown.duration(200)} style={{alignSelf:own?'flex-end':'flex-start',maxWidth:'88%',padding:13,borderRadius:18,borderBottomRightRadius:own?5:18,borderBottomLeftRadius:own?18:5,backgroundColor:own?colors.forest:colors.surface,borderWidth:own?0:1,borderColor:colors.line}}><Text selectable style={{color:own?colors.onAccent:colors.ink,fontSize:15,lineHeight:22}}>{m.content}</Text></Animated.View>})}
     {busy&&<View style={{flexDirection:'row',gap:8,alignItems:'center'}}><ActivityIndicator color={colors.forest}/><Text style={{color:colors.muted}}>Thinking…</Text></View>}
     <ErrorNotice message={error}/></>}
   </ScrollView>
   {status&&<View style={{flexDirection:'row',gap:10,padding:12,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:colors.surface,alignItems:'flex-end'}}><TextInput accessibilityLabel="Ask the car assistant" value={text} onChangeText={setText} placeholder="Ask about maintenance, noises, buying…" placeholderTextColor={colors.placeholder} multiline maxLength={1500} style={{flex:1,maxHeight:120,minHeight:46,paddingHorizontal:14,paddingVertical:11,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,color:colors.ink,fontSize:16}}/><IconButton name="send" label="Send" disabled={!text.trim()||busy} onPress={()=>void send()}/></View>}
  </KeyboardAvoidingView>
 </SafeAreaView>}
