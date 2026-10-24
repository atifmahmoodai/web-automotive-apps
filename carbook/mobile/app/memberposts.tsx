import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {FeedScreen} from '../src/screens/Feed';
export default function MemberPosts(){const {id}=useLocalSearchParams<{id:string}>();return <FeedScreen params={{author:id}} title="Member posts"/>}
