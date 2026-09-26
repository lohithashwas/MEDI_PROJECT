"""Download public archives and verify the exact versions used in this experiment."""
from pathlib import Path
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parent
if __name__=='__main__':
    target=ROOT/'data';target.mkdir(exist_ok=True)
    for source in json.loads((ROOT/'sources.json').read_text()):
        path=target/source['file']
        if not path.exists():
            request=urllib.request.Request(source['url'],headers={'User-Agent':'MEDIKET-research/1.0'})
            with urllib.request.urlopen(request,timeout=120) as response,path.open('wb') as f:
                while chunk:=response.read(1024*1024):f.write(chunk)
        with path.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
        if digest!=source['sha256']:raise RuntimeError(f'{path.name}: checksum mismatch; do not train on an unreviewed replacement')
        print(f'Verified {path.name}',flush=True)
