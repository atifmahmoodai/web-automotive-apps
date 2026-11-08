import React,{useRef,useState} from 'react';
import {Dimensions,FlatList,Image,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated,{FadeInDown,FadeInUp,useAnimatedStyle,withSpring} from 'react-native-reanimated';
import {Button,tap} from '../components/ui';
import {Icon,type IconName} from '../components/Icon';
import {colors,radius,type as typo} from '../components/theme';
import {askPermission} from '../core/push';
const SLIDES:{icon:IconName;kicker:string;title:string;body:string}[]=[
 {icon:'car',kicker:'WELCOME TO CARBOOK',title:'Good cars.\nBetter company.',body:'A private network for people who love their cars: stories, communities, drives and a marketplace you can trust.'},
 {icon:'wrench',kicker:'SMART GARAGE',title:'Your car’s\nlogbook, perfected.',body:'Service history, fuel economy, running costs and documents, with reminders before anything falls due.'},
 {icon:'map',kicker:'MEETUPS',title:'Find the meet.\nCheck in. Drive.',body:'See pinned meetups on the map, get directions in one tap and check in when you arrive.'},
 {icon:'sparkle',kicker:'CAR ASSISTANT',title:'Answers about\nyour car.',body:'Ask an AI assistant about maintenance and buying, with your garage as context. It is guidance, not a mechanic.'},
 {icon:'bell',kicker:'STAY IN THE LOOP',title:'Never miss\nthe moment.',body:'Get notified about messages, offers, comments and event updates. You control every notification in Settings.'},
];
function Dot({active}:{active:boolean}){const s=useAnimatedStyle(()=>({width:withSpring(active?26:8),opacity:withSpring(active?1:.35)}));return <Animated.View style={[{height:8,borderRadius:4,backgroundColor:colors.forest},s]}/>}
export function Onboarding({onDone}:{onDone:()=>void}){const [index,setIndex]=useState(0),list=useRef<FlatList>(null),width=Dimensions.get('window').width,last=index===SLIDES.length-1;
 const onView=useRef(({viewableItems}:{viewableItems:{index?:number|null}[]})=>{const i=viewableItems[0]?.index;if(i!=null)setIndex(i)}).current;
 const next=()=>{tap();if(last)return;list.current?.scrollToIndex({index:index+1,animated:true})};
 return <SafeAreaView style={{flex:1,backgroundColor:colors.paper}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:22,paddingTop:10}}><Image source={require('../../assets/icon.png')} style={{width:34,height:34,borderRadius:10}}/><Text style={{flex:1,fontSize:20,fontWeight:'800',color:colors.ink,letterSpacing:-.6}}>carbook</Text>{!last&&<Button title="Skip" secondary onPress={onDone}/>}</View>
  <FlatList ref={list} data={SLIDES} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={s=>s.kicker} onViewableItemsChanged={onView} viewabilityConfig={{itemVisiblePercentThreshold:60}}
   renderItem={({item,index:i})=><View style={{width,padding:26,justifyContent:'center',gap:18}}>
    {i===0?<Animated.View entering={FadeInUp.duration(500)}><Image source={require('../../assets/hero.jpg')} style={{height:240,width:'100%',borderRadius:radius.xl}} accessibilityIgnoresInvertColors/></Animated.View>
     :<View style={{height:200,borderRadius:radius.xl,backgroundColor:colors.leaf,alignItems:'center',justifyContent:'center'}}><View style={{width:108,height:108,borderRadius:54,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'}}><Icon name={item.icon} size={52} color={colors.forest}/></View></View>}
    <Text style={[typo.caption,{color:colors.orange,letterSpacing:2}]}>{item.kicker}</Text>
    <Text style={[typo.display,{color:colors.ink}]}>{item.title}</Text>
    <Text style={[typo.body,{color:colors.muted}]}>{item.body}</Text></View>}/>
  <Animated.View entering={FadeInDown.delay(200)} style={{padding:22,gap:16}}>
   <View accessibilityLabel={`Step ${index+1} of ${SLIDES.length}`} style={{flexDirection:'row',gap:6,justifyContent:'center'}}>{SLIDES.map((s,i)=><Dot key={s.kicker} active={i===index}/>)}</View>
   {last?<><Button title="Turn on notifications" icon="bell" onPress={()=>void askPermission().catch(()=>false).finally(onDone)}/><Button title="Maybe later" secondary onPress={onDone}/></>:<Button title="Continue" onPress={next}/>}
  </Animated.View></SafeAreaView>}
