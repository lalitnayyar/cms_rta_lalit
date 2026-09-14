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

  btnCreateLink.addEventListener('click', async ()=>{
    const uid = localStorage.getItem('crta_admin_uid');
    if(!uid){ out.textContent='Not logged in'; return; }
    const body = { url: 'https://example.com/'+Date.now(), heading: 'Sample '+Date.now(), description: 'Created from admin UI' };
    try{
      const r = await fetch('/admin/links',{method:'POST',headers:{'Content-Type':'application/json','x-admin-uid':uid},body:JSON.stringify(body)});
      if(r.status===201){ out.textContent='Created link'; } else { out.textContent='Create failed: '+(await r.text()); }
    }catch(e){ out.textContent='Error: '+e.message }
  });
}

init();
