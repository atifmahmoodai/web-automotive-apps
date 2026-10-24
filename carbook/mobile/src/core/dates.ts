// Reject normalized dates (for example February 31) and nonexistent local DST times.
export function localEventTime(date:string,time:string,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Enter a valid date and 24-hour time.');
 const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 const value=new Date(year!,month!-1,day!,hour,minute,0,0);
 if(value.getFullYear()!==year||value.getMonth()!==month!-1||value.getDate()!==day||value.getHours()!==hour||value.getMinutes()!==minute)throw new Error('This local date and time does not exist.');
 if(value.getTime()<now+60000)throw new Error('Choose a future date and time.');return value.getTime();
}
