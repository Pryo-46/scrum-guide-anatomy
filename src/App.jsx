import { useState, useMemo, useCallback, useRef } from "react";
import { MARKDOWN } from "./data";

// ── パーサー ──
const TAG_TYPES = ["公理", "定義", "ルール", "根拠", "許容", "実践例", "慣行"];
const PILLARS = ["T", "I", "A"];

function parseMarkdown(md) {
  const lines = md.split("\n");
  const sections = [];
  let curSec = null, curSub = null, curGrp = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith("## ")) {
      curSec = { title: ln.slice(3), subsections: [] };
      sections.push(curSec);
      curSub = null; curGrp = null;
    } else if (ln.startsWith("### ") && curSec) {
      curSub = { title: ln.slice(4), items: [], subgroups: [] };
      curSec.subsections.push(curSub);
      curGrp = null;
    } else if (ln.startsWith("#### ") && curSub) {
      curGrp = { title: ln.slice(5), items: [] };
      curSub.subgroups.push(curGrp);
    } else if (ln.startsWith("- #") && (curSub || curGrp)) {
      const raw = ln.slice(2);
      if (raw.startsWith("(prose)")) continue;
      const tags = [], pillars = [];
      for (const t of TAG_TYPES) if (raw.includes(`#${t}`)) tags.push(t);
      for (const p of PILLARS) if (raw.includes(`#${p} `) || raw.endsWith(`#${p}`)) pillars.push(p);
      let text = raw;
      for (const t of TAG_TYPES) text = text.replace(new RegExp(`#${t}\\s*`, "g"), "");
      for (const p of PILLARS) text = text.replace(new RegExp(`#${p}\\s*`, "g"), "");
      text = text.trim();
      let explanation = "";
      if (i + 1 < lines.length && lines[i + 1].startsWith("  ") && !lines[i + 1].startsWith("- ")) {
        explanation = lines[i + 1].trim();
        i++;
      }
      const item = { tags, pillars, text, explanation };
      (curGrp || curSub).items.push(item);
    }
  }
  return sections;
}

// ── 色定義 ──
const TAG_COLORS = {
  公理:   { bg: "#7C3AED", text: "#fff" },
  定義:   { bg: "#475569", text: "#fff" },
  ルール: { bg: "#1E40AF", text: "#fff" },
  根拠:   { bg: "#B91C1C", text: "#fff" },
  許容:   { bg: "#0F766E", text: "#fff" },
  実践例: { bg: "#DB2777", text: "#fff" },
  慣行:   { bg: "#A16207", text: "#fff" },
};
const PILLAR_STYLE = {
  T: { bg: "#DBEAFE", text: "#1E3A5F", border: "#60A5FA", label: "透明性" },
  I: { bg: "#D1FAE5", text: "#14532D", border: "#34D399", label: "検査" },
  A: { bg: "#FFEDD5", text: "#7C2D12", border: "#FB923C", label: "適応" },
};

const BADGE_W = 54;
const PILL_W = 26;

// ── 小コンポーネント ──
function TagBadge({ tag }) {
  const c = TAG_COLORS[tag];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: BADGE_W, padding: "2px 6px", borderRadius: "4px",
      fontSize: "11px", fontWeight: 600, lineHeight: "16px",
      backgroundColor: c.bg, color: c.text, textAlign: "center",
    }}>{tag}</span>
  );
}

function PillarBadge({ p }) {
  const c = PILLAR_STYLE[p];
  return (
    <span title={c.label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: PILL_W, height: PILL_W, borderRadius: "50%",
      fontSize: "12px", fontWeight: 700,
      backgroundColor: c.bg, color: c.text,
      border: `2px solid ${c.border}`,
    }}>{p}</span>
  );
}

function Chip({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: BADGE_W, padding: "4px 10px", borderRadius: "16px",
      border: active ? `1.5px solid ${color}` : "1.5px solid #CBD5E1",
      backgroundColor: active ? `${color}14` : "transparent",
      color: active ? color : "#64748B",
      fontSize: "12px", fontWeight: active ? 600 : 500,
      cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function PillarChip({ p, active, onClick }) {
  const c = PILLAR_STYLE[p];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "4px 10px", borderRadius: "16px",
      border: active ? `1.5px solid ${c.border}` : "1.5px solid #CBD5E1",
      backgroundColor: active ? c.bg : "transparent",
      color: active ? c.text : "#64748B",
      fontSize: "12px", fontWeight: active ? 600 : 500,
      cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        backgroundColor: active ? c.border : "#CBD5E1", flexShrink: 0,
      }}/>
      {p} {c.label}
    </button>
  );
}

