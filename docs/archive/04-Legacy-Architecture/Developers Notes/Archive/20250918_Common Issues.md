# Common Issues

Sserver connectivity issue. Based on your notes and the Status Code 0 error, I need to diagnose what's happening with your local development setup. 

Thinking

Ran terminal command: lsof -i :4000 -i :8888 -i :3000

Read [](file:///Users/dancross/Documents/GitHub/WovenWebApp/package.json)

Now I understand the issue! Looking at your package.json, there are several different development setups:

1. `npm run dev` - Uses Netlify dev (port 8888)
2. `npm run dev:nextjs` - Runs Next.js on port 4000
3. `npm run dev:next-local` - Runs both Tailwind watch and Next.js on port 4000

You're trying to access port 4000, but the task that was started uses `npm run dev` which runs Netlify dev on port 8888. Let me check what's currently running and start the correct server: 

Ran terminal command: ps aux | grep -E "(netlify|next)" | grep -v grep