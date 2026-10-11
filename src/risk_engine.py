"""
Unified AI/NLP Risk Engine & Portfolio Intelligence (src/risk_engine.py)
---------------------------------------------------------------------------------
Features:
- Multi-Source Ingestion: Financial News & Social Media (Twitter/X)
- AI/NLP Analysis: Sentiment (-1.0 to +1.0), Event Classification, Impact Score (1-10), Entity Tagging
- Module A: Tactical High-Frequency Index Rebalancer (Mock S&P 100 Portfolio)
- Module B: Strategic Event-Driven Wholesale Banking Portfolio Stress Tester ($1.25B Portfolio)
- Embedded JSON REST API Server
---------------------------------------------------------------------------------
"""

import sys
import os
import io
import json
import math
import re
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Ensure Windows console handles UTF-8 / emojis without crashing on cp1252
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# --- FINANCIAL NLP LEXICONS & EVENT PATTERNS (FinBERT & Loughran-McDonald aligned) ---
FINANCIAL_POSITIVE_TERMS = {
    "surge": 0.8, "surges": 0.8, "rally": 0.7, "rallies": 0.7, "outperform": 0.85,
    "breakthrough": 0.9, "beat": 0.75, "beats": 0.75, "record": 0.7, "growth": 0.6,
    "soar": 0.85, "soars": 0.85, "upgrade": 0.75, "upgrades": 0.75, "strong": 0.5,
    "acquisition": 0.65, "clearance": 0.7, "approval": 0.8, "expansion": 0.65,
    "profit": 0.7, "lucrative": 0.75, "moonshot": 0.9, "accumulate": 0.6, "bullish": 0.8,
    "unprecedented": 0.5, "exceed": 0.7, "exceeds": 0.7, "windfall": 0.85, "robust": 0.6
}

FINANCIAL_NEGATIVE_TERMS = {
    "plunge": -0.85, "plunges": -0.85, "crash": -0.95, "crashes": -0.95, "slump": -0.75,
    "default": -0.95, "defaults": -0.95, "insolvency": -0.95, "bankrupt": -0.95, "collapse": -0.9,
    "miss": -0.7, "misses": -0.7, "downgrade": -0.8, "antitrust": -0.85, "investigation": -0.75,
    "sanction": -0.8, "sanctions": -0.8, "blockade": -0.9, "inflation": -0.6, "hawkish": -0.65,
    "headwind": -0.6, "subpoena": -0.75, "lawsuit": -0.7, "restructure": -0.6, "layoff": -0.65,
    "deficit": -0.6, "turmoil": -0.8, "contagion": -0.9, "crisis": -0.85, "liquidity": -0.5
}

EVENT_KEYWORDS = {
    "Geopolitical": ["war", "military", "blockade", "sanction", "geopolitical", "strait", "naval", "tariff", "missile", "treaty"],
    "Macroeconomic": ["federal reserve", "central bank", "inflation", "cpi", "pce", "interest rate", "treasury", "yield", "gdp", "hawkish", "rate hike", "recession"],
    "Credit Event": ["default", "syndication", "distressed", "insolvency", "downgrade", "covenant", "restructuring", "credit facility", "debt ceiling", "liquidity crunch", "non-performing"],
    "Merger/Acquisition": ["merger", "acquisition", "acquire", "buyout", "takeover", "merges", "deal", "spinoff", "joint venture", "consolidation"],
    "Product Launch": ["launch", "unveil", "reveals", "next-gen", "chip", "platform", "ai model", "patent", "breakthrough", "announces", "rollout"],
    "Regulatory Action": ["antitrust", "investigation", "doj", "sec", "compliance", "regulatory", "fine", "subpoena", "ruling", "clearance"],
    "Earnings & Guidance": ["earnings", "revenue", "profit", "quarterly", "margin", "guidance", "eps", "deliveries", "miss", "beat", "q1", "q2", "q3", "q4"]
}

TICKER_MAP = {
    "AAPL": ["apple", "aapl", "iphone", "tim cook"],
    "MSFT": ["microsoft", "msft", "azure", "windows", "satya nadella"],
    "NVDA": ["nvidia", "nvda", "jensen", "gpu", "blackwell", "cuda"],
    "AMZN": ["amazon", "amzn", "aws", "bezos"],
    "GOOGL": ["google", "alphabet", "googl", "goog", "gemini", "search"],
    "META": ["meta", "facebook", "zuckerberg", "instagram"],
    "TSLA": ["tesla", "tsla", "elon musk", "ev deliveries", "cybertruck"],
    "JPM": ["jpmorgan", "jpm", "jamie dimon", "chase bank"],
    "V": ["visa", "payments network"],
    "XOM": ["exxon", "xom", "mobil", "crude oil", "brent"]
}

