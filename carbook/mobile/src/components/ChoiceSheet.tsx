import React from 'react';
import {Modal,Pressable,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from './theme';
import {IconButton,textStyles} from './ui';
export type Choice={label:string;onPress:()=>void;danger?:boolean};
export function ChoiceSheet({title,choices,onClose}:{title:string;choices:Choice[]|null;onClose:()=>void}){return <Modal transparent animationType="slide" visible={choices!==null} onRequestClose={onClose}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#10261D66'}}><Pressable accessibilityLabel="Close options" onPress={onClose} style={{flex:1}}/><SafeAreaView edges={['bottom']} style={{padding:20,gap:6,borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:'white'}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:12}}><Text style={textStyles.subtitle}>{title}</Text><IconButton name="close" label="Close" onPress={onClose}/></View>{choices?.map(c=><Pressable key={c.label} accessibilityRole="button" onPress={()=>{onClose();c.onPress()}} style={{paddingVertical:17,paddingHorizontal:12,borderRadius:12}}><Text style={{fontSize:17,fontWeight:'600',color:c.danger?colors.danger:colors.ink}}>{c.label}</Text></Pressable>)}</SafeAreaView></View></Modal>}
