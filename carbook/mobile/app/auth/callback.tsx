import React from 'react';
import {Redirect} from 'expo-router';
// AuthSession handles the code and PKCE verifier in the system browser callback.
export default function Callback(){return <Redirect href="/"/>}
