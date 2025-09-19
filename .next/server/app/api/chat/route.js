(()=>{var a={};a.id=276,a.ids=[276],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3421:(a,b,c)=>{"use strict";Object.defineProperty(b,"I",{enumerable:!0,get:function(){return g}});let d=c(71237),e=c(55088),f=c(17679);async function g(a,b,c,g){if((0,d.isNodeNextResponse)(b)){var h;b.statusCode=c.status,b.statusMessage=c.statusText;let d=["set-cookie","www-authenticate","proxy-authenticate","vary"];null==(h=c.headers)||h.forEach((a,c)=>{if("x-middleware-set-cookie"!==c.toLowerCase())if("set-cookie"===c.toLowerCase())for(let d of(0,f.splitCookiesString)(a))b.appendHeader(c,d);else{let e=void 0!==b.getHeader(c);(d.includes(c.toLowerCase())||!e)&&b.appendHeader(c,a)}});let{originalResponse:i}=b;c.body&&"HEAD"!==a.method?await (0,e.pipeToNodeResponse)(c.body,i,g):i.end()}}},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},25779:(a,b,c)=>{"use strict";c.d(b,{BY:()=>h,mE:()=>i,pG:()=>g});let d={requestsPerMinute:15,requestsPerDay:1500,tokensPerMinute:32e3,tokensPerDay:5e4},e={requestsToday:0,tokensToday:0,lastResetDate:new Date().toDateString(),requestsThisMinute:0,lastMinuteReset:Date.now()};function f(){let a=new Date().toDateString(),b=Date.now();e.lastResetDate!==a&&(e.requestsToday=0,e.tokensToday=0,e.lastResetDate=a),b-e.lastMinuteReset>6e4&&(e.requestsThisMinute=0,e.lastMinuteReset=b)}function g(a=1e3){f(),e.requestsToday++,e.requestsThisMinute++,e.tokensToday+=a,console.log(`Gemini API Usage - Requests today: ${e.requestsToday}/${d.requestsPerDay}, This minute: ${e.requestsThisMinute}/${d.requestsPerMinute}`)}function h(){return f(),{...e,limits:d,percentages:{dailyRequests:Math.round(e.requestsToday/d.requestsPerDay*100),dailyTokens:Math.round(e.tokensToday/d.tokensPerDay*100),minuteRequests:Math.round(e.requestsThisMinute/d.requestsPerMinute*100)}}}function i(){return(f(),e.requestsThisMinute>=d.requestsPerMinute)?{allowed:!1,reason:"Rate limit exceeded (requests per minute)"}:e.requestsToday>=d.requestsPerDay?{allowed:!1,reason:"Daily quota exceeded"}:{allowed:!0}}},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},92524:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>O,patchFetch:()=>N,routeModule:()=>J,serverHooks:()=>M,workAsyncStorage:()=>K,workUnitAsyncStorage:()=>L});var d={};c.r(d),c.d(d,{POST:()=>I,runtime:()=>H});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(77533),k=c(32822),l=c(261),m=c(54290),n=c(85328),o=c(38928),p=c(46595),q=c(3421),r=c(17679),s=c(41681),t=c(63446),u=c(86439),v=c(51356);function w(a,b){let c=a.replace(/\b(is|are|will)\b/gi,"may");return c=c.replace(/causes?/gi,"may correlate with"),"mirror"===b.section&&(c+='\n\n<small style="opacity:.6">(If no resonance: mark OSR—null data is valid.)</small>'),c}function x(a){let b=function(a){let b=0;for(let c=0;c<a.length;c++)b=31*b+a.charCodeAt(c)>>>0;return b}(a);return`${["⚡ Pulse","⚡ Stirring","⚡ Convergence"][b%3]} \xb7 ${["\uD83C\uDF1E Supportive","\uD83C\uDF17 Mixed","\uD83C\uDF11 Restrictive"][b%3]} \xb7 ${["\uD83C\uDF2A Low","\uD83C\uDF2A Scattered","\uD83C\uDF2A Active"][b%3]}`}var y=c(31404),z=c(25779);class A{generateFollowUp(a,b){switch(a.type){case"AFFIRM":return this.generateZoomIn(a,b);case"OSR":return this.generateOSRProbe(a,b);case"UNCLEAR":return this.generateClarification(a,b);default:return this.generateGenericFollowUp()}}generateZoomIn(a,b){let c=["Which line carried the weight for you — and how does it show up in your day?","What part of that landed — and how do you feel it when it's live in your field?","Which piece resonated — and how do you act when that pattern is active?","What line hit — and where do you notice that pressure in your daily life?","Which part felt true — and how does it move through you when it's present?"];return{stage:"ZOOM_IN",question:c[Math.floor(Math.random()*c.length)],purpose:"Isolate specific pressure and gather behavioral context",expectedResponse:"WB"}}generateOSRProbe(a,b){let c=["That one missed. Was it more the opposite, the wrong flavor, or just not in your field at all?","Didn't land. Was it backwards, off-tone, or simply not you?","That felt off. More like the inverse, wrong style, or completely outside your range?","Missed the mark. Was it flipped around, wrong energy, or not in your territory?","That didn't fit. Was it contrary, mismatched tone, or just not your pattern?"];return{stage:"OSR_PROBE",question:c[Math.floor(Math.random()*c.length)],purpose:"Convert OSR miss into diagnostic data for Actor/Role weighting",expectedResponse:"CLARIFICATION"}}generateClarification(a,b){let c=["Help me understand — what felt unclear about that reflection?","What part felt muddy or hard to pin down?","Where did that lose you — the description or how it applies?","What made that feel uncertain for you?"];return{stage:"CLASSIFICATION",question:c[Math.floor(Math.random()*c.length)],purpose:"Gather more context to properly classify the response",expectedResponse:"WB"}}generateGenericFollowUp(){return{stage:"CLASSIFICATION",question:"How does that land with you?",purpose:"General resonance check",expectedResponse:"WB"}}classifyResponse(a,b){let c=a.toLowerCase();if("OSR_PROBE"===b){let a="not-in-field";return c.includes("opposite")||c.includes("backwards")||c.includes("flipped")||c.includes("inverse")?a="opposite":(c.includes("flavor")||c.includes("tone")||c.includes("style")||c.includes("energy"))&&(a="wrong-flavor"),{classification:"OSR",weight:0,targetWeighting:"actor",probeType:a}}if("ZOOM_IN"===b){let b=["when i","i tend to","i usually","i feel","i notice","shows up as","happens when","looks like","feels like"].some(a=>c.includes(a));return b&&a.length>50?{classification:"WB",weight:1,targetWeighting:"both"}:b?{classification:"ABE",weight:.5,targetWeighting:"role"}:{classification:"OSR",weight:0,targetWeighting:"actor"}}return c.includes("yes")||c.includes("exactly")||c.includes("that's me")?{classification:"WB",weight:1,targetWeighting:"both"}:c.includes("somewhat")||c.includes("partially")||c.includes("kind of")?{classification:"ABE",weight:.5,targetWeighting:"role"}:{classification:"OSR",weight:0,targetWeighting:"actor"}}updateSessionContext(a,b,c){let d={...a};switch(c.classification){case"WB":d.wbHits.push({content:b});break;case"ABE":d.abeHits.push({content:b,tone:"off-tone"});break;case"OSR":d.osrMisses.push({content:b,probeType:c.probeType})}switch(c.targetWeighting){case"actor":d.actorWeighting+=c.weight;break;case"role":d.roleWeighting+=c.weight;break;case"both":d.actorWeighting+=.6*c.weight,d.roleWeighting+=.4*c.weight}let e=d.actorWeighting+d.roleWeighting;return d.driftIndex=e>0?d.actorWeighting/e:0,d}generateWrapUpCard(a){let b=this.calculateResonanceFidelity(a);return{hookStack:[],resonantLines:a.wbHits.map(a=>a.content),scoreStrip:{wb:a.wbHits.length,abe:a.abeHits.length,osr:a.osrMisses.length},resonanceFidelity:b,actorRoleComposite:a.currentComposite,driftFlag:a.driftIndex>.6,climateRibbon:void 0}}calculateResonanceFidelity(a){let b,c,d=a.wbHits.length,e=a.abeHits.length,f=d+e+a.osrMisses.length;if(0===f)return{percentage:0,band:"LOW",label:"No Responses Yet"};let g=Math.round((d+.5*e)/f*100);return g>70?(b="HIGH",c="High Alignment"):g>=40?(b="MIXED",c="Mixed Resonance"):(b="LOW",c="Low Alignment"),{percentage:g,band:b,label:c}}generateSessionClosure(){return{resetPrompt:"Are you going to upload a new report or are we to speak of something else in your pattern?",continuationOptions:["Upload new report","Explore another area","Generate poetic card","Review session patterns"]}}generatePoeticCard(a){let b=a.wbHits[0]?.content||"No clear resonance yet";return{title:"Resonance Pattern Card",resonantLine:b,scoreIndicator:`✅ ${a.wbHits.length} WB / 🟡 ${a.abeHits.length} ABE / ❌ ${a.osrMisses.length} OSR`,resonanceFidelity:this.calculateResonanceFidelity(a),compositeGuess:a.currentComposite||"Pattern emerging...",driftFlag:a.driftIndex>.6?"\uD83C\uDF00 Sidereal drift detected":void 0}}generateJournalSummary(a,b="the user"){let c=this.calculateResonanceFidelity(a),d=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),e=a.wbHits.slice(0,3).map(a=>this.extractKeyPhrase(a.content)).filter(a=>a.length>0),f=this.generateNarrativeSummary(a,b,c);return{title:`Raven Reading Session - ${b}`,narrative:f,metadata:{sessionDate:d,totalInteractions:a.wbHits.length+a.abeHits.length+a.osrMisses.length,resonanceFidelity:c.percentage,primaryPatterns:e}}}extractKeyPhrase(a){let b=a.split(/[.!?]+/).filter(a=>a.trim().length>0),c=["when i","i tend to","i usually","i feel","shows up as"];for(let a of b){let b=a.toLowerCase().trim();if(c.some(a=>b.includes(a))&&a.length<100)return a.trim()}return b[0]?.trim()||a.substring(0,50)+"..."}generateNarrativeSummary(a,b,c){let d=a.wbHits.length+a.abeHits.length+a.osrMisses.length;if(0===d)return`${b} began a session with Raven but had not yet explored any patterns deeply enough for resonance tracking.`;let e=`On this session, ${b} sat with Raven to explore the patterns written in their chart. `;if("HIGH"===c.band?e+=`The conversation flowed with remarkable alignment—Raven's mirrors consistently landed true, with ${b} recognizing themselves clearly in ${c.percentage}% of the reflections offered. `:"MIXED"===c.band?e+=`The dialogue wove between recognition and clarification, with ${b} finding ${c.percentage}% resonance as they and Raven navigated the more complex territories of their pattern. `:e+=`This session required careful excavation, with only ${c.percentage}% initial resonance as ${b} and Raven worked together to find the precise language for their inner architecture. `,a.wbHits.length>0){e+="What rang most true were insights around ";let b=a.wbHits.slice(0,2).map(a=>this.extractKeyPhrase(a.content));1===b.length?e+=`${b[0].toLowerCase()}. `:e+=`${b.slice(0,-1).join(", ").toLowerCase()}, and ${b[b.length-1].toLowerCase()}. `}return a.driftIndex>.6&&(e+=`Throughout the exchange, Raven detected signs that ${b}'s core drives might operate from a different seasonal rhythm than their outward presentation suggests—a pattern sometimes called sidereal drift. `),a.osrMisses.length>0&&a.osrMisses.length/d>.3&&(e+=`Several of Raven's initial offerings missed the mark entirely, requiring gentle probing to understand whether the patterns were inverted, off-tone, or simply outside ${b}'s field altogether. `),a.currentComposite?e+=`By session's end, the tentative pattern emerging was "${a.currentComposite}"—though ${b}, as always, remained the final validator of what felt true.`:e+=`The session concluded with patterns still crystallizing, leaving space for ${b} to continue the exploration when ready.`,e}}let B=new A,C=new Map;function D(a){return!function(a){let b=a.toLowerCase();return!!/^yes\b/i.test(a.trim())||["that's familiar","feels familiar","that resonates","resonates with me","exactly","that's me","spot on","that hits","so true","absolutely","definitely me","that's accurate","yes, that's right","that's it exactly","i just said it was","it was","it is","that is","yes it is","yes that is","that's right","correct","true"].some(a=>b.includes(a))}(a)?!function(a){let b=a.toLowerCase();return["sort of","kind of","partly","somewhat","maybe","i think so","possibly","in a way","to some extent"].some(a=>b.includes(a))}(a)?!function(a){let b=a.toLowerCase();return["doesn't feel familiar","doesn't resonate","not me","doesn't sound like me","not familiar","doesn't ring true","not quite right","off the mark","doesn't match","not accurate","not really me"].some(a=>b.includes(a))}(a)?"UNCLEAR":"OSR":"PARTIAL_ABE":"CLEAR_WB"}function E(a){let b=a.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);if(!b)return!1;let c=b[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"');return c.includes('"balance_meter"')&&c.includes('"context"')}function F(a){if(a.includes('"balance_meter"')&&a.includes('"magnitude"'))try{let b=a.match(/\{[\s\S]*\}/);if(b){let a=JSON.parse(b[0]),c=a.balance_meter?.magnitude?.value,d=a.balance_meter?.valence?.value;if(c>=4&&d<=-10)return"Crisis & Structural Overload \xb7 Maximum Threshold";if(c>=3&&d<=-5)return"Pressure & Restriction \xb7 Storm Systems"}}catch(a){}return/dream|sleep/i.test(a)?"Duty & Dreams \xb7 Saturn ↔ Neptune":/private|depth|shadow/i.test(a)?"Private & Piercing \xb7 Mercury ↔ Pluto":/restless|ground/i.test(a)?"Restless & Grounded \xb7 Pluto ↔ Moon":void 0}function G(a){return new TextEncoder().encode(JSON.stringify(a)+"\n")}let H="nodejs";async function I(a){let b=await a.json(),{persona:c,messages:d=[]}=b,e=b?.reportContexts||[],f=[...d].reverse().find(a=>"user"===a.role),g=f?.content||f?.html||"Hello",h=/\b(are you|what are you|how do you work|gemini|api|technical|test|version|system)\b/i.test(g),i=/^(hello|hi|hey|good morning|good afternoon|good evening|greetings)\b/i.test(g.trim()),j=(Array.isArray(d)?d.filter(a=>"raven"===a.role):[]).length<=1,k=g;if(!function(a,b=10,c=6e4){let d=Date.now(),e=C.get(a);return e?d-e.ts>c&&(e.t=b,e.ts=d):(e={t:b,ts:d},C.set(a,e)),!(e.t<=0)&&(e.t--,!0)}(a.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local"))return new Response(JSON.stringify({error:"rate_limited",retry_in:"60s"}),{status:429,headers:{"Content-Type":"application/json"}});if(h||i){let a=F(g),b=void 0,c=w("Staying close to what you said…",{hook:a,climate:b,section:"mirror"}).split(/\n+/)[0],d="";return d=g.toLowerCase().includes("gemini")?"Yes, I am currently using Google's Gemini API. It's a pleasure to connect.":i?"Hello! I'm Raven Calder, and I'm here to help you see yourself more clearly. I'm ready when you are.":"I'm Raven Calder, a symbolic mirror that uses Google's Gemini API to provide reflective insights. How can I help you today?",new Response(new ReadableStream({async start(e){e.enqueue(G({climate:b,hook:a,delta:c+d})),e.close()}}),{headers:{"Content-Type":"text/plain; charset=utf-8"}})}let l=Array.isArray(e)&&e.length>0,m=(0,z.mE)();if(!m.allowed)return new Response(JSON.stringify({error:m.reason}),{status:429,headers:{"Content-Type":"application/json"}});let n=/\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i.test(g),o=/\b(my chart|my birth|personal reading|mirror|balance meter|read me|analyze me|what do you see in me|my aspects|my placements|my transits)\b/i.test(g);if(!l&&o&&!n){let a=F(g),b=void 0,c=["With you—before we dive in…","Here with you. One small setup step first…","Holding your question—let’s get the ground right…"],d=w(c[Math.floor(Math.random()*c.length)],{hook:a,climate:b,section:"mirror"}).split(/\n+/)[0],e=`
I can’t responsibly read you without a chart or report context. Two quick options:

• Generate Math Brain on the main page (geometry only), then click “Ask Raven” to send the report here
• Or ask for “planetary weather only” to hear today’s field without personal mapping

If you already have a JSON report, paste or upload it and I’ll proceed.`.trim();return new Response(new ReadableStream({async start(c){c.enqueue(G({climate:b,hook:a,delta:d+"\n\n"+e})),c.close()}}),{headers:{"Content-Type":"text/plain; charset=utf-8"}})}if(!l&&n){let a=F(g),b=x(g),c=["With you—reading the sky’s weather…","Here with today’s currents—no personal map applied…"],d=w(c[Math.floor(Math.random()*c.length)],{hook:a,climate:b,section:"mirror"}).split(/\n+/)[0],e=`
Field-only read (no natal overlay):
• Mood/valence: treat as background conditions, not fate
• Use this like a tide chart—choose times that support your aims

If you want this mapped to you, generate Math Brain first and send the report here.`.trim(),f=`
Give a short, plain-language summary of the current planetary weather in two parts: (1) what’s emphasized, (2) what that feels like behaviorally—in conditional phrasing. No metaphors about “you,” no personality claims, no advice. Keep to 5–7 sentences total.

User words: ${g}`,h=(0,y.generateStream)(f,{model:process.env.MODEL_PROVIDER,personaHook:a});return new Response(new ReadableStream({async start(c){for await(let f of(c.enqueue(G({climate:b,hook:a,delta:d+"\n\n"+e+"\n\n"})),h))c.enqueue(G({climate:b,hook:a,delta:f.delta}));c.close()}}),{headers:{"Content-Type":"text/plain; charset=utf-8"}})}let p=D(g),q={wbHits:[],abeHits:[],osrMisses:[],actorWeighting:0,roleWeighting:0,driftIndex:0,sessionActive:!0};if("CLEAR_WB"===p)B.generateFollowUp({type:"AFFIRM",content:g,originalMirror:g},q),k=`The user clearly confirmed resonance: "${g}"

**AUTO-CLASSIFICATION: WB (Within Boundary)**
Log this as confirmed resonance. Do NOT ask for additional validation.

**TRANSITION TO ELABORATION:**
Instead of asking "does this feel true?", acknowledge the confirmation and pivot to depth exploration:

Examples:
- "Logged as WB: that resonance confirmed. Let's stay with how this pressure moves through you."
- "That lands—the coil is tightly wound. Where do you feel that tension most, in the body or more in the mind's looping?"
- "Confirmed as WB. Does the drive bring focus, or does it scatter you?"

Your response should:
1. Acknowledge the confirmed resonance 
2. Mirror back the structural pressure
3. Move into depth probing (how/where it shows up)
4. Skip any additional truth gates

User's clear affirmation: ${g}`;else if("PARTIAL_ABE"===p)k=`The user gave partial confirmation: "${g}"

**CLASSIFICATION: ABE (At Boundary Edge)**
This needs clarification, not full repair. Ask for refinement:

"I'm logging this as ABE—partially resonant but needs fine-tuning. What part lands, and what feels off?"

User's partial response: ${g}`;else if("OSR"===p){let a=B.generateFollowUp({type:"OSR",content:g,originalMirror:g},q);k=`The user indicated that something didn't resonate. Generate a response that includes this natural OSR probe: "${a.question}"

User's OSR response: ${g}

Your response should acknowledge their feedback and offer the choice-based clarification probe to convert the miss into diagnostic data. Keep it skippable and non-forcing.`}else if(g.toLowerCase().includes("poetic card")||g.toLowerCase().includes("generate card"))k=`The user is requesting a poetic card based on their session. Generate a visual card display showing:
- Resonance Pattern summary
- Score indicators (WB/ABE/OSR)
- Actor/Role composite guess
- Any drift flags
Do NOT generate a new poem. This is a summary card of what has already resonated.`;else if(g.toLowerCase().includes("done")||g.toLowerCase().includes("finished")||g.toLowerCase().includes("session complete")){let a=B.generateSessionClosure();k=`The user is indicating they want to end this reading session. Generate a response that includes: "${a.resetPrompt}"

This will reset the scorecard but not make you forget who you're talking to. Offer these options: ${a.continuationOptions.join(", ")}`}else{let a=d.filter(a=>"raven"===a.role).pop();if(a&&(a.html.includes("Does any of this feel familiar")||a.html.includes("Does this fit your experience")||a.html.includes("feel accurate")||a.html.includes("resonate")))if(function(a){let b=a.toLowerCase();return["you asked","you are asking again","why are you asking","i already said","i just said","as i said","what i had just explained","repeating myself","asked again","repeat the question","i literally just","already confirmed","i've already answered","well, yeah"].some(a=>b.includes(a))}(g)){let a=[...d].filter(a=>"user"===a.role).reverse()[1],b=a?.content||a?.html||"",c=b?D(b):"UNCLEAR";k="CLEAR_WB"===c?`The user expressed irritation at being asked again (meta-signal), not new content: "${g}".

Preserve the prior classification: WB (Within Boundary). Do NOT re-open validation.

Respond with: Acknowledge the irritation + keep fidelity + deepen the original mirror. Avoid new symbolic images or psychologizing.

Example shape:
- "Logged as WB: you already confirmed. I hear the frustration in repeating. Let's stay with the coil itself—when you're stretched that thin, does the pressure feel more physical or more mental?"

Rules:
1) No additional "does this feel true?" gates
2) No motive analysis or personality inference
3) Mirror only structural pressure and pivot to somatic/behavioral deepening`:"PARTIAL_ABE"===c?`The user commented on repetition (meta-signal), not new content: "${g}".

Preserve prior classification: ABE (At Boundary Edge). Do NOT re-open the main validation gate.

Respond with: Acknowledge the irritation + offer one focused refinement question about what part lands vs. what doesn't, using their words where possible.

Rules: no new metaphors, no psychoanalysis, keep it brief and user-led.`:"OSR"===c?`The user commented on repetition (meta-signal): "${g}".

Preserve prior classification: OSR (Outside Symbolic Range). Do NOT analyze the meta-comment. Offer a minimal repair that uses their prior correction, then validate the repair only if they choose to engage.

Keep it skippable and brief; acknowledge the repetition irritation.`:`Treat this as a meta-signal about repetition: "${g}".

Do not analyze it. Briefly acknowledge the irritation and ask one gentle, concrete deepening question about the previously discussed pressure (without re-validating).`}else{let a=D(g);k="CLEAR_WB"===a?`The user clearly confirmed resonance to your probe: "${g}"

**AUTO-CLASSIFICATION: WB (Within Boundary)**
This is confirmed resonance. Log it immediately without additional validation.

**RESPONSE PROTOCOL:**
1. Acknowledge confirmation: "Logged as WB: that resonance confirmed."
2. Mirror back the structural pressure in somatic/behavioral terms
3. Pivot to depth exploration, NOT truth validation
4. Ask elaboration questions like:
   - "Where do you feel that tension most—in the body or mind?"
   - "Does this drive bring focus or scatter you?"
   - "How does this pressure move through your day?"

**DO NOT** ask "Does this feel true?" or any additional validation. The user already confirmed it.

User's clear confirmation: "${g}"`:"PARTIAL_ABE"===a?`The user gave partial confirmation to your probe: "${g}"

**CLASSIFICATION: ABE (At Boundary Edge)**
This needs refinement, not full repair.

**RESPONSE PROTOCOL:**
1. Log as ABE: "I'm logging this as ABE—partially resonant but needs fine-tuning."
2. Ask for clarification: "What part lands, and what feels off?"
3. Refine the image based on their feedback

User's partial response: "${g}"`:"OSR"===a?`The user redirected/contradicted your probe: "${g}"

**CLASSIFICATION: OSR (Outside Symbolic Range)**
This requires a repair branch with validation.

**RESPONSE PROTOCOL:**
1. State classification: "I'm logging that probe as OSR."
2. Acknowledge the miss: "I offered [original theme] but you're describing [their theme] instead."
3. Offer repair using their exact words: "Repair: [rephrase their clarification]"
4. Validate REPAIR only: "Does this repair feel true?" [Yes] [Partly] [No]

User's OSR response: "${g}"`:`The user gave an unclear response to your probe: "${g}"

**CLASSIFICATION: UNCLEAR**
This needs gentle clarification to determine WB/ABE/OSR.

**RESPONSE PROTOCOL:**
Ask for clarification: "I want to make sure I'm tracking you—does the image I offered feel familiar, or does it miss the mark?"

User's unclear response: "${g}"`}else k=`This appears to be a request for astrological insight or general conversation that could benefit from symbolic reflection.

**MANDATORY: Deliver COMPLETE Core Flow structure in your response:**

1. **Resonance First:** "I see you as [stance image]: [felt qualities]. [polarity tension]."
2. **Recognition Layer:** "This may show up as [specific daily behavior/experience]"
3. **Typological Profile:** Behavioral lean + impulse patterns + polarity check (plain language only—no MBTI/function labels)
4. **Soft Vector Surfacing:** "Hidden push toward [drive], counterweight through [restraint]"
5. **SST Gate:** Ask ONE specific behavioral/somatic question, not generic "feel true?"

**CRITICAL:** Do NOT deliver just a metaphor + question. You must include ALL five Core Flow layers.

SESSION FLAG: FIRST_TURN = ${j?"TRUE":"FALSE"}
- If FIRST_TURN is TRUE (very first mirror after the intro), OMIT the SST Gate question entirely. End with a reflective close instead of a question.
- If FIRST_TURN is FALSE, END your response with EXACTLY ONE concrete question and nothing after it. Prefer this canonical line unless the context demands a somatic variant:
  "Does any of this feel familiar?"

User's input: "${g}"`}if(E(k)){let a=function(a){try{let b=a.match(/<pre[^>]*>(.*?)<\/pre>/s);if(b){let a=b[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"');return JSON.parse(a),a}}catch(a){console.log("Failed to extract JSON from upload:",a)}return null}(k);a&&(k=`I've received a WovenWebApp JSON report. Please provide a complete Solo Mirror analysis based on this data:

${a}

Focus on completing any empty template sections with VOICE synthesis.`)}else if(function(a){let b=a.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);if(b){let a=b[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim();if(!(a.startsWith("{")&&a.endsWith("}"))&&a.length>80)return!0}return a.includes("Uploaded Journal Entry:")||a.includes("Journal Entry:")}(k)){let a=function(a){try{let b=a.match(/<pre[^>]*>(.*?)<\/pre>/s);if(b)return b[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim()}catch(a){console.log("Failed to extract text from upload:",a)}return a}(k);k=`I've received a journal entry for analysis. Please read this with your symbolic weather lens and provide insights into the patterns, emotional climate, and potential astrological correlates:

${a}

Apply Recognition Layer analysis and provide conditional reflections that can be tested (SST protocol).`}let r=F(k),s=!function(a){if(E(a))return!0;let b=a.replace(/<[^>]*>/g," ").toLowerCase();return!!(/(transit|window|during|between|over the (last|next)|this week|today|tomorrow|yesterday|from\s+\w+\s+\d{1,2}\s*(–|-|to)\s*\w*\s*\d{1,2})/.test(b)||/(\b\d{4}-\d{2}-\d{2}\b)|(\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/.test(b)||/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*\d{1,2}\s*(–|-|to)\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)?\s*\d{1,2}/.test(b))}(k)?void 0:x(k),t=["With you—taking a careful read…","Staying close to what you said…","Here with you. Reading the pattern…","Holding what you said against the pattern…","I’m tracking you—slowly, precisely…"],u=w(t[Math.floor(Math.random()*t.length)],{hook:r,climate:s,section:"mirror"}).split(/\n+/)[0],v=`
MANDATORY: Follow the v11 "Warm-Core, Rigor-Backed" protocol EXACTLY:

1. ALWAYS start with "I see you as [stance image]: [felt qualities]. [concrete behavior]."
2. NO technical openings like "I've received..." or data summaries
3. Recognition of felt tension comes AFTER the warm greeting
4. Weather/climate is context, never the headline
5. Use everyday language, not jargon

CRITICAL CORE FLOW STRUCTURE - Always deliver ALL layers in sequence:

**Resonance First:** 
- Warm stance image with felt qualities and polarity tension

**Recognition Layer:**
- "This may show up as [daily behavior/experience]" - anchor the image in lived reality
- Use somatic/behavioral specifics, not abstract concepts

**Typological Profile (light touch):**
- Behavioral lean described in plain language (habits, choices, tells). Do NOT use MBTI or cognitive-function labels. No "Sensation/Intuition" or "Thinking/Feeling" wording.
- Impulse patterns: what triggers action vs. withdrawal
- Polarity check: name the exact tension poles

**Soft Vector Surfacing (when relevant):**
- "Hidden push toward [drive], counterweight through [restraint]"
- Keep planetary references subtle and conditional

**SST Gate:**
- Ask ONE specific behavioral/somatic question, not generic "feel true?"
- Examples: "Does this show up in your body as tension held tight, or more as a mental loop that won't quiet?"

Anti-psychologizing rule: Mirror structural pressure and behavior only. Avoid motive analysis, diagnoses, or personality typing.

First-turn rule: If this is the very first substantive mirror of a session, end with a reflective close (no question). Questions begin on later turns.

CRITICAL INTEGRATION RULE: When users share specific personal details (living situation, family circumstances, financial challenges, etc.), reflect back their ACTUAL words and circumstances rather than generic metaphors. For example:
- If they mention "living with elderly parents and disabled daughter" → acknowledge this specific caregiving reality
- If they mention "they pay rent but caregiving makes it hard to survive" → reflect this exact financial bind
- Avoid generic metaphors like "sturdy oak" when they've given you specific, vulnerable details to work with

Your response MUST begin with the warm recognition greeting AND include ALL Core Flow layers, not just a metaphor + question.
`,A="";if(Array.isArray(e)&&e.length>0){let a=e.slice(-4).map((a,b)=>`- [${a.type}] ${a.name}: ${a.summary||""}`.trim()).join("\n");A=`

SESSION CONTEXT (Compact Uploads)
${a}

Use these as background only. Prefer the user's live words. Do not restate the uploads; integrate gently where relevant.`}let H=Array.isArray(e)&&e.some(a=>"mirror"===a.type),I=Array.isArray(e)&&e.some(a=>"balance"===a.type);H&&I&&(k+=`

Integration hint: The user provided both Mirror and Balance back-to-back. Synthesize structural tension (Mirror) with current climate/valence (Balance).`);let J=v+k+A+`

[SESSION META] first_turn=${j}`,K=(0,y.generateStream)(J,{model:process.env.MODEL_PROVIDER,personaHook:r});return new Response(new ReadableStream({async start(a){for await(let b of((0,z.pG)(k.length),a.enqueue(G({climate:s,hook:r,delta:u})),K))a.enqueue(G({climate:s,hook:r,delta:b.delta}));a.close()}}),{headers:{"Content-Type":"text/plain; charset=utf-8"}})}let J=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/chat/route",pathname:"/api/chat",filename:"route",bundlePath:"app/api/chat/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/dancross/Documents/GitHub/WovenWebApp/app/api/chat/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:K,workUnitAsyncStorage:L,serverHooks:M}=J;function N(){return(0,g.patchFetch)({workAsyncStorage:K,workUnitAsyncStorage:L})}async function O(a,b,c){var d;let e="/api/chat/route";"/index"===e&&(e="/");let g=await J.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:w,params:x,nextConfig:y,isDraftMode:z,prerenderManifest:A,routerServerContext:B,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:E,clientReferenceManifest:F,serverActionsManifest:G}=g,H=(0,l.normalizeAppPath)(e),I=!!(A.dynamicRoutes[H]||A.routes[E]);if(I&&!z){let a=!!A.routes[E],b=A.dynamicRoutes[H];if(b&&!1===b.fallback&&!a)throw new u.NoFallbackError}let K=null;!I||J.isDev||z||(K="/index"===(K=E)?"/":K);let L=!0===J.isDev||!I,M=I&&!L;G&&F&&(0,j.setReferenceManifestsSingleton)({page:e,clientReferenceManifest:F,serverActionsManifest:G,serverModuleMap:(0,k.createServerModuleMap)({serverActionsManifest:G})});let N=a.method||"GET",O=(0,i.getTracer)(),P=O.getActiveScopeSpan(),Q={params:x,prerenderManifest:A,renderOpts:{experimental:{cacheComponents:!!y.experimental.cacheComponents,authInterrupts:!!y.experimental.authInterrupts},supportsDynamicResponse:L,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=y.experimental)?void 0:d.cacheLife,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>J.onRequestError(a,b,d,B)},sharedContext:{buildId:w}},R=new m.NodeNextRequest(a),S=new m.NodeNextResponse(b),T=n.NextRequestAdapter.fromNodeNextRequest(R,(0,n.signalFromNodeResponse)(b));try{let d=async a=>J.handle(T,Q).finally(()=>{if(!a)return;a.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let c=O.getRootSpanAttributes();if(!c)return;if(c.get("next.span_type")!==o.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${c.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let d=c.get("next.route");if(d){let b=`${N} ${d}`;a.setAttributes({"next.route":d,"http.route":d,"next.span_name":b}),a.updateName(b)}else a.updateName(`${N} ${e}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&C&&D&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=Q.renderOpts.fetchMetrics;let i=Q.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=Q.renderOpts.collectedTags;if(!I)return await (0,q.I)(R,S,e,Q.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,r.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[t.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==Q.renderOpts.collectedRevalidate&&!(Q.renderOpts.collectedRevalidate>=t.INFINITE_CACHE)&&Q.renderOpts.collectedRevalidate,d=void 0===Q.renderOpts.collectedExpire||Q.renderOpts.collectedExpire>=t.INFINITE_CACHE?void 0:Q.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await J.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,p.c)({isStaticGeneration:M,isOnDemandRevalidate:C})},B),b}},l=await J.handleResponse({req:a,nextConfig:y,cacheKey:K,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:k,waitUntil:c.waitUntil});if(!I)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),z&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,r.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&I||m.delete(t.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,s.getCacheControlHeader)(l.cacheControl)),await (0,q.I)(R,S,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};P?await g(P):await O.withPropagatedContext(a.headers,()=>O.trace(o.BaseServerSpan.handleRequest,{spanName:`${N} ${e}`,kind:i.SpanKind.SERVER,attributes:{"http.method":N,"http.target":a.url}},g))}catch(b){if(b instanceof u.NoFallbackError||await J.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,p.c)({isStaticGeneration:M,isOnDemandRevalidate:C})}),I)throw b;return await (0,q.I)(R,S,new Response(null,{status:500})),null}}},95736:(a,b,c)=>{"use strict";a.exports=c(44870)},96487:()=>{}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[828,364,404],()=>b(b.s=92524));module.exports=c})();