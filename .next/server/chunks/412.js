"use strict";exports.id=412,exports.ids=[412],exports.modules={2412:(e,t,n)=>{function i(e,t=null){return({conjunction:"fusion pressure, merging pull",opposition:"pull-apart tension, polarizing stretch",square:"friction heat, resistance pressure",trine:"flowing ease, supportive current",sextile:"opportunity spark, gentle activation"})[e.aspect?.toLowerCase()]||"energetic texture"}function a(e,t=null){let n="conjunction";if(e.aspect)n=e.aspect.toLowerCase();else if(e.map){let t=e.map.split(" ");t.length>=3&&(n=t[1].toLowerCase())}let i={conjunction:"These energies may blend together, sometimes harmoniously, sometimes creating intensity that needs conscious direction.",opposition:"These energies may pull in different directions, creating awareness through contrast and the need to find balance.",square:"These energies may create friction that generates movement - challenge that promotes growth when engaged consciously.",trine:"These energies may flow naturally together, creating ease and supporting natural expression.",sextile:"These energies may offer opportunities for integration through conscious engagement and effort."}[n]||"These planetary energies may interact in ways that create opportunities for conscious awareness and growth.";return"A"===t?`For Person A: ${i}`:"B"===t?`For Person B: ${i}`:i}n.r(t),n.d(t,{default:()=>r});let o={0:{label:"Whisper",emoji:"・",description:"Barely perceptible symbolic pressure"},1:{label:"Pulse",emoji:"◦",description:"Subtle background hum"},2:{label:"Wave",emoji:"〜",description:"Noticeable current"},3:{label:"Surge",emoji:"≈",description:"Strong presence"},4:{label:"Peak",emoji:"⚡",description:"Commanding attention"},5:{label:"Apex",emoji:"⚡⚡",description:"Maximum symbolic intensity"}},s={LOW:{label:"Steady",emoji:"━",description:"Concentrated, sustained pressure"},MEDIUM:{label:"Variable",emoji:"≈",description:"Alternating intensity"},HIGH:{label:"Stormy",emoji:"\uD83C\uDF2A️",description:"Scattered, unpredictable surges"}};function r(e={}){let t=e.prov||{},n=e.geo||{},o=e.options||{},s=o.relational||{},r=t.subject_name||"Subject",c=o.mode||"Reader+Reflection",p=t.reference_date||"",u=Array.isArray(n.aspects)?n.aspects.length:0,m=o.map_source||"",d=`# ${r} — ${c}

`,h=`**Reference**: ${p}${m?` • Map: ${m}`:""}`,f=`

_Aspects detected_: ${u}.`,g=t.relational_context||null,y=g?`

## Relationship Context
- type: ${g.relationship_type??g.type??"—"}
- intimacy_tier: ${g.intimacy_tier??"—"}
- contact_state: ${g.contact_state??"—"}
`:"";return`${d}${h}${f}`+y+(g?`

## Dialogue Voice
The shared field speaks in integration tones: directness meeting receptivity. (Awaiting Priority 3 implementation)
`:"")+"\n\n"+function(e,t=!1){let n=`## Polarity Cards

`;return(function(e,t=!1){let n=[];for(e.person_a?.aspects&&e.person_a.aspects.slice(0,3).forEach(e=>{n.push({nameA:e.p1_name,nameB:e.p2_name,aspect:e.aspect,field:i(e),map:`${e.p1_name} ${e.aspect} ${e.p2_name}, ${Math.abs(e.orb||e.orbit||0).toFixed(1)}\xb0 orb`,fieldA:t?i(e,"A"):null,fieldB:t?i(e,"B"):null})});n.length<3;){let a=(e.person_a?.aspects||[]).filter(e=>!n.some(t=>t.nameA===e.p1_name&&t.nameB===e.p2_name));if(a.length>0){let e=a[0];n.push({nameA:e.p1_name,nameB:e.p2_name,aspect:e.aspect,field:i(e),map:`${e.p1_name} ${e.aspect} ${e.p2_name}, ${Math.abs(e.orb||e.orbit||0).toFixed(1)}\xb0 orb`,fieldA:t?i(e,"A"):null,fieldB:t?i(e,"B"):null})}else n.push({nameA:"Individual",nameB:"Collective",aspect:"conjunction",field:"personal/transpersonal tension",map:"Fundamental human polarity patterns",fieldA:t?"Individual focus for A":null,fieldB:t?"Individual focus for B":null})}return n})(e,t).forEach((e,i)=>{n+=`### ${i+1}) **${e.nameA}** ↔ **${e.nameB}**

`,t?n+=`**FIELD:**
  - **Person A:** ${e.fieldA}
  - **Person B:** ${e.fieldB}

**VOICE:**
  - **Person A:** ${a(e,"A")}
  - **Person B:** ${a(e,"B")}

`:n+=`**FIELD:** ${e.field}

**VOICE:** ${a(e)}

`}),n}({person_a:{aspects:n.aspects||[]}},!!g)+(s.shared_symbolic_climate?`

### Shared Symbolic Climate
${l(s.shared_symbolic_climate)}`:"")+(s.cross_symbolic_climate?`

### Cross Symbolic Climate
${l(s.cross_symbolic_climate)}`:"")+`

## Agency Hygiene

If this doesn't land, it doesn't count (OSR valid).
All phrasing remains conditional (may/might/could).
The SST classification depends entirely on your lived experience confirmation.
`}function l(e){let t=e.magnitude??0,n=e.valence??0,i=e.volatility??0,a=o[Math.round(Math.max(0,Math.min(5,t)))],r=i<1.5?s.LOW:i<3?s.MEDIUM:s.HIGH;return`- **Magnitude**: ${a.emoji} ${a.label} (${t.toFixed(1)}) — ${a.description}
- **Valence**: ${n>0?"\uD83C\uDF1E supportive":n<0?"\uD83C\uDF11 restrictive":"\uD83C\uDF17 neutral"} (${n.toFixed(1)})
- **Volatility**: ${r.emoji} ${r.label} (${i.toFixed(1)}) — ${r.description}
`}}};