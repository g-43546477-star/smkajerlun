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
  }
  tick(); setInterval(tick,1000);
  var thn=document.getElementById('thn'); if(thn) thn.textContent=new Date().getFullYear();
})();
;
(function(){
  var namaSolat={fajr:'Subuh',dhuhr:'Zohor',asr:'Asar',maghrib:'Maghrib',isha:'Isyak'};
  function fmt(ts){
    var d=new Date(ts*1000);
    return new Intl.DateTimeFormat('ms-MY',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  }
  fetch('https://api.waktusolat.app/v2/solat/KDH01')
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(data){
      var today=new Date().getDate();
      var hariIni=(data.prayers||[]).find(function(p){return p.day===today;});
      if(!hariIni)throw new Error('tiada data hari ini');
      var wrap=document.getElementById('solat-times');
      var now=Date.now()/1000, nextFound=false, nextKey=null;
      ['fajr','dhuhr','asr','maghrib','isha'].forEach(function(k){
        var chip=document.createElement('div');
        chip.className='solat-chip';
        chip.setAttribute('role','listitem');
        if(!nextFound && hariIni[k]>now){chip.className+=' next';nextFound=true;nextKey=k;}
        chip.innerHTML='<span class="n">'+namaSolat[k]+'</span><span class="t">'+fmt(hariIni[k])+'</span>';
        wrap.appendChild(chip);
      });
      // Paparan besar "Solat Seterusnya" dalam hero. Jika semua waktu hari ini
      // telah berlalu (selepas Isyak), papar Subuh sebagai rujukan terakhir.
      var nameEl=document.getElementById('solat-next-name');
      var timeEl=document.getElementById('solat-next-time');
      if(nameEl && timeEl){
        if(nextKey){
          nameEl.textContent=namaSolat[nextKey];
          timeEl.textContent=fmt(hariIni[nextKey]);
        } else {
          nameEl.textContent='Subuh (esok)';
          timeEl.textContent=fmt(hariIni.fajr);
        }
      }
      document.getElementById('solat-note').textContent='Sumber: JAKIM (e-Solat) melalui waktusolat.app';
    })
    .catch(function(){
      document.getElementById('solat-note').textContent='Waktu solat tidak dapat dimuatkan buat masa ini.';
      var nameEl=document.getElementById('solat-next-name');
      if(nameEl) nameEl.textContent='Tidak tersedia';
    });
})();
;
cmsLoadPengumuman('notis-list');
cmsLoadAktivitiTerdekat('aktiviti-terdekat-list', 5);
cmsLoadTodayNotice('widget-notis');
cmsLoadAuthNav();
