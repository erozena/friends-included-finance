const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const people = {richard:'Richard Darling', anastasia:'Anastasia Ferrari', 'jean-claude':'Jean-Claude Berzins', kevin:'Kevin von Whatever', svetlana:'Svetlana de Monte Carlo'};

export function json(res, status, body) { res.status(status).setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); }
export function read(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
export async function db(path, options={}) {
  if (!url || !key) throw new Error('Supabase server variables are not configured.');
  const r = await fetch(`${url}/rest/v1/${path}`, { ...options, headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'return=representation',...(options.headers||{})} });
  if (!r.ok) throw new Error((await r.text()) || `Supabase ${r.status}`);
  const text=await r.text(); return text ? JSON.parse(text) : null;
}
export function requireManager(role) { if (role !== 'svetlana') throw new Error('Only Svetlana can make manager decisions.'); }
export function roleFor(id) { return id === 'kevin' ? 'expense' : id === 'svetlana' ? 'manager' : 'sales'; }
export function round(n) { return Math.round((Number(n)+Number.EPSILON)*100)/100; }
export function validSplit(a,b,c) { return [a,b,c].every(x=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=100) && round(Number(a)+Number(b)+Number(c))===100; }
export function commissions(amount, r,a,j) {
  if (!validSplit(r,a,j)) throw new Error('Commission shares must each be 0-100 and total exactly 100%.');
  const pool=round(Number(amount)*.1), parts=[Number(r),Number(a),Number(j)], raw=parts.map(p=>round(pool*p/100));
  const delta=round(pool-raw.reduce((x,y)=>x+y,0));
  const order=[0,1,2].sort((x,y)=>parts[y]-parts[x] || x-y); raw[order[0]]=round(raw[order[0]]+delta);
  return {pool, r:raw[0], a:raw[1], j:raw[2]};
}
export async function telegram(chatId, text) {
  if (!chatId) throw new Error('No Telegram recipient linked');
  const token=process.env.TELEGRAM_BOT_TOKEN; if (!token) throw new Error('Telegram is not configured');
  const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text})});
  const data=await r.json(); if(!data.ok) throw new Error(data.description||'Telegram delivery failed'); return data;
}
export async function googleToken() {
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  const pem=rawKey.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  const privateKey=(pem ? pem[0] : rawKey).replace(/\\n/g,'\n').trim()+'\n';
  if(!email||!privateKey) throw new Error('Google service-account variables are not configured');
  const {createSign}=await import('node:crypto'); const b=x=>Buffer.from(x).toString('base64url'); const now=Math.floor(Date.now()/1000);
  const input=`${b(JSON.stringify({alg:'RS256',typ:'JWT'}))}.${b(JSON.stringify({iss:email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}))}`;
  const s=createSign('RSA-SHA256');s.update(input); const assertion=`${input}.${s.sign(privateKey).toString('base64url')}`;
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})}); const d=await r.json(); if(!d.access_token) throw new Error(d.error_description||'Google authentication failed'); return d.access_token;
}
export async function syncSheet(t) {
  const id=process.env.GOOGLE_SHEET_ID;if(!id) throw new Error('GOOGLE_SHEET_ID is not configured'); const token=await googleToken(); const tab=t.kind==='sale'?'Sales':'Expenses';
  const get=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${tab}!A:A`,{headers:{Authorization:`Bearer ${token}`}}); const rows=(await get.json()).values||[];
  if (!rows.length) { const header=t.kind==='sale'?['Reference','Submission time','Salesperson','Customer','Project','Description','Amount','Original split','Approved split','Richard earned','Anastasia earned','Jean-Claude earned','Status']:['Reference','Submission time','Reporter','Description','Category','Amount','Proposed allocation','Final allocation','Status']; await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`${tab}!A1`)}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[header]})}); rows.push(header); }
  const at=rows.findIndex(row=>row[0]===t.reference);
  const sale=[t.reference,t.submission_time,people[t.submitter_id],t.customer,t.project,t.description,t.amount,`${t.proposed_richard}/${t.proposed_anastasia}/${t.proposed_jean_claude}`,t.approved_richard==null?'':`${t.approved_richard}/${t.approved_anastasia}/${t.approved_jean_claude}`,t.commission_richard,t.commission_anastasia,t.commission_jean_claude,t.status];
  const expense=[t.reference,t.submission_time,people[t.submitter_id],t.description,t.category,t.amount,t.proposed_allocation,t.final_allocation||'',t.status];
  const values=[t.kind==='sale'?sale:expense], range=`${tab}!A${at>=0?at+1:rows.length+1}`;
  const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values})}); if(!r.ok) throw new Error(await r.text());
  await db(`transactions?id=eq.${t.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({sheets_status:'Synced'})});
}
export async function safeSync(t) {
  try { await syncSheet(t); return 'Synced'; }
  catch (e) {
    await db(`transactions?id=eq.${t.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({sheets_status:`Sync failed: ${e.message}`})
    });
    return `Sync failed: ${e.message}`;
  }
}
