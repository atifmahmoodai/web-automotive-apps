import React from 'react';
import {Text,View,Pressable} from 'react-native';
import {router} from 'expo-router';
import Animated,{FadeInDown} from 'react-native-reanimated';
import {useCarbook} from '../../src/core/store';
import {Button,Empty,Label,Photo,Screen,textStyles} from '../../src/components/ui';
import {colors,radius,elevation} from '../../src/components/theme';
import {Icon} from '../../src/components/Icon';
export default function GarageHome(){const {data}=useCarbook(),cars=(data?.cars||[]).filter(c=>c.owner_id===data?.userId);
 return <Screen title="Smart garage" back><Label muted>Service history, fuel economy, running costs and documents for each car. Records are private to you.</Label>
  {cars.map((c,i)=><Animated.View key={c.id} entering={FadeInDown.delay(i*70)}><Pressable accessibilityRole="button" accessibilityLabel={`Open garage for ${c.name}`} onPress={()=>router.push({pathname:'/garage/[id]',params:{id:c.id}})} style={({pressed})=>[{borderRadius:radius.lg,overflow:'hidden',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,transform:[{scale:pressed?.985:1}]},elevation.card]}><Photo path={c.image} height={150}/><View style={{padding:16,flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1}}><Text style={textStyles.subtitle}>{c.name}</Text><Label muted>{String(c.year)}</Label></View><Icon name="chevron" color={colors.muted}/></View></Pressable></Animated.View>)}
  {!cars.length&&<Empty icon="car" title="Your garage is empty" description="Add a car to start tracking services, fuel and documents." action={<Button title="Add a car" icon="plus" onPress={()=>router.push({pathname:'/edit',params:{kind:'car'}})}/>}/>}
 </Screen>}
