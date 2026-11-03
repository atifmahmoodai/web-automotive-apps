import React,{useState} from 'react';
import {openExternal} from '../core/open-link';
import {websiteUrl} from '../core/config';
import {useCarbook} from '../core/store';
import {Button,Card,ErrorNotice,Field,Label,useTask} from './ui';
export function ConnectAccount(){const {client,refresh}=useCarbook(),[code,setCode]=useState(''),task=useTask();return <Card><Label>Already have a website account?</Label><Label muted>Create a connection code in the website’s Settings → Your account, then enter it here.</Label><Button title="Open Carbook website" secondary onPress={()=>void openExternal(websiteUrl('settings'),'website')}/><Field label="Connection code" value={code} onChangeText={setCode} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={48}/><ErrorNotice message={task.error}/><Button title="Connect your profile" disabled={code.trim().length!==48} loading={task.busy} onPress={()=>void task.run(async()=>{await client.request('/api/account/link',{method:'POST',body:JSON.stringify({code:code.trim()})});setCode('');await refresh()})}/></Card>}
