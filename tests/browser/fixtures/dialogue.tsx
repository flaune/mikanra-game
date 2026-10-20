import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import DialogueBox from '/src/components/DialogueBox';

if (!import.meta.env.DEV) throw new Error('The QA fixture is development-only.');

export function Fixture() {
  const [line, setLine] = useState(0);
  return <>
    <button onClick={() => setLine(value => value + 1)}>Start a new line</button>
    {line > 0 && <DialogueBox key={line} speaker="Haru" text="Welcome to the neighborhood. Take your time with your first shift." onContinue={() => {}} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
