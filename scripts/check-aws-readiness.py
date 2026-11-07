#!/usr/bin/env python3
"""Read-only endpoint probes. Reads public endpoint configuration; prints no secret values."""
import pathlib,urllib.request,urllib.error,urllib.parse,json,ssl,datetime,os
values={}
for line in pathlib.Path('.env.local').read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);values[k.strip()]=v.strip().strip('"\'')
ctx=ssl.create_default_context(cafile='/etc/ssl/cert.pem') if pathlib.Path('/etc/ssl/cert.pem').exists() else ssl.create_default_context()
base=values['VITE_API_BASE_URL'].rstrip('/')
frontend=urllib.parse.urlsplit(values['VITE_REDIRECT_URI'])
frontend_origin=frontend.scheme+'://'+frontend.netloc
urls={'apiHealth':base+'/health','apiCatalogue':base+'/v1/catalogue','apiUnauthenticatedProfile':base+'/v1/me','cognitoDiscovery':values['VITE_COGNITO_AUTHORITY'].rstrip('/')+'/.well-known/openid-configuration','cognitoJwks':values['VITE_COGNITO_AUTHORITY'].rstrip('/')+'/.well-known/jwks.json','frontend':values['VITE_REDIRECT_URI']}
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':{}}
for name,url in urls.items():
 req=urllib.request.Request(url,headers={'Origin':frontend_origin})
 try:
  with urllib.request.urlopen(req,context=ctx,timeout=20) as response:
   body=response.read(2000000);status=response.status;headers=response.headers
 except urllib.error.HTTPError as e: body=e.read(10000);status=e.code;headers=e.headers
 except Exception as e: report['checks'][name]={'reachable':False,'errorType':type(e).__name__};continue
 entry={'httpStatus':status,'contentType':headers.get('Content-Type'),'allowOrigin':headers.get('Access-Control-Allow-Origin')}
 try:
  data=json.loads(body)
  if name=='apiHealth':entry['response']=data
  if name=='apiCatalogue':entry['productCount']=len(data) if isinstance(data,list) else len(data.get('products',[]))
  if name=='cognitoDiscovery':entry['issuerMatches']=data.get('issuer')==values['VITE_COGNITO_AUTHORITY']
  if name=='cognitoJwks':entry['signingKeyCount']=len(data.get('keys',[]))
 except ValueError:pass
 report['checks'][name]=entry
report['iamCredentials']={'environmentConfigured':bool(os.environ.get('AWS_ACCESS_KEY_ID') or os.environ.get('AWS_WEB_IDENTITY_TOKEN_FILE') or os.environ.get('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI')),'sharedConfigPresent':(pathlib.Path.home()/'.aws/config').exists(),'sharedCredentialsPresent':(pathlib.Path.home()/'.aws/credentials').exists()}
pathlib.Path('docs/case-assessment/aws-readiness.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
