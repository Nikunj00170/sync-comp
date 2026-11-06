#!/usr/bin/env python3
"""Regenerate exact-byte synthetic OCR cache with installed Tesseract (not a decision answer key)."""
import concurrent.futures, hashlib, json, pathlib, subprocess
root=pathlib.Path(__file__).resolve().parent.parent
files=sorted((root/'case_source/kyc_documents').glob('*.png'))
assert len(files)==47
def extract(path):
 text=subprocess.run(['tesseract',str(path),'stdout'],capture_output=True,text=True,check=True).stdout
 return {'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'text':text}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: data=list(pool.map(extract,files))
(root/'shared/data/kyc-ocr-fixtures.json').write_text(json.dumps(data,indent=2)+'\n')
print('Rebuilt cached OCR for 47 synthetic images. Unknown bytes require review; no identifiers corrected.')
