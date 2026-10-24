import React from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import {Stack,ErrorBoundaryProps} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider,useAuth} from '../src/core/auth';
import {StoreProvider,useCarbook} from '../src/core/store';
import {ConnectAccount} from '../src/components/ConnectAccount';
import {SignIn} from '../src/screens/SignIn';
import {Button,ErrorNotice,Screen,Empty,useTask} from '../src/components/ui';
import {colors} from '../src/components/theme';
export function ErrorBoundary({retry}:ErrorBoundaryProps){return <Screen><Empty icon="refresh" title="Let’s try that again" description="Carbook encountered an unexpected problem. Your saved content is still on the service." action={<Button title="Reload Carbook" onPress={retry}/>}/></Screen>}
function AccountGate({children}:{children:React.ReactNode}){const {data,error,refresh,client}=useCarbook(),auth=useAuth(),task=useTask();if(!data)return <Screen><Empty title="Opening your garage" description="Loading your Carbook community."/><ErrorNotice message={error} retry={()=>void refresh().catch(()=>{})}/>{!error&&<ActivityIndicator color={colors.forest}/>}{error&&<ConnectAccount/>}<Button title="Sign out" secondary onPress={()=>void auth.signOut()}/></Screen>;
 if(data.accountStatus!=='active')return <Screen><Empty icon="shield" title={data.accountStatus==='deletion_pending'?'Account deletion scheduled':data.accountStatus==='deleted'?'Account deleted':'Account unavailable'} description={data.accountStatus==='deletion_pending'?'Your profile is hidden. You can cancel deletion during the seven-day waiting period.':data.accountStatus==='deleted'?'Your Carbook content has been removed.':'This account is deactivated or suspended.'}/><ErrorNotice message={task.error}/>{data.accountStatus==='deletion_pending'&&<Button title="Cancel account deletion" loading={task.busy} onPress={()=>void task.run(async()=>{await client.request('/api/account/cancel-deletion',{method:'POST',body:'{}'});await refresh()})}/>}<Button title="Sign out" secondary onPress={()=>void auth.signOut()}/></Screen>;
 return children;
}
function Root(){const auth=useAuth();if(auth.status==='loading')return <View style={{flex:1,backgroundColor:colors.paper,justifyContent:'center'}}><ActivityIndicator color={colors.forest}/></View>;if(auth.status!=='signedIn')return <SignIn/>;return <StoreProvider><AccountGate><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.paper}}}><Stack.Screen name="(tabs)"/><Stack.Screen name="compose" options={{presentation:'modal'}}/><Stack.Screen name="edit" options={{presentation:'modal'}}/><Stack.Screen name="report" options={{presentation:'modal'}}/></Stack></AccountGate></StoreProvider>}
export default function Layout(){return <SafeAreaProvider><StatusBar style="dark"/><AuthProvider><Root/></AuthProvider></SafeAreaProvider>}