def load_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "..", "data", "synthetic_data.json"),
        os.path.join(base_dir, "synthetic_data.json"),
        os.path.join(base_dir, "data", "synthetic_data.json"),
        os.path.join(os.getcwd(), "data", "synthetic_data.json"),
        os.path.join(os.getcwd(), "synthetic_data.json")
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("Could not locate synthetic_data.json in data/ or root directory.")


class NLPRiskEngine:
    """Core NLP Engine analyzing unstructured text from multiple sources into structured signals."""
    
    def __init__(self):
        self.history = []

    def extract_entity(self, text: str):
        text_lower = text.lower()
        for ticker, aliases in TICKER_MAP.items():
            for alias in aliases:
                if re.search(r'\b' + re.escape(alias) + r'\b', text_lower):
                    return ticker
        if any(w in text_lower for w in ["crude", "oil", "strait", "naval", "war"]):
            return "GLOBAL_COMMODITIES"
        if any(w in text_lower for w in ["treasury", "federal reserve", "yield", "inflation"]):
            return "GLOBAL_MACRO"
        return "GENERAL_MARKET"

    def calculate_sentiment(self, text: str):
        words = re.findall(r'\b[a-zA-Z-]+\b', text.lower())
        if not words:
            return 0.0

        pos_score = 0.0
        neg_score = 0.0

        for i, word in enumerate(words):
            prev_window = words[max(0, i-2):i]
            negate = any(nw in prev_window for nw in ["not", "no", "never", "without", "hardly", "barely"])

            if word in FINANCIAL_POSITIVE_TERMS:
                val = FINANCIAL_POSITIVE_TERMS[word]
                if negate:
                    neg_score += val * 0.8
                else:
                    pos_score += val
            elif word in FINANCIAL_NEGATIVE_TERMS:
                val = abs(FINANCIAL_NEGATIVE_TERMS[word])
                if negate:
                    pos_score += val * 0.6
                else:
                    neg_score += val

        total = pos_score + neg_score
        if total == 0:
            return 0.0
        
        raw_sentiment = (pos_score - neg_score) / (total + 1.2)
        sentiment = max(-1.0, min(1.0, round(raw_sentiment * 1.5, 2)))
        return sentiment

    def classify_event(self, text: str):
        text_lower = text.lower()
        event_scores = {}
        for event_type, keywords in EVENT_KEYWORDS.items():
            count = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text_lower))
            if count > 0:
                event_scores[event_type] = count
        
        if event_scores:
            return max(event_scores.items(), key=lambda x: x[1])[0]
        return "Macroeconomic"

    def calculate_impact_score(self, text: str, sentiment: float, event_type: str):
        base_severity = {
            "Geopolitical": 7.5,
            "Credit Event": 7.8,
            "Macroeconomic": 6.8,
            "Regulatory Action": 6.0,
            "Earnings & Guidance": 5.2,
            "Product Launch": 5.0,
            "Merger/Acquisition": 5.8
        }.get(event_type, 4.5)

        sentiment_amplifier = abs(sentiment) * 2.2
        text_lower = text.lower()
        boost = 0.0
        urgent_keywords = ["default", "emergency", "crisis", "antitrust", "blockade", "spike", "multi-billion", "halt"]
        for kw in urgent_keywords:
            if kw in text_lower:
                boost += 0.6

        raw_impact = base_severity + sentiment_amplifier + boost
        return round(max(1.0, min(10.0, raw_impact)), 1)

    def analyze(self, text: str, source: str = "Financial News Feed"):
        entity = self.extract_entity(text)
        sentiment = self.calculate_sentiment(text)
        event_type = self.classify_event(text)
        impact = self.calculate_impact_score(text, sentiment, event_type)

        signal = {
            "signal_id": f"SIG-{int(time.time()*1000)%1000000:06d}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "source": source,
            "source_type": "Social Media (Twitter/X)" if ("tweet" in source.lower() or "x" in source.lower() or "$" in text) else "Financial News",
            "entity": entity,
            "raw_text": text,
            "sentiment_score": sentiment,
            "sentiment_label": "Positive" if sentiment > 0.15 else ("Negative" if sentiment < -0.15 else "Neutral"),
            "event_classification": event_type,
            "impact_score": impact,
            "high_risk_trigger": impact >= 7.0
        }
        self.history.append(signal)
        return signal


