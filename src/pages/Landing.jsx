/**
 * Landing page component — rendered when user is NOT logged in.
 * Based on the static pausewallet.com/index.html, converted to React.
 */
export default function Landing({ onLaunch }) {
  return (
    <div style={{ 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#0a0a0f',
      color: '#f0f0f0',
      minHeight: '100vh',
      overflowX: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
        .gold { color: #c9a84c; }
        .landing-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 2rem; border-radius: 12px; font-size: 0.95rem;
          font-weight: 600; text-decoration: none; transition: all 0.25s;
          cursor: pointer; border: none;
        }
        .landing-btn-primary {
          background: linear-gradient(135deg, #c9a84c, #a8893a); color: #0a0a0f;
        }
        .landing-btn-primary:hover {
          background: linear-gradient(135deg, #e4c76b, #c9a84c);
          transform: translateY(-2px); box-shadow: 0 8px 30px rgba(201,168,76,0.3);
        }
        .landing-btn-outline {
          background: transparent; color: #f0f0f0; border: 1px solid #222235;
        }
        .landing-btn-outline:hover { border-color: #c9a84c; color: #c9a84c; transform: translateY(-2px); }
        .landing-btn-green {
          background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.3);
        }
        .landing-btn-green:hover { background: rgba(74,222,128,0.18); transform: translateY(-2px); }
        .flow-step {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1.2rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;
        }
        .step-card {
          background: #12121a; border: 1px solid #222235; border-radius: 20px; padding: 2rem;
          transition: all 0.3s;
        }
        .step-card:hover { border-color: #a8893a; background: #1a1a25; transform: translateY(-4px); }
        .feature-card {
          background: #12121a; border: 1px solid #222235; border-radius: 16px; padding: 1.5rem;
          transition: all 0.3s;
        }
        .feature-card:hover { border-color: rgba(201,168,76,0.25); background: #1a1a25; }
        .scenario-step {
          display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.02); border: 1px solid #222235; border-radius: 12px;
        }
        .scenario-step:hover { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.03); }
        .scenario-num {
          width: 32px; height: 32px; border-radius: 50%; background: rgba(201,168,76,0.12);
          color: #c9a84c; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
        }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '800px',
        background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '1rem 2rem', background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid #222235',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: '#c9a84c' }}>PAUSE WALLET</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="#how-it-works" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '0.875rem' }}>How It Works</a>
            <a href="#features" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '0.875rem' }}>Features</a>
            <button onClick={onLaunch} className="landing-btn landing-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
              Launch Wallet
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '8rem 2rem 4rem' }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.4rem 1rem', borderRadius: '100px', marginBottom: '2rem' }}>
            🛡️ Patent-Pending Technology
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Hackers Can Steal Your Keys.<br /><span className="gold">They Can't Steal Your Crypto.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#8888a0', maxWidth: '600px', margin: '0 auto 1rem', lineHeight: 1.7 }}>
            Pause Wallet is a new kind of crypto wallet. Every transaction is time-locked. Every suspicious move can be revoked. And if the worst happens, your funds automatically route to <strong style={{ color: '#f0f0f0' }}>PauseSafe</strong> — a hardened recovery wallet, completely out of reach.
          </p>
          <p style={{ color: '#8888a0', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto 2rem' }}>
            Sent to the wrong address? Wrong network? With Pause Wallet, mistakes aren't permanent anymore. <strong style={{ color: '#f0f0f0' }}>You get a second chance.</strong>
          </p>

          {/* Flow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div className="flow-step" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>🔐 Vault — Store</div>
            <span style={{ color: '#8888a0', fontSize: '1.2rem' }}>→</span>
            <div className="flow-step" style={{ background: 'rgba(201,168,76,0.12)', color: '#e4c76b', border: '1px solid rgba(201,168,76,0.25)' }}>⏱️ Hold — Time Lock</div>
            <span style={{ color: '#8888a0', fontSize: '1.2rem' }}>→</span>
            <div className="flow-step" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>🛡️ Safe — Recover</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3rem' }}>
            <div className="flow-step" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>⚡ Liquidity — No Time Lock, Sends Instantly</div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onLaunch} className="landing-btn landing-btn-primary">🚀 Launch Pause Wallet</button>
            <a href="#how-it-works" className="landing-btn landing-btn-outline">See How It Works ↓</a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ position: 'relative', zIndex: 1, padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#c9a84c', marginBottom: '0.75rem', display: 'inline-block' }}>Security Architecture</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>How Pause Wallet Protects You</h2>
          <p style={{ color: '#8888a0', fontSize: '1.05rem', maxWidth: '600px', marginBottom: '3rem' }}>Pause Wallet is one security system with three layers. Every transaction passes through all three — automatically.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { num: '1', title: 'Vault — Your Savings Account', desc: 'Think of the Vault like a savings account for your crypto. This is where the bulk of your portfolio lives. When you send crypto out, it enters the Guard first.' },
              { num: '2', title: 'Hold — Customizable Time Lock', desc: 'Every Vault transaction is held before reaching the recipient. You choose the lock time — 6, 12, or 24 hours. During this window, you can revoke anything you didn\'t authorize.' },
              { num: '3', title: 'Liquidity — Your Checking Account', desc: 'Keep smaller amounts here for everyday use, quick trades, and time-sensitive moves. No time lock, no delay. Sends go out instantly.' },
              { num: '4', title: 'Safe — Emergency Recovery', desc: 'When you revoke a transaction, funds route to PauseSafe — a completely separate hardened wallet. No seed phrase access, no external connections, PIN-protected.' },
            ].map(s => (
              <div key={s.num} className="step-card">
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', background: 'rgba(201,168,76,0.15)', color: '#e4c76b' }}>{s.num}</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.6rem' }}>{s.title}</h3>
                <p style={{ color: '#8888a0', fontSize: '0.9rem', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Hack Scenario */}
          <div style={{ marginTop: '3.5rem', background: '#12121a', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '2.5rem' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>🚨 What happens when you get hacked?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                'Attacker gains access to your Vault and initiates a transfer of all your ETH.',
                'The transaction enters the Guard and is held for your configured lock time. The attacker can\'t speed this up.',
                'You get an alert. You open Pause Wallet and see the unauthorized transfer. You hit Revoke.',
                'The transaction is cancelled. Your funds are instantly routed to your PauseSafe wallet.',
                'You secure your accounts, set up a new Vault, and transfer funds back. Zero loss.',
              ].map((text, i) => (
                <div key={i} className="scenario-step" style={i === 4 ? { borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' } : {}}>
                  <div className="scenario-num" style={i === 4 ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' } : {}}>{i + 1}</div>
                  <p style={{ color: '#8888a0', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }} dangerouslySetInnerHTML={{ __html: text.replace('Revoke', '<strong style="color:#f0f0f0">Revoke</strong>').replace('Zero loss', '<strong style="color:#4ade80">Zero loss</strong>') }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#c9a84c', marginBottom: '0.75rem', display: 'inline-block' }}>Why Pause Wallet</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '3rem' }}>Built Different</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {[
              { icon: '⏱️', title: 'Customizable Time Lock', desc: 'Choose 6, 12, or 24 hours. Attackers can\'t move your funds before you notice.' },
              { icon: '🔄', title: 'Instant Revoke', desc: 'See something wrong? One click revokes the transaction and routes funds to Safe.' },
              { icon: '🔒', title: 'No Seed Exposure', desc: 'PauseSafe locks down the seed phrase entirely. No one can accidentally leak it.' },
              { icon: '🔄', title: 'Undo Your Mistakes', desc: 'Wrong address? Wrong network? Revoke during the hold window. Mistakes don\'t have to be permanent.' },
              { icon: '⚡', title: 'Liquidity Wallet', desc: 'Your checking account for crypto. No time lock — sends go out instantly.' },
              { icon: '🛡️', title: 'Emergency Mode', desc: 'Detect a breach? Emergency protection migrates all held funds to a new vault instantly.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{f.title}</h4>
                <p style={{ color: '#8888a0', fontSize: '0.82rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Patent */}
      <section style={{ position: 'relative', zIndex: 1, padding: '3rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ background: '#12121a', border: '1px solid #222235', borderRadius: 20, padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '0.5rem 1.25rem', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600, color: '#c9a84c', marginBottom: '1rem' }}>📋 USPTO Filed</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Patent-Pending Technology</h3>
            <p style={{ color: '#8888a0', fontSize: '0.9rem', maxWidth: 500, margin: '0 auto' }}>Pause Wallet's four-layer security architecture is protected by provisional patents filed with the United States Patent and Trademark Office.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '6rem 2rem' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1rem' }}>
          Your Keys Got Stolen.<br /><span className="gold">Your Crypto Didn't.</span>
        </h2>
        <p style={{ color: '#8888a0', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          That's the Pause Wallet difference. Protection from hackers AND your own mistakes.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onLaunch} className="landing-btn landing-btn-primary">🚀 Launch Pause Wallet</button>
          <button onClick={onLaunch} className="landing-btn landing-btn-green">🛡️ Set Up PauseSafe</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #222235', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#c9a84c', fontSize: '1rem' }}>PAUSE WALLET</span>
          <p style={{ color: '#8888a0', fontSize: '0.8rem' }}>© 2026 Pause Wallet. All rights reserved. Patent pending.</p>
        </div>
      </footer>
    </div>
  );
}
