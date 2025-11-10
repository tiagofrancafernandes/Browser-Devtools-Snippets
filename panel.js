(function(){
  const api = (self.browser || self.chrome);
  const storage = api.storage && api.storage.local ? api.storage.local : null;

  function $(id){ return document.getElementById(id); }

  async function getSnippets(){
    if(!storage) return [];
    const data = await storage.get('snippets');
    return data.snippets || [];
  }

  async function setSnippets(list){
    if(!storage) return;
    await storage.set({ snippets: list });
  }

  function createSnippetNode(snippet, index){
    const wrap = document.createElement('div');
    wrap.className = 'snippet';

    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.justifyContent = 'space-between';
    titleRow.style.alignItems = 'center';

    const title = document.createElement('strong');
    title.textContent = snippet.name || ('Snippet ' + (index+1));

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.className = 'small';
    copyBtn.onclick = () => navigator.clipboard.writeText(snippet.code);

    const runBtn = document.createElement('button');
    runBtn.textContent = 'Run';
    runBtn.className = 'small';
    runBtn.onclick = () => {
      try {
        // run in inspectedWindow
        const toEval = '(' + snippet.code + ')';
        (api.devtools || api.devtools).inspectedWindow.eval(snippet.code, (result, exception) => {
          if(exception) console.error('Eval exception:', exception);
        });
      } catch(e){
        console.error(e);
      }
    };

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'small';
    editBtn.onclick = () => {
      $('snippet-name').value = snippet.name;
      $('snippet-code').value = snippet.code;
      $('add').textContent = 'Update';
      $('add').dataset.editIndex = index;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'small';
    delBtn.onclick = async () => {
      const list = await getSnippets();
      list.splice(index,1);
      await setSnippets(list);
      render();
    };

    actions.append(copyBtn, runBtn, editBtn, delBtn);
    titleRow.append(title, actions);

    const pre = document.createElement('pre');
    pre.textContent = snippet.code;

    wrap.append(titleRow, pre);
    return wrap;
  }

  async function render(){
    const container = $('snippets');
    container.innerHTML = '';
    const list = await getSnippets();
    if(list.length === 0){
      const p = document.createElement('div');
      p.className = 'muted';
      p.textContent = 'No snippets. Add one above.';
      container.appendChild(p);
      return;
    }
    list.forEach((s,i) => {
      container.appendChild(createSnippetNode(s,i));
    });
  }

  async function addOrUpdate(){
    const name = $('snippet-name').value.trim();
    const code = $('snippet-code').value.trim();
    if(!code) return alert('Code is required');
    const list = await getSnippets();
    if($('add').dataset.editIndex){
      const idx = Number($('add').dataset.editIndex);
      list[idx] = { name, code };
      delete $('add').dataset.editIndex;
      $('add').textContent = 'Add';
    } else {
      list.push({ name, code });
    }
    await setSnippets(list);
    $('snippet-name').value = '';
    $('snippet-code').value = '';
    render();
  }

  async function clearAll(){
    if(!confirm('Clear all snippets?')) return;
    await setSnippets([]);
    render();
  }

  async function exportJSON(){
    const list = await getSnippets();
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snippets.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        if(!Array.isArray(parsed)) throw new Error('Invalid format');
        await setSnippets(parsed);
        render();
      } catch(err){
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('add').addEventListener('click', addOrUpdate);
    $('clear').addEventListener('click', clearAll);
    $('export').addEventListener('click', exportJSON);
    $('import').addEventListener('click', importJSON);
    render();
  });
})();