class TacticalIndexRebalancer:
    """Module A: Tactical High-Frequency Index Rebalancer."""

    def __init__(self, stock_universe):
        self.universe = {s["ticker"]: dict(s) for s in stock_universe}
        self.current_weights = {s["ticker"]: s["base_weight"] for s in stock_universe}
        self.rebalance_history = []
        self.sentiment_buffer = {s["ticker"]: [] for s in stock_universe}

    def process_signal(self, signal):
        ticker = signal.get("entity")
        if ticker in self.current_weights:
            sentiment = signal.get("sentiment_score", 0.0)
            self.sentiment_buffer[ticker].append(sentiment)
            return self.rebalance()
        return None

    def rebalance(self):
        new_weights = {}
        adjustments = {}

        for ticker, stock in self.universe.items():
            base_wt = stock["base_weight"]
            sentiments = self.sentiment_buffer[ticker]
            recent_sentiment = sentiments[-1] if sentiments else 0.0

            delta = recent_sentiment * 0.40 * base_wt
            raw_wt = base_wt + delta
            new_weights[ticker] = max(0.02, min(0.25, raw_wt))

        total_w = sum(new_weights.values())
        normalized_weights = {t: round(w / total_w, 4) for t, w in new_weights.items()}

        for t in self.universe:
            old_w = self.current_weights[t]
            new_w = normalized_weights[t]
            adjustments[t] = {
                "old_weight": old_w,
                "new_weight": new_w,
                "delta": round(new_w - old_w, 4),
                "action": "OVERWEIGHT (BUY)" if new_w > old_w + 0.005 else ("UNDERWEIGHT (SELL)" if new_w < old_w - 0.005 else "HOLD")
            }

        self.current_weights = normalized_weights
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "weights": normalized_weights,
            "adjustments": adjustments
        }
        self.rebalance_history.append(record)
        return record


