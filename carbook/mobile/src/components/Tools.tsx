import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Card,textStyles} from './ui';
import {colors} from './theme';
import {Icon,type IconName} from './Icon';
const TOOLS:{icon:IconName;title:string;href:'/garage'|'/vin'|'/map'|'/assistant'}[]=[{icon:'wrench',title:'Smart garage',href:'/garage'},{icon:'car',title:'VIN decoder',href:'/vin'},{icon:'map',title:'Meetups map',href:'/map'},{icon:'sparkle',title:'Car assistant',href:'/assistant'}];
export function Tools(){return <Card><Text style={textStyles.subtitle}>Carbook tools</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{TOOLS.map(t=><Pressable key={t.href} accessibilityRole="button" onPress={()=>router.push(t.href)} style={({pressed})=>({flexBasis:'46%',flexGrow:1,padding:14,gap:8,borderRadius:16,backgroundColor:colors.leaf,opacity:pressed?.8:1})}><Icon name={t.icon} size={22}/><Text style={{fontWeight:'700',color:colors.ink}}>{t.title}</Text></Pressable>)}</View></Card>}
