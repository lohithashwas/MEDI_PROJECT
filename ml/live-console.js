const liveFields = {heart_rate_bpm:['Heart rate','bpm'],spo2_percent:['SpO₂','%'],temperature_c:['Temperature','°C'],systolic_bp_mmhg:['Systolic BP','mmHg'],diastolic_bp_mmhg:['Diastolic BP','mmHg'],glucose_mg_dl:['Glucose','mg/dL'],bmi:['BMI','kg/m²'],stress_level:['Stress level','device score']};
let liveBusy=false;
function showTime(value){if(value==null)return 'Not supplied';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString();}
async function refreshLive(){
 if(liveBusy)return;liveBusy=true;const button=document.getElementById('live-refresh');button.disabled=true;
 try{
  const response=await fetch('/live',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error();const data=await response.json();
  document.getElementById('live-status').textContent=data.status==='connected'?'Live feeds connected':data.status==='partial'?'Some live feeds are unavailable':'Live feeds unavailable';
  const grid=document.getElementById('live-grid');grid.replaceChildren();
  for(const [key,[label,unit]] of Object.entries(liveFields)){const card=document.createElement('div');card.className='live-card';const title=document.createElement('small');title.textContent=label;const value=document.createElement('strong');const n=data.measurements[key];value.textContent=n==null?'—':`${n} ${unit}`;card.append(title,value);grid.append(card);}
  document.getElementById('live-times').textContent=`Vitals measured: ${showTime(data.sources.vitals.recorded_at)} · BP recorded: ${showTime(data.sources['blood-pressure'].recorded_at)} · Temperature time: not supplied · Fetched: ${showTime(data.fetched_at)}`;
  document.getElementById('live-prediction').textContent=data.prediction.reason;
  document.getElementById('live-json').textContent=JSON.stringify(data,null,2);
 }catch{document.getElementById('live-status').textContent='Connection lost — live readings cleared';document.getElementById('live-grid').replaceChildren();document.getElementById('live-times').textContent='';document.getElementById('live-json').textContent='';document.getElementById('live-prediction').textContent='Keep the ML server and MEDIKET website server running.';}
 finally{liveBusy=false;button.disabled=false;}
}
document.getElementById('live-refresh').addEventListener('click',refreshLive);
refreshLive();setInterval(()=>{if(!document.hidden)refreshLive();},10000);