class WholesaleStressTester:
    """Module B: Strategic Wholesale Banking Portfolio Stress Tester ($1.25B Portfolio)."""

    def __init__(self, portfolio):
        self.portfolio = portfolio
        self.total_initial_aum = sum(a["par_value_usd"] for a in portfolio)

    def run_stress_test(self, event_type: str, impact_score: float, custom_shocks=None):
        severity_ratio = impact_score / 10.0

        if custom_shocks:
            shocks = custom_shocks
        elif event_type == "Geopolitical":
            shocks = {
                "equity_drop_pct": 0.16 * severity_ratio,
                "credit_spread_widening_bps": 190 * severity_ratio,
                "interest_rate_shift_bps": 40 * severity_ratio,
                "loan_default_rate_pct": 0.035 * severity_ratio,
                "derivative_mtm_haircut_pct": 0.12 * severity_ratio
            }
        elif event_type == "Macroeconomic":
            shocks = {
                "equity_drop_pct": 0.11 * severity_ratio,
                "credit_spread_widening_bps": 120 * severity_ratio,
                "interest_rate_shift_bps": 225 * severity_ratio,
                "loan_default_rate_pct": 0.028 * severity_ratio,
                "derivative_mtm_haircut_pct": 0.08 * severity_ratio
            }
        elif event_type == "Credit Event":
            shocks = {
                "equity_drop_pct": 0.14 * severity_ratio,
                "credit_spread_widening_bps": 280 * severity_ratio,
                "interest_rate_shift_bps": -20 * severity_ratio,
                "loan_default_rate_pct": 0.065 * severity_ratio,
                "derivative_mtm_haircut_pct": 0.15 * severity_ratio
            }
        else:
            shocks = {
                "equity_drop_pct": 0.08 * severity_ratio,
                "credit_spread_widening_bps": 85 * severity_ratio,
                "interest_rate_shift_bps": 50 * severity_ratio,
                "loan_default_rate_pct": 0.015 * severity_ratio,
                "derivative_mtm_haircut_pct": 0.05 * severity_ratio
            }

        stressed_assets = []
        total_stressed_value = 0.0
        loss_by_asset_type = {}

        for item in self.portfolio:
            par = item["par_value_usd"]
            duration = item["duration_yrs"]
            asset_type = item["asset_type"]

            if asset_type == "Commercial Loan":
                default_loss = par * shocks["loan_default_rate_pct"] * 0.55
                spread_loss = par * (shocks["credit_spread_widening_bps"] / 10000.0) * (duration * 0.5)
                loss = default_loss + spread_loss
            elif asset_type == "Corporate Bond":
                rate_loss = par * duration * (shocks["interest_rate_shift_bps"] / 10000.0)
                spread_loss = par * duration * (shocks["credit_spread_widening_bps"] / 10000.0)
                loss = max(0, rate_loss + spread_loss)
            elif asset_type == "Sovereign Bond":
                loss = max(0, par * duration * (shocks["interest_rate_shift_bps"] / 10000.0))
            elif asset_type == "Derivatives":
                loss = par * shocks["derivative_mtm_haircut_pct"]
            elif asset_type == "Wholesale Equity":
                loss = par * shocks["equity_drop_pct"] * 1.25
            else:
                loss = par * 0.05

            loss = min(par, max(0.0, loss))
            stressed_value = par - loss
            total_stressed_value += stressed_value

            loss_by_asset_type[asset_type] = loss_by_asset_type.get(asset_type, 0.0) + loss

            stressed_assets.append({
                "asset_id": item["asset_id"],
                "name": item["name"],
                "asset_type": asset_type,
                "par_value_usd": par,
                "loss_usd": round(loss, 2),
                "stressed_value_usd": round(stressed_value, 2),
                "impairment_pct": round((loss / par) * 100, 2)
            })

        total_loss = self.total_initial_aum - total_stressed_value
        pct_loss = (total_loss / self.total_initial_aum) * 100

        base_cet1_ratio = 13.5
        capital_reduction = (total_loss / 350000000) * 100
        stressed_cet1_ratio = max(4.5, round(base_cet1_ratio - (capital_reduction * 0.4), 2))

        return {
            "event_trigger": {
                "event_type": event_type,
                "impact_score": impact_score,
                "stress_threshold_exceeded": impact_score >= 7.0
            },
            "applied_shocks": {k: round(v, 4) for k, v in shocks.items()},
            "summary": {
                "pre_stress_aum_usd": self.total_initial_aum,
                "post_stress_aum_usd": round(total_stressed_value, 2),
                "total_loss_usd": round(total_loss, 2),
                "total_loss_pct": round(pct_loss, 2),
                "baseline_cet1_ratio_pct": base_cet1_ratio,
                "stressed_cet1_ratio_pct": stressed_cet1_ratio,
                "regulatory_action_required": stressed_cet1_ratio < 8.0
            },
            "loss_by_asset_type": {k: round(v, 2) for k, v in loss_by_asset_type.items()},
            "asset_breakdown": stressed_assets
        }


# --- HTTP REST API SERVER ---
class RiskEngineAPIHandler(BaseHTTPRequestHandler):
    nlp_engine = None
    rebalancer = None
    stress_tester = None
    raw_data = None

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/v1/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "healthy", "service": "AI/NLP Risk Engine"}).encode())
        elif url.path == "/api/v1/universe":
            self._set_headers(200)
            self.wfile.write(json.dumps(self.raw_data.get("stock_universe", [])).encode())
        elif url.path == "/api/v1/portfolio":
            self._set_headers(200)
            self.wfile.write(json.dumps(self.raw_data.get("wholesale_banking_portfolio", [])).encode())
        elif url.path == "/api/v1/signals":
            self._set_headers(200)
            self.wfile.write(json.dumps(self.nlp_engine.history).encode())
        elif url.path == "/api/v1/weights":
            self._set_headers(200)
            self.wfile.write(json.dumps(self.rebalancer.current_weights).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())

    def do_POST(self):
        url = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}

        if url.path == "/api/v1/analyze":
            text = payload.get("text", "")
            source = payload.get("source", "API Feed")
            if not text:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Missing 'text' field"}).encode())
                return
            signal = self.nlp_engine.analyze(text, source)
            rebalance_update = self.rebalancer.process_signal(signal)
            stress_result = None
            if signal["high_risk_trigger"]:
                stress_result = self.stress_tester.run_stress_test(
                    signal["event_classification"], signal["impact_score"]
                )

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "signal": signal,
                "rebalance_triggered": rebalance_update is not None,
                "stress_test_triggered": stress_result is not None,
                "rebalance_snapshot": rebalance_update,
                "stress_test_snapshot": stress_result
            }, indent=2).encode())

        elif url.path == "/api/v1/stress-test":
            event_type = payload.get("event_type", "Geopolitical")
            impact_score = float(payload.get("impact_score", 8.0))
            shocks = payload.get("shocks", None)
            res = self.stress_tester.run_stress_test(event_type, impact_score, shocks)
            self._set_headers(200)
            self.wfile.write(json.dumps(res, indent=2).encode())

        elif url.path == "/api/v1/rebalance":
            res = self.rebalancer.rebalance()
            self._set_headers(200)
            self.wfile.write(json.dumps(res, indent=2).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())


