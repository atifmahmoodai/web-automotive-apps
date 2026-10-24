import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {FeedScreen} from '../src/screens/Feed';
export default function CommunityFeed(){const {id,kind}=useLocalSearchParams<{id:string;kind:string}>();return <FeedScreen params={{[kind==='page'?'page':'group']:id}} title={kind==='page'?'Page posts':'Community posts'}/>}
