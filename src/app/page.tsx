"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Share_Tech_Mono, Bebas_Neue, DM_Sans } from "next/font/google";
import "./landing.css";

const shareTechMono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-mono" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const dmSans = DM_Sans({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body" });

export default function TracePilotLanding() {
  useEffect(() => {
    // ── cursor ──
    const C = document.getElementById('cur');
    const R = document.getElementById('cur-ring');
    let mx = 0, my = 0, rx = 0, ry = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    let rafId: number;
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (C) {
        C.style.left = mx + 'px';
        C.style.top = my + 'px';
      }
      if (R) {
        R.style.left = rx + 'px';
        R.style.top = ry + 'px';
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // ── app window animation ──
    let animTimeout: NodeJS.Timeout;
    let tickerInterval: NodeJS.Timeout;
    let timeouts: NodeJS.Timeout[] = [];

    function runAnim() {
      // reset cards
      ['rc1','rc2','rc3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
      });
      const cf = document.getElementById('cfill');
      if (cf) cf.classList.remove('show');

      // reset pipeline
      const s: Record<string, string> = {s1:'done', s2:'done', s3:'run', s4:'', s5:''};
      Object.entries(s).forEach(([id, cls]) => {
        const el = document.getElementById(id);
        if (el) el.className = 'pstep ' + (cls || '');
      });
      const n3 = document.getElementById('n3'), n4 = document.getElementById('n4'), n5 = document.getElementById('n5');
      if (n3) n3.className = 'pname run';
      if (n4) n4.className = 'pname';
      if (n5) n5.className = 'pname';

      const pstat = document.getElementById('pstat');
      if (pstat) {
        pstat.textContent = 'Running…';
        pstat.style.color = 'rgba(255,255,255,0.5)';
      }

      const pill = document.getElementById('wpill');
      const blinker = document.getElementById('blinker');
      const pilltext = document.getElementById('pilltext');
      const welap = document.getElementById('welap');

      if (pill) {
        pill.style.color = '';
        pill.style.borderColor = '';
        pill.style.background = '';
      }
      if (pilltext) pilltext.textContent = 'ANALYZING';
      if (blinker) {
        blinker.style.background = 'var(--red)';
        blinker.style.boxShadow = '0 0 5px var(--red)';
      }

      // elapsed ticker
      let t = 0;
      clearInterval(tickerInterval);
      tickerInterval = setInterval(() => {
        t += 0.1;
        if (welap) welap.textContent = t.toFixed(1) + 's';
      }, 100);

      // step 3 done → rc1 at 1.8s
      timeouts.push(setTimeout(() => {
        const s3 = document.getElementById('s3'); if (s3) s3.className = 'pstep done';
        if (n3) n3.className = 'pname done';
        const s4 = document.getElementById('s4'); if (s4) s4.className = 'pstep run';
        if (n4) n4.className = 'pname run';
        if (pstat) pstat.textContent = 'Step 4/5…';
        const rc1 = document.getElementById('rc1'); if (rc1) rc1.classList.add('show');
      }, 1800));

      // rc2 at 2.5s
      timeouts.push(setTimeout(() => {
        const rc2 = document.getElementById('rc2'); if (rc2) rc2.classList.add('show');
        timeouts.push(setTimeout(() => {
          const cf = document.getElementById('cfill'); if (cf) cf.classList.add('show');
        }, 300));
      }, 2500));

      // done + rc3 at 3.7s
      timeouts.push(setTimeout(() => {
        const s4 = document.getElementById('s4'); if (s4) s4.className = 'pstep done';
        if (n4) n4.className = 'pname done';
        const s5 = document.getElementById('s5'); if (s5) s5.className = 'pstep done';
        if (n5) n5.className = 'pname done';
        clearInterval(tickerInterval);
        if (pstat) { pstat.textContent = 'Complete ✓'; pstat.style.color = '#1db954'; }
        if (pill) { pill.style.color = '#1db954'; pill.style.borderColor = 'rgba(29,185,84,.3)'; pill.style.background = 'rgba(29,185,84,.08)'; }
        if (pilltext) pilltext.textContent = 'DONE';
        if (blinker) { blinker.style.background = '#1db954'; blinker.style.boxShadow = '0 0 5px #1db954'; }
        const rc3 = document.getElementById('rc3'); if (rc3) rc3.classList.add('show');
      }, 3700));

      // loop every 8s
      animTimeout = setTimeout(runAnim, 8000);
    }

    animTimeout = setTimeout(runAnim, 600);

    // ── scroll reveal ──
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
      clearTimeout(animTimeout);
      clearInterval(tickerInterval);
      timeouts.forEach(clearTimeout);
      obs.disconnect();
    };
  }, []);

  return (
    <div className={`landing-page ${shareTechMono.variable} ${bebasNeue.variable} ${dmSans.variable} ${dmSans.className}`}>
      <div id="cur"></div>
      <div id="cur-ring"></div>

      <nav>
        <div className="nav-logo">
          <div className="nav-dot"></div>
          TRACEPILOT<span>.</span>
        </div>
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#integrations">Integrations</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        
        <SignedOut>
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <button className="nav-cta">Login Access</button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="nav-cta" style={{ textDecoration: 'none' }}>Open Dashboard</Link>
        </SignedIn>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="led"></span>
            AI-Powered Incident Intelligence
          </div>
          <h1>
            <span className="stroke">RAW LOGS</span>
            <span className="acc">INTO</span>
            ACTION
          </h1>
          <p className="hero-sub">TracePilot's multi-agent pipeline transforms chaotic log data into clear incident reports — root cause, severity, and remediation in seconds.</p>
          <div className="hero-actions">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="btn-p">Start Analyzing Free</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="btn-p">Enter Dashboard →</button>
              </Link>
            </SignedIn>
            <a href="#how" className="btn-g" style={{ display: 'inline-block' }}>See How It Works →</a>
          </div>
          <div className="hero-stats">
            <div><div className="sn">4<span>s</span></div><div className="sl">Avg. Triage Time</div></div>
            <div><div className="sn">99<span>%</span></div><div className="sl">Root Cause Accuracy</div></div>
            <div><div className="sn">5</div><div className="sl">Pipeline Agents</div></div>
          </div>
        </div>

        <div className="hero-right">
          <div className="app-window">
            <div className="wtb">
              <div className="wdots">
                <div className="wd cl"></div>
                <div className="wd mn"></div>
                <div className="wd mx"></div>
              </div>
              <div className="wtitle">TracePilot — Incident #4821 — db-primary outage</div>
              <div className="wpill" id="wpill">
                <div className="bd" id="blinker"></div>
                <span id="pilltext">ANALYZING</span>
              </div>
            </div>

            <div className="wbody">
              <div className="wsb">
                <div className="sbi act">⚡</div>
                <div className="sbi">▦</div>
                <div className="sbi">⇌</div>
                <div className="sbsep"></div>
                <div className="sbi">🗂</div>
                <div className="sbi">↺</div>
                <div className="sbi">◉</div>
                <div className="sbsep"></div>
                <div className="sbi bot">⚙</div>
              </div>

              <div className="wmain">
                <div className="wtopbar">
                  <div className="wtab act">Analyze</div>
                  <div className="wtab">Report</div>
                  <div className="wtab">Chat</div>
                  <div className="wtsp"></div>
                  <button className="wrunbtn">▶ Run Analysis</button>
                </div>

                <div className="wcontent">
                  <div className="pinput">
                    <div className="plabel">Raw Log Input</div>
                    <div className="lscroll">
                      <div className="ll"><span className="ll-ts">10:42:01</span><span className="ll-lv i">[INFO]</span><span className="ll-msg">auth-svc started :8080</span></div>
                      <div className="ll"><span className="ll-ts">10:42:03</span><span className="ll-lv i">[INFO]</span><span className="ll-msg">DB pool init <span className="hw">pool=10</span></span></div>
                      <div className="ll"><span className="ll-ts">10:42:07</span><span className="ll-lv w">[WARN]</span><span className="ll-msg">p99=<span className="hw">2840ms</span></span></div>
                      <div className="ll"><span className="ll-ts">10:42:09</span><span className="ll-lv e">[ERR]</span><span className="ll-msg"><span className="hr">ECONNREFUSED</span> db:5432</span></div>
                      <div className="ll"><span className="ll-ts">10:42:09</span><span className="ll-lv e">[ERR]</span><span className="ll-msg"><span className="hr">ECONN</span> retry 1/3</span></div>
                      <div className="ll"><span className="ll-ts">10:42:10</span><span className="ll-lv e">[ERR]</span><span className="ll-msg"><span className="hr">ECONN</span> retry 2/3</span></div>
                      <div className="ll"><span className="ll-ts">10:42:10</span><span className="ll-lv e">[ERR]</span><span className="ll-msg"><span className="hr">Max retries</span> exceeded</span></div>
                      <div className="ll"><span className="ll-ts">10:42:11</span><span className="ll-lv e">[ERR]</span><span className="ll-msg"><span className="hr">503</span> Unavailable</span></div>
                      <div className="ll"><span className="ll-ts">10:42:11</span><span className="ll-lv w">[WARN]</span><span className="ll-msg">Breaker <span className="hw">OPEN</span></span></div>
                      <div className="ll"><span className="ll-ts">10:42:12</span><span className="ll-lv i">[INFO]</span><span className="ll-msg">Failover…<span className="cblink"></span></span></div>
                    </div>
                  </div>

                  <div className="presult">
                    <div className="pbar">
                      <div className="pb-lbl">Pipeline <span className="ps" id="pstat">Running…</span></div>
                      <div className="pb-steps">
                        <div className="pstep done" id="s1"></div>
                        <div className="pstep done" id="s2"></div>
                        <div className="pstep run" id="s3"></div>
                        <div className="pstep" id="s4"></div>
                        <div className="pstep" id="s5"></div>
                      </div>
                      <div className="pb-names">
                        <div className="pname done">Intake</div>
                        <div className="pname done">Severity</div>
                        <div className="pname run" id="n3">Root Cause</div>
                        <div className="pname" id="n4">Remediate</div>
                        <div className="pname" id="n5">Report</div>
                      </div>
                    </div>

                    <div className="rcards">
                      <div className="rc" id="rc1">
                        <div className="rc-head">
                          <span className="rc-lbl">Severity</span>
                          <span className="rcbadge crit">⬤ CRITICAL</span>
                        </div>
                        <div className="rc-txt">DB primary unreachable — <span className="red">503s cascading</span> across all upstream services.</div>
                      </div>

                      <div className="rc" id="rc2">
                        <div className="rc-head">
                          <span className="rc-lbl">Root Cause</span>
                          <span className="rcbadge hi">94% CONF</span>
                        </div>
                        <div className="rc-txt"><span className="bright">ECONNREFUSED</span> on <span className="red">db-primary:5432</span>. Pool exhausted. Circuit breaker opened.</div>
                        <div className="confrow">
                          <div className="confbar"><div className="conffill" id="cfill"></div></div>
                          <div className="confpct">92%</div>
                        </div>
                      </div>

                      <div className="rc" id="rc3">
                        <div className="rc-head">
                          <span className="rc-lbl">Remediation</span>
                          <span className="rcbadge ok">3 ACTIONS</span>
                        </div>
                        <div className="acts">
                          <div className="act-item">Verify route to db-primary:5432</div>
                          <div className="act-item">Promote read replica to primary</div>
                          <div className="act-item">Drain &amp; restart connection pool</div>
                        </div>
                      </div>
                    </div>

                    <div className="wsbar">
                      <div className="wsi err"><div className="d"></div>5 ERR</div>
                      <div className="wsi wrn"><div className="d"></div>2 WARN</div>
                      <div className="wsi ok"><div className="d"></div>OK</div>
                      <div className="wsp"></div>
                      <div className="welap" id="welap">0.0s</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="how-hd reveal">
          <div className="stag">The Pipeline</div>
          <h2>FIVE AGENTS.<br /><em>ONE CLEAR</em> REPORT.</h2>
          <p>Each stage is purpose-built — from intake to severity, root cause, remediation, and a shareable final report.</p>
        </div>
        <div className="pipeline">
          <div className="pstage reveal"><div className="pnum">01 / INTAKE AGENT</div><div className="picon">📥</div><div className="pname2">INTAKE</div><div className="pdesc">Structures noisy incident input into a reliable working record and extracts the first evidence snippets.</div><div className="parr"></div></div>
          <div className="pstage reveal r1"><div className="pnum">02 / SEVERITY AGENT</div><div className="picon">🚨</div><div className="pname2">SEVERITY</div><div className="pdesc">Estimates impact, urgency, and customer risk from available signals with confidence scoring.</div><div className="parr"></div></div>
          <div className="pstage reveal r2"><div className="pnum">03 / ROOT CAUSE AGENT</div><div className="picon">🔍</div><div className="pname2">ROOT CAUSE</div><div className="pdesc">Builds evidence-grounded hypotheses, flags missing context, and ranks likely failure origins.</div><div className="parr"></div></div>
          <div className="pstage reveal r3"><div className="pnum">04 / REMEDIATION AGENT</div><div className="picon">⚡</div><div className="pname2">REMEDIATE</div><div className="pdesc">Turns findings into immediate response steps and owner-ready actions.</div><div className="parr"></div></div>
          <div className="pstage reveal r3"><div className="pnum">05 / REPORT AGENT</div><div className="picon">📄</div><div className="pname2">REPORT</div><div className="pdesc">Compiles the final incident narrative for sharing, review, and audit history.</div></div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="reveal">
          <div className="stag">Capabilities</div>
          <h2>EVERYTHING YOUR<br /><em>ON-CALL</em> NEEDS.</h2>
          <p className="sub">From single-file log analysis to live CloudWatch monitoring — TracePilot covers the full incident lifecycle.</p>
        </div>
        <div className="fgrid">
          <div className="fc lg reveal">
            <div>
              <div className="ficon">📄</div>
              <div className="ftitle">LOG FILE ANALYSIS</div>
              <div className="fbody">Paste logs or upload a single log export. TracePilot extracts evidence, runs the agent pipeline, and stores the incident report without retaining the raw file.</div>
              <span className="ftag">TXT / LOG / JSON / NDJSON</span>
            </div>
            <div className="logvis">
              <div className="ok">✓ api-server.log (48 KB)</div>
              <div className="ok">✓ db-connector.log (312 KB)</div>
              <div className="ok">✓ auth-service.json (220 KB)</div>
              <div className="sk">✗ config.env (unsupported)</div>
              <div className="sk">✗ binary.dump (binary)</div>
              <div className="ok">✓ workers.ndjson (89 KB)</div>
              <div style={{ marginTop: '5px' }} className="al">⚑ evidence extracted → agents running</div>
            </div>
          </div>
          <div className="fc reveal">
            <div className="ficon">📊</div>
            <div className="ftitle">LOG CHARTS &amp; SIGNALS</div>
            <div className="fbody">Visual dashboards show severity mix, error/warning density, HTTP status classes, and reliability signals — all extracted from your logs.</div>
            <div className="sev-chart">
              <div className="rw">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="34" fill="none" stroke="#f0f0f0" strokeWidth="7" />
                  <circle cx="42" cy="42" r="34" fill="none" stroke="#e8000d" strokeWidth="7" strokeDasharray="42.7 171.4" opacity=".9" />
                  <circle cx="42" cy="42" r="34" fill="none" stroke="#ff5722" strokeWidth="7" strokeDasharray="74.8 139.3" strokeDashoffset="-42.7" opacity=".7" />
                  <circle cx="42" cy="42" r="34" fill="none" stroke="#f0a500" strokeWidth="7" strokeDasharray="64.1 150" strokeDashoffset="-117.5" opacity=".6" />
                  <circle cx="42" cy="42" r="34" fill="none" stroke="#1db954" strokeWidth="7" strokeDasharray="32 182.1" strokeDashoffset="-181.6" opacity=".5" />
                </svg>
                <div className="rl">24<small>EVT</small></div>
              </div>
              <div className="sleg">
                <div className="srow"><div className="sdot" style={{ background: '#e8000d' }}></div>CRITICAL 20%</div>
                <div className="srow"><div className="sdot" style={{ background: '#ff5722' }}></div>HIGH 35%</div>
                <div className="srow"><div className="sdot" style={{ background: '#f0a500' }}></div>MEDIUM 30%</div>
                <div className="srow"><div className="sdot" style={{ background: '#1db954' }}></div>LOW 15%</div>
              </div>
            </div>
          </div>
          <div className="fc reveal">
            <div className="ficon">💬</div>
            <div className="ftitle">REMEDIATION CHAT</div>
            <div className="fbody">Every action opens a scoped chat. Ask why a step matters, which log line backs it up, or what command to run — with full history persisted per job and action.</div>
            <span className="ftag">Scoped Per Action</span>
          </div>
          <div className="fc reveal r1">
            <div className="ficon">🎯</div>
            <div className="ftitle">SMART CLARIFICATION</div>
            <div className="fbody">TracePilot asks targeted questions when logs need operational context: Was there a deployment? Database rotation? Traffic spike? Answers refine the full remediation plan.</div>
            <span className="ftag">Context-Aware Refinement</span>
          </div>
          <div className="fc reveal r2">
            <div className="ficon">📤</div>
            <div className="ftitle">AUDIT &amp; EXPORT</div>
            <div className="fbody">Full audit trail of pipeline stages, remediation actions, clarification answers, and chat messages. Export as JSON, PDF, or signed audit PDF for compliance teams.</div>
            <span className="ftag">JSON / PDF / Audit PDF</span>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="integrations" id="integrations">
        <div className="stag" style={{ color: 'var(--red)' }}>Integrations</div>
        <h2 className="reveal">PLUG INTO YOUR<br />EXISTING STACK.</h2>
        <p className="reveal">TracePilot notifies your team the moment a high or critical incident is confirmed — wherever they work.</p>
        <div className="igrid reveal">
          <div className="icard"><div className="iico">💬</div><div><div className="iname">Slack</div><div className="itype">Incoming Webhook</div></div></div>
          <div className="icard"><div className="iico">🔗</div><div><div className="iname">Generic Webhook</div><div className="itype">REST / HTTP POST</div></div></div>
          <div className="icard"><div className="iico">☁️</div><div><div className="iname">AWS CloudWatch</div><div className="itype">Live Log Monitor</div></div></div>
          <div className="icard"><div className="iico">📧</div><div><div className="iname">Email / Resend</div><div className="itype">Reminder Delivery</div></div></div>
          <div className="icard"><div className="iico">🟡</div><div><div className="iname">PagerDuty</div><div className="itype">Alert Escalation</div></div></div>
          <div className="icard"><div className="iico">📡</div><div><div className="iname">Datadog</div><div className="itype">Metrics Correlation</div></div></div>
          <div className="icard"><div className="iico">🔷</div><div><div className="iname">Jira</div><div className="itype">Ticket Auto-Create</div></div></div>
          <div className="icard"><div className="iico">⚙️</div><div><div className="iname">GitHub Actions</div><div className="itype">CI/CD Trigger</div></div></div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="stag reveal">Pricing</div>
        <h2 className="reveal">SIMPLE, <em>TRANSPARENT</em><br />PRICING.</h2>
        <p className="psub reveal">No per-seat nonsense. Pay for what your team actually uses.</p>
        <div className="pgrid">
          <div className="plan reveal">
            <div className="pnm">STARTER</div>
            <div className="pprice"><sup>$</sup>0<small>/mo</small></div>
            <div className="pdesc2">For solo engineers exploring incident intelligence.</div>
            <div className="pdiv"></div>
            <ul className="pfts">
              <li>50 incident analyses / month</li>
              <li>Single file + paste ingestion</li>
              <li>Full 5-agent pipeline</li>
              <li>Remediation chat (7-day history)</li>
              <li>JSON export</li>
              <li>Community support</li>
            </ul>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="pbtn">Start Free</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard"><button className="pbtn">Enter Dashboard</button></Link>
            </SignedIn>
          </div>
          <div className="plan feat reveal r1">
            <div className="pbdge">Most Popular</div>
            <div className="pnm">PRO</div>
            <div className="pprice"><sup>$</sup>20<small>/mo</small></div>
            <div className="pdesc2">For on-call teams and growing engineering orgs.</div>
            <div className="pdiv"></div>
            <ul className="pfts">
              <li>10,000 incident analyses / month</li>
              <li>Single log file upload</li>
              <li>Full 5-agent pipeline + strong root cause model</li>
              <li>Persistent chat history + reminders</li>
              <li>Slack + webhook integrations</li>
              <li>PDF + Audit PDF export</li>
              <li>Dashboard, Compare, Replay, Live</li>
              <li>Priority support</li>
            </ul>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="pbtn">Get Pro Access</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard"><button className="pbtn">Upgrade in App</button></Link>
            </SignedIn>
          </div>
          <div className="plan reveal r2">
            <div className="pnm">ENTERPRISE</div>
            <div className="pprice">—</div>
            <div className="pdesc2">Custom scale, compliance, and white-glove setup.</div>
            <div className="pdiv"></div>
            <ul className="pfts">
              <li>50,000 incident analyses / month</li>
              <li>Custom ingestion workflows</li>
              <li>Custom model selection (AWS Bedrock)</li>
              <li>SSO / SAML</li>
              <li>On-prem or VPC deployment</li>
              <li>SLA-backed uptime</li>
              <li>CloudWatch Live monitoring</li>
              <li>Dedicated success engineer</li>
            </ul>
            <button className="pbtn">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cstrip">
        <div>
          <div className="stag">Get Started</div>
          <h2>STOP DEBUGGING<br />IN THE <em>DARK.</em></h2>
          <p>Paste your first log right now — no credit card, no signup friction.</p>
        </div>
        <div className="cacts">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="btn-p">Analyze Logs Free →</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <button className="btn-p">Open Dashboard →</button>
            </Link>
          </SignedIn>
          <button className="btn-g">Book a Demo</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="ftop">
          <div className="fbrand">
            <div className="nav-logo" style={{ color: '#fff' }}><div className="nav-dot"></div>TRACEPILOT<span>.</span></div>
            <p className="fline">AI-powered incident intelligence that turns raw logs into actionable reports — in seconds, not hours.</p>
          </div>
          <div className="fcol"><h4>Product</h4><ul><li><a href="#">Analyze</a></li><li><a href="#">Dashboard</a></li><li><a href="#">Audit Trail</a></li><li><a href="#">Compare</a></li><li><a href="#">Live Monitor</a></li><li><a href="#">Replay</a></li></ul></div>
          <div className="fcol"><h4>Developers</h4><ul><li><a href="#">API Reference</a></li><li><a href="#">Webhook Docs</a></li><li><a href="#">Log Format Guide</a></li><li><a href="#">Changelog</a></li><li><a href="#">Status Page</a></li></ul></div>
          <div className="fcol"><h4>Company</h4><ul><li><a href="#">About</a></li><li><a href="#">Blog</a></li><li><a href="#">Security</a></li><li><a href="#">Privacy Policy</a></li><li><a href="#">Terms</a></li></ul></div>
        </div>
        <div className="fbot">
          <div className="fcopy">© 2026 TRACEPILOT INC. — ALL RIGHTS RESERVED</div>
          <div className="fstat"><div className="d"></div>ALL SYSTEMS OPERATIONAL</div>
        </div>
      </footer>
    </div>
  );
}
