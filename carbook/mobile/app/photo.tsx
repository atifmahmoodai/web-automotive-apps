import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {useWindowDimensions} from 'react-native';
import {Screen,Photo} from '../src/components/ui';
export default function PhotoScreen(){const {path}=useLocalSearchParams<{path:string}>(),{height}=useWindowDimensions();return <Screen title="Photo" back><Photo path={path} height={height*.72} style={{borderRadius:20}}/></Screen>}
