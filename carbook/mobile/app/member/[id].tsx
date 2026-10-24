import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {ProfileScreen} from '../../src/screens/Profile';
export default function Member(){const {id}=useLocalSearchParams<{id:string}>();return <ProfileScreen id={id}/>}
