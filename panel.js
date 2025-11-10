(function(){
  const api = (self.browser || self.chrome);
  const primary = api.storage && api.storage.sync ? api.storage.sync : (api.storage && api.storage.local ? api.storage.local : null);
  const fallback = api.storage && api.storage.local ? api.storage.local : null;
  const $=id=>document.getElementById(id);

  async function getSnippets(){ if(!primary) return []; return new Promise(res=>primary.get('snippets', r=>res(r && r.snippets ? r.snippets : []))); }
  async function setSnippets(list){ if(!primary) return; primary.set({snippets:list}, ()=>{}); if(fallback && fallback !== primary) fallback.set({snippets:list}, ()=>{}); }

  function matches(sn, q){ q=q.toLowerCase(); return (sn.name && sn.name.toLowerCase().includes(q)) || (sn.code && sn.code.toLowerCase().includes(q)); }

  function highlightCode(js){
    if(!js) return '';
    let s=js.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    s = s.replace(/\b([0-9]+(?:\.[0-9]+)?)\b/g, '<span class="tok-number">$1</span>');
    s = s.replace(/\b(var|let|const|if|else|for|while|function|return|async|await|try|catch|new|class|switch|case|break|continue|throw)\b/g, '<span class="tok-keyword">$1</span>');
    s = s.replace(/([A-Za-z_]\w*)\s*(?=\()/g, '<span class="tok-func">$1</span>');
    s = s.replace(/=>/g, '<span class="tok-keyword">=&gt;</span>');
    return s;
  }

  function createNode(sn, idx){
    const wrap=document.createElement('div'); wrap.className='snippet-item';
    const titleRow=document.createElement('div'); titleRow.className='snippet-title';
    const title=document.createElement('strong'); title.textContent=sn.name||('Snippet '+(idx+1));
    const actions=document.createElement('div'); actions.className='snippet-actions';
    const copy=document.createElement('button'); copy.textContent='Copy'; copy.className='small'; copy.onclick=()=>navigator.clipboard.writeText(sn.code);
    const run=document.createElement('button'); run.textContent='Run'; run.className='small'; run.onclick=()=>{ try{ api.devtools.inspectedWindow.eval(sn.code, (r,e)=>{ if(e) console.error('Eval error',e); }); }catch(e){console.error(e);} };
    const edit=document.createElement('button'); edit.textContent='Edit'; edit.className='small'; edit.onclick=()=>{ $('name').value=sn.name; $('code').value=sn.code; $('save').dataset.editIndex=idx; $('name').focus(); };
    const del=document.createElement('button'); del.textContent='Delete'; del.className='small'; del.onclick=async()=>{ const list=await getSnippets(); list.splice(idx,1); await setSnippets(list); render($('search').value.trim()); };
    actions.append(copy,run,edit,del); titleRow.append(title,actions);
    const pre=document.createElement('pre'); pre.className='code'; pre.innerHTML=highlightCode(sn.code||'');
    wrap.append(titleRow, pre); return wrap;
  }

  async function render(q=''){
    const container=$('list'); container.innerHTML=''; const list=await getSnippets(); const filtered = q ? list.filter(s=>matches(s,q)) : list;
    if(filtered.length===0){ const p=document.createElement('div'); p.className='muted'; p.textContent='No snippets found.'; container.appendChild(p); return; }
    filtered.forEach((s,i)=>container.appendChild(createNode(s,i)));
  }

  async function save(){
    const name=$('name').value.trim(); const code=$('code').value.trim(); if(!code) return alert('Code is required');
    const list=await getSnippets();
    if($('save').dataset.editIndex){ const idx=Number($('save').dataset.editIndex); list[idx]={name,code}; delete $('save').dataset.editIndex; } else { list.push({name,code}); }
    await setSnippets(list); $('name').value=''; $('code').value=''; render($('search').value.trim());
  }

  async function runCurrent(){ const code=$('code').value.trim(); if(!code) return alert('Nothing to run'); try{ api.devtools.inspectedWindow.eval(code,(r,e)=>{ if(e) console.error('Eval error',e); }); }catch(e){console.error(e);} }

  async function clearAll(){ if(!confirm('Clear all snippets?')) return; await setSnippets([]); render(); }
  async function exportJSON(){ const list=await getSnippets(); const blob=new Blob([JSON.stringify(list,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='snippets.json'; a.click(); URL.revokeObjectURL(url); }
  function importJSON(){ const input=document.createElement('input'); input.type='file'; input.accept='application/json'; input.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; const txt=await f.text(); try{ const parsed=JSON.parse(txt); if(!Array.isArray(parsed)) throw new Error('Invalid'); await setSnippets(parsed); render(); }catch(err){ alert('Import failed: '+err.message); } }; input.click(); }

  document.addEventListener('keydown', ev=>{ if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='s'){ ev.preventDefault(); save(); return; } if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ ev.preventDefault(); runCurrent(); return; } if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='f'){ ev.preventDefault(); $('search').focus(); $('search').select(); return; } });

  let timer=null; $('search').addEventListener('input', e=>{ clearTimeout(timer); timer=setTimeout(()=>render(e.target.value.trim()),150); });

  $('save').addEventListener('click', save); $('run').addEventListener('click', runCurrent); $('clear').addEventListener('click', clearAll); $('export').addEventListener('click', exportJSON); $('import').addEventListener('click', importJSON);

  (async function init(){ const existing = await getSnippets(); if(existing.length===0){ const defaultSnips=[{name:'Log selected ($0)',code:'console.log($0);'},{name:'Highlight links',code:\"document.querySelectorAll('a').forEach(a=>a.style.background='yellow');\"}]; await setSnippets(defaultSnips); } $('sync-status').textContent = (api.storage && api.storage.sync) ? 'enabled' : 'local-only'; render(); if(api.storage && api.storage.onChanged) api.storage.onChanged.addListener((changes, area) => { if(changes.snippets) render($('search').value.trim()); }); })();
})();
