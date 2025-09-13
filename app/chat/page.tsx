import React from 'react';
import AuthStatusPill from '../../components/dev/AuthStatusPill';
import ChatClient from '../../components/ChatClient';
import RequireAuth from '../../components/RequireAuth';
export const dynamic = 'force-dynamic';
export default function ChatPage(){
  return (
    <RequireAuth>
      {process.env.NODE_ENV !== 'production' && <AuthStatusPill />}
      <ChatClient />
    </RequireAuth>
  );
}
