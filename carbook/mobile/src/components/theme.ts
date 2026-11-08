// Carbook design tokens. `colors` is a live palette swapped by ThemeProvider (light/dark); read it at render time, never cache it at module level.
export type Scheme='light'|'dark';
const light={paper:'#F7F8F4',surface:'#FFFFFF',raised:'#FFFFFF',ink:'#162D24',muted:'#66786C',line:'#DFE6DC',forest:'#214C38',leaf:'#EAF1E5',orange:'#DE7345',peach:'#FAE7DC',danger:'#A33436',dangerSoft:'#FBECE6',blue:'#255B88',gold:'#B88A2E',onAccent:'#FFFFFF',placeholder:'#849085',overlay:'#10261D66',scrim:'#11271FB0',skeleton:'#E6ECE3',media:'#10261D'};
const dark:typeof light={paper:'#0D1411',surface:'#151F1A',raised:'#1B2721',ink:'#E7EFE9',muted:'#97A79C',line:'#26352D',forest:'#74C9A0',leaf:'#1C2C24',orange:'#F0905F',peach:'#3A271E',danger:'#F08079',dangerSoft:'#3A1E1D',blue:'#8DBBE8',gold:'#E0B95E',onAccent:'#0A1912',placeholder:'#6F8076',overlay:'#000000AA',scrim:'#000000B8',skeleton:'#1F2C25',media:'#050807'};
export const palettes={light,dark};
export const colors:typeof light={...light};
export const shadow={shadowColor:'#193525',shadowOffset:{width:0,height:5},shadowOpacity:0.04,shadowRadius:18,elevation:2};
export let scheme:Scheme='light';
export function applyScheme(next:Scheme){scheme=next;Object.assign(colors,palettes[next]);Object.assign(shadow,next==='dark'?{shadowColor:'#000000',shadowOpacity:0.35}:{shadowColor:'#193525',shadowOpacity:0.04});}
export const space={xs:4,sm:8,md:12,lg:16,xl:20,xxl:28,xxxl:40} as const;
export const radius={sm:10,md:14,lg:20,xl:28,pill:999} as const;
export const type={display:{fontSize:34,lineHeight:40,fontWeight:'800' as const,letterSpacing:-1},title:{fontSize:30,lineHeight:36,fontWeight:'800' as const,letterSpacing:-.8},subtitle:{fontSize:20,lineHeight:26,fontWeight:'700' as const},body:{fontSize:16,lineHeight:24},label:{fontSize:14,lineHeight:20,fontWeight:'600' as const},caption:{fontSize:12,lineHeight:16,fontWeight:'600' as const,letterSpacing:.4}};
export const elevation={flat:{},card:{shadowColor:'#0B1A12',shadowOffset:{width:0,height:4},shadowOpacity:.06,shadowRadius:14,elevation:2},floating:{shadowColor:'#0B1A12',shadowOffset:{width:0,height:10},shadowOpacity:.14,shadowRadius:24,elevation:8}};
export const motion={fast:140,base:220,slow:360} as const;
