import {useState} from 'react';
import {Alert} from 'react-native';
import {usePreventRemove} from 'expo-router';
export function useUnsavedChanges(dirty:boolean){const [allowed,setAllowed]=useState(false);const disable=usePreventRemove(dirty&&!allowed,({repeat})=>{Alert.alert('Discard your changes?','Your unpublished changes will be lost.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>{setAllowed(true);repeat()}}]);});return ()=>{setAllowed(true);disable()};}