function ItemCard({ item, q }) {
  const [open, setOpen] = useState(false);
  const hl = useCallback((txt) => {
    if (!q) return txt;
    const i = txt.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return txt;
    return <>{txt.slice(0, i)}<mark style={{ background: "#FDE68A", borderRadius: 2, padding: "0 1px" }}>{txt.slice(i, i + q.length)}</mark>{txt.slice(i + q.length)}</>;
  }, [q]);

  return (
    <div onClick={() => item.explanation && setOpen(!open)} style={{
      padding: "10px 14px", borderRadius: "6px",
      backgroundColor: "#fff", cursor: item.explanation ? "pointer" : "default",
      transition: "background .12s", border: "1px solid #F1F5F9",
    }}
      onMouseEnter={e => item.explanation && (e.currentTarget.style.backgroundColor = "#F8FAFC")}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0, alignItems: "center", flexWrap: "wrap", paddingTop: "1px" }}>
          {item.tags.map(t => <TagBadge key={t} tag={t}/>)}
          {item.pillars.map(p => <PillarBadge key={p} p={p}/>)}
        </div>
        <div style={{ flex: 1, fontSize: "13.5px", lineHeight: 1.7, color: "#1E293B", minWidth: 0 }}>
          {hl(item.text)}
        </div>
        {item.explanation && (
          <span style={{
            fontSize: "10px", color: "#94A3B8", flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .15s",
            userSelect: "none", paddingTop: "4px",
          }}>▼</span>
        )}
      </div>
      {open && item.explanation && (
        <div style={{
          marginTop: "8px", padding: "8px 12px", borderRadius: "4px",
          backgroundColor: "#F1F5F9",
          fontSize: "12.5px", lineHeight: 1.65, color: "#475569",
        }}>{hl(item.explanation)}</div>
      )}
    </div>
  );
}