def run_cli_demo():
    print("=" * 80)
    print("      FINRISK-AI: UNIFIED AI/NLP RISK ENGINE & PORTFOLIO INTELLIGENCE")
    print("      Module A: Tactical Rebalancer | Module B: Wholesale Stress Testing")
    print("=" * 80)

    data = load_data()
    engine = NLPRiskEngine()
    rebalancer = TacticalIndexRebalancer(data["stock_universe"])
    stress_tester = WholesaleStressTester(data["wholesale_banking_portfolio"])

    print(f"\n[+] Ingesting multi-source feeds ({len(data['sample_feed_items'])} items)...\n")

    for i, item in enumerate(data["sample_feed_items"], 1):
        print(f"--- Feed Item #{i} [{item['source_type'].upper()}] ---")
        print(f"Source: {item['source']}")
        print(f"Text  : {item['text']}")

        signal = engine.analyze(item["text"], item["source"])
        print(f"\n>> NLP Risk Signal Generated:")
        print(f"   Entity/Ticker       : {signal['entity']}")
        print(f"   Sentiment Score     : {signal['sentiment_score']:+.2f} ({signal['sentiment_label']})")
        print(f"   Event Classification: {signal['event_classification']}")
        print(f"   Impact Score        : {signal['impact_score']}/10.0")

        if signal["entity"] in rebalancer.current_weights:
            rebal_res = rebalancer.process_signal(signal)
            adj = rebal_res["adjustments"][signal["entity"]]
            print(f"\n   [Module A Rebalance Triggered]")
            print(f"   Action: {adj['action']} | New Weight: {adj['new_weight']*100:.1f}% (Delta {adj['delta']*100:+.2f}%)")

        if signal["high_risk_trigger"]:
            print(f"\n   [Module B Stress Test Triggered (Impact >= 7.0)]")
            stress_res = stress_tester.run_stress_test(signal["event_classification"], signal["impact_score"])
            sumry = stress_res["summary"]
            print(f"   Pre-Stress Portfolio:  ${sumry['pre_stress_aum_usd']/1e6:.1f}M")
            print(f"   Post-Stress Value   :  ${sumry['post_stress_aum_usd']/1e6:.1f}M")
            print(f"   Simulated Loss      : -${sumry['total_loss_usd']/1e6:.1f}M (-{sumry['total_loss_pct']:.2f}%)")
            print(f"   CET1 Capital Ratio  :  {sumry['baseline_cet1_ratio_pct']}% -> {sumry['stressed_cet1_ratio_pct']}%")

        print("-" * 80)
        time.sleep(0.05)

    print("\n[SUCCESS] CLI Demonstration Completed Successfully.")


def start_server(port=8000):
    data = load_data()
    RiskEngineAPIHandler.nlp_engine = NLPRiskEngine()
    RiskEngineAPIHandler.rebalancer = TacticalIndexRebalancer(data["stock_universe"])
    RiskEngineAPIHandler.stress_tester = WholesaleStressTester(data["wholesale_banking_portfolio"])
    RiskEngineAPIHandler.raw_data = data

    server_address = ('', port)
    httpd = HTTPServer(server_address, RiskEngineAPIHandler)
    print(f"[*] AI/NLP Risk Engine REST API Server active on http://localhost:{port}")
    print("[*] Available Endpoints:")
    print("    POST /api/v1/analyze       - Ingest & analyze unstructured text")
    print("    POST /api/v1/rebalance     - Module A Tactical Rebalancing")
    print("    POST /api/v1/stress-test   - Module B Wholesale Stress Testing")
    print("    GET  /api/v1/signals       - Audit trail of processed signals")
    print("    GET  /api/v1/weights       - Current index portfolio weights")
    print("    GET  /api/v1/portfolio     - Wholesale banking asset inventory")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--serve":
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
        start_server(port)
    else:
        run_cli_demo()
