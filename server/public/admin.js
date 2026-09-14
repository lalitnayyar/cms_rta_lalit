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

  const btnDbStatus = await $('btnDbStatus');
  const btnTestLive = await $('btnTestLive');
  const btnSettings = await $('btnSettings');
  const settingsPanel = await $('settingsPanel');
  const s_heading1 = await $('s_heading1');
  const s_heading2 = await $('s_heading2');
  const btnSaveSettings = await $('btnSaveSettings');
  const settingsOut = await $('settingsOut');

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
  const searchLinks = await $('searchLinks');

  let currentLinkId = null;

  // Users UI
  const u_uid = await $('u_uid');
  const u_pw = await $('u_pw');
  const btnCreateUser = await $('btnCreateUser');
  const btnFetchUsers = await $('btnFetchUsers');
  const usersOut = await $('usersOut');
  const searchUsers = await $('searchUsers');


  let currentEditId = null;

  // cached lists for client-side search
  let lastLinks = [];
  let lastNotices = [];
  let lastUsers = [];
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
      lastNotices = Array.isArray(j)? j : [];
      renderNotices(lastNotices);
    }catch(e){ out.textContent = 'Error: '+e.message }
  }

  btnNotices.addEventListener('click', fetchNotices);
  // search handlers
  if(searchLinks){ searchLinks.addEventListener('input', (e)=>{ const q=String(e.target.value||'').trim().toLowerCase(); renderLinks(q? lastLinks.filter(l=> (l.heading||'').toLowerCase().includes(q) || (l.url||'').toLowerCase().includes(q) || (l.description||'').toLowerCase().includes(q) ) : lastLinks); }); }
  if(searchUsers){ searchUsers.addEventListener('input', (e)=>{ const q=String(e.target.value||'').trim().toLowerCase(); renderUsers(q? lastUsers.filter(u=> (u.uid||'').toLowerCase().includes(q) ) : lastUsers); }); }
  const searchNoticesEl = await $('searchNotices');
  if(searchNoticesEl){ searchNoticesEl.addEventListener('input', (e)=>{ const q=String(e.target.value||'').trim().toLowerCase(); renderNotices(q? lastNotices.filter(n=> (n.heading||'').toLowerCase().includes(q) || (n.description||'').toLowerCase().includes(q) || (n.priority||'').toLowerCase().includes(q) ) : lastNotices); }); }

  btnDbStatus.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    try{
      const r = await fetch('/admin/status',{headers:{'x-admin-uid':uid}});
      const j = await r.json();
      out.textContent = 'DB status: ' + JSON.stringify(j);
      // show download link
      const a = document.createElement('a');
      a.href = '/admin/db?uid='+encodeURIComponent(uid);
      a.textContent = 'Download DB';
      a.target = '_blank';
      out.appendChild(document.createElement('br'));
      out.appendChild(a);
    }catch(e){ out.textContent='Error: '+e.message }
  });

  btnSettings.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    if(settingsPanel.style.display==='none'){
      // fetch current settings
      try{
        const r = await fetch('/admin/settings',{headers:{'x-admin-uid':uid}});
        const j = await r.json();
        s_heading1.value = j.heading1 || '';
        s_heading2.value = j.heading2 || '';
      }catch(e){ out.textContent='Error: '+e.message }
      settingsPanel.style.display='block';
    } else {
      settingsPanel.style.display='none';
    }
  });

  btnSaveSettings.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ settingsOut.textContent='Not logged in'; return; }
    const payload = { heading1: s_heading1.value || '', heading2: s_heading2.value || '' };
    try{
      const r = await fetch('/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify(payload)});
      const j = await r.json();
      if(r.ok){ settingsOut.textContent = 'Saved'; // also update server-side cache if needed
      } else { settingsOut.textContent = 'Save failed: '+(j.error||JSON.stringify(j)); }
    }catch(e){ settingsOut.textContent = 'Error: '+e.message }
  });

  btnTestLive.addEventListener('click', async ()=>{
    out.textContent='';
    try{
      const r = await fetch('/');
      out.textContent = 'Live root responded: ' + r.status + ' ' + r.statusText + ' ('+ (r.headers.get('content-type') || '') +')';
      // open in new tab for manual check
      window.open('/', '_blank');
    }catch(e){ out.textContent='Error: '+e.message }
  });

  btnCreateNotice.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    // convert datetime-local (local time) to server UTC 'YYYY-MM-DD HH:MM:SS'
    const localInputToServerUTC = v => {
      if(!v) return null;
      // v = 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DDTHH:MM:SS'
      const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
      if(!m) return null;
      const y=+m[1], mo=+m[2], d=+m[3], hh=+m[4], mm=+m[5], ss=+(m[6]||0);
      // build local Date
      const local = new Date(y, mo-1, d, hh, mm, ss);
      // extract UTC components
      const uy = local.getUTCFullYear(), umo = local.getUTCMonth()+1, ud = local.getUTCDate(), uhh = local.getUTCHours(), umm = local.getUTCMinutes(), uss = local.getUTCSeconds();
      const pad = n=> String(n).padStart(2,'0');
      return `${uy}-${pad(umo)}-${pad(ud)} ${pad(uhh)}:${pad(umm)}:${pad(uss)}`;
    };

    const body = {
      image: n_image.value || null,
      heading: n_heading.value || null,
      description: n_description.value || null,
      publish_at: localInputToServerUTC(n_publish.value),
      expires_at: localInputToServerUTC(n_expires.value),
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
    n_image.value=''; n_heading.value=''; n_description.value='';
    // default publish to now (local) and expires to +8 hours
    n_publish.value = localNowInput(0);
    n_expires.value = localNowInput(8);
    n_priority.value='Medium';
    btnCreateNotice.textContent = 'Create notice';
    btnCancelEdit.classList.add('hidden');
  }

  function parseServerDatetimeAsUTC(dt){
    // dt expected 'YYYY-MM-DD HH:MM:SS'
    const m = String(dt||'').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if(!m) return new Date(dt);
    const y = +m[1], mo = +m[2], d = +m[3], hh = +m[4], mm = +m[5], ss = +m[6];
    // treat server timestamp as UTC
    const ms = Date.UTC(y, mo-1, d, hh, mm, ss);
    return new Date(ms);
  }

  function fmt(dt){
    if(!dt) return '-';
    const d = parseServerDatetimeAsUTC(dt);
    if(isNaN(d)) return dt;
    return d.toLocaleString();
  }

  function serverToLocalInput(s){
    if(!s) return '';
    const d = parseServerDatetimeAsUTC(s);
    if(isNaN(d)) return '';
    const pad = n=> String(n).padStart(2,'0');
    const y = d.getFullYear(), mo = pad(d.getMonth()+1), day = pad(d.getDate()), hh = pad(d.getHours()), mm = pad(d.getMinutes());
    return `${y}-${mo}-${day}T${hh}:${mm}`;
  }

  function localNowInput(addHours){
    const now = new Date();
    if(addHours) now.setHours(now.getHours()+addHours);
    const pad = n=> String(n).padStart(2,'0');
    const y = now.getFullYear(), mo = pad(now.getMonth()+1), day = pad(now.getDate()), hh = pad(now.getHours()), mm = pad(now.getMinutes());
    return `${y}-${mo}-${day}T${hh}:${mm}`;
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
        n_publish.value = serverToLocalInput(ev.target.getAttribute('data-publish') || '');
        n_expires.value = serverToLocalInput(ev.target.getAttribute('data-expires') || '');
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
      lastLinks = Array.isArray(j)? j : [];
      renderLinks(lastLinks);
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
      lastUsers = Array.isArray(j)? j : [];
      renderUsers(lastUsers);
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
