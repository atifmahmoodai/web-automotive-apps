"""Check the generated project catalogue and JavaScript syntax (Python + Node.js)."""
from pathlib import Path
import json, re, subprocess, sys, tempfile
ROOT=Path(__file__).resolve().parents[1]
projects=json.loads((ROOT/'scripts'/'catalog-manifest.json').read_text()) if (ROOT/'scripts'/'catalog-manifest.json').exists() else None
folders=sorted(p for p in ROOT.glob('*/') if p.is_dir() and p.name!='scripts' and not p.name.startswith('.'))
errors=[]
for folder in folders:
    for name in ['README.md','index.html','project.json']:
        if not (folder/name).is_file(): errors.append(f'{folder.relative_to(ROOT)}: missing {name}')
    try:
        cfg=json.loads((folder/'project.json').read_text())
        html=(folder/'index.html').read_text()
        if not cfg.get('seed') or not cfg.get('fields') or not cfg.get('statuses'): errors.append(f'{folder}: incomplete project configuration')
        if any(marker in html for marker in ['__TITLE__','__CONFIG__','__OPTIONS__']): errors.append(f'{folder}: unresolved template marker')
        script=re.search(r'<script>(.*?)</script>',html,re.S)
        if not script: errors.append(f'{folder}: missing application script')
        else:
            with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8') as f:
                f.write(script.group(1));f.flush()
                result=subprocess.run(['node','--check',f.name],capture_output=True,text=True)
            if result.returncode: errors.append(f'{folder}: {result.stderr.strip()}')
    except Exception as exc: errors.append(f'{folder}: {exc}')
if len(folders)!=19: errors.append(f'Expected 19 project folders, found {len(folders)}')
print(f'Project folders: {len(folders)}')
print(f'Validation failures: {len(errors)}')
for error in errors: print(error)
sys.exit(bool(errors))
