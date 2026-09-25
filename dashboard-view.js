/* 팀 대시보드 공용 렌더러 — index.html(관리자)과 dashboard.html(팀 열람용)에서 함께 사용 */
(function(){
const STATUSES=['준비','진행','보류','완료'];
const FILTERS=[['all','전체'],['준비','준비'],['진행','진행'],['보류','보류'],['완료','완료']];
const states=new WeakMap();

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function today(){const d=new Date();d.setHours(0,0,0,0);return d}
function parseDate(v){if(!v||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d)}
function daysLeft(v){const d=parseDate(v);if(!d)return null;return Math.round((d-today())/86400000)}
function dday(v){const n=daysLeft(v);if(n===null)return '';return n===0?'D-day':n>0?`D-${n}`:`D+${-n}`}
function shortDate(v){const d=parseDate(v);if(!d)return '-';return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`}

function stepPct(p,t){const total=(t.todos||[]).length;if(!total)return 0;const done=t.todos.filter((_,i)=>p.taskStatus&&p.taskStatus[`${t.instanceId}-${i}`]).length;return Math.round(done/total*100)}

/* 프로젝트 원본 JSON → 대시보드 한 줄 요약 (비밀번호·메모·참여자 정보 제외) */
function summarize(p){
  const tasks=p.selectedTasks||[];
  const total=tasks.reduce((s,t)=>s+(t.todos||[]).length,0);
  const done=tasks.reduce((s,t)=>s+(t.todos||[]).filter((_,i)=>p.taskStatus&&p.taskStatus[`${t.instanceId}-${i}`]).length,0);
  const idx=tasks.findIndex(t=>t.instanceId===p.currentStep);
  const cur=idx>=0?tasks[idx]:null;
  const status=STATUSES.includes(p.status)?p.status:'준비';
  const open=status==='준비'||status==='진행';
  const reasons=[];
  if(open&&daysLeft(p.dueDate)!==null&&daysLeft(p.dueDate)<0)reasons.push('납품일 경과');
  if(open&&cur&&daysLeft(cur.dueDate)!==null&&daysLeft(cur.dueDate)<0&&stepPct(p,cur)<100)reasons.push('현재 단계 예정일 경과');
  return {
    id:p.id,name:p.name||'이름 없는 프로젝트',folder:p.folder||'',client:p.client||'',pm:p.pm||'',
    startDate:p.startDate||'',dueDate:p.dueDate||'',status,
    progress:total?Math.round(done/total*100):0,
    stepCount:tasks.length,currentStepIndex:idx,currentStepTitle:cur?cur.title:'',currentStepDue:cur?cur.dueDate||'':'',
    delayed:reasons.length>0,delayReason:reasons.join(', '),
    steps:tasks.map(t=>({title:t.title,pct:stepPct(p,t),dueDate:t.dueDate||'',current:t.instanceId===p.currentStep})),
    lastModified:p.lastModified||''
  };
}

function isSoon(r){const n=daysLeft(r.dueDate);return r.status!=='완료'&&n!==null&&n>=0&&n<=7}

function matches(r,st){
  if(st.filter==='delayed'&&!r.delayed)return false;
  if(st.filter==='soon'&&!isSoon(r))return false;
  if(STATUSES.includes(st.filter)&&r.status!==st.filter)return false;
  if(st.pm&&r.pm!==st.pm)return false;
  if(st.q){const q=st.q.toLowerCase();if(![r.name,r.client,r.pm,r.folder,r.currentStepTitle].some(v=>String(v).toLowerCase().includes(q)))return false}
  return true;
}

function sorter(key){
  const due=r=>parseDate(r.dueDate)?.getTime()??Infinity;
  const rank={진행:0,준비:1,보류:2,완료:3};
  return {
    due:(a,b)=>(a.status==='완료')-(b.status==='완료')||due(a)-due(b),
    progress:(a,b)=>b.progress-a.progress,
    status:(a,b)=>(rank[a.status]-rank[b.status])||due(a)-due(b),
    recent:(a,b)=>String(b.lastModified).localeCompare(String(a.lastModified)),
    name:(a,b)=>a.name.localeCompare(b.name,'ko')
  }[key]||(()=>0);
}

function stepCell(r){
  if(!r.stepCount)return '<span class="dash-muted">단계 없음</span>';
  if(r.currentStepIndex<0)return `<span class="dash-muted">현재 단계 미지정</span><div class="dash-sub">총 ${r.stepCount}단계</div>`;
  const n=daysLeft(r.currentStepDue);
  const due=r.currentStepDue?`<span class="${n!==null&&n<0?'dash-late':''}">예정 ${shortDate(r.currentStepDue)}</span>`:'';
  return `<div class="dash-step"><span class="dash-step-no">${r.currentStepIndex+1}/${r.stepCount}</span>${esc(r.currentStepTitle)}</div>${due?`<div class="dash-sub">${due}</div>`:''}`;
}

function dueCell(r){
  if(!r.dueDate)return '<span class="dash-muted">-</span>';
  const n=daysLeft(r.dueDate);
  const cls=r.status==='완료'?'dash-muted':n<0?'dash-late':n<=7?'dash-soon':'';
  return `<div>${shortDate(r.dueDate)}</div><div class="dash-sub ${cls}">${r.status==='완료'?'완료':dday(r.dueDate)}</div>`;
}

function stepsDetail(r){
  if(!r.steps.length)return '<div class="dash-muted">등록된 단계가 없습니다.</div>';
  return `<ol class="dash-steps">${r.steps.map(s=>`<li class="${s.current?'is-current':''}${s.pct===100?' is-done':''}"><span class="dash-steps-title">${esc(s.title)}${s.current?' <b>진행 중</b>':''}</span><span class="dash-steps-meta">${s.dueDate?`예정 ${shortDate(s.dueDate)} · `:''}${s.pct}%</span></li>`).join('')}</ol>`;
}

function render(root,rows,opts={}){
  if(!root)return;
  let st=states.get(root);
  if(!st){st={filter:'all',pm:'',q:'',sort:'due',open:{}};states.set(root,st)}
  const pms=[...new Set(rows.map(r=>r.pm).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  if(st.pm&&!pms.includes(st.pm))st.pm='';
  const count={
    진행:rows.filter(r=>r.status==='진행').length,
    soon:rows.filter(isSoon).length,
    delayed:rows.filter(r=>r.delayed).length,
    완료:rows.filter(r=>r.status==='완료').length
  };
  const list=rows.filter(r=>matches(r,st)).sort(sorter(st.sort));
  const card=(key,label,value,tone)=>`<button type="button" class="dash-kpi ${tone||''} ${st.filter===key?'active':''}" data-filter="${key}"><span class="dash-kpi-label">${label}</span><span class="dash-kpi-value">${value}</span></button>`;
  root.innerHTML=`
  <div class="dash-kpis">
    ${card('진행','진행 중',count.진행)}
    ${card('soon','7일 내 납품',count.soon,count.soon?'tone-soon':'')}
    ${card('delayed','지연',count.delayed,count.delayed?'tone-late':'')}
    ${card('완료','완료',count.완료)}
  </div>
  <div class="dash-toolbar">
    <div class="dash-chips">${FILTERS.map(([k,l])=>`<button type="button" class="dash-chip ${st.filter===k?'active':''}" data-filter="${k}">${l}</button>`).join('')}</div>
    <div class="dash-controls">
      <select data-role="pm"><option value="">PM 전체</option>${pms.map(p=>`<option value="${esc(p)}" ${st.pm===p?'selected':''}>${esc(p)}</option>`).join('')}</select>
      <select data-role="sort">${[['due','납품일 가까운 순'],['status','상태순'],['progress','진행률 높은 순'],['recent','최근 수정순'],['name','이름순']].map(([k,l])=>`<option value="${k}" ${st.sort===k?'selected':''}>${l}</option>`).join('')}</select>
      <input data-role="q" type="search" placeholder="프로젝트·발주처 검색" value="${esc(st.q)}" />
    </div>
  </div>
  <div class="dash-table">
    <div class="dash-row dash-head"><div>프로젝트</div><div>PM</div><div>발주처</div><div>현재 단계</div><div>진행률</div><div>납품일</div><div>상태</div></div>
    ${list.length?list.map(r=>`
    <div class="dash-row dash-item ${r.delayed?'is-late':''} ${r.status==='완료'?'is-done':''}" data-id="${esc(r.id)}" role="button" tabindex="0" title="${opts.onOpen?'클릭하면 이 프로젝트의 워크플로우로 이동합니다':'클릭하면 단계 목록을 펼칩니다'}">
      <div class="dash-c-name"><div class="dash-name">${esc(r.name)}</div>${r.folder?`<div class="dash-sub">${esc(r.folder)}</div>`:''}</div>
      <div class="dash-c-pm" data-label="PM">${r.pm?esc(r.pm):'<span class="dash-muted">-</span>'}</div>
      <div class="dash-c-client" data-label="발주처">${r.client?esc(r.client):'<span class="dash-muted">-</span>'}</div>
      <div class="dash-c-step" data-label="현재 단계">${stepCell(r)}</div>
      <div class="dash-c-prog" data-label="진행률"><div class="dash-prog"><div class="dash-track"><div class="dash-fill" style="width:${r.progress}%"></div></div><span>${r.progress}%</span></div></div>
      <div class="dash-c-due" data-label="납품일">${dueCell(r)}</div>
      <div class="dash-c-status" data-label="상태"><span class="dash-badge s-${esc(r.status)}">${esc(r.status)}</span>${r.delayed?`<span class="dash-badge s-late" title="${esc(r.delayReason)}">지연</span>`:''}</div>
      ${!opts.onOpen&&st.open[r.id]?`<div class="dash-detail">${stepsDetail(r)}</div>`:''}
    </div>`).join(''):`<div class="dash-empty">${rows.length?'조건에 맞는 프로젝트가 없습니다.':(opts.emptyText||'등록된 프로젝트가 없습니다.')}</div>`}
  </div>`;
  const rerender=()=>render(root,rows,opts);
  root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{const k=b.dataset.filter;st.filter=(st.filter===k&&b.classList.contains('dash-kpi'))?'all':k;rerender()});
  root.querySelector('[data-role="pm"]').onchange=e=>{st.pm=e.target.value;rerender()};
  root.querySelector('[data-role="sort"]').onchange=e=>{st.sort=e.target.value;rerender()};
  const q=root.querySelector('[data-role="q"]');
  q.oninput=e=>{st.q=e.target.value;rerender();const n=root.querySelector('[data-role="q"]');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
  root.querySelectorAll('.dash-item').forEach(el=>{
    const act=()=>{const id=el.dataset.id;if(opts.onOpen)opts.onOpen(id);else{st.open[id]=!st.open[id];rerender()}};
    el.onclick=act;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}};
  });
}

window.PMDash={summarize,render,STATUSES,daysLeft,shortDate};
})();