// ── メイン ──
export default function App() {
  const data = useMemo(() => parseMarkdown(MARKDOWN), []);
  const [tagF, setTagF] = useState(new Set());
  const [pillarF, setPillarF] = useState(new Set());
  const [q, setQ] = useState("");
  const [tocOpen, setTocOpen] = useState(false);
  const secRefs = useRef([]);
  const subRefs = useRef({});

  const toggle = (setter, val) => {
    setter(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  };
  const clear = () => { setTagF(new Set()); setPillarF(new Set()); setQ(""); };
  const hasFilter = tagF.size > 0 || pillarF.size > 0 || q;

  const match = useCallback(item => {
    if (tagF.size > 0 && !item.tags.some(t => tagF.has(t))) return false;
    if (pillarF.size > 0 && !item.pillars.some(p => pillarF.has(p))) return false;
    if (q) {
      const lq = q.toLowerCase();
      if (!item.text.toLowerCase().includes(lq) && !item.explanation.toLowerCase().includes(lq)) return false;
    }
    return true;
  }, [tagF, pillarF, q]);

  const stats = useMemo(() => {
    let total = 0; const pc = { T: 0, I: 0, A: 0 };
    data.forEach(s => s.subsections.forEach(sub => {
      const check = items => items.forEach(it => {
        if (match(it)) { total++; it.pillars.forEach(p => pc[p]++); }
      });
      check(sub.items);
      sub.subgroups.forEach(g => check(g.items));
    }));
    return { total, ...pc };
  }, [data, match]);

  const scrollTo = (secIdx, subIdx) => {
    setTocOpen(false);
    const el = subIdx != null ? subRefs.current[`${secIdx}-${subIdx}`] : secRefs.current[secIdx];
    if (el) {
      const headerH = document.querySelector('[data-sticky-header]')?.offsetHeight || 0;
      const top = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const PillarDiagram = () => (
    <div style={{
      padding: "16px", borderRadius: "8px", margin: "0 0 16px",
      backgroundColor: "#FAFBFC", border: "1px solid #F1F5F9",
    }}>
      <p style={{ margin: "0 0 12px", fontSize: "13px", lineHeight: 1.6, color: "#475569" }}>
        スクラムは<strong>経験主義</strong>と<strong>リーン思考</strong>に基づく。経験主義を支える3つの柱には厳密な依存関係がある。
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "8px 0" }}>
        {PILLARS.map((p, i) => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
              <span style={{
                width: 40, height: 40, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center",
                backgroundColor: PILLAR_STYLE[p].bg, color: PILLAR_STYLE[p].text,
                border: `2px solid ${PILLAR_STYLE[p].border}`,
                fontWeight: 700, fontSize: "15px",
              }}>{p}</span>
              <span style={{ fontSize: "11px", color: PILLAR_STYLE[p].text, fontWeight: 600 }}>{PILLAR_STYLE[p].label}</span>
            </div>
            {i < 2 && <span style={{ fontSize: "18px", color: "#94A3B8" }}>→</span>}
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "11.5px", color: "#94A3B8", lineHeight: 1.6, textAlign: "center" }}>
        見えないものは検査できない。検査は適応につなげてはじめて意味を持つ。適応には権限が前提となる。
      </p>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',-apple-system,sans-serif", maxWidth: 820, margin: "0 auto", color: "#1E293B", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── 固定ヘッダー ── */}
      <div data-sticky-header style={{
        position: "sticky", top: 0, zIndex: 100,
        backgroundColor: "rgba(250,251,252,0.97)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid #E2E8F0",
        padding: "10px 16px 8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            スクラムガイド Anatomy
          </h1>
          <button onClick={() => setTocOpen(v => !v)} style={{
            padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
            border: "1px solid #CBD5E1", cursor: "pointer",
            backgroundColor: tocOpen ? "#EFF6FF" : "transparent",
            color: tocOpen ? "#2563EB" : "#64748B",
            transition: "all .12s",
          }}>目次 {tocOpen ? "▲" : "▼"}</button>
        </div>

        {tocOpen && (
          <div style={{
            padding: "8px 12px 12px", marginBottom: "8px", borderRadius: "6px",
            backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0",
            maxHeight: "50vh", overflowY: "auto",
          }}>
            {data.map((sec, si) => (
              <div key={si} style={{ marginBottom: si < data.length - 1 ? "6px" : 0 }}>
                <div onClick={() => scrollTo(si)} style={{
                  fontSize: "13px", fontWeight: 600, color: "#1E293B",
                  cursor: "pointer", padding: "3px 4px", borderRadius: "4px",
                }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#EFF6FF"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >{sec.title}</div>
                {sec.subsections.map((sub, sbi) => (
                  <div key={sbi} onClick={() => scrollTo(si, sbi)} style={{
                    fontSize: "12px", color: "#64748B",
                    cursor: "pointer", padding: "2px 4px 2px 20px", borderRadius: "4px",
                  }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#EFF6FF"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >{sub.title}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ position: "relative", marginBottom: "8px" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="キーワードで検索..."
            style={{
              width: "100%", padding: "7px 10px 7px 30px", borderRadius: "6px",
              border: "1.5px solid #CBD5E1", fontSize: "13px",
              backgroundColor: "#F8FAFC", color: "#1E293B",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "#60A5FA"}
            onBlur={e => e.target.style.borderColor = "#CBD5E1"}
          />
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#94A3B8", pointerEvents: "none" }}>🔍</span>
        </div>

        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "6px" }}>
          {TAG_TYPES.map(t => <Chip key={t} label={t} active={tagF.has(t)} onClick={() => toggle(setTagF, t)} color={TAG_COLORS[t].bg}/>)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          {PILLARS.map(p => <PillarChip key={p} p={p} active={pillarF.has(p)} onClick={() => toggle(setPillarF, p)}/>)}
          {hasFilter && (
            <button onClick={clear} style={{
              padding: "3px 8px", border: "none", borderRadius: "12px",
              backgroundColor: "transparent", color: "#94A3B8", fontSize: "11px", cursor: "pointer",
            }}>× クリア</button>
          )}
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap" }}>
            {stats.total}件 — T:{stats.T} I:{stats.I} A:{stats.A}
          </span>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div style={{ padding: "12px 16px 24px", flex: 1 }}>
        {data.map((sec, si) => {
          const anyVisible = si === 0 || sec.subsections.some(sub =>
            sub.items.some(match) || sub.subgroups.some(g => g.items.some(match))
          );
          if (!anyVisible && hasFilter) return null;

          return (
            <div key={si} ref={el => secRefs.current[si] = el} style={{ marginTop: si === 0 ? 0 : "28px" }}>
              <h2 style={{
                fontSize: "15px", fontWeight: 700, margin: "0 0 10px",
                paddingBottom: "6px", borderBottom: "2px solid #E2E8F0", color: "#0F172A",
              }}>{sec.title}</h2>

              {si === 0 && !hasFilter && <PillarDiagram/>}

              {sec.subsections.map((sub, sbi) => {
                const vis = sub.items.filter(match);
                const visG = sub.subgroups.map(g => ({ ...g, items: g.items.filter(match) })).filter(g => g.items.length);
                if (si > 0 && vis.length === 0 && visG.length === 0 && hasFilter) return null;
                if (si === 0 && hasFilter) return null;

                return (
                  <div key={sbi} ref={el => subRefs.current[`${si}-${sbi}`] = el} style={{ marginBottom: "18px" }}>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>
                      {sub.title}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      {vis.map((it, i) => <ItemCard key={i} item={it} q={q}/>)}
                    </div>
                    {visG.map((g, gi) => (
                      <div key={gi} style={{ marginTop: "10px" }}>
                        <h4 style={{ fontSize: "12.5px", fontWeight: 600, color: "#94A3B8", margin: "0 0 4px", paddingLeft: "4px" }}>
                          {g.title}
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {g.items.map((it, i) => <ItemCard key={i} item={it} q={q}/>)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── フッター（ライセンス表示） ── */}
      <footer style={{
        padding: "20px 16px", borderTop: "1px solid #E2E8F0",
        fontSize: "11.5px", lineHeight: 1.7, color: "#94A3B8",
      }}>
        <p style={{ margin: "0 0 6px" }}>
          本サイトは、Ken Schwaber & Jeff Sutherland 著{" "}
          <a href="https://scrumguides.org/" target="_blank" rel="noopener noreferrer" style={{ color: "#64748B" }}>
            スクラムガイド 2020
          </a>{" "}
          に注釈・分類を加えた派生物です。
          原著は{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ja" target="_blank" rel="noopener noreferrer" style={{ color: "#64748B" }}>
            CC BY-SA 4.0
          </a>{" "}
          で公開されています。
        </p>
        <p style={{ margin: 0 }}>
          本サイトも同ライセンス（CC BY-SA 4.0）の下で公開されています。
        </p>
      </footer>
    </div>
  );
}
