import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import Animated,{FadeIn,FadeInDown} from 'react-native-reanimated';
import {useCarbook} from '../../src/core/store';
import {premium} from '../../src/core/premium';
import {categoryTotals,dueItems,fuelStats,KIND_LABEL,latestOdometer,money,monthlySpend,reminderPlan,type RecordKind,type VehicleRecord} from '../../src/core/garage';
import {scheduleLocal,permissionStatus,askPermission} from '../../src/core/push';
import {Banner,Bars,Button,Card,Chip,Empty,ErrorNotice,IconButton,Label,Photo,Screen,SectionTitle,SkeletonCard,Stat,textStyles} from '../../src/components/ui';
import {Icon,type IconName} from '../../src/components/Icon';
import {colors,radius} from '../../src/components/theme';
type Tab='overview'|RecordKind;
const TABS:{key:Tab;label:string;icon:IconName}[]=[{key:'overview',label:'Overview',icon:'chart'},{key:'service',label:'Service',icon:'wrench'},{key:'fuel',label:'Fuel',icon:'fuel'},{key:'expense',label:'Expenses',icon:'wallet'},{key:'document',label:'Documents',icon:'doc'}];
const fmtDate=(ms:number)=>new Date(ms).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
export default function GarageCar(){const {id}=useLocalSearchParams<{id:string}>(),{data,client}=useCarbook(),car=data?.cars.find(c=>c.id===id&&c.owner_id===data.userId),[records,setRecords]=useState<VehicleRecord[]|null>(null),[error,setError]=useState<string|null>(null),[tab,setTab]=useState<Tab>('overview'),[reminders,setReminders]=useState<string|null>(null);
 const load=useCallback(()=>{if(!id)return;premium.records(client,id).then(r=>{setRecords(r);setError(null)}).catch(e=>setError(e.message))},[id,client]);
 useFocusEffect(load);
 // Keep this car's local reminders in step with its records (identifiers are namespaced per car).
 useEffect(()=>{if(!records||!car)return;const items=records.flatMap(r=>reminderPlan(r,car.name).map(p=>({...p,id:`garage-${car.id}-${p.id}`,route:`/garage/${car.id}`})));
  void scheduleLocal(items,`garage-${car.id}-`).then(async n=>{const s=await permissionStatus();setReminders(items.length&&s!=='granted'?'off':n?`${n} reminder${n===1?'':'s'} scheduled on this device`:null)}).catch(()=>{})},[records,car]);
 const fuel=useMemo(()=>fuelStats(records||[]),[records]),totals=useMemo(()=>categoryTotals(records||[]),[records]),months=useMemo(()=>monthlySpend(records||[]),[records]),due=useMemo(()=>dueItems(records||[]),[records]);
 if(!car)return <Screen title="Garage" back><Empty icon="car" title="Car not found" description="This car is not in your garage anymore."/></Screen>;
 const list=(records||[]).filter(r=>tab!=='overview'&&r.kind===tab),odo=latestOdometer(records||[]);
 return <Screen title={car.name} back right={<IconButton name="plus" label="Add record" onPress={()=>router.push({pathname:'/garage/record',params:{carId:car.id,kind:tab==='overview'?'service':tab}})}/>}>
  <Card style={{padding:0,overflow:'hidden'}}><Photo path={car.image} height={150}/><View style={{padding:16,flexDirection:'row',gap:10,alignItems:'center'}}><View style={{flex:1}}><Text style={textStyles.subtitle}>{car.name}</Text><Label muted>{`${car.year}${odo!=null?` · ${odo.toLocaleString('en-US')} km`:''}`}</Label></View><Button title="Ask AI" icon="sparkle" secondary onPress={()=>router.push({pathname:'/assistant',params:{carId:car.id}})}/></View></Card>
  <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{TABS.map(t=><Chip key={t.key} title={t.label} selected={tab===t.key} onPress={()=>setTab(t.key)}/>)}</View>
  <ErrorNotice message={error} retry={load}/>
  {!records&&!error&&<><SkeletonCard lines={2}/><SkeletonCard lines={3}/></>}
  {records&&tab==='overview'&&<Animated.View entering={FadeIn} style={{gap:16}}>
   {reminders==='off'&&<Banner icon="bell" title="Reminders are off" tone="peach">Allow notifications so Carbook can remind you before services and documents fall due.</Banner>}
   {reminders==='off'&&<Button title="Allow reminders" secondary icon="bell" onPress={()=>void askPermission().then(load)}/>}
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}><Stat label="Total spend" value={money(totals.total)} hint={`${records.filter(r=>r.amount).length} costed records`}/><Stat label="Fuel economy" tone="orange" value={fuel.average?`${fuel.average.toFixed(1)} L/100km`:'—'} hint={fuel.kmPerLitre?`${fuel.kmPerLitre.toFixed(1)} km/L · ${fuel.fills} fills`:'Needs two full-tank fills'}/><Stat label="Cost per km" tone="blue" value={fuel.costPerKm?money(fuel.costPerKm):'—'} hint="Fuel only"/><Stat label="Due soon" tone="gold" value={String(due.filter(d=>d.state!=='later').length)} hint={`${due.filter(d=>d.state==='overdue').length} overdue`}/></View>
   <SectionTitle title="Upcoming"/>{due.length?due.slice(0,5).map(d=><RecordRow key={d.record.id} r={d.record} badge={d.state==='overdue'?'Overdue':d.days!=null?(d.days===0?'Today':d.days>0?`In ${d.days} d`:`${-d.days} d ago`):d.kmLeft!=null?`${d.kmLeft.toLocaleString('en-US')} km`:''} tone={d.state}/>):<Label muted>No due dates yet. Add a next-service date or a document expiry to get reminders.</Label>}
   <SectionTitle title="Spend · last 6 months"/><Card><Bars data={months} format={n=>n?money(n):'—'}/></Card>
   {!!totals.rows.length&&<><SectionTitle title="By category"/><Card><Bars data={totals.rows.slice(0,8)} format={n=>money(n)}/></Card></>}
   {!records.length&&<Empty icon="wrench" title="Start your car’s logbook" description="Log a service, a fill-up or a document to unlock stats, charts and reminders." action={<Button title="Add first record" icon="plus" onPress={()=>router.push({pathname:'/garage/record',params:{carId:car.id,kind:'service'}})}/>}/>}
  </Animated.View>}
  {records&&tab==='fuel'&&!!list.length&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}><Stat label="Average" tone="orange" value={fuel.average?`${fuel.average.toFixed(1)} L/100`:'—'}/><Stat label="Last interval" value={fuel.last?`${fuel.last.toFixed(1)} L/100`:'—'}/><Stat label="Litres" tone="blue" value={fuel.totalLitres.toFixed(0)}/></View>}
  {records&&tab!=='overview'&&(list.length?list.map((r,i)=><Animated.View key={r.id} entering={FadeInDown.delay(Math.min(i,8)*40)}><RecordRow r={r}/></Animated.View>):<Empty icon={TABS.find(t=>t.key===tab)!.icon} title={`No ${KIND_LABEL[tab as RecordKind].toLowerCase()} records`} description={tab==='document'?'Store insurance, registration and other papers with expiry reminders.':tab==='fuel'?'Log fill-ups with the odometer reading; full-tank fills give the most accurate economy.':'Keep a tidy history that helps resale value.'} action={<Button title="Add record" icon="plus" onPress={()=>router.push({pathname:'/garage/record',params:{carId:car.id,kind:tab}})}/>}/>)}
  {reminders&&reminders!=='off'&&<Label muted>{reminders}</Label>}
 </Screen>;
 function RecordRow({r,badge,tone}:{r:VehicleRecord;badge?:string;tone?:'overdue'|'soon'|'later'}){const icon:IconName=r.kind==='fuel'?'fuel':r.kind==='document'?'doc':r.kind==='expense'?'wallet':'wrench';
  return <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/garage/record',params:{carId:car!.id,id:r.id}})} style={({pressed})=>({flexDirection:'row',gap:12,alignItems:'center',padding:14,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,opacity:pressed?.8:1})}>
   {r.image?<View style={{width:46,height:46,borderRadius:12,overflow:'hidden'}}><Photo path={r.image} height={46}/></View>:<View style={{width:46,height:46,borderRadius:12,backgroundColor:colors.leaf,alignItems:'center',justifyContent:'center'}}><Icon name={icon} color={colors.forest}/></View>}
   <View style={{flex:1,gap:2}}><Text style={{fontWeight:'700',color:colors.ink,fontSize:15}} numberOfLines={1}>{r.title}</Text><Text style={{color:colors.muted,fontSize:13}} numberOfLines={1}>{[fmtDate(r.date),r.category,r.kind==='fuel'&&r.litres?`${r.litres} L${r.full_tank?'':' (partial)'}`:'',r.odometer!=null?`${r.odometer.toLocaleString('en-US')} km`:''].filter(Boolean).join(' · ')}</Text>{r.due_date!=null&&!badge&&<Text style={{color:colors.orange,fontSize:12,fontWeight:'600'}}>{(r.kind==='document'?'Expires ':'Due ')+fmtDate(r.due_date)}</Text>}</View>
   <View style={{alignItems:'flex-end',gap:4}}>{r.amount!=null&&<Text style={{fontWeight:'700',color:colors.ink}}>{money(r.amount,r.currency)}</Text>}{!!badge&&<Text style={{fontSize:12,fontWeight:'700',color:tone==='overdue'?colors.danger:tone==='soon'?colors.orange:colors.muted}}>{badge}</Text>}</View></Pressable>}
}
