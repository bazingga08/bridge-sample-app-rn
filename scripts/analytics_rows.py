#!/usr/bin/env python3
"""Print a workspace's taps / app opens / installs since an ISO time, normalised
for assertions: one line per row, sorted; tap ids replaced by letters (A, B, …)
so "the open joins its tap" reads as the same letter on both lines.

  analytics_rows.py <tenant_id> <since-iso>     (needs redirect-engine/.env)
"""
import json, os, subprocess, sys

tenant, since = sys.argv[1], sys.argv[2]
engine = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'redirect-engine')
sql = f"""
select 'TAP' k, coalesce((select slug from links where id=link_id),'-') slug,
       source||' '||coalesce(sent_to,'-') v, click_id::text tap, clicked_at t
  from link_clicks where tenant_id='{tenant}' and clicked_at >= '{since}' and source <> 'match'
union all
select 'OPEN', coalesce((select slug from links where id=coalesce(o.link_id,(select link_id from link_clicks c where c.click_id=o.click_id))),'-'),
       route||' '||coalesce(app_state,'-')||' '||case when is_install then 'new' else 'existing' end||' '||case when matched then 'ok' else 'failed:'||coalesce(reason,'') end,
       click_id::text, received_at
  from app_opens o where tenant_id='{tenant}' and received_at >= '{since}'
union all
select 'INSTALL', coalesce((select slug from links where id=link_id),'-'), match_method||' '||case when matched then 'ok' else 'unmatched' end, click_id::text, installed_at
  from installs where tenant_id='{tenant}' and installed_at >= '{since}'
order by 5"""
out = subprocess.run(['node', '--env-file=.env', 'scripts/q.mjs', sql], cwd=engine, capture_output=True, text=True, check=True).stdout
rows = json.loads(out[out.index('['):])
letters = {}
def tag(tap):
    if not tap: return '-'
    letters.setdefault(tap, chr(ord('A') + len(letters)))
    return letters[tap]
lines = [f"{r['k']} {r['slug']} {r['v']} tap={tag(r['tap'])}" for r in rows]
# Taps only show their letter when something else references the same tap.
counts = {}
for r in rows:
    if r['tap']: counts[r['tap']] = counts.get(r['tap'], 0) + 1
lines = [l if not l.startswith('TAP') or counts.get(r['tap'], 0) > 1 else l.rsplit(' tap=', 1)[0] + ' tap=-' for l, r in zip(lines, rows)]
print('\n'.join(sorted(lines)))
