import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import Animated,{FadeInDown} from 'react-native-reanimated';
import {decodeVin,validateVin,vinTitle,type VinDecode} from '../src/core/vin';
import {Banner,Button,Card,ErrorNotice,Field,Label,Screen,SkeletonCard,tap,textStyles,useTask} from '../src/components/ui';
import {colors} from '../src/components/theme';
export default function VinDecoder(){const [vin,setVin]=useState(''),[result,setResult]=useState<VinDecode|null>(null),task=useTask(),check=vin.length>=17?validateVin(vin):null;
 const rows=result?([['Year',result.year],['Make',result.make],['Model',result.model],['Trim',result.trim],['Body',result.body],['Engine',result.engine],['Fuel',result.fuel],['Drive',result.drive],['Transmission',result.transmission],['Built in',result.plant],['Manufacturer',result.manufacturer]] as const).filter(([,v])=>v):[];
 const title=result?vinTitle(result):'';
 return <Screen title="VIN decoder" back>
  <Banner icon="shield" title="Decoded by NHTSA vPIC">Free US government database. Coverage is best for vehicles sold in North America; imports may decode partially.</Banner>
  <Card><Field label="Vehicle identification number" value={vin} onChangeText={v=>{setVin(v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,17));setResult(null)}} autoCapitalize="characters" autoCorrect={false} maxLength={17} placeholder="17 characters, e.g. 1HGCM82633A004352" error={check&&!check.ok?check.error:undefined}/>
   <Label muted>{`${vin.length}/17 · Find it on the windscreen corner, driver door pillar or registration papers.`}</Label>
   {check?.ok&&check.warning&&<Label muted>{check.warning}</Label>}
   <Button title="Decode VIN" icon="search" loading={task.busy} disabled={!check?.ok} onPress={()=>void task.run(async()=>{setResult(await decodeVin(vin));tap('success')})}/></Card>
  <ErrorNotice message={task.error}/>
  {task.busy&&<SkeletonCard lines={5}/>}
  {result&&<Animated.View entering={FadeInDown} style={{gap:14}}><Card><Text style={textStyles.subtitle}>{title||result.vin}</Text><Text style={{color:colors.muted,letterSpacing:1.5,fontWeight:'600'}}>{result.vin}</Text>
   {rows.map(([k,v])=><View key={k} style={{flexDirection:'row',gap:12,paddingVertical:6,borderTopWidth:1,borderTopColor:colors.line}}><Text style={{width:110,color:colors.muted}}>{k}</Text><Text style={{flex:1,color:colors.ink,fontWeight:'600'}}>{v}</Text></View>)}
   {result.note&&<Label muted>{`vPIC note: ${result.note}`}</Label>}</Card>
   <Button title="Add to my garage" icon="car" onPress={()=>router.push({pathname:'/edit',params:{kind:'car',prefill:JSON.stringify({name:[result.make&&result.make[0]+result.make.slice(1).toLowerCase(),result.model,result.trim].filter(Boolean).join(' '),year:result.year})}})}/>
   <Button title="Use for a marketplace listing" icon="market" secondary onPress={()=>router.push({pathname:'/edit',params:{kind:'listing',prefill:JSON.stringify({title,description:`${title}\nVIN: ${result.vin}\n${rows.map(([k,v])=>`${k}: ${v}`).join('\n')}\n\nCondition: `})}})}/>
  </Animated.View>}
 </Screen>}
