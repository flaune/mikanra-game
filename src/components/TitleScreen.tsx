import { useState } from 'react';
import '../opening.css';

interface TitleScreenProps {
  arriving: boolean;
  ready: boolean;
  muted: boolean;
  continuing?: boolean;
  onMute: () => void;
  onPlay: () => void;
}

export function TitleScreen({ arriving, ready, continuing, onPlay }: TitleScreenProps) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  return (
    <section className={`rail-title opening-title simple-title ${arriving ? 'is-arriving' : ''}`} aria-label="Mikanra title screen" onKeyDown={event => { if (event.key === 'Escape') setCreditsOpen(false); }}>
      {!arriving && <>
        <h1 className="simple-title-logo">Mikanra</h1>
        {creditsOpen ? <div className="simple-credits" role="region" aria-label="Credits">
          <h2>Credits</h2>
          <p><a href="https://www.bhach.com" target="_blank" rel="noopener noreferrer">Bryan</a></p>
          <small className="simple-audio-credit">Original arrival sound and café artwork by Bryan, created with AI-assisted development.</small>
          <small className="simple-audio-credit">Japanese pronunciation: OpenJTalk HTS voice “Mei” · © 2009–2013 Nagoya Institute of Technology / MMDAgent Project Team · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Synthesized at a teaching pace and encoded as MP3.</small>
          <small className="simple-audio-credit"><a href={`${import.meta.env.BASE_URL}licenses/index.html`} target="_blank" rel="noopener noreferrer">Software and audio licenses</a></small>
          <button autoFocus onClick={() => setCreditsOpen(false)}>Back</button>
        </div> : <nav className="simple-title-menu" aria-label="Main menu">
          <button disabled={!ready} onClick={onPlay}>{continuing ? 'Continue café' : 'Click to Play'}</button>
          <button onClick={() => setCreditsOpen(true)}>Credits</button>
        </nav>}
      </>}
      {arriving && <>
        <div className="rail-arrival-shade opening-arrival-shade" aria-hidden="true" />
        <div className="opening-arrival-copy" role="status"><span className="opening-overline">NEXT STOP / 次は</span><h2>Shibuya<span lang="ja">渋谷</span></h2><p>“The next station is Shibuya, JY20. The doors on the left side will open. Please watch your step when you leave the train.”</p></div>
        <span className="opening-skip">ESC · SKIP ARRIVAL</span>
      </>}
    </section>
  );
}

export function MobileNotice() {
  return <main className="rail-mobile opening-mobile">
    <div className="opening-mobile-logo">Mikanra<span lang="ja">ミカンラ</span></div>
    <div className="opening-mobile-card"><span className="opening-overline">SEVEN MORNINGS AT CAFÉ MIKAN</span><h1>A seat at<br />your desktop.</h1><p>Mikanra is best experienced on desktop with a keyboard and mouse.</p><p>Your first morning at Café Mikan is waiting. In the meantime, explore my other work.</p><a className="rail-play opening-play" href="https://bhach.com"><span>VISIT BHACH.COM</span><b aria-hidden="true">↗</b></a></div>
    <p className="opening-mobile-credit">Made by <strong><a href="https://www.bhach.com" target="_blank" rel="noopener noreferrer">Bryan</a></strong></p>
  </main>;
}
