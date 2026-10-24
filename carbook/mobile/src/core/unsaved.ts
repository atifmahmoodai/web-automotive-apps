import {useEffect,useRef} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from 'expo-router';
export function useUnsavedChanges(dirty:boolean){const navigation=useNavigation(),allowed=useRef(false);useEffect(()=>navigation.addListener('beforeRemove',event=>{if(!dirty||allowed.current)return;event.preventDefault();Alert.alert('Discard your changes?','Your unpublished changes will be lost.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>{allowed.current=true;navigation.dispatch(event.data.action)}}]);}),[navigation,dirty]);return ()=>{allowed.current=true};}
