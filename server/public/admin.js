async function $(id){return document.getElementById(id)}

async function init(){
  const uidEl = await $('uid');
  const pwEl = await $('pw');
  const btnLogin = await $('btnLogin');
  const btnLogout = await $('btnLogout');
  const who = await $('who');
  const after = await $('after');
  const msg = await $('msg');
  const out = await $('out');
  const btnLinks = await $('btnLinks');
  const btnCreateLink = await $('btnCreateLink');
  const btnNotices = await $('btnNotices');
  const btnCreateNotice = await $('btnCreateNotice');
  const btnCancelEdit = await $('btnCancelEdit');
  const n_image = await $('n_image');
  const n_heading = await $('n_heading');
  const n_description = await $('n_description');
  const n_publish = await $('n_publish');
  const n_expires = await $('n_expires');
  const n_priority = await $('n_priority');
  const noticesOut = await $('noticesOut');

  // Links UI
  const btnCreateLinkForm = await $('btnCreateLinkForm');
  const linksForm = await $('linksForm');
  const btnSaveLink = await $('btnSaveLink');
  const btnCancelLink = await $('btnCancelLink');
  const l_url = await $('l_url');
  const l_heading = await $('l_heading');
  const l_description = await $('l_description');
  const l_enabled = await $('l_enabled');
  const l_theme = await $('l_theme');
  const linksOut = await $('linksOut');

  let currentLinkId = null;

  // Users UI
  const u_uid = await $('u_uid');
  const u_pw = await $('u_pw');
  const btnCreateUser = await $('btnCreateUser');
  const btnFetchUsers = await $('btnFetchUsers');
  const usersOut = await $('usersOut');


  let currentEditId = null;

  function setLogged(uid){
    if(uid){
      localStorage.setItem('crta_admin_uid', uid);
      who.textContent = uid;
      document.getElementById('loginForm').style.display='none';
      after.style.display = 'block';
    } else {
      localStorage.removeItem('crta_admin_uid');
      document.getElementById('loginForm').style.display='block';
      after.style.display = 'none';
    }
  }

  const saved = localStorage.getItem('crta_admin_uid');
  if(saved) setLogged(saved);

  btnLogin.addEventListener('click', async ()=>{
    msg.textContent='';
    const uid = uidEl.value.trim();
    const pw = pwEl.value;
    if(!uid || !pw){ msg.textContent='uid and password required'; return; }
    try{
      const r = await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,password:pw})});
      const j = await r.json();
      if(r.ok){ setLogged(j.uid||uid); out.textContent = 'Login OK: '+JSON.stringify(j); }
      else { msg.textContent = j.error || JSON.stringify(j); }
    }catch(e){ msg.textContent = 'Network error: '+e.message }
  });

  btnLogout.addEventListener('click', ()=>{ setLogged(null); out.textContent=''; });

  btnLinks.addEventListener('click', async ()=>{
    out.textContent='';
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    try{
      const r = await fetch('/admin/links',{headers:{'x-admin-uid':uid}});
      const j = await r.json();
      out.textContent = JSON.stringify(j, null, 2);
    }catch(e){ out.textContent = 'Error: '+e.message }
  });


  async function fetchNotices(){
    out.textContent='';
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    try{
      const r = await fetch('/admin/notices',{headers:{'x-admin-uid':uid}});
      const j = await r.json();
      renderNotices(j);
    }catch(e){ out.textContent = 'Error: '+e.message }
  }

  btnNotices.addEventListener('click', fetchNotices);

  btnCreateNotice.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    const toISO = v => v ? (v.replace('T',' ') + ':00') : null; // datetime-local -> 'YYYY-MM-DD HH:MM:SS'
    const body = {
      image: n_image.value || null,
      heading: n_heading.value || null,
      description: n_description.value || null,
      publish_at: toISO(n_publish.value),
      expires_at: toISO(n_expires.value),
      priority: n_priority.value || 'Medium'
    };
    try{
      if(currentEditId){
        const r = await fetch('/admin/notices/'+currentEditId,{method:'PUT',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify(body)});
        const j = await r.json();
        if(r.ok){ out.textContent='Updated notice'; resetForm(); fetchNotices(); } else { out.textContent='Update failed: '+JSON.stringify(j); }
      } else {
        const r = await fetch('/admin/notices',{method:'POST',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify(body)});
        if(r.status===201){ out.textContent='Created notice'; fetchNotices(); } else { out.textContent='Create failed: '+(await r.text()); }
      }
    }catch(e){ out.textContent='Error: '+e.message }
  });

  btnCancelEdit.addEventListener('click', ()=>{ resetForm(); });

  function resetForm(){
    currentEditId = null;
    n_image.value=''; n_heading.value=''; n_description.value=''; n_publish.value=''; n_expires.value=''; n_priority.value='Medium';
    btnCreateNotice.textContent = 'Create notice';
    btnCancelEdit.classList.add('hidden');
  }

  function fmt(dt){
    if(!dt) return '-';
    // server stores 'YYYY-MM-DD HH:MM:SS' — convert to 'YYYY-MM-DDTHH:MM:SS' for Date parsing
    const d = new Date(dt.replace(' ','T'));
    if(isNaN(d)) return dt;
    return d.toLocaleString();
  }

  function renderNotices(list){
    if(!Array.isArray(list)) { noticesOut.textContent = JSON.stringify(list); return; }
    if(list.length===0){ noticesOut.textContent = 'No notices'; return; }
    const rows = list.map(n=>{
      const color = n.priority==='High'? 'text-red-600' : n.priority==='Medium'? 'text-yellow-600' : 'text-gray-600';
      return `
      <div class="bg-white p-3 rounded shadow-sm transition hover:shadow-md">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <strong class="text-lg">${escapeHtml(n.heading||'(no heading)')}</strong>
              <span class="font-semibold ${color}">${n.priority||'Medium'}</span>
            </div>
            <div class="mt-2 text-sm text-gray-700">${escapeHtml(n.description||'')}</div>
            <div class="mt-2 text-xs text-gray-500">Publish: ${fmt(n.publish_at)} | Expires: ${fmt(n.expires_at)} | Created: ${fmt(n.created_at)}</div>
          </div>
          <div class="flex flex-col gap-2 ml-3">
            <button data-id="${n.id}" data-image="${escapeHtml(n.image||'')}" data-heading="${escapeHtml(n.heading||'')}" data-description="${escapeHtml(n.description||'')}" data-publish="${n.publish_at||''}" data-expires="${n.expires_at||''}" data-priority="${n.priority||'Medium'}" class="btnEdit px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Edit</button>
            <button data-id="${n.id}" class="btnDel px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');
    noticesOut.innerHTML = rows;

    Array.from(noticesOut.querySelectorAll('.btnDel')).forEach(b=>{
      b.addEventListener('click', async (ev)=>{
        const id = ev.target.getAttribute('data-id');
        const uid = localStorage.getItem('crta_admin_uid');
        if(!uid){ out.textContent='Not logged in'; return; }
        if(!confirm('Delete notice '+id+'?')) return;
        try{
          const r = await fetch('/admin/notices/'+id,{method:'DELETE',headers:{'x-admin-uid':uid}});
          const j = await r.json();
          out.textContent = 'Deleted: '+JSON.stringify(j);
          fetchNotices();
        }catch(e){ out.textContent='Error: '+e.message }
      });
    });

    Array.from(noticesOut.querySelectorAll('.btnEdit')).forEach(b=>{
      b.addEventListener('click', (ev)=>{
        const id = ev.target.getAttribute('data-id');
        currentEditId = id;
        n_image.value = ev.target.getAttribute('data-image') || '';
        n_heading.value = ev.target.getAttribute('data-heading') || '';
        n_description.value = ev.target.getAttribute('data-description') || '';
        // convert 'YYYY-MM-DD HH:MM:SS' to 'YYYY-MM-DDTHH:MM' for datetime-local
        const toLocalInput = s => s ? s.replace(' ', 'T').slice(0,16) : '';
        n_publish.value = toLocalInput(ev.target.getAttribute('data-publish') || '');
        n_expires.value = toLocalInput(ev.target.getAttribute('data-expires') || '');
        n_priority.value = ev.target.getAttribute('data-priority') || 'Medium';
        btnCreateNotice.textContent = 'Update notice';
        btnCancelEdit.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // LINKS: create/edit/delete/fetch
  btnCreateLinkForm.addEventListener('click', ()=>{
    linksForm.style.display = 'block';
    currentLinkId = null;
    l_url.value=''; l_heading.value=''; l_description.value=''; l_enabled.value='1'; l_theme.value='';
  });
  btnCancelLink.addEventListener('click', ()=>{ linksForm.style.display='none'; currentLinkId=null; });

  btnSaveLink.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    const payload = { url: l_url.value, heading: l_heading.value, description: l_description.value, enabled: parseInt(l_enabled.value,10), theme_tag: l_theme.value };
    try{
      if(currentLinkId){
        const r = await fetch('/admin/links/'+currentLinkId,{method:'PUT',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify(payload)});
        const j = await r.json();
        out.textContent = 'Updated link: '+JSON.stringify(j);
      } else {
        const r = await fetch('/admin/links',{method:'POST',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify(payload)});
        const j = await r.json();
        out.textContent = 'Created link: '+JSON.stringify(j);
      }
      linksForm.style.display='none';
      fetchLinks();
    }catch(e){ out.textContent='Error: '+e.message }
  });

  async function fetchLinks(){
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    try{
      const r = await fetch('/admin/links',{headers:{'x-admin-uid':uid}});
      const j = await r.json();
      renderLinks(j);
    }catch(e){ out.textContent='Error: '+e.message }
  }

  function renderLinks(list){
    if(!Array.isArray(list)){ linksOut.textContent = JSON.stringify(list); return; }
    linksOut.innerHTML = list.map(l=>{
      return `<div class="p-2 bg-white rounded shadow-sm flex justify-between items-center">
        <div>
          <div class="font-semibold">${escapeHtml(l.heading||l.url)}</div>
          <div class="text-sm text-gray-600">${escapeHtml(l.description||'')}</div>
          <div class="text-xs text-gray-500">${l.enabled? 'Enabled' : 'Disabled'} | ${escapeHtml(l.theme_tag||'')}</div>
        </div>
        <div class="flex flex-col gap-2">
          <button data-id="${l.id}" data-url="${escapeHtml(l.url||'')}" data-heading="${escapeHtml(l.heading||'')}" data-description="${escapeHtml(l.description||'')}" data-enabled="${l.enabled?1:0}" data-theme="${escapeHtml(l.theme_tag||'')}" class="btnLinkEdit px-2 py-1 bg-blue-500 text-white rounded">Edit</button>
          <button data-id="${l.id}" class="btnLinkDel px-2 py-1 bg-red-500 text-white rounded">Delete</button>
        </div>
      </div>`;
    }).join('');

    Array.from(linksOut.querySelectorAll('.btnLinkDel')).forEach(b=>{
      b.addEventListener('click', async (ev)=>{
        const id = ev.target.getAttribute('data-id');
        const uid = localStorage.getItem('crta_admin_uid');
        if(!uid){ out.textContent='Not logged in'; return; }
        if(!confirm('Delete link '+id+'?')) return;
        try{
          const r = await fetch('/admin/links/'+id,{method:'DELETE',headers:{'x-admin-uid':uid}});
          const j = await r.json();
          out.textContent = 'Deleted: '+JSON.stringify(j);
          fetchLinks();
        }catch(e){ out.textContent='Error: '+e.message }
      });
    });

    Array.from(linksOut.querySelectorAll('.btnLinkEdit')).forEach(b=>{
      b.addEventListener('click', (ev)=>{
        const id = ev.target.getAttribute('data-id');
        currentLinkId = id;
        l_url.value = ev.target.getAttribute('data-url')||'';
        l_heading.value = ev.target.getAttribute('data-heading')||'';
        l_description.value = ev.target.getAttribute('data-description')||'';
        l_enabled.value = ev.target.getAttribute('data-enabled')||'1';
        l_theme.value = ev.target.getAttribute('data-theme')||'';
        linksForm.style.display='block';
      });
    });
  }

  // initial load of links
  fetchLinks();

  // Users
  btnCreateUser.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    if(!u_uid.value || !u_pw.value){ out.textContent='uid and password required'; return; }
    try{
      const r = await fetch('/admin/users',{method:'POST',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify({uid:u_uid.value,password:u_pw.value})});
      const j = await r.json();
      out.textContent = 'Created user: '+JSON.stringify(j);
      u_uid.value=''; u_pw.value='';
      fetchUsers();
    }catch(e){ out.textContent='Error: '+e.message }
  });

  btnFetchUsers.addEventListener('click', fetchUsers);

  async function fetchUsers(){
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    try{
      const r = await fetch('/admin/users',{headers:{'x-admin-uid':uid}});
      const j = await r.json();
      renderUsers(j);
    }catch(e){ out.textContent='Error: '+e.message }
  }

  function renderUsers(list){
    if(!Array.isArray(list)){ usersOut.textContent = JSON.stringify(list); return; }
    if(list.length===0){ usersOut.textContent='No users'; return; }
    usersOut.innerHTML = list.map(u=>{
      return `<div class="p-2 bg-white rounded shadow-sm flex justify-between items-center"><div>${escapeHtml(u.uid)}</div><div><button data-uid="${escapeHtml(u.uid)}" class="btnUserDel px-2 py-1 bg-red-500 text-white rounded">Delete</button></div></div>`;
    }).join('');
    Array.from(usersOut.querySelectorAll('.btnUserDel')).forEach(b=>{
      b.addEventListener('click', async (ev)=>{
        const uidv = ev.target.getAttribute('data-uid');
        const admin = localStorage.getItem('crta_admin_uid');
        if(!admin){ out.textContent='Not logged in'; return; }
        if(!confirm('Delete user '+uidv+'?')) return;
        try{
          const r = await fetch('/admin/users/'+encodeURIComponent(uidv),{method:'DELETE',headers:{'x-admin-uid':admin}});
          const j = await r.json();
          out.textContent = 'Deleted user: '+JSON.stringify(j);
          fetchUsers();
        }catch(e){ out.textContent='Error: '+e.message }
      });
    });
  }

  // initial state
  resetForm();
}

init();
