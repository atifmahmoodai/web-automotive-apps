import React,{useEffect,useState} from 'react';
import {Switch,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {useCarbook} from '../../src/core/store';
import {premium,parseAmount} from '../../src/core/premium';
import {selectMedia} from '../../src/core/media';
import {DOCUMENT_TYPES,EXPENSE_CATEGORIES,KIND_LABEL,dayString,parseDay,type RecordKind,type VehicleRecord} from '../../src/core/garage';
import {Button,Card,Chip,ErrorNotice,Field,Label,Photo,Screen,SkeletonCard,confirm,tap,textStyles,useTask} from '../../src/components/ui';
import {colors} from '../../src/components/theme';
const KINDS:RecordKind[]=['service','fuel','expense','document'];
export default function RecordForm(){const p=useLocalSearchParams<{carId:string;id?:string;kind?:string}>(),{client,data}=useCarbook(),task=useTask(),car=data?.cars.find(c=>c.id===p.carId);
 const [loadError,setLoadError]=useState<string|null>(null),[loadAttempt,setLoadAttempt]=useState(0),[loaded,setLoaded]=useState(!p.id),[kind,setKind]=useState<RecordKind>(KINDS.includes(p.kind as RecordKind)?p.kind as RecordKind:'service'),[title,setTitle]=useState(''),[category,setCategory]=useState(''),[date,setDate]=useState(dayString(Date.now())),[amount,setAmount]=useState(''),[odometer,setOdometer]=useState(''),[litres,setLitres]=useState(''),[full,setFull]=useState(true),[due,setDue]=useState(''),[dueKm,setDueKm]=useState(''),[image,setImage]=useState<string|null>(null),[notes,setNotes]=useState('');
 useEffect(()=>{let alive=true;if(!p.id){setLoaded(true);return;}setLoaded(false);setLoadError(null);void premium.records(client,p.carId).then(rs=>{if(!alive)return;const r=rs.find(x=>x.id===p.id);if(!r)throw new Error('This record is unavailable. Return to your garage and refresh.');fill(r);setLoaded(true)}).catch(e=>{if(alive)setLoadError(e instanceof Error?e.message:'Unable to load this record.')});return()=>{alive=false}},[p.id,p.carId,client,loadAttempt]);
 function fill(r:VehicleRecord){setKind(r.kind);setTitle(r.title);setCategory(r.category);setDate(dayString(r.date));setAmount(r.amount!=null?String(r.amount):'');setOdometer(r.odometer!=null?String(r.odometer):'');setLitres(r.litres!=null?String(r.litres):'');setFull(!!r.full_tank);setDue(r.due_date!=null?dayString(r.due_date):'');setDueKm(r.due_odometer!=null?String(r.due_odometer):'');setImage(r.image);setNotes(r.notes)}
 const cats=kind==='document'?DOCUMENT_TYPES:kind==='expense'?EXPENSE_CATEGORIES:[];
 async function save(){const day=parseDay(date);if(!day)throw new Error('Enter the date as YYYY-MM-DD.');const dueDay=due.trim()?parseDay(due):null;if(due.trim()&&!dueDay)throw new Error('Enter the due date as YYYY-MM-DD.');
  const num=(v:string,label:string)=>{if(!v.trim())return null;const n=parseAmount(v);if(n==null)throw new Error(`${label} must be a whole number.`);return n};
  const l=litres.trim()?Number(litres.replace(',','.')):null;if(l!=null&&!(l>0))throw new Error('Litres must be a positive number.');
  const t=title.trim()||(kind==='fuel'?'Fuel fill-up':category||'');
  await premium.saveRecord(client,{id:p.id,carId:p.carId,kind,title:t,category:kind==='fuel'?'':category,date:day,amount:num(amount,'Amount'),odometer:num(odometer,'Odometer'),litres:kind==='fuel'?l:null,fullTank:full,dueDate:kind==='fuel'?null:dueDay,dueOdometer:kind==='service'?num(dueKm,'Next service odometer'):null,image,notes});tap('success');router.back();}
 if(!loaded)return <Screen title="Garage record" back>{loadError?<ErrorNotice message={loadError} retry={()=>setLoadAttempt(n=>n+1)}/>:<SkeletonCard lines={5}/>}</Screen>;
 return <Screen title={`${p.id?'Edit':'New'} ${KIND_LABEL[kind].toLowerCase()} record`} back>
  {car&&<Label muted>{car.name}</Label>}
  {!p.id&&<View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{KINDS.map(k=><Chip key={k} title={KIND_LABEL[k]} selected={k===kind} onPress={()=>{setKind(k);setCategory('')}}/>)}</View>}
  <Card>
   <Field label={kind==='document'?'Document name':kind==='fuel'?'Title (optional)':'Title'} value={title} onChangeText={setTitle} maxLength={120} placeholder={kind==='service'?'Oil and filter change':kind==='document'?'Comprehensive insurance':kind==='fuel'?'Fuel fill-up':'New tyres'}/>
   {!!cats.length&&<View style={{gap:7}}><Text style={{fontWeight:'600',color:colors.ink}}>Category</Text><View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{cats.map(c=><Chip key={c} title={c} selected={c===category} onPress={()=>setCategory(c)}/>)}</View></View>}
   <Field label={kind==='document'?'Issued on (YYYY-MM-DD)':'Date (YYYY-MM-DD)'} value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation"/>
   <Field label="Amount (PKR, optional)" value={amount} onChangeText={setAmount} keyboardType="number-pad" maxLength={14}/>
   {kind!=='document'&&<Field label={kind==='fuel'?'Odometer (km)':'Odometer (km, optional)'} value={odometer} onChangeText={setOdometer} keyboardType="number-pad" maxLength={8}/>}
   {kind==='fuel'&&<><Field label="Litres" value={litres} onChangeText={setLitres} keyboardType="decimal-pad" maxLength={7}/><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}><Label>Filled to full</Label><Label muted>Economy is measured between full-tank fills.</Label></View><Switch accessibilityLabel="Filled to full" value={full} onValueChange={setFull} trackColor={{true:colors.forest}}/></View></>}
   {(kind==='service'||kind==='document'||kind==='expense')&&<Field label={kind==='document'?'Expires on (YYYY-MM-DD)':kind==='service'?'Next service due (YYYY-MM-DD, optional)':'Renewal date (optional)'} value={due} onChangeText={setDue} maxLength={10} keyboardType="numbers-and-punctuation"/>}
   {kind==='service'&&<Field label="Next service at (km, optional)" value={dueKm} onChangeText={setDueKm} keyboardType="number-pad" maxLength={8}/>}
   <Field label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={1000} style={{minHeight:90}}/>
  </Card>
  {(kind==='document'||kind==='service'||kind==='expense')&&<Card><Text style={textStyles.subtitle}>{kind==='document'?'Document photo':'Receipt photo'}</Text><Label muted>Stored privately: only you can open it.</Label>{image&&<Photo path={image} height={200} style={{borderRadius:14}}/>}<View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}><Button title="Take photo" icon="camera" secondary loading={task.busy} onPress={()=>void task.run(async()=>{const m=await selectMedia(true);if(m)setImage((await client.upload(m.uri,m.mimeType,m.name)).url)})}/><Button title="Choose" icon="image" secondary onPress={()=>void task.run(async()=>{const m=await selectMedia(false);if(m)setImage((await client.upload(m.uri,m.mimeType,m.name)).url)})}/>{image&&<Button title="Remove" danger onPress={()=>setImage(null)}/>}</View></Card>}
  <ErrorNotice message={task.error}/>
  <Button title={p.id?'Save changes':'Save record'} icon="check" loading={task.busy} onPress={()=>void task.run(save)}/>
  {p.id&&<Button title="Delete record" danger onPress={()=>confirm('Delete this record?','It will be removed from your garage history and its reminders cancelled.',async()=>{await premium.deleteRecord(client,p.id!);router.back()})}/>}
 </Screen>}
