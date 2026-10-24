import React from 'react';
import {useCarbook} from '../../src/core/store';
import {ProfileScreen} from '../../src/screens/Profile';
export default function ProfileTab(){const {data}=useCarbook();return data?.userId?<ProfileScreen id={data.userId} tab/>:null}
