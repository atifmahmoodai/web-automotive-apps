import React,{useMemo,useRef,useState} from 'react';
import {Linking,PanResponder,Pressable,Text,View} from 'react-native';
import {Image} from 'expo-image';
import {project,tileTemplate,tileUrl,unproject,visibleTiles} from '../core/geo';
import {colors,radius} from './theme';
import {Icon} from './Icon';
import {tap} from './ui';
export type Marker={id:string;lat:number;lng:number;label:string;active?:boolean};
// Keyless OpenStreetMap-style raster map: draggable, zoomable, no device location, attribution always visible.
export function TileMap({markers,initial,height=320,onSelect,attribution='© OpenStreetMap contributors'}:{markers:Marker[];initial:{center:{lat:number;lng:number};zoom:number};height?:number;onSelect?:(id:string)=>void;attribution?:string}){
 const [size,setSize]=useState({width:0,height}),[view,setView]=useState(initial),start=useRef(view),template=useMemo(()=>tileTemplate(),[]);
 const viewRef=useRef(view);viewRef.current=view;
 const pan=useMemo(()=>PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)+Math.abs(g.dy)>6,onPanResponderGrant:()=>{start.current=viewRef.current},onPanResponderMove:(_,g)=>{const s=start.current,c=project(s.center.lat,s.center.lng,s.zoom),n=unproject(c.x-g.dx,c.y-g.dy,s.zoom);setView({zoom:s.zoom,center:{lat:Math.max(-84,Math.min(84,n.lat)),lng:((n.lng+540)%360)-180}})}}),[]);
 const zoom=(d:number)=>{tap();setView(v=>({...v,zoom:Math.max(2,Math.min(18,v.zoom+d))}))};
 const c=project(view.center.lat,view.center.lng,view.zoom),tiles=size.width?visibleTiles(view.center,view.zoom,size.width,size.height):[];
 return <View onLayout={e=>setSize({width:e.nativeEvent.layout.width,height})} style={{height,borderRadius:radius.lg,overflow:'hidden',backgroundColor:colors.leaf,borderWidth:1,borderColor:colors.line}} {...pan.panHandlers} accessibilityLabel={`Map with ${markers.length} event${markers.length===1?'':'s'}`}>
  {tiles.map(t=><Image key={t.key} source={{uri:tileUrl(template,t.z,t.x,t.y),headers:{'User-Agent':'Carbook-mobile/0.2'}}} style={{position:'absolute',left:t.left,top:t.top,width:256,height:256}} cachePolicy="disk" recyclingKey={t.key}/>)}
  {size.width>0&&markers.map(m=>{const p=project(m.lat,m.lng,view.zoom),x=p.x-c.x+size.width/2,y=p.y-c.y+size.height/2;if(x<-30||y<-40||x>size.width+30||y>size.height+10)return null;
   return <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={m.label} onPress={()=>{tap();onSelect?.(m.id)}} hitSlop={10} style={{position:'absolute',left:x-17,top:y-40,alignItems:'center'}}><View style={{width:34,height:34,borderRadius:17,backgroundColor:m.active?colors.orange:colors.forest,borderWidth:3,borderColor:colors.surface,alignItems:'center',justifyContent:'center'}}><Icon name="calendar" size={16} color={colors.onAccent}/></View><View style={{width:3,height:8,backgroundColor:m.active?colors.orange:colors.forest}}/></Pressable>})}
  <View style={{position:'absolute',right:10,top:10,gap:8}}>{([['plus',1],['minus',-1]] as const).map(([k,d])=><Pressable key={k} accessibilityRole="button" accessibilityLabel={d>0?'Zoom in':'Zoom out'} onPress={()=>zoom(d)} style={{width:40,height:40,borderRadius:20,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line}}>{d>0?<Icon name="plus" size={20}/>:<Text style={{fontSize:24,lineHeight:26,color:colors.forest,fontWeight:'700'}}>−</Text>}</Pressable>)}</View>
  <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://www.openstreetmap.org/copyright')} style={{position:'absolute',right:0,bottom:0,paddingHorizontal:6,paddingVertical:2,backgroundColor:colors.surface+'DD',borderTopLeftRadius:6}}><Text style={{fontSize:10,color:colors.ink}}>{attribution}</Text></Pressable>
 </View>}
