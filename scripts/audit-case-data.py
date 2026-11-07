#!/usr/bin/env python3
"""Read only the student dataset. Output aggregates/hashes, never lead PII or OCR text."""
import argparse, collections, csv, hashlib, json, pathlib, statistics
p=argparse.ArgumentParser();p.add_argument('source',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('docs/case-assessment/data-audit.json'));args=p.parse_args()
source=args.source;repo=pathlib.Path(__file__).resolve().parent.parent
files={name:list(csv.DictReader((source/name).open(encoding='utf-8-sig'))) for name in ['product_catalogue.csv','smb_leads.csv','mock_gstin_registry.csv','mock_udyam_registry.csv']}
comparisons={}
for name, rows in files.items():
 local=list(csv.DictReader((repo/'case_source'/name).open(encoding='utf-8-sig')))
 differences=collections.Counter(k for a,b in zip(rows,local) for k in a if a[k]!=b.get(k))
 comparisons[name]={'rows':len(rows),'repositoryRows':len(local),'identicalBytes':(source/name).read_bytes()==(repo/'case_source'/name).read_bytes(),'changedFields':dict(differences),'sourceSha256':hashlib.sha256((source/name).read_bytes()).hexdigest()}
images=list((source/'kyc_documents').glob('*.png'))
assert len(images)==47
assert all(f.read_bytes()==(repo/'case_source/kyc_documents'/f.name).read_bytes() for f in images),'Supplied images differ from repository fixtures'
leads=files['smb_leads.csv'];activated=[r for r in leads if r['outcome'].lower()=='activated']
stages={'leads':len(leads)}
for stage in ['contacted','needs_assessed','quote_accepted','kyc_complete','activated']: stages[stage]=sum(bool(r[stage+'_date']) for r in leads)
segments={}
for name in sorted({r['segment'] for r in leads}):
 subset=[r for r in leads if r['segment']==name];win=[r for r in subset if r['outcome'].lower()=='activated']
 segments[name]={'leads':len(subset),'activated':len(win),'conversionPercent':round(100*len(win)/len(subset),2),'medianActivatedMonthlyInr':statistics.median(float(r['monthly_bundle_value_inr']) for r in win) if win else None}
report={'validationDate':'2026-07-15','sourceFiles':comparisons,'images':{'count':len(images),'allMatchRepository':True},'funnel':stages,'activationRatePercent':round(100*len(activated)/len(leads),2),'averageActivationDays':round(statistics.mean(float(r['days_lead_to_activation']) for r in activated),2),'averageFollowupCalls':round(statistics.mean(float(r['customer_follow_up_calls']) for r in activated),2),'blendedCacInr':round(sum(float(r['acquisition_cost_inr']) for r in leads)/len(activated),2),'activatedSixMonthChurnPercent':round(100*sum(r['churned_within_6_months'].lower() in ['y','yes','true','1'] for r in activated)/len(activated),2),'segments':segments,'preferredLanguages':dict(collections.Counter(r['preferred_language'] for r in leads))}
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
