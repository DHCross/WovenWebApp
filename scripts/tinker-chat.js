#!/usr/bin/env node
// Simple local CLI tinker script that posts to local dev /api/chat
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });
let history = [];

async function main(){
  console.log('\nRaven Calder · Tinker Mode');
  console.log('Type your message. Empty line to exit.\n');
  while(true){
    const line = await rl.question('you > ');
    if(!line.trim()) break;
    history.push({role:'user', content: line});
    const res = await fetch('http://localhost:3000/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({messages: history}) });
    if(!res.body){ console.error('No stream body'); continue; }
    const reader = res.body.getReader();
    let acc='';
    process.stdout.write('raven > ');
    while(true){
      const {value, done} = await reader.read();
      if(done) break;
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split(/\n+/).filter(Boolean);
      for(const ln of lines){
        try {
          const obj = JSON.parse(ln);
          if(obj.delta){
            acc += obj.delta;
            process.stdout.write(obj.delta);
          }
        } catch{ /* ignore */ }
      }
    }
    process.stdout.write('\n');
    history.push({role:'raven', content: acc});
  }
  rl.close();
}
main().catch(e=>{ console.error(e); process.exit(1); });
