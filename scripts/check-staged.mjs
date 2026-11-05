import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=files.filter(file=>/(^|\/)\.private-context\/|(^|\/)AGENTS\.md$|(^|\/)\.env(?:\.|$)/.test(file)&&!file.endsWith('.env.example')||/\.(?:pem|key|keystore|jks|p12)$/.test(file)||file==='infra-placeholder/aws-prototype-config.json');
if(forbidden.length){console.error('Private/local configuration must not be committed:\n'+forbidden.join('\n'));process.exit(1);}
console.log(`Checked ${files.length} staged paths; no private context or local configuration staged.`);
