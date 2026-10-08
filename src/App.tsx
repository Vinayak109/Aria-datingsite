/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Chat } from './components/Chat';

export default function App() {
  const [view, setView] = useState<'landing' | 'chat'>('landing');

  return (
    <>
      {view === 'landing' && <LandingPage onStartChat={() => setView('chat')} />}
      {view === 'chat' && <Chat onBack={() => setView('landing')} />}
    </>
  );
}
