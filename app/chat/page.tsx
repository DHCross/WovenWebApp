import React from 'react';
import ChatClient from '../../components/ChatClient';
import RequireAuth from '../../components/RequireAuth';
export const dynamic = 'force-dynamic';
export default function ChatPage(){
  return (
    <RequireAuth>
      <ChatClient />
    </RequireAuth>
  );
}
