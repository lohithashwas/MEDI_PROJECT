import json,socket,subprocess,sys,time,unittest,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parent
class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as s:s.bind(('127.0.0.1',0));cls.port=s.getsockname()[1]
        cls.base=f'http://127.0.0.1:{cls.port}'
        cls.proc=subprocess.Popen([sys.executable,str(ROOT/'serve.py'),'--port',str(cls.port)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        for _ in range(60):
            try:
                with urllib.request.urlopen(cls.base+'/health',timeout=1) as r:
                    if r.status==200:return
            except (OSError,urllib.error.URLError):time.sleep(.1)
        cls.proc.terminate();raise RuntimeError('Local API did not start')
    @classmethod
    def tearDownClass(cls):cls.proc.terminate();cls.proc.wait(timeout=10)
    def test_valid_research_request(self):
        request=urllib.request.Request(self.base+'/predict',data=(ROOT/'examples'/'diabetes.json').read_bytes(),headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=15) as r:body=json.load(r)
        self.assertEqual(body['status'],'research_result');self.assertFalse(body['clinical_use'])
    def test_browser_console(self):
        for path in ('/','/console'):
            with urllib.request.urlopen(self.base+path,timeout=5) as r:
                self.assertEqual(r.status,200);self.assertIn('text/html',r.headers['Content-Type']);self.assertIn('Run Model',r.read().decode())
    def test_reject_malformed_json(self):
        request=urllib.request.Request(self.base+'/predict',data=b'{broken',headers={'Content-Type':'application/json'})
        with self.assertRaises(urllib.error.HTTPError) as caught:urllib.request.urlopen(request,timeout=5)
        self.assertEqual(caught.exception.code,400)
        caught.exception.close()
    def test_stream_sends_initial_frame(self):
        with urllib.request.urlopen(self.base+'/stream',timeout=15) as response:
            self.assertEqual(response.headers['Content-Type'],'text/event-stream')
            self.assertEqual(response.readline(),b': connected\n')
    def test_readiness_reports_both_models(self):
        with urllib.request.urlopen(self.base+'/health',timeout=15) as response:
            body=json.load(response)
        self.assertEqual(body['status'],'ready')
        self.assertEqual(set(body['models']),{'sepsis','diabetes'})
    def test_demo_inference(self):
        request=urllib.request.Request(self.base+'/predict',data=(ROOT/'examples'/'sepsis-demo.json').read_bytes(),headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=15) as response:
            body=json.load(response)
        self.assertEqual(body['status'],'demonstration_result')
        self.assertIsNone(body['overall_health_status'])
if __name__=='__main__':unittest.main()
