// ═══════════════════════════════
//  AUX ASC DASHBOARD · CHARTS
// ═══════════════════════════════
const CHART_REGISTRY={};
const PAL=['#003D8F','#5BA4F5','#0891b2','#16a34a','#d97706','#7c3aed','#dc2626','#5a607a'];

function destroyChart(id){if(CHART_REGISTRY[id]){CHART_REGISTRY[id].destroy();delete CHART_REGISTRY[id];}}
function mkChart(id,cfg){
  destroyChart(id);
  const el=document.getElementById(id);if(!el)return null;
  CHART_REGISTRY[id]=new Chart(el.getContext('2d'),cfg);
  return CHART_REGISTRY[id];
}

function dm(t,s){
  const r={...t};
  for(const k of Object.keys(s)){
    if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]))r[k]=dm(t[k]||{},s[k]);
    else r[k]=s[k];
  }
  return r;
}

function baseOpts(o={}){
  return dm({
    responsive:true, maintainAspectRatio:false, animation:{duration:380},
    plugins:{
      legend:{position:'bottom',labels:{font:{family:'DM Sans',size:11},padding:14,boxWidth:10,boxHeight:10,color:'#5a607a'}},
      tooltip:{backgroundColor:'#111318',titleFont:{family:'DM Sans',size:12,weight:'600'},bodyFont:{family:'DM Sans',size:11},padding:10,cornerRadius:8}
    },
    scales:{
      x:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{family:'DM Sans',size:10},color:'#a0a8bd',maxRotation:45},border:{color:'transparent'}},
      y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{family:'DM Sans',size:10},color:'#a0a8bd'},border:{color:'transparent'}}
    }
  },o);
}

function lineChart(id,labels,datasets,opts={}){
  return mkChart(id,{type:'line',data:{labels,datasets:datasets.map((d,i)=>({
    tension:.35,fill:false,pointRadius:4,pointHoverRadius:6,borderWidth:2.5,
    pointBackgroundColor:d.borderColor||PAL[i],...d,borderColor:d.borderColor||PAL[i]
  }))},options:baseOpts(opts)});
}

function barChart(id,labels,datasets,opts={}){
  return mkChart(id,{type:'bar',data:{labels,datasets:datasets.map((d,i)=>({
    borderRadius:4,barMaxWidth:40,...d,backgroundColor:d.backgroundColor||PAL[i]
  }))},options:baseOpts(opts)});
}

function hBarChart(id,labels,data,color,opts={}){
  return mkChart(id,{type:'bar',data:{labels,datasets:[{data,borderRadius:4,
    backgroundColor:Array.isArray(color)?color:labels.map((_,i)=>color||PAL[i%PAL.length])
  }]},options:baseOpts(dm({indexAxis:'y',plugins:{legend:{display:false}},
    scales:{x:{beginAtZero:true},y:{grid:{display:false}}}},opts))});
}

function donutChart(id,labels,data,opts={}){
  return mkChart(id,{type:'doughnut',data:{labels,datasets:[{data,
    backgroundColor:PAL.slice(0,labels.length),borderWidth:2,borderColor:'#fff',
    hoverBorderColor:'#fff',hoverBorderWidth:3
  }]},options:dm({responsive:true,maintainAspectRatio:false,cutout:'65%',
    plugins:{
      legend:{position:'right',labels:{font:{family:'DM Sans',size:11},padding:12,boxWidth:10,boxHeight:10,color:'#5a607a'}},
      tooltip:{backgroundColor:'#111318',titleFont:{family:'DM Sans',size:12,weight:'600'},bodyFont:{family:'DM Sans',size:11},padding:10,cornerRadius:8}
    }
  },opts)});
}

function renderAgingBars(cid,agingData,total){
  const el=document.getElementById(cid);if(!el)return;
  const colors=['#16a34a','#003D8F','#d97706','#dc2626','#111318'];
  el.innerHTML=agingData.map((c,i)=>{
    const p=total>0?c.count/total*100:0;
    return`<div class="aging-row">
      <div class="aging-label">${esc(c.label)}</div>
      <div class="aging-bar-wrap"><div class="aging-bar-fill" style="width:${p.toFixed(1)}%;background:${colors[i]||'#888'}"></div></div>
      <div class="aging-count">${c.count}</div>
    </div>`;
  }).join('');
}
