import { useState, useRef, useEffect } from "react";
import JOBS from "./mockJobs.json";

const SWIPE_THRESHOLD = 100;

export default function JobSwipePage() {
  const [cards, setCards] = useState(JOBS);
  const [current, setCurrent] = useState(0);
  const [swipedJobs, setSwipedJobs] = useState([]);
  const [dragState, setDragState] = useState({ x: 0, y: 0, dragging: false });
  const [lastAction, setLastAction] = useState(null);
  const [showMatch, setShowMatch] = useState(false);
  const [expandedCard, setExpandedCard] = useState(false);
  const dragRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });

  const job = cards[current];
  const nextJob = cards[current + 1];

  const triggerSwipe = (direction) => {
    const action = direction === "right" ? "applied" : "skipped";
    setLastAction({ action, job });
    if (direction === "right") setShowMatch(true);

    setSwipedJobs((prev) => [...prev, { ...job, action }]);
    setCurrent((c) => c + 1);
    setDragState({ x: 0, y: 0, dragging: false });
    setExpandedCard(false);

    if (direction === "right") {
      setTimeout(() => setShowMatch(false), 1800);
    }
  };

  const onPointerDown = (e) => {
    if (expandedCard) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragState({ x: 0, y: 0, dragging: true });
    dragRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragState.dragging) return;
    setDragState((d) => ({
      ...d,
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    }));
  };

  const onPointerUp = () => {
    if (!dragState.dragging) return;
    if (dragState.x > SWIPE_THRESHOLD) triggerSwipe("right");
    else if (dragState.x < -SWIPE_THRESHOLD) triggerSwipe("left");
    else setDragState({ x: 0, y: 0, dragging: false });
  };

  const rotation = dragState.x * 0.08;
  const opacity = Math.max(0, 1 - Math.abs(dragState.x) / 400);
  const likeOpacity = Math.min(1, Math.max(0, dragState.x / 80));
  const nopeOpacity = Math.min(1, Math.max(0, -dragState.x / 80));

  const done = current >= cards.length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0a1e 0%, #1a0f3a 40%, #2d1060 100%)",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0px; }
        .card-shine { position: relative; overflow: hidden; }
        .card-shine::before {
          content: '';
          position: absolute;
          top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }
        .pill {
          display: inline-flex; align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.75);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .action-btn {
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          border: none; cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          flex-shrink: 0;
        }
        .action-btn:hover { transform: scale(1.08); }
        .action-btn:active { transform: scale(0.95); }
        .skip-btn {
          width: 60px; height: 60px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,100,100,0.4);
          box-shadow: 0 4px 24px rgba(255,80,80,0.12);
        }
        .apply-btn {
          width: 76px; height: 76px;
          background: linear-gradient(135deg, #7c3aed, #9d46f5);
          box-shadow: 0 8px 32px rgba(124,58,237,0.5);
        }
        .super-btn {
          width: 56px; height: 56px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(250,220,80,0.4);
          box-shadow: 0 4px 24px rgba(250,200,0,0.1);
        }
        .swipe-stamp {
          position: absolute;
          top: 28px;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 32px;
          letter-spacing: 2px;
          padding: 6px 16px;
          border-radius: 8px;
          border: 3px solid;
          text-transform: uppercase;
          pointer-events: none;
          transform: rotate(-15deg);
          z-index: 10;
        }
        .match-toast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          animation: matchPop 1.8s ease forwards;
          z-index: 100;
          text-align: center;
        }
        @keyframes matchPop {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        }
        .progress-bar {
          height: 3px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #c084fc);
          transition: width 0.5s cubic-bezier(.4,0,.2,1);
          border-radius: 2px;
        }
        .expand-toggle {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.5); font-size: 13px;
          display: flex; align-items: center; gap: 4px;
          transition: color 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .expand-toggle:hover { color: rgba(255,255,255,0.85); }
        .qual-item {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 13px; color: rgba(255,255,255,0.65);
          line-height: 1.5;
          padding: 4px 0;
        }
        .undo-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .undo-btn:hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.85);
        }
      `}</style>

      {/* Top nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px 0",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "22px" }}>💼</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px", color: "#fff", letterSpacing: "-0.3px" }}>JobSwipe</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>Applied</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#c084fc", fontFamily: "'Syne', sans-serif" }}>
              {swipedJobs.filter(j => j.action === "applied").length}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>Remaining</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "'Syne', sans-serif" }}>
              {Math.max(0, cards.length - current)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: "14px 24px 0" }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(current / cards.length) * 100}%` }} />
        </div>
      </div>

      {/* Filters row */}
      <div style={{
        display: "flex", gap: "8px", padding: "14px 24px",
        overflowX: "auto", flexShrink: 0,
      }}>
        {["All Roles", "Internships", "Full-time", "SG Only", "High Match ✦"].map((f, i) => (
          <div key={f} className="pill" style={i === 0 ? { background: "rgba(124,58,237,0.35)", borderColor: "rgba(192,132,252,0.5)", color: "#e9d5ff" } : {}}>
            {f}
          </div>
        ))}
      </div>

      {/* Card stack */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 20px", position: "relative",
        minHeight: 0,
      }}>

        {done ? (
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: "56px", marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 800, marginBottom: 8 }}>You're all caught up!</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", marginBottom: 32 }}>
              Applied to {swipedJobs.filter(j => j.action === "applied").length} roles today
            </div>
            <button
              onClick={() => { setCurrent(0); setSwipedJobs([]); setLastAction(null); setCards(JOBS); }}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #9d46f5)",
                border: "none", color: "#fff", fontWeight: 600, fontSize: "15px",
                padding: "14px 32px", borderRadius: "50px", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 8px 32px rgba(124,58,237,0.45)",
              }}
            >
              Start Over
            </button>
          </div>
        ) : (
          <>
            {/* Background card peek */}
            {nextJob && (
              <div style={{
                position: "absolute",
                width: "min(420px, 94vw)",
                transform: "scale(0.93) translateY(18px)",
                zIndex: 0,
                borderRadius: 24,
                overflow: "hidden",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                height: expandedCard ? 420 : 340,
              }} />
            )}

            {/* Main card */}
            <div
              ref={dragRef}
              className="card-shine"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{
                position: "relative",
                zIndex: 2,
                width: "min(420px, 94vw)",
                borderRadius: 24,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(20px)",
                cursor: dragState.dragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                overflow: expandedCard ? "auto" : "hidden",
                maxHeight: expandedCard ? "62vh" : "auto",
                transition: dragState.dragging ? "none" : "transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s",
                transform: dragState.dragging
                  ? `translate(${dragState.x}px, ${dragState.y * 0.3}px) rotate(${rotation}deg)`
                  : "none",
                boxShadow: dragState.dragging
                  ? `0 24px 60px rgba(0,0,0,0.4)`
                  : "0 8px 40px rgba(0,0,0,0.35)",
              }}
            >
              {/* LIKE/NOPE stamp */}
              {likeOpacity > 0.05 && (
                <div className="swipe-stamp" style={{ left: 20, color: "#4ade80", borderColor: "#4ade80", opacity: likeOpacity }}>
                  Apply ✓
                </div>
              )}
              {nopeOpacity > 0.05 && (
                <div className="swipe-stamp" style={{ right: 20, color: "#f87171", borderColor: "#f87171", opacity: nopeOpacity, transform: "rotate(15deg)" }}>
                  Skip ✕
                </div>
              )}

              {/* Card header */}
              <div style={{ padding: "22px 22px 16px", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {job.logo}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{job.company}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", lineHeight: 1.25, marginTop: 2 }}>
                        {job.role}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: job.match >= 90 ? "rgba(74,222,128,0.15)" : job.match >= 85 ? "rgba(192,132,252,0.2)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${job.match >= 90 ? "rgba(74,222,128,0.3)" : job.match >= 85 ? "rgba(192,132,252,0.35)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 10, padding: "4px 10px", textAlign: "center", flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: job.match >= 90 ? "#4ade80" : job.match >= 85 ? "#c084fc" : "#fff" }}>
                      {job.match}%
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600 }}>match</div>
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  <div className="pill">{job.type}</div>
                  <div className="pill">📍 {job.location}</div>
                  <div className="pill">💰 {job.salary}</div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 14 }}>
                  {job.description}
                </p>

                {/* Tech tags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {job.tags.map(tag => (
                    <div key={tag} style={{
                      background: "rgba(124,58,237,0.2)",
                      border: "1px solid rgba(192,132,252,0.25)",
                      borderRadius: 6, padding: "3px 9px",
                      fontSize: 11, fontWeight: 600, color: "#c084fc",
                      letterSpacing: "0.3px",
                    }}>
                      {tag}
                    </div>
                  ))}
                </div>

                {/* Expand toggle */}
                <button
                  className="expand-toggle"
                  onClick={(e) => { e.stopPropagation(); setExpandedCard(v => !v); }}
                >
                  {expandedCard ? "▲ Less details" : "▼ Minimum qualifications"}
                </button>
              </div>

              {/* Expanded qualifications */}
              {expandedCard && (
                <div style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  padding: "16px 22px 20px",
                  position: "relative", zIndex: 1,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                    Minimum Qualifications
                  </div>
                  {job.qualifications.map((q, i) => (
                    <div key={i} className="qual-item">
                      <span style={{ color: "#7c3aed", marginTop: 2, flexShrink: 0 }}>●</span>
                      {q}
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      🗓 Deadline: <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{job.deadline}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      👥 <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{job.headcount} openings</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {!done && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 20, padding: "16px 24px 28px", flexShrink: 0,
        }}>
          <button className="action-btn skip-btn" onClick={() => triggerSwipe("left")} aria-label="Skip">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button className="action-btn super-btn" onClick={() => {}} aria-label="Save for later">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>

          <button className="action-btn apply-btn" onClick={() => triggerSwipe("right")} aria-label="Apply">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button className="action-btn super-btn" style={{ border: "1.5px solid rgba(100,180,255,0.3)" }} onClick={() => {}} aria-label="Share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>

          {lastAction && swipedJobs.length > 0 && (
            <button
              className="undo-btn"
              onClick={() => {
                setCurrent(c => c - 1);
                setSwipedJobs(prev => prev.slice(0, -1));
                setLastAction(null);
              }}
            >
              ↩ Undo
            </button>
          )}
        </div>
      )}

      {/* Bottom hint */}
      {!done && current === 0 && (
        <div style={{
          textAlign: "center", paddingBottom: 16,
          fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.3px",
        }}>
          Drag the card or use the buttons below
        </div>
      )}

      {/* Match toast */}
      {showMatch && (
        <div className="match-toast">
          <div style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.9), rgba(157,70,245,0.9))",
            backdropFilter: "blur(20px)",
            borderRadius: 20, padding: "24px 40px",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 20px 60px rgba(124,58,237,0.5)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 4 }}>
              Application Sent!
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
              Applied to <strong>{lastAction?.job?.company}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}