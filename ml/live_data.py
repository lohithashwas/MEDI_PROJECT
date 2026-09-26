"""Read the existing local MEDIKET APIs. Never trigger hardware or alter Firebase."""
import json, math, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
from predict import abstain, RANGES

def fetch_source(path):
    origin=os.environ.get('MEDIKET_WEB_ORIGIN','http://127.0.0.1:3002').rstrip('/')
    parsed=urlparse(origin)
    if parsed.scheme!='http' or parsed.hostname not in ('127.0.0.1','localhost') or parsed.username or parsed.password:
        raise ValueError('MEDIKET_WEB_ORIGIN must be a local HTTP address')
    with urllib.request.urlopen(origin+'/api/'+path,timeout=7) as response:
        body=json.load(response)
    if not isinstance(body,dict) or body.get('error'):raise ValueError('Source unavailable')
    return body

def number(value):
    return value if isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value) else None

def read_live(fetcher=fetch_source):
    sources={};data={}
    with ThreadPoolExecutor(max_workers=3) as pool:
        pending={path:pool.submit(fetcher,path) for path in ('vitals','blood-pressure','temperature')}
        for path,future in pending.items():
            try:
                data[path]=future.result()
                if not isinstance(data[path], dict) or data[path].get('error'):
                    raise ValueError('Invalid source response')
                sources[path]={'status':'connected'}
            except Exception:data[path]={};sources[path]={'status':'unavailable','message':'Could not read this feed from MEDIKET. Check its device connection and server configuration.'}
    v=data['vitals'];bp=data['blood-pressure'];temp=data['temperature']
    systolic=diastolic=None
    try:
        parts=bp.get('bloodPressure','').split('/')
        if len(parts)==2:systolic,diastolic=[float(x) for x in parts]
    except (ValueError,TypeError,AttributeError):pass
    raw=number(temp.get('temperature'));unit=temp.get('unit')
    celsius=round((raw-32)*5/9,2) if raw is not None and unit=='°F' else raw if unit=='°C' else None
    measurements={'heart_rate_bpm':number(v.get('heartRate')),'spo2_percent':number(v.get('spo2')),'temperature_c':celsius,'systolic_bp_mmhg':number(systolic),'diastolic_bp_mmhg':number(diastolic),'glucose_mg_dl':number(v.get('glucose')),'bmi':number(v.get('bmi')),'stress_level':number(v.get('stressLevel'))}
    invalid_inputs=[]
    for field, value in measurements.items():
        if value is not None and not RANGES[field][0] <= value <= RANGES[field][1]:
            invalid_inputs.append(field)
            measurements[field]=None
    if measurements['systolic_bp_mmhg'] is not None and measurements['diastolic_bp_mmhg'] is not None and measurements['systolic_bp_mmhg'] <= measurements['diastolic_bp_mmhg']:
        invalid_inputs.extend(['systolic_bp_mmhg', 'diastolic_bp_mmhg'])
        measurements['systolic_bp_mmhg']=measurements['diastolic_bp_mmhg']=None
    sources['vitals']['invalid_inputs']=invalid_inputs
    sources['vitals']['recorded_at']=v.get('updatedAt')
    sources['blood-pressure']['recorded_at']=bp.get('recordedAt')
    sources['temperature']['recorded_at']=None
    connected=sum(s['status']=='connected' for s in sources.values())
    return {'status':'connected' if connected==3 else 'partial' if connected else 'unavailable','source':'live_mediket','fetched_at':int(time.time()*1000),'measurements':measurements,'sources':sources,'prediction':abstain('Live kiosk readings are connected as inputs, but neither trained model supports a general kiosk-health prediction. The ICU model requires a different population and time window; the diabetes model requires survey answers.'),'notes':['Zero heart rate or SpO₂ indicates no usable sensor measurement.','BP may be an older saved reading; consult its recorded time. Temperature measurement time is not supplied by its source. Fetch time is not measurement time.','BMI is unavailable unless supplied by the API. No sample values replace missing live data.']}
