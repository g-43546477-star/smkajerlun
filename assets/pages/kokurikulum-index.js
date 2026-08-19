(function(){
  var msLoc='ms-MY';
  function tick(){
    var now=new Date();
    var el;
    el=document.getElementById('tarikh-masihi');
    if(el) el.textContent=new Intl.DateTimeFormat(msLoc,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
    el=document.getElementById('tarikh-hijri');
    if(el){try{el.textContent=new Intl.DateTimeFormat('ms-MY-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(now).replace(/\s*H$/,'')+' H';}catch(e){el.style.display='none';}}
    el=document.getElementById('jam');
    if(el) el.textContent=new Intl.DateTimeFormat(msLoc,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    var g=document.getElementById('greet');
    if(g){
      var h=now.getHours(), t;
      if(h<12)t='Selamat pagi, warga SMKAJ';
      else if(h<15)t='Selamat tengah hari, warga SMKAJ';
      else if(h<19)t='Selamat petang, warga SMKAJ';
      else t='Selamat malam, warga SMKAJ';
      g.textContent=t;
    }
  }
  tick(); setInterval(tick,1000);
  var thn=document.getElementById('thn'); if(thn) thn.textContent=new Date().getFullYear();
})();
;
cmsLoadKokurikulum();
cmsLoadAchievements('koku-achievement-list', { limit: 6 });
cmsLoadAuthNav();
