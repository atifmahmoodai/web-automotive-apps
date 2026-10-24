import React from 'react';
import {Tabs,router} from 'expo-router';
import {View} from 'react-native';
import {Icon,type IconName} from '../../src/components/Icon';
import {colors} from '../../src/components/theme';
import {useCarbook} from '../../src/core/store';
export default function TabsLayout(){const {data}=useCarbook(),unread=data?.conversations.reduce((n,c)=>n+c.unread,0)||0;const icon=(name:IconName)=>({color}:{color:string})=><Icon name={name} color={color}/>;return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.forest,tabBarInactiveTintColor:colors.muted,tabBarLabelStyle:{fontSize:11,fontWeight:'600'},tabBarStyle:{backgroundColor:'white',borderTopColor:colors.line,paddingTop:7}}}><Tabs.Screen name="index" options={{title:'Feed',tabBarIcon:icon('home')}}/><Tabs.Screen name="explore" options={{title:'Explore',tabBarIcon:icon('search')}}/><Tabs.Screen name="compose" options={{title:'Create',tabBarIcon:()=> <View style={{width:43,height:38,borderRadius:13,backgroundColor:colors.orange,alignItems:'center',justifyContent:'center'}}><Icon name="plus" color="white"/></View>}} listeners={{tabPress:e=>{e.preventDefault();router.push('/compose')}}}/><Tabs.Screen name="messages" options={{title:'Inbox',tabBarIcon:icon('message'),tabBarBadge:unread||undefined}}/><Tabs.Screen name="profile" options={{title:'You',tabBarIcon:icon('user')}}/></Tabs>}
