import React, { useState, useEffect } from "react";
import StockSearch from "./StockSearch";
import { pricesAPI, tradesAPI } from "../../api";
import { fmt, fmtN, pct } from "../../utils/helpers";

function Modal({ show = true, onClose, title, children, wide = false }) {
  if (!show) return null;
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className={`modal ${wide ? "modal-lg" : ""}`} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div className="modal-ttl">{title}</div>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function FInput({ label, ...props }) {
  return (
    <div className="fg">
      {label && <label className="flabel">{label}</label>}
      <input className="finput" {...props} />
    </div>
  );
}

function FSelect({ label, value, onChange, options }) {
  return (
    <div className="fg">
      {label && <label className="flabel">{label}</label>}
      <select className="finput" value={value} onChange={onChange}>
        {options.map(option => (
          <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
        ))}
      </select>
    </div>
  );
}

function cleanErrorMessage(msg) {
  if (!msg) return "An error occurred. Please try again.";
  // Strip raw serverless error IDs
  let clean = String(msg)
    .replace(/FUNCTION_INVOCATION_FAILED\s+\S+/gi, "server error")
    .replace(/bom1::[a-z0-9-]+/gi, "")
    .trim();
  // Make common errors friendlier
  if (/rate.?limit|429/i.test(clean)) return "Yahoo Finance is rate-limiting. Please wait 30 s and retry.";
  if (/timeout|timed out/i.test(clean)) return "Request timed out. Please retry.";
  if (/network|ENOTFOUND|ECONNREFUSED/i.test(clean)) return "Network error. Check your connection and retry.";
  if (/server error/i.test(clean)) return "A server error occurred. Please retry in a moment.";
  return clean || "An error occurred. Please try again.";
}

const BLANK = {
  symbol:"", name:"", sector:"", entry:"", sl:"", target:"",
  qty:"", status:"WAITING", entryType:"BREAKOUT", confidence:"MEDIUM",
  ema200:"", ema50:"", rsi:"",
};

export default function AddTradeModal({
  show = true, onClose, onSave, onSaved,
  editTrade = null, initialTrade = null, capital = 100000,
}) {
  const [form,      setForm]      = useState(BLANK);
  const [priceInfo, setPriceInfo] = useState(null);
  const [fetching,  setFetching]  = useState(false);
  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [lastPriceSymbol, setLastPriceSymbol] = useState("");

  useEffect(() => {
    if (editTrade || initialTrade) {
      const src = editTrade || initialTrade;
      setForm({
        ...BLANK, ...src,
        entry:  String(src.entry  || ""),
        sl:     String(src.sl     || ""),
        target: String(src.target || ""),
        qty:    String(src.qty    || ""),
        ema200: String(src.ema200 || ""),
        ema50:  String(src.ema50  || ""),
        rsi:    String(src.rsi    || ""),
      });
      setPriceInfo(src.currentPrice || src.entry
        ? { price: src.currentPrice || Number(src.entry), symbol: src.symbol }
        : null);
      setError(null);
      setLastPriceSymbol(src.symbol || "");
    } else {
      setForm(BLANK);
      setPriceInfo(null);
      setError(null);
      setLastPriceSymbol("");
    }
  }, [editTrade, initialTrade, show]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleStockSelect = async (stock) => {
    setError(null);
    set("symbol",  stock.symbol);
    set("name",    stock.symbol.replace(".NS", "").toUpperCase());
    set("sector",  stock.sector || "");
    setLastPriceSymbol(stock.symbol);

    if (stock.price && stock.price > 0) {
      setPriceInfo(stock);
      set("entry", String(stock.price));
    } else {
      setFetching(true);
      try {
        const d = await pricesAPI.get([stock.symbol]);
        const q = d?.prices?.[stock.symbol];
        if (q?.price) {
          setPriceInfo(q);
          set("entry", String(q.price));
        } else {
          setError("Could not fetch live price. You can enter the price manually.");
        }
      } catch (e) {
        setError("Could not fetch live price. Enter the price manually and click Add Position.");
      } finally {
        setFetching(false);
      }
    }
  };

  const fetchPrice = async () => {
    const sym = form.symbol || (form.name ? `${form.name}.NS` : "");
    if (!sym) return;
    setLastPriceSymbol(sym);
    setFetching(true);
    setError(null);
    try {
      const d = await pricesAPI.get([sym]);
      const q = d?.prices?.[sym];
      if (q?.price) {
        setPriceInfo(q);
        if (!form.entry) set("entry", String(q.price));
      } else {
        setError(`No price found for ${sym}. Enter the price manually.`);
      }
    } catch (e) {
      setError("Price fetch failed. Enter the price manually.");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.name && !form.symbol) { setError("Please select a stock."); return; }
    if (!form.entry) { setError("Entry price is required."); return; }
    if (!form.sl)    { setError("Stop loss is required."); return; }
    if (!form.target){ setError("Target price is required."); return; }
    if (Number(form.entry) <= 0)  { setError("Entry price must be greater than zero."); return; }
    if (Number(form.sl)    <= 0)  { setError("Stop loss must be greater than zero."); return; }
    if (Number(form.target)<= 0)  { setError("Target must be greater than zero."); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        name:    (form.name || form.symbol || "").replace(".NS","").toUpperCase(),
        symbol:  form.symbol || `${form.name}.NS`,
        entry:   Number(form.entry),
        sl:      Number(form.sl),
        target:  Number(form.target),
        qty:     Number(form.qty) || Math.floor(capital / 3 / Number(form.entry || 1)),
        ema200:  Number(form.ema200) || 0,
        ema50:   Number(form.ema50)  || 0,
        rsi:     Number(form.rsi)    || 0,
        currentPrice: priceInfo?.price || Number(form.entry) || 0,
      };
      if (onSave) await onSave(payload, editTrade?._id);
      else if (editTrade?._id) await tradesAPI.update(editTrade._id, payload);
      else await tradesAPI.create(payload);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(cleanErrorMessage(e.message));
    } finally {
      setSaving(false);
    }
  };

  const entry  = Number(form.entry)  || 0;
  const sl     = Number(form.sl)     || 0;
  const target = Number(form.target) || 0;
  const risk   = entry - sl;
  const rr     = risk > 0 ? ((target - entry) / risk).toFixed(1) : "—";
  const expRet = entry > 0 ? pct(target, entry) : "—";
  const maxLoss= entry > 0 ? pct(sl, entry) : "—";
  const autoQty= entry > 0 ? Math.floor(capital / 3 / entry) : 0;
  const alloc  = entry > 0 ? fmt(Math.round(capital / 3)) : "—";
  const isUp   = priceInfo && priceInfo.changePct >= 0;

  return (
    <Modal show={show} onClose={onClose}
      title={editTrade ? `EDIT — ${editTrade.name || "TRADE"}` : "ADD NEW POSITION"} wide>

      {/* Stock Search */}
      <div className="fg">
        <label className="flabel">Search Stock (NSE)</label>
        <StockSearch
          onSelect={handleStockSelect}
          placeholder="Type stock name or symbol — e.g. Reliance, INFY…"
          disabled={!!editTrade}
        />
      </div>

      {/* Live price info bar */}
      {(priceInfo || fetching) && (
        <div style={{
          background:"rgba(255,153,0,0.06)", border:"1px solid var(--border)",
          padding:"8px 12px", marginBottom:12, fontSize:11,
          display:"flex", gap:20, flexWrap:"wrap", alignItems:"center",
          borderRadius:8,
        }}>
          {fetching ? (
            <span style={{ color:"var(--muted2)", display:"flex", alignItems:"center", gap:8 }}>
              <span className="spinner spinner-sm"/> Fetching live price…
            </span>
          ) : priceInfo && (
            <>
              <span>
                <span style={{ color:"var(--muted2)" }}>CMP: </span>
                <span className="fw7 col-green">{fmt(priceInfo.price)}</span>
              </span>
              {priceInfo.change !== undefined && (
                <span style={{ color: isUp ? "var(--green)" : "var(--red)", fontWeight:600 }}>
                  {isUp ? "▲" : "▼"} {Math.abs(fmtN(priceInfo.changePct))}%
                  ({isUp ? "+" : ""}₹{fmtN(priceInfo.change, 2)})
                </span>
              )}
              {priceInfo.high && (
                <span style={{ color:"var(--muted2)" }}>H:{fmt(priceInfo.high)} L:{fmt(priceInfo.low)}</span>
              )}
              {priceInfo.volume > 0 && (
                <span style={{ color:"var(--muted2)" }}>Vol:{(priceInfo.volume/1e5).toFixed(1)}L</span>
              )}
              {priceInfo.marketState && (
                <span style={{ color:"var(--text3)", fontSize:9 }}>{priceInfo.marketState}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Manual symbol + fetch */}
      {!editTrade && (
        <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"flex-end" }}>
          <div style={{ flex:1 }}>
            <FInput label="Symbol (manual override)" value={form.symbol}
              onChange={e => set("symbol", e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE.NS" />
          </div>
          <button className="btn btn-blue btn-sm" style={{ marginBottom:12 }}
            onClick={fetchPrice} disabled={fetching}>
            {fetching ? <span className="spinner spinner-sm"/> : "FETCH PRICE"}
          </button>
        </div>
      )}

      <div className="fgrid2">
        <FInput label="Display Name" value={form.name}
          onChange={e => set("name", e.target.value.toUpperCase())} placeholder="RELIANCE" />
        <FInput label="Sector" value={form.sector}
          onChange={e => set("sector", e.target.value)} placeholder="Energy" />
      </div>

      <div className="fgrid3">
        <FInput label="Entry Price (₹)" type="number" value={form.entry}
          onChange={e => set("entry", e.target.value)} placeholder="2850" />
        <FInput label="Stop Loss (₹)"  type="number" value={form.sl}
          onChange={e => set("sl", e.target.value)}    placeholder="2700" />
        <FInput label="Target Price (₹)" type="number" value={form.target}
          onChange={e => set("target", e.target.value)} placeholder="3150" />
      </div>

      <div className="fgrid3">
        <FInput label={`Qty (auto=${autoQty})`} type="number" value={form.qty}
          onChange={e => set("qty", e.target.value)} placeholder={String(autoQty)} />
        <FSelect label="Status" value={form.status} onChange={e => set("status", e.target.value)}
          options={["WAITING","ACTIVE","TARGET","SL","MANUAL_EXIT"]} />
        <FSelect label="Setup Type" value={form.entryType} onChange={e => set("entryType", e.target.value)}
          options={["BREAKOUT","EMA50_BOUNCE","EMA20_PULLBACK","RETEST","MONITOR"]} />
      </div>

      {/* Optional technicals */}
      <details style={{ marginBottom:12 }}>
        <summary style={{ fontSize:10, color:"var(--muted2)", cursor:"pointer", padding:"4px 0", letterSpacing:"0.06em", textTransform:"uppercase" }}>
          ▸ Technical Details (optional)
        </summary>
        <div className="fgrid3" style={{ marginTop:8 }}>
          <FInput label="200 EMA (₹)" type="number" value={form.ema200}
            onChange={e => set("ema200", e.target.value)} placeholder="auto" />
          <FInput label="50 EMA (₹)"  type="number" value={form.ema50}
            onChange={e => set("ema50",  e.target.value)} placeholder="auto" />
          <FInput label="RSI (14)"     type="number" value={form.rsi}
            onChange={e => set("rsi",    e.target.value)} placeholder="auto" />
        </div>
        <FSelect label="Confidence" value={form.confidence}
          onChange={e => set("confidence", e.target.value)}
          options={["HIGH","MEDIUM","LOW"]} />
      </details>

      {/* Trade preview */}
      {entry > 0 && sl > 0 && target > 0 && (
        <div className="fprev">
          <span>R:R <span className="fw6 col-green">{rr}:1</span></span>
          <span>Expected <span className="fw6 col-green">+{expRet}%</span></span>
          <span>Max Loss <span className="fw6 col-red">{maxLoss}%</span></span>
          <span>Alloc/3 <span className="fw6 col-amber">{alloc}</span></span>
          {rr !== "—" && Number(rr) < 2 && (
            <span style={{ color:"var(--red)" }}>⚠ R:R below 2:1 — consider adjusting</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="form-error">
          <div>
            <strong>Error</strong>
            <span>{error}</span>
          </div>
          {lastPriceSymbol && (
            <button className="btn btn-sm btn-red" onClick={fetchPrice} disabled={fetching}>
              RETRY PRICE
            </button>
          )}
        </div>
      )}

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn btn-green" onClick={handleSave}
          disabled={saving || !form.entry || !form.sl || !form.target}>
          {saving
            ? <><span className="spinner spinner-sm"/> Saving…</>
            : editTrade ? "UPDATE POSITION" : "ADD POSITION"}
        </button>
      </div>
    </Modal>
  );
}
