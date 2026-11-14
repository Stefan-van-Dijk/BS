export function listSyncStatus(list,{online=true,busy=false,now=Date.now()}={}){
 const c=list?.cloud;
 if(!c)return {state:'local',label:'Alleen op dit apparaat',detail:'Koppel deze lijst via het Sharon-logo om te synchroniseren.'};
 const checked=Number(c.confirmedAt)||0;
 const detail=checked?'Laatst bevestigd: '+new Date(checked).toLocaleString('nl-NL'):'Nog niet door de server bevestigd.';
 if(c.conflict)return {state:'conflict',label:'Controle nodig',detail:c.error||'Open de online versie via Sharon. Je lokale wijzigingen blijven bewaard.'};
 if(!online)return {state:'offline',label:c.pending?'Offline · wijzigingen wachten':'Offline',detail};
 if(busy)return {state:'syncing',label:'Synchroniseren…',detail};
 if(c.error)return {state:'error',label:'Verbinding controleren',detail:c.error};
 if(c.pending)return {state:'pending',label:'Wijzigingen wachten',detail};
 if(!checked||now-checked>45000||checked>now)return {state:'stale',label:'Opnieuw controleren',detail};
 return {state:'current',label:'✓ Bijgewerkt · '+new Date(checked).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),detail};
}
