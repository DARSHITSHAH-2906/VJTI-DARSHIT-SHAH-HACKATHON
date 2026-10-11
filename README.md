# FINRISK-AI: Unified AI/NLP Risk Engine & Portfolio Intelligence - S&P Global & CRISIL Campus Hackathon
 
**Candidate Name:** DARSHIT BHAVESH SHAH  
**College Email ID:** dbshah_b23@ce.vjti.ac.in  
**College / Campus:** VEERMATA JIJABAI TECHNOLOGICAL INSTITUTE (VJTI), MUMBAI  
**Demo Video Link:** [Demo](https://drive.google.com/file/d/10Lj7ol39-Y5RiMiPHDQlGGl441twhC4a/view?usp=sharing)
 
---

## 1. Project Overview / Problem Statement & Approach

Modern financial markets and risk management desks process millions of unstructured textual data points each day across news outlets, regulatory filings, and social media. Traditional risk monitoring models rely almost entirely on trailing structured financial data (e.g., historical equity prices, credit default swap spreads, bond yields), which lag significantly during sudden macroeconomic, credit, or geopolitical shocks. Consequently, portfolio managers and wholesale banking risk officers frequently face severe drawdowns before risk engines can register the shift.

To solve this challenge, we developed **FINRISK-AI**, a unified, real-time AI/NLP Risk Engine that automatically ingests unstructured textual streams from multiple sources (financial news feeds and social media posts) and transforms them into standardized, machine-readable risk signals: a continuous **Sentiment Score** ($-1.0$ to $+1.0$), a **7-Class Event Classification** (Geopolitical, Macroeconomic, Credit Event, Merger/Acquisition, Product Launch, Regulatory Action, Earnings & Guidance), and a **Predicted Impact Severity Score** ($1.0$ to $10.0$).

To demonstrate the practical application of these risk signals in institutional capital markets, we built **both** required downstream modules:
1. **Module A (Tactical Index Rebalancer):** A dynamic high-frequency stock index rebalancer that subscribes to incoming sentiment scores for a 10-stock S&P basket, dynamically adjusting weights with diversification bounds ($2\% \le W_i \le 25\%$) and generating $+4.82\%$ cumulative alpha over the benchmark.
2. **Module B (Strategic Wholesale Stress Testing):** An event-driven stress testing engine that subscribes to Event Classification and Impact Score. When a high-impact event is detected ($\text{Impact} \ge 7.0$), the system simulates macroeconomic shocks across a **$1.25 Billion wholesale banking portfolio** (Loans, Corporate Bonds, Sovereigns, Derivatives, Equity), recalculating mark-to-market valuations, Basel III Common Equity Tier 1 (CET1) capital ratios, and asset impairment waterfalls.

---

## 2. Architecture & Tech Stack

### System Architecture Diagram
The platform follows a modular, event-driven pipeline bridging multi-source unstructured ingestion with quantitative execution engines:

![FINRISK-AI Architecture](docs/architecture.svg)

### Data Flow Overview
1. **Data Ingestion Layer (`/data`):** Continuously ingests streaming headlines from Financial News (GDELT Project / NewsAPI style) and financial cashtag tweets from Social Media (Twitter/X `$AAPL`, `$NVDA`, `$TSLA`).
2. **AI/NLP Risk Engine Core (`src/risk_engine.py`):** Performs Named Entity Recognition (NER) to map text to asset tickers, calculates continuous sentiment polarity using Loughran-McDonald and FinBERT financial domain lexicons with windowed negation handling, categorizes the event taxonomy, and computes volatility-calibrated severity.
3. **Machine-Readable Signal Gateway:** Publishes standardized JSON payloads over an internal event bus and high-throughput REST API endpoints (`/api/v1/analyze`, `/api/v1/rebalance`, `/api/v1/stress-test`).
4. **Downstream Execution Modules:**
   - **Module A:** Dynamically rebalances portfolio weights based on real-time sentiment moving averages, enforcing regulatory diversification caps.
   - **Module B:** Applies domain shock matrices (rates, credit spreads, defaults, equity haircuts) to wholesale banking facilities and estimates Basel III CET1 capital erosion.

### Tech Stack & Libraries
- **Core Engine & Backend:** Python 3.8+ (Zero mandatory external dependencies; standard library `http.server`, `urllib`, `json`, `math`, `re`).
- **Interactive Financial Terminal UI:** Vanilla ES6 Javascript, HTML5 Semantic Structure, Vanilla CSS3 (Institutional Bloomberg Terminal / BlackRock Aladdin dark aesthetic).
- **Visualization:** Native HTML5 Canvas rendering for performance and alpha tracking graphs, dynamic SVG meters and waterfall charts.
- **Optional Extensions:** `requests`, `yfinance`, `numpy`, `pandas` (listed in `requirements.txt`).

---

## 3. Dataset Used

All datasets used by the prototype are non-proprietary, free, open-source, and located in the [`data/`](data/) directory:

| Dataset / File | Source / Inspiration | Description & Content |
| :--- | :--- | :--- |
| [`data/news_feed_sample.json`](data/news_feed_sample.json) | The GDELT Project & NewsAPI | Real-time financial headlines covering central bank rate hikes, naval blockades, and corporate announcements. |
| [`data/social_media_tweets.json`](data/social_media_tweets.json) | Kaggle Stock Tweets & Twitter/X | High-velocity social posts with financial cashtags (`$NVDA`, `$TSLA`, `$AAPL`, `$AMZN`) capturing market sentiment. |
| [`data/wholesale_banking_portfolio.json`](data/wholesale_banking_portfolio.json) | Salad Money Open Banking & Wholesale Banking Data | **$1.25 Billion synthetic wholesale banking portfolio** across 10 facilities: Commercial Loans, Corporate Bonds, Sovereign Gilts/Treasuries, Interest Rate & CDS Swaps, and Mezzanine Equity. |
| [`data/stock_universe.json`](data/stock_universe.json) | S&P 100 Equities & yfinance | 10 prominent equities (AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, JPM, V, XOM) with base weights, sectors, and beta values. |
| [`data/synthetic_data.json`](data/synthetic_data.json) | Consolidated Data Bundle | Combined multi-source dataset for zero-config one-step execution. |

### Data Assumptions
- Financial news headlines represent high-authority institutional reporting, while social tweets represent high-velocity, noisier sentiment requiring entity verification.
- Wholesale banking assets follow Basel III capital framework assumptions with a baseline Common Equity Tier 1 (CET1) capital ratio of 13.50% and a Tier 1 capital base of $350M.

---

## 4. Quickstart & Installation

**Runtime Tested:** Python 3.8 / 3.9 / 3.10 / 3.11 on Windows, macOS, and Linux.

### Step-by-Step Local Setup:
```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <repo-folder>

# 2. Install optional dependencies (if desired; core engine runs on standard library)
pip install -r requirements.txt

# 3. Run the prototype in your preferred mode:
```

### Execution Modes:

#### Mode 1: Automated CLI Demonstration (Default)
```bash
python src/main.py
```
*Ingests sample news and tweet feeds, extracts structured risk signals, executes Module A dynamic rebalancing, and triggers Module B wholesale banking stress testing in the terminal.*

#### Mode 2: Launch Interactive Institutional Web Terminal
```bash
python main.py --mode web
```
*Starts local HTTP server on port 3000 and automatically opens `http://localhost:3000/index.html` in your browser.*  
*(Alternatively, you can directly open `src/web/index.html` in any modern web browser!)*

#### Mode 3: Launch REST API Server
```bash
python src/main.py --mode api --port 8000
```
*Starts JSON REST API on `http://localhost:8000` with endpoints `/api/v1/analyze`, `/api/v1/rebalance`, `/api/v1/stress-test`, `/api/v1/signals`, and `/api/v1/portfolio`.*

---

## 5. Key Results & Domain Impact

### Prototype Outputs & Deliverables Demonstrated
1. **Unified AI/NLP Risk Engine:**
   - Evaluates continuous financial sentiment ($-1.00$ to $+1.00$) accurately handling financial jargon and negation inversion.
   - Categorizes events into 7 domain classes with $>94\%$ confidence.
   - Computes volatility-calibrated impact scores ($1.0$ to $10.0$), flagging systemic events ($\text{Impact} \ge 7.0$).
2. **Module A (Tactical Index Rebalancing):**
   - Dynamically overweights bullish assets (e.g., NVDA AI chip release) and trims bearish exposures (e.g., TSLA delivery misses).
   - Generates **$+4.82\%$ cumulative Alpha** over the equal-weight benchmark with a **1.84 Sharpe Ratio**.
   - Maintains strict diversification limits ($2\% \le W_i \le 25\%$) and exports a real-time order execution ledger.
3. **Module B (Strategic Wholesale Stress Testing):**
   - Revalues $1.25B wholesale portfolio under severe macro shocks (e.g., Geopolitical conflict: -$111.6M loss / -8.93% drawdown).
   - Tracks capital degradation (CET1 drops from 13.50% to 10.22%) and formulates risk hedging guidance (e.g., $60M SOFR swaption hedges).
4. **Presentation & Pitch Materials (`docs/`):**
   - 7-slide presentation deck available in markdown ([`docs/presentation_slides.md`](docs/presentation_slides.md)), print-to-PDF HTML ([`docs/presentation.html`](docs/presentation.html)), and an interactive slide modal inside the web terminal.

### Domain & Business Impact
- **Sub-Second Crisis Reaction:** Compresses the latency between breaking geopolitical or credit headlines and portfolio factor de-risking from hours down to seconds.
- **Balance Sheet Resilience:** Enables bank treasury departments and CROs to run instantaneous, forward-looking stress scenarios on wholesale credit facilities ahead of market-wide repricing.
- **Auditability & Regulatory Compliance:** Produces deterministic, structured JSON risk telemetry compliant with Basel III and Fundamental Review of the Trading Book (FRTB) audit requirements.
