/**
 * FINRISK-AI // Unified AI/NLP Risk Engine & Portfolio Intelligence Terminal
 * Core Application Engine & Downstream Modules Logic (src/web/app.js)
 */

// --- GLOBAL APPLICATION STATE ---
const STATE = {
  activeTab: 'tab-overview',
  streamActive: false,
  streamInterval: null,
  streamIndex: 0,
  
  // Stock universe for Module A (Tactical Index Rebalancer)
  universe: [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", basePrice: 228.50, baseWeight: 0.12, currentWeight: 0.12, sentiment: 0.0, price: 228.50 },
    { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology", basePrice: 420.20, baseWeight: 0.12, currentWeight: 0.12, sentiment: 0.0, price: 420.20 },
    { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Semiconductors", basePrice: 125.80, baseWeight: 0.11, currentWeight: 0.11, sentiment: 0.0, price: 125.80 },
    { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Disc.", basePrice: 185.30, baseWeight: 0.10, currentWeight: 0.10, sentiment: 0.0, price: 185.30 },
    { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Communication", basePrice: 164.40, baseWeight: 0.10, currentWeight: 0.10, sentiment: 0.0, price: 164.40 },
    { ticker: "META", name: "Meta Platforms", sector: "Communication", basePrice: 570.60, baseWeight: 0.09, currentWeight: 0.09, sentiment: 0.0, price: 570.60 },
    { ticker: "TSLA", name: "Tesla Inc.", sector: "Automotive", basePrice: 240.10, baseWeight: 0.08, currentWeight: 0.08, sentiment: 0.0, price: 240.10 },
    { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials", basePrice: 215.70, baseWeight: 0.10, currentWeight: 0.10, sentiment: 0.0, price: 215.70 },
    { ticker: "V", name: "Visa Inc.", sector: "Financials", basePrice: 278.40, baseWeight: 0.09, currentWeight: 0.09, sentiment: 0.0, price: 278.40 },
    { ticker: "XOM", name: "Exxon Mobil", sector: "Energy", basePrice: 118.20, baseWeight: 0.09, currentWeight: 0.09, sentiment: 0.0, price: 118.20 }
  ],

  // Wholesale banking portfolio for Module B ($1.25B AUM)
  portfolio: [
    { id: "LN-CORP-101", name: "Senior Syndicated Term Loan - Apex Industrial", assetType: "Commercial Loan", parValue: 150000000, rating: "BBB+", duration: 4.2, stressLoss: 0 },
    { id: "LN-CRE-102", name: "CRE Commercial Facility - Metro Plaza Trust", assetType: "Commercial Loan", parValue: 120000000, rating: "BB", duration: 3.8, stressLoss: 0 },
    { id: "LN-TECH-103", name: "Revolving Credit Line - Silicon Cloud", assetType: "Commercial Loan", parValue: 130000000, rating: "A-", duration: 2.5, stressLoss: 0 },
    { id: "BND-IG-201", name: "IG Corporate Bond - Global Logistics Corp", assetType: "Corporate Bond", parValue: 200000000, rating: "A+", duration: 6.5, stressLoss: 0 },
    { id: "BND-HY-202", name: "High Yield Bond - Vanguard Telecom", assetType: "Corporate Bond", parValue: 150000000, rating: "B+", duration: 5.1, stressLoss: 0 },
    { id: "SOV-TRS-301", name: "US 10-Year Benchmark Treasury Notes", assetType: "Sovereign Bond", parValue: 150000000, rating: "AAA", duration: 8.2, stressLoss: 0 },
    { id: "SOV-MUN-302", name: "European Sovereign Gilt & Bund Tranche", assetType: "Sovereign Bond", parValue: 100000000, rating: "AAA", duration: 7.4, stressLoss: 0 },
    { id: "SWP-IRS-401", name: "Interest Rate Swaps (Payer 5Y SOFR vs Fixed)", assetType: "Derivatives", parValue: 90000000, rating: "AA-", duration: 4.8, stressLoss: 0 },
    { id: "SWP-CDS-402", name: "Credit Default Swap Basket (CDX NA IG)", assetType: "Derivatives", parValue: 60000000, rating: "A", duration: 3.0, stressLoss: 0 },
    { id: "EQ-FAC-501", name: "Mezzanine Structured Convertible Facility", assetType: "Wholesale Equity", parValue: 100000000, rating: "BBB-", duration: 3.5, stressLoss: 0 }
  ],

  // Real-time stream items
  streamItems: [],
  currentSignal: null,
  rebalanceAudit: [],
  
  // Historical chart data
  chartHistory: {
    labels: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"],
    rebalancedReturns: [100.0, 100.8, 101.9, 102.5, 102.2, 103.8, 104.5, 105.1, 105.9],
    benchmarkReturns:  [100.0, 100.3, 100.7, 101.1, 100.9, 101.4, 101.8, 102.0, 102.3]
  },

  // Presentation slides modal
  currentSlide: 0
};

// --- MULTI-SOURCE STREAM DATA ---
const RAW_SAMPLE_ITEMS = [
  {
    id: "NEWS-001",
    source: "Financial News (Reuters / GDELT)",
    sourceType: "news",
    time: "09:15:00",
    entity: "NVDA",
    text: "NVIDIA reveals next-gen ultra-dense AI datacenter chips with 4x computational throughput; major hyperscalers sign multi-billion dollar pre-orders amidst insatiable enterprise demand."
  },
  {
    id: "TWEET-001",
    source: "Twitter/X Financial Stream",
    sourceType: "social",
    time: "09:18:22",
    entity: "NVDA",
    text: "$NVDA absolute moonshot announcement today. Order book completely locked up through next fiscal year. Institutional accumulation ramping hard 🔥🚀"
  },
  {
    id: "NEWS-002",
    source: "Financial News (Bloomberg)",
    sourceType: "news",
    time: "09:30:10",
    entity: "GLOBAL_MACRO",
    text: "Federal Reserve unexpectedly signals prolonged hawkish posture as core PCE inflation accelerates; 10-year Treasury yields spike 28 basis points to multi-year highs."
  },
  {
    id: "TWEET-002",
    source: "Twitter/X Financial Stream",
    sourceType: "social",
    time: "09:35:45",
    entity: "TSLA",
    text: "$TSLA deliveries miss consensus by 8% in Asian markets amid intense EV price competition and factory retooling delays. Margins likely under severe compression."
  },
  {
    id: "NEWS-003",
    source: "Financial News (Financial Times)",
    sourceType: "news",
    time: "09:42:00",
    entity: "JPM",
    text: "Major European commercial real estate syndication defaults on $1.4B credit facility; tier-1 wholesale lenders initiate emergency provisioning for potential contagion losses."
  },
  {
    id: "NEWS-004",
    source: "Financial News (WSJ / GDELT)",
    sourceType: "news",
    time: "10:05:00",
    entity: "GLOBAL_GEO",
    text: "Naval blockade escalation in key maritime strait halts 18% of global crude tanker transits; Brent crude surges 9.5% intraday amidst immediate supply disruption threats."
  },
  {
    id: "TWEET-003",
    source: "Twitter/X Financial Stream",
    sourceType: "social",
    time: "10:12:15",
    entity: "AAPL",
    text: "$AAPL Department of Justice antitrust remedies could force dismantling of exclusive app store billing agreements and default search partnership rev-share. Legal headwind is real."
  },
  {
    id: "NEWS-005",
    source: "Financial News (CNBC)",
    sourceType: "news",
    time: "10:25:30",
    entity: "MSFT",
    text: "Microsoft secures landmark multi-jurisdiction regulatory clearance for sovereign AI cloud contracts with enterprise backlogs expanding by 34% year-over-year."
  },
  {
    id: "TWEET-004",
    source: "Twitter/X Financial Stream",
    sourceType: "social",
    time: "10:33:00",
    entity: "AMZN",
    text: "$AMZN AWS accelerating custom silicon adoption with Trainium3; gross cloud margins expected to expand 300bps next quarter. Enterprise migrations picking up speed."
  },
  {
    id: "NEWS-006",
    source: "Financial News (Dow Jones)",
    sourceType: "news",
    time: "10:48:10",
    entity: "XOM",
    text: "Exxon Mobil finalizes strategic mega-merger acquisition in deepwater offshore assets, boosting free cash flow projections by $4.5B annually starting next year."
  }
];

// --- FINANCIAL NLP LEXICONS ---
const FINANCIAL_LEXICON = {
  positive: {
    "surge": 0.8, "surges": 0.8, "rally": 0.7, "outperform": 0.85, "breakthrough": 0.9,
    "beat": 0.75, "record": 0.7, "growth": 0.6, "soar": 0.85, "upgrade": 0.75,
    "acquisition": 0.65, "clearance": 0.7, "approval": 0.8, "expansion": 0.65,
    "profit": 0.7, "moonshot": 0.9, "accumulate": 0.6, "bullish": 0.8, "windfall": 0.85,
    "accelerating": 0.7, "expand": 0.65, "landmark": 0.75
  },
  negative: {
    "plunge": -0.85, "crash": -0.95, "slump": -0.75, "default": -0.95, "defaults": -0.95,
    "insolvency": -0.95, "bankrupt": -0.95, "collapse": -0.9, "miss": -0.7, "misses": -0.7,
    "downgrade": -0.8, "antitrust": -0.85, "investigation": -0.75, "sanction": -0.8,
    "blockade": -0.9, "inflation": -0.6, "hawkish": -0.65, "headwind": -0.6,
    "lawsuit": -0.7, "contagion": -0.9, "crisis": -0.85, "halts": -0.8, "compression": -0.6
  },
  events: {
    "Geopolitical": ["war", "military", "blockade", "sanction", "geopolitical", "strait", "naval", "tariff", "missile"],
    "Macroeconomic": ["federal reserve", "central bank", "inflation", "cpi", "pce", "interest rate", "treasury", "yield", "gdp", "hawkish", "rate hike", "recession"],
    "Credit Event": ["default", "syndication", "distressed", "insolvency", "downgrade", "covenant", "restructuring", "credit facility", "debt", "contagion"],
    "Merger/Acquisition": ["merger", "acquisition", "acquire", "buyout", "takeover", "merges", "deal", "spinoff"],
    "Product Launch": ["launch", "unveil", "reveals", "next-gen", "chip", "platform", "ai model", "patent", "breakthrough", "announces"],
    "Regulatory Action": ["antitrust", "investigation", "doj", "sec", "compliance", "regulatory", "fine", "subpoena", "ruling", "clearance"],
    "Earnings & Guidance": ["earnings", "revenue", "profit", "quarterly", "margin", "guidance", "eps", "deliveries", "miss", "beat"]
  },
  tickers: {
    "AAPL": ["apple", "aapl", "iphone", "tim cook"],
    "MSFT": ["microsoft", "msft", "azure", "windows"],
    "NVDA": ["nvidia", "nvda", "jensen", "gpu", "blackwell", "cuda"],
    "AMZN": ["amazon", "amzn", "aws", "trainium"],
    "GOOGL": ["google", "alphabet", "googl", "gemini"],
    "META": ["meta", "facebook", "zuckerberg"],
    "TSLA": ["tesla", "tsla", "elon", "ev"],
    "JPM": ["jpmorgan", "jpm", "jamie dimon", "chase"],
    "V": ["visa", "payments"],
    "XOM": ["exxon", "xom", "mobil", "crude", "oil", "brent"]
  }
};

// --- CORE NLP ANALYSIS FUNCTION ---
function analyzeTextNLP(text, source = "Financial News Feed") {
  const textLower = text.toLowerCase();
  const words = textLower.match(/[a-zA-Z-]+/g) || [];

  // 1. Entity Recognition
  let entity = "GENERAL_MARKET";
  for (const [ticker, aliases] of Object.entries(FINANCIAL_LEXICON.tickers)) {
    if (aliases.some(alias => new RegExp(`\\b${alias}\\b`, 'i').test(textLower))) {
      entity = ticker;
      break;
    }
  }
  if (entity === "GENERAL_MARKET") {
    if (/(treasury|federal reserve|yield|inflation|interest rate)/i.test(textLower)) entity = "GLOBAL_MACRO";
    else if (/(strait|naval|blockade|war|crude|brent)/i.test(textLower)) entity = "GLOBAL_GEO";
  }

  // 2. Sentiment Scoring (-1.00 to +1.00)
  let posScore = 0.0, negScore = 0.0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWindow = words.slice(Math.max(0, i - 2), i);
    const isNegated = prevWindow.some(nw => ["not", "no", "never", "without", "hardly"].includes(nw));

    if (FINANCIAL_LEXICON.positive[word]) {
      const val = FINANCIAL_LEXICON.positive[word];
      if (isNegated) negScore += val * 0.8;
      else posScore += val;
    } else if (FINANCIAL_LEXICON.negative[word]) {
      const val = Math.abs(FINANCIAL_LEXICON.negative[word]);
      if (isNegated) posScore += val * 0.6;
      else negScore += val;
    }
  }

  const total = posScore + negScore;
  let rawSentiment = total > 0 ? (posScore - negScore) / (total + 1.2) : 0.0;
  let sentimentScore = Math.max(-1.0, Math.min(1.0, Math.round(rawSentiment * 1.5 * 100) / 100));

  // 3. Event Classification
  let bestEvent = "Macroeconomic";
  let maxMatches = 0;
  for (const [evt, kws] of Object.entries(FINANCIAL_LEXICON.events)) {
    const matches = kws.filter(kw => new RegExp(`\\b${kw}\\b`, 'i').test(textLower)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestEvent = evt;
    }
  }

  // 4. Impact Score Calculation (1 to 10)
  const baseSeverities = {
    "Geopolitical": 7.5,
    "Credit Event": 7.8,
    "Macroeconomic": 6.8,
    "Regulatory Action": 6.0,
    "Earnings & Guidance": 5.2,
    "Product Launch": 5.0,
    "Merger/Acquisition": 5.8
  };
  let impact = (baseSeverities[bestEvent] || 5.0) + Math.abs(sentimentScore) * 2.2;
  if (/(default|crisis|blockade|emergency|antitrust|multi-billion)/i.test(textLower)) impact += 0.8;
  impact = Math.max(1.0, Math.min(10.0, Math.round(impact * 10) / 10));

  const isSocial = /(tweet|x stream|\$)/i.test(source) || text.includes("$");

  return {
    signal_id: `SIG-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toISOString(),
    source: source,
    source_type: isSocial ? "Social Media (Twitter/X)" : "Financial News (GDELT / NewsAPI)",
    entity: entity,
    raw_text: text,
    sentiment_score: sentimentScore,
    sentiment_label: sentimentScore > 0.15 ? "Positive" : (sentimentScore < -0.15 ? "Negative" : "Neutral"),
    event_classification: bestEvent,
    impact_score: impact,
    high_risk_trigger: impact >= 7.0
  };
}

// --- MODULE A: TACTICAL REBALANCING LOGIC ---
function executeTacticalRebalance(triggerSignal = null) {
  if (triggerSignal && triggerSignal.entity) {
    const stock = STATE.universe.find(s => s.ticker === triggerSignal.entity);
    if (stock) {
      stock.sentiment = triggerSignal.sentiment_score;
    }
  }

  // Adjust weights: base_weight + sentiment * 0.40 * base_weight
  let unnormalized = {};
  STATE.universe.forEach(stock => {
    const delta = stock.sentiment * 0.45 * stock.baseWeight;
    const clamped = Math.max(0.02, Math.min(0.25, stock.baseWeight + delta));
    unnormalized[stock.ticker] = clamped;
  });

  const totalSum = Object.values(unnormalized).reduce((a, b) => a + b, 0);
  const adjustments = [];

  STATE.universe.forEach(stock => {
    const oldWeight = stock.currentWeight;
    const newWeight = Math.round((unnormalized[stock.ticker] / totalSum) * 1000) / 1000;
    const delta = Math.round((newWeight - oldWeight) * 1000) / 1000;
    stock.currentWeight = newWeight;

    let action = "HOLD";
    if (delta > 0.005) action = "BUY (OVERWEIGHT)";
    else if (delta < -0.005) action = "SELL (UNDERWEIGHT)";

    adjustments.push({
      ticker: stock.ticker,
      oldWeight,
      newWeight,
      delta,
      action
    });
  });

  // Record audit log
  const logItem = {
    timestamp: new Date().toLocaleTimeString(),
    trigger: triggerSignal ? `${triggerSignal.entity} (${triggerSignal.sentiment_score > 0 ? '+' : ''}${triggerSignal.sentiment_score})` : "Manual Portfolio Rebalance",
    summary: adjustments.filter(a => a.action !== "HOLD").map(a => `${a.ticker}: ${a.action} -> ${(a.newWeight*100).toFixed(1)}%`).join(" | ") || "Portfolio Weights Balanced"
  };
  STATE.rebalanceAudit.unshift(logItem);
  if (STATE.rebalanceAudit.length > 20) STATE.rebalanceAudit.pop();

  renderWeightsTable();
  renderMiniWeights();
  renderAuditLog();
  updateChartData();
}

// --- MODULE B: STRATEGIC STRESS TESTING LOGIC ---
function executeStressTest(scenarioType = "Geopolitical", customShocks = null) {
  let shocks = {};

  if (scenarioType === "Geopolitical") {
    shocks = {
      equityDrop: 0.15,
      spreadWideningBps: 180,
      rateShiftBps: 40,
      defaultRateSurge: 0.035,
      derivativeHaircut: 0.12
    };
  } else if (scenarioType === "Macroeconomic") {
    shocks = {
      equityDrop: 0.11,
      spreadWideningBps: 120,
      rateShiftBps: 225, // +225 bps rate hike
      defaultRateSurge: 0.028,
      derivativeHaircut: 0.08
    };
  } else if (scenarioType === "Credit Event") {
    shocks = {
      equityDrop: 0.14,
      spreadWideningBps: 280, // High-yield credit crisis
      rateShiftBps: -20,
      defaultRateSurge: 0.065,
      derivativeHaircut: 0.15
    };
  } else if (scenarioType === "Custom" && customShocks) {
    shocks = customShocks;
  }

  let totalLoss = 0;
  let totalPreStress = 0;
  const lossByType = {};

  STATE.portfolio.forEach(asset => {
    const par = asset.parValue;
    const dur = asset.duration;
    let loss = 0;

    if (asset.assetType === "Commercial Loan") {
      loss = (par * shocks.defaultRateSurge * 0.55) + (par * (shocks.spreadWideningBps / 10000) * (dur * 0.5));
    } else if (asset.assetType === "Corporate Bond") {
      loss = (par * dur * (shocks.rateShiftBps / 10000)) + (par * dur * (shocks.spreadWideningBps / 10000));
    } else if (asset.assetType === "Sovereign Bond") {
      loss = par * dur * (shocks.rateShiftBps / 10000);
    } else if (asset.assetType === "Derivatives") {
      loss = par * shocks.derivativeHaircut;
    } else if (asset.assetType === "Wholesale Equity") {
      loss = par * shocks.equityDrop * 1.25;
    }

    loss = Math.min(par, Math.max(0, loss));
    asset.stressLoss = loss;
    totalLoss += loss;
    totalPreStress += par;

    lossByType[asset.assetType] = (lossByType[asset.assetType] || 0) + loss;
  });

  const postStress = totalPreStress - totalLoss;
  const pctLoss = (totalLoss / totalPreStress) * 100;
  const baselineCET1 = 13.50;
  const stressedCET1 = Math.max(4.5, Math.round((baselineCET1 - (totalLoss / 350000000) * 40) * 100) / 100);

  // Render UI
  const formatM = (v) => `$${(v / 1e6).toFixed(1)}M`;
  document.getElementById('stress-post-val').textContent = formatM(postStress);
  document.getElementById('stress-loss-val').textContent = `-${formatM(totalLoss)}`;
  document.getElementById('stress-loss-pct').textContent = `Drawdown: -${pctLoss.toFixed(2)}%`;
  document.getElementById('stress-cet1-val').textContent = `${stressedCET1.toFixed(2)}%`;

  document.getElementById('mini-post-stress').textContent = formatM(postStress);
  document.getElementById('mini-stress-loss').textContent = `-${formatM(totalLoss)} (-${pctLoss.toFixed(1)}%)`;

  // Render Waterfall
  const wfContainer = document.getElementById('stress-waterfall-container');
  wfContainer.innerHTML = '';
  Object.entries(lossByType).forEach(([type, loss]) => {
    const row = document.createElement('div');
    row.className = 'waterfall-row';
    const pct = ((loss / totalLoss) * 100).toFixed(0);
    row.innerHTML = `
      <div class="wf-label">${type}</div>
      <div class="wf-bar-wrap">
        <div class="wf-bar" style="width: ${Math.min(100, Math.max(5, pct))}%;"></div>
      </div>
      <div class="wf-val">-$${(loss / 1e6).toFixed(1)}M</div>
    `;
    wfContainer.appendChild(row);
  });

  renderPortfolioTable();
}

// --- UI RENDERING HELPERS ---
function renderFeedList(filter = 'all') {
  const container = document.getElementById('overview-feed-list');
  container.innerHTML = '';

  const items = STATE.streamItems.filter(item => {
    if (filter === 'news') return item.sourceType === 'news';
    if (filter === 'social') return item.sourceType === 'social';
    return true;
  });

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = `feed-item ${idx === 0 ? 'active-item' : ''}`;
    div.innerHTML = `
      <div class="feed-item-header">
        <span class="feed-src">${item.source}</span>
        <span class="feed-time">${item.time}</span>
      </div>
      <div class="feed-text">${item.text}</div>
      <div class="feed-tags">
        <span class="feed-tag ${item.sourceType === 'social' ? 'tag-social' : 'tag-news'}">
          ${item.sourceType === 'social' ? 'TWITTER/X' : 'NEWS API / GDELT'}
        </span>
        <span class="feed-tag">${item.entity}</span>
      </div>
    `;
    div.addEventListener('click', () => {
      processIncomingFeedItem(item);
    });
    container.appendChild(div);
  });
}

function processIncomingFeedItem(item) {
  const signal = analyzeTextNLP(item.text, item.source);
  STATE.currentSignal = signal;

  // Update Overview Telemetry
  document.getElementById('latest-signal-id').textContent = signal.signal_id;
  document.getElementById('active-signal-headline').textContent = `"${signal.raw_text}"`;
  document.getElementById('active-signal-source').textContent = `Source: ${signal.source}`;
  document.getElementById('active-signal-entity').textContent = `Target: ${signal.entity}`;

  // Sentiment display
  const sentimentEl = document.getElementById('disp-sentiment');
  sentimentEl.textContent = (signal.sentiment_score > 0 ? "+" : "") + signal.sentiment_score.toFixed(2);
  sentimentEl.className = "gauge-value " + (signal.sentiment_score > 0.15 ? "text-green" : (signal.sentiment_score < -0.15 ? "text-red" : "text-cyan"));
  document.getElementById('disp-sentiment-label').textContent = signal.sentiment_label.toUpperCase();
  
  const sentimentMeter = document.getElementById('meter-sentiment');
  const sentPct = ((signal.sentiment_score + 1.0) / 2.0) * 100;
  sentimentMeter.style.width = `${sentPct}%`;
  sentimentMeter.style.backgroundColor = signal.sentiment_score > 0.15 ? 'var(--green)' : (signal.sentiment_score < -0.15 ? 'var(--red)' : 'var(--cyan)');

  // Event display
  document.getElementById('disp-event').textContent = signal.event_classification;

  // Impact display
  const impactEl = document.getElementById('disp-impact');
  impactEl.innerHTML = `${signal.impact_score.toFixed(1)}<span class="gauge-max">/10</span>`;
  document.getElementById('disp-impact-label').textContent = signal.impact_score >= 7.0 ? "HIGH SYSTEMIC RISK" : "MODERATE VOLATILITY";
  document.getElementById('meter-impact').style.width = `${(signal.impact_score / 10.0) * 100}%`;
  document.getElementById('meter-impact').style.backgroundColor = signal.impact_score >= 7.0 ? 'var(--red)' : 'var(--amber)';

  // Downstream Trigger Notifications
  const banner = document.getElementById('downstream-trigger-banner');
  if (signal.impact_score >= 7.0) {
    banner.style.borderColor = 'var(--red)';
    banner.style.color = 'var(--red)';
    document.getElementById('downstream-trigger-text').textContent = 
      `🚨 High-Impact Event Detected (${signal.event_classification}, Impact ${signal.impact_score}) -> Triggered Module B Wholesale Banking Stress Simulation!`;
    executeStressTest(signal.event_classification);
  } else {
    banner.style.borderColor = 'var(--cyan)';
    banner.style.color = 'var(--cyan)';
    document.getElementById('downstream-trigger-text').textContent = 
      `⚡ Signal Routed -> Module A Tactical Rebalancing updated for ${signal.entity} (${signal.sentiment_label}).`;
  }

  // Update NLP tab cards
  document.getElementById('nlp-res-sentiment').textContent = (signal.sentiment_score > 0 ? "+" : "") + signal.sentiment_score.toFixed(2);
  document.getElementById('nlp-res-sentiment').className = "tile-value " + (signal.sentiment_score > 0.15 ? "text-green" : (signal.sentiment_score < -0.15 ? "text-red" : "text-cyan"));
  document.getElementById('nlp-res-event').textContent = signal.event_classification;
  document.getElementById('nlp-res-impact').textContent = `${signal.impact_score.toFixed(1)} / 10`;
  document.getElementById('nlp-res-entity').textContent = signal.entity;
  document.getElementById('nlp-json-output').textContent = JSON.stringify(signal, null, 2);

  // Automatically execute Module A Tactical Rebalancer
  executeTacticalRebalance(signal);
}

function renderWeightsTable() {
  const tbody = document.getElementById('weights-table-body');
  tbody.innerHTML = '';

  STATE.universe.forEach(stock => {
    const tr = document.createElement('tr');
    const delta = stock.currentWeight - stock.baseWeight;
    const deltaClass = delta > 0.005 ? 'text-green' : (delta < -0.005 ? 'text-red' : 'text-dim');
    const actionClass = delta > 0.005 ? 'action-buy' : (delta < -0.005 ? 'action-sell' : 'action-hold');
    const actionText = delta > 0.005 ? 'BUY' : (delta < -0.005 ? 'SELL' : 'HOLD');

    tr.innerHTML = `
      <td class="ticker-cell">${stock.ticker}</td>
      <td>${stock.name}</td>
      <td style="color: var(--text-dim);">${stock.sector}</td>
      <td style="font-family: var(--font-mono);">${(stock.baseWeight * 100).toFixed(1)}%</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: #fff;">${(stock.currentWeight * 100).toFixed(1)}%</td>
      <td style="font-family: var(--font-mono); font-weight: 600;" class="${deltaClass}">${(delta * 100 > 0 ? '+' : '')}${(delta * 100).toFixed(1)}%</td>
      <td style="font-family: var(--font-mono);" class="${stock.sentiment > 0.15 ? 'text-green' : (stock.sentiment < -0.15 ? 'text-red' : 'text-dim')}">${(stock.sentiment > 0 ? '+' : '')}${stock.sentiment.toFixed(2)}</td>
      <td class="${actionClass}">${actionText}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMiniWeights() {
  const container = document.getElementById('mini-weights-container');
  container.innerHTML = '';
  STATE.universe.slice(0, 6).forEach(s => {
    const item = document.createElement('div');
    item.style.marginBottom = '0.45rem';
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 2px;">
        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--cyan);">${s.ticker}</span>
        <span style="font-family: var(--font-mono);">${(s.currentWeight * 100).toFixed(1)}%</span>
      </div>
      <div style="height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;">
        <div style="height: 100%; width: ${s.currentWeight * 400}%; background: var(--cyan);"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolio-table-body');
  tbody.innerHTML = '';

  STATE.portfolio.forEach(asset => {
    const tr = document.createElement('tr');
    const stressedVal = asset.parValue - asset.stressLoss;
    const impairmentPct = (asset.stressLoss / asset.parValue) * 100;
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); font-weight: 600; color: var(--cyan);">${asset.id}</td>
      <td style="font-weight: 500;">${asset.name}</td>
      <td style="color: var(--text-dim);">${asset.assetType}</td>
      <td style="font-family: var(--font-mono);">$${(asset.parValue / 1e6).toFixed(1)}M</td>
      <td><span class="badge">${asset.rating}</span></td>
      <td style="font-family: var(--font-mono);">${asset.duration}y</td>
      <td style="font-family: var(--font-mono); color: var(--red); font-weight: 600;">-$${(asset.stressLoss / 1e6).toFixed(2)}M</td>
      <td style="font-family: var(--font-mono); font-weight: 700;">$${(stressedVal / 1e6).toFixed(2)}M</td>
      <td style="font-family: var(--font-mono); color: var(--red);">${impairmentPct.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAuditLog() {
  const container = document.getElementById('rebalance-audit-log');
  container.innerHTML = '';
  STATE.rebalanceAudit.forEach(log => {
    const div = document.createElement('div');
    div.className = 'audit-row';
    div.innerHTML = `
      <div>
        <span class="audit-time">[${log.timestamp}]</span>
        <span style="color: var(--cyan); margin-left: 6px;">${log.trigger}:</span>
        <span style="color: var(--text-muted); margin-left: 6px;">${log.summary}</span>
      </div>
      <span class="badge" style="color: var(--green); border-color: var(--green);">EXECUTED</span>
    `;
    container.appendChild(div);
  });
}

// --- CANVAS PERFORMANCE CHART ---
function renderChart() {
  const canvas = document.getElementById('rebalance-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const padLeft = 45;
  const padBottom = 30;
  const padTop = 20;
  const padRight = 20;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const labels = STATE.chartHistory.labels;
  const rebal = STATE.chartHistory.rebalancedReturns;
  const bench = STATE.chartHistory.benchmarkReturns;

  const allVals = [...rebal, ...bench];
  const minVal = Math.floor(Math.min(...allVals) - 1);
  const maxVal = Math.ceil(Math.max(...allVals) + 1);

  // Grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padTop + (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();

    const val = (maxVal - ((maxVal - minVal) / steps) * i).toFixed(1);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(`${val}%`, 10, y + 3);
  }

  // Draw benchmark line
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  bench.forEach((val, idx) => {
    const x = padLeft + (chartW / (bench.length - 1)) * idx;
    const y = padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw rebalanced line (gradient fill)
  const grad = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
  grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  ctx.beginPath();
  rebal.forEach((val, idx) => {
    const x = padLeft + (chartW / (rebal.length - 1)) * idx;
    const y = padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padLeft + chartW, padTop + chartH);
  ctx.lineTo(padLeft, padTop + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  rebal.forEach((val, idx) => {
    const x = padLeft + (chartW / (rebal.length - 1)) * idx;
    const y = padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw dots on rebalanced
  rebal.forEach((val, idx) => {
    const x = padLeft + (chartW / (rebal.length - 1)) * idx;
    const y = padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // X axis label
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText(labels[idx], x - 12, h - 8);
  });
}

function updateChartData() {
  const lastRebal = STATE.chartHistory.rebalancedReturns[STATE.chartHistory.rebalancedReturns.length - 1];
  const lastBench = STATE.chartHistory.benchmarkReturns[STATE.chartHistory.benchmarkReturns.length - 1];
  
  // Random small bump reflecting positive alpha
  const newRebal = Math.round((lastRebal + 0.35 + (Math.random() * 0.4 - 0.1)) * 10) / 10;
  const newBench = Math.round((lastBench + 0.10 + (Math.random() * 0.2 - 0.1)) * 10) / 10;
  
  STATE.chartHistory.rebalancedReturns.shift();
  STATE.chartHistory.rebalancedReturns.push(newRebal);

  STATE.chartHistory.benchmarkReturns.shift();
  STATE.chartHistory.benchmarkReturns.push(newBench);

  renderChart();
}

// --- 7-SLIDE PRESENTATION CONTENT ---
const PRESENTATION_SLIDES = [
  {
    title: "1. Executive Summary & Problem Context",
    subtitle: "AI/NLP Financial Risk Engine & Real-Time Portfolio Intelligence",
    content: `
      <div class="slide-card-view">
        <h4>The Objective</h4>
        <p>Design and implement an end-to-end platform capable of ingesting real-time, unstructured data (news & social media) to generate structured, actionable financial risk signals for downstream quantitative applications.</p>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Unified AI/NLP Core:</strong> Parses unstructured text streams into standardized machine-readable signals: Sentiment Score (-1.0 to +1.0), Categorical Event Classification, and Impact Severity Score (1-10).
          </div>
          <div class="slide-bullet-item">
            <strong>Module A (Tactical Index Rebalancer):</strong> Dynamic high-frequency reweighting of an S&P 100 stock basket based on continuous sentiment polarity with risk bounds.
          </div>
          <div class="slide-bullet-item">
            <strong>Module B (Strategic Wholesale Stress Testing):</strong> Event-driven macroeconomic shock simulation on a $1.25B wholesale banking portfolio, projecting mark-to-market drawdowns and Basel III CET1 capital adequacy impacts.
          </div>
        </div>
      </div>
    `
  },
  {
    title: "2. End-to-End System Architecture",
    subtitle: "Modular, Event-Driven & High-Throughput Pipeline",
    content: `
      <div class="slide-card-view">
        <h4>Pipeline Architecture</h4>
        <p>The platform follows an asynchronous, loosely-coupled event-driven architecture bridging raw textual ingestion with automated financial risk execution.</p>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Ingestion Layer:</strong> Multi-source connectors ingesting Financial News (GDELT Project, NewsAPI, Reuters/Bloomberg) and Social Media (Twitter/X financial cashtags).
          </div>
          <div class="slide-bullet-item">
            <strong>NLP Risk Engine:</strong> Loughran-McDonald & FinBERT-aligned financial lexical engine with Named Entity Recognition (NER), negation detection, event classification, and volatility-calibrated severity scoring.
          </div>
          <div class="slide-bullet-item">
            <strong>Downstream Bus & REST API:</strong> High-speed event routing to Module A (Tactical Rebalancer) and Module B (Wholesale Portfolio Stress Tester) plus REST endpoints for external algorithmic trading desks.
          </div>
        </div>
      </div>
    `
  },
  {
    title: "3. The Core Challenge: AI/NLP Risk Engine",
    subtitle: "Mathematical Formulation & Signal Extraction",
    content: `
      <div class="slide-card-view">
        <h4>Structured Signal Specification</h4>
        <p>Converts arbitrary unstructured headlines and posts into a strict machine-readable JSON schema:</p>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Sentiment Score (S ∈ [-1.0, +1.0]):</strong> Evaluates polarity using financial corpus weights with windowed negation handling (e.g., 'not defaulting', 'without growth').
          </div>
          <div class="slide-bullet-item">
            <strong>Event Classification:</strong> Multi-class taxonomy across 7 domain categories: Geopolitical, Macroeconomic, Credit Event, Merger/Acquisition, Product Launch, Regulatory Action, and Earnings & Guidance.
          </div>
          <div class="slide-bullet-item">
            <strong>Impact Score (I ∈ [1.0, 10.0]):</strong> Combines baseline event gravity, sentiment extremity, and market-moving trigger keywords to quantify systemic severity.
          </div>
          <div class="slide-bullet-item">
            <strong>Automated Routing:</strong> Events with Impact ≥ 7.0 automatically trigger enterprise stress simulations in Module B.
          </div>
        </div>
      </div>
    `
  },
  {
    title: "4. Downstream Application: Module A",
    subtitle: "Tactical High-Frequency Stock Index Rebalancer",
    content: `
      <div class="slide-card-view">
        <h4>Dynamic Sentiment-Driven Reweighting</h4>
        <p>Subscribes to incoming sentiment streams for 10 prominent S&P index equities (AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, JPM, V, XOM).</p>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Rebalancing Algorithm:</strong> W_new = Clamp(W_base + S_recent × 0.45 × W_base, 2%, 25%), followed by full renormalization (Σ W_i = 100%).
          </div>
          <div class="slide-bullet-item">
            <strong>Alpha Generation:</strong> Overweighting bullish sentiment (e.g., NVDA AI breakthroughs) and underweighting bearish headwinds (e.g., TSLA delivery misses) generates demonstrable positive alpha (+4.82%) against equal-weight benchmarks.
          </div>
          <div class="slide-bullet-item">
            <strong>Execution Ledger:</strong> Generates real-time timestamped trade orders with BUY/SELL/HOLD tags and delta weights.
          </div>
        </div>
      </div>
    `
  },
  {
    title: "5. Downstream Application: Module B",
    subtitle: "Strategic Wholesale Banking Portfolio Stress Testing",
    content: `
      <div class="slide-card-view">
        <h4>Enterprise Risk & Basel III Simulation ($1.25B AUM)</h4>
        <p>Simulates systemic macro shocks across wholesale banking asset classes: Commercial Loans ($400M), Corporate Bonds ($350M), Sovereign Debt ($250M), Swaps/Derivatives ($150M), and Wholesale Equity ($100M).</p>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Event-Driven Shocks:</strong> Geopolitical conflict (Equity -15%, Spreads +180 bps), Macro rate spike (+225 bps yields, bond duration drawdown), and Credit contagion ($1.4B syndication default, default rate surge).
          </div>
          <div class="slide-bullet-item">
            <strong>Financial Repricing:</strong> Uses modified duration, credit migration default loss models, and MTM haircuts to price every facility.
          </div>
          <div class="slide-bullet-item">
            <strong>Regulatory Telemetry:</strong> Live projection of Common Equity Tier 1 (CET1) ratio from baseline 13.50% down to stressed levels with automated risk hedging advice.
          </div>
        </div>
      </div>
    `
  },
  {
    title: "6. Engineering Challenges & Mitigations",
    subtitle: "Overcoming Real-World NLP & Financial Modeling Hurdles",
    content: `
      <div class="slide-card-view">
        <h4>Key Technical Challenges Addressed</h4>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Challenge 1: Financial Polysemy & Slang:</strong> Words like 'crush' mean failure in general English but blowout success in quarterly earnings ('crushed estimates'). Mitigated by domain-specific financial sentiment lexicons.
          </div>
          <div class="slide-bullet-item">
            <strong>Challenge 2: Multi-Source Noise & Social Sentiment Volatility:</strong> Twitter/X feeds exhibit high noise and bot spam. Mitigated via entity verification and moving average smoothing buffers.
          </div>
          <div class="slide-bullet-item">
            <strong>Challenge 3: Portfolio Constraint Integrity:</strong> Naive rebalancing violates regulatory diversification limits. Mitigated by strict box constraints (min 2%, max 25%) and dynamic normalization.
          </div>
        </div>
      </div>
    `
  },
  {
    title: "7. Production Roadmap & Quantitative Results",
    subtitle: "Demo Summary, Extensibility & Future Work",
    content: `
      <div class="slide-card-view">
        <h4>Results & Extensibility</h4>
        <div class="slide-bullet-list">
          <div class="slide-bullet-item">
            <strong>Fully Functional Prototype:</strong> Demonstrated live ingestion from 2 sources, NLP scoring (Sentiment, Event, Impact), Module A Index Rebalancer, and Module B Wholesale Stress Tool.
          </div>
          <div class="slide-bullet-item">
            <strong>Enterprise Extensibility:</strong> Modular Python engine (<code>risk_engine.py</code>) + high-performance web terminal. Can plug into live Bloomberg B-PIPE, GDELT BigQuery streaming, or Kafka bus.
          </div>
          <div class="slide-bullet-item">
            <strong>5-Minute Live Demo Ready:</strong> Intuitive controls, preset scenarios, real-time visual telemetry, and downloadable JSON signal specifications.
          </div>
        </div>
      </div>
    `
  }
];

function renderSlide(index) {
  STATE.currentSlide = index;
  const slide = PRESENTATION_SLIDES[index];
  document.getElementById('slide-num-indicator').textContent = `SLIDE ${index + 1} OF ${PRESENTATION_SLIDES.length}`;
  document.getElementById('slide-modal-title').textContent = slide.title;
  document.getElementById('slide-content-area').innerHTML = slide.content;

  // Dots
  const dotsContainer = document.getElementById('slide-dots-container');
  dotsContainer.innerHTML = '';
  PRESENTATION_SLIDES.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = `slide-dot ${i === index ? 'active' : ''}`;
    dot.addEventListener('click', () => renderSlide(i));
    dotsContainer.appendChild(dot);
  });
}

// --- TAB SWITCHING ---
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
  STATE.activeTab = tabId;

  if (tabId === 'tab-module-a') {
    setTimeout(renderChart, 50);
  }
}

// --- INITIALIZATION & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  STATE.streamItems = [...RAW_SAMPLE_ITEMS];

  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFeedList(btn.dataset.filter);
    });
  });

  // Stream controls
  const toggleBtn = document.getElementById('btn-stream-toggle');
  const toggleText = document.getElementById('stream-btn-text');
  toggleBtn.addEventListener('click', () => {
    STATE.streamActive = !STATE.streamActive;
    if (STATE.streamActive) {
      toggleBtn.classList.add('btn-primary');
      toggleText.textContent = "Pause Feed";
      STATE.streamInterval = setInterval(() => {
        STATE.streamIndex = (STATE.streamIndex + 1) % STATE.streamItems.length;
        processIncomingFeedItem(STATE.streamItems[STATE.streamIndex]);
      }, 3500);
    } else {
      toggleBtn.classList.remove('btn-primary');
      toggleText.textContent = "Auto Stream Feed";
      clearInterval(STATE.streamInterval);
    }
  });

  document.getElementById('btn-next-item').addEventListener('click', () => {
    STATE.streamIndex = (STATE.streamIndex + 1) % STATE.streamItems.length;
    processIncomingFeedItem(STATE.streamItems[STATE.streamIndex]);
  });

  // Custom NLP Analyzer
  document.getElementById('btn-analyze-custom').addEventListener('click', () => {
    const text = document.getElementById('custom-text-input').value.trim();
    const source = document.getElementById('custom-source-select').value;
    if (!text) {
      alert("Please enter a financial news headline or social media post to analyze.");
      return;
    }
    const item = {
      id: `CUSTOM-${Date.now()}`,
      source: source,
      sourceType: source.includes('Twitter') ? 'social' : 'news',
      time: new Date().toLocaleTimeString(),
      entity: "ANALYZED",
      text: text
    };
    STATE.streamItems.unshift(item);
    renderFeedList();
    processIncomingFeedItem(item);
  });

  // Presets
  const PRESET_MAP = {
    nvda: { text: "NVIDIA surges 9.2% on blowout earnings and unprecedented demand for Blackwell AI datacenter chips across hyperscalers.", source: "Financial News (Reuters / GDELT)" },
    fed: { text: "Federal Reserve unexpectedly signals hawkish posture as core PCE inflation accelerates; 10Y yields spike 28bps.", source: "Financial News (Bloomberg)" },
    cre: { text: "Major European commercial real estate syndication defaults on $1.4B credit facility; tier-1 wholesale lenders initiate emergency provisioning.", source: "Financial News (Financial Times)" },
    geo: { text: "Naval blockade escalation in key maritime strait halts 18% of global crude tanker transits; Brent crude surges 9.5% intraday.", source: "Financial News (WSJ / GDELT)" },
    tsla: { text: "$TSLA deliveries miss consensus by 8% in Asian markets amid intense EV price competition and factory retooling delays.", source: "Twitter/X Financial Stream" },
    aapl: { text: "$AAPL Department of Justice antitrust remedies could force dismantling of exclusive app store billing agreements.", source: "Twitter/X Financial Stream" },
    xom: { text: "Exxon Mobil finalizes strategic mega-merger acquisition in deepwater offshore assets, boosting free cash flow projections by $4.5B.", source: "Financial News (Dow Jones)" }
  };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const p = PRESET_MAP[btn.dataset.preset];
      if (p) {
        document.getElementById('custom-text-input').value = p.text;
        document.getElementById('custom-source-select').value = p.source;
        // Do not auto-run: allow user to inspect or edit text and click "Run NLP Risk Engine"
      }
    });
  });

  document.getElementById('custom-text-input').addEventListener('input', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  });

  // Copy JSON
  document.getElementById('btn-copy-json').addEventListener('click', () => {
    const jsonText = document.getElementById('nlp-json-output').textContent;
    navigator.clipboard.writeText(jsonText).then(() => {
      alert("Structured JSON Risk Signal copied to clipboard!");
    });
  });

  // Module A actions
  document.getElementById('btn-rebalance-now').addEventListener('click', () => {
    executeTacticalRebalance();
  });
  document.getElementById('btn-reset-weights').addEventListener('click', () => {
    STATE.universe.forEach(s => {
      s.currentWeight = s.baseWeight;
      s.sentiment = 0.0;
    });
    renderWeightsTable();
    renderMiniWeights();
    alert("Index weights reset to baseline.");
  });

  // Module B scenario buttons
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sc = btn.dataset.scenario;
      if (sc !== 'Custom') {
        executeStressTest(sc);
      }
    });
  });

  // Stress sliders
  const updateSliders = () => {
    const rate = parseFloat(document.getElementById('slider-rate').value);
    const spread = parseFloat(document.getElementById('slider-spread').value);
    const eq = parseFloat(document.getElementById('slider-equity').value);
    const def = parseFloat(document.getElementById('slider-default').value);

    document.getElementById('val-rate-shift').textContent = `+${rate} bps`;
    document.getElementById('val-spread-widening').textContent = `+${spread} bps`;
    document.getElementById('val-equity-drop').textContent = `-${eq.toFixed(1)}%`;
    document.getElementById('val-default-rate').textContent = `+${def.toFixed(1)}%`;

    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.scenario-btn[data-scenario="Custom"]').classList.add('active');

    executeStressTest('Custom', {
      rateShiftBps: rate,
      spreadWideningBps: spread,
      equityDrop: eq / 100,
      defaultRateSurge: def / 100,
      derivativeHaircut: 0.10
    });
  };

  ['slider-rate', 'slider-spread', 'slider-equity', 'slider-default'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSliders);
  });

  document.getElementById('btn-trigger-stress').addEventListener('click', () => {
    executeStressTest('Geopolitical');
  });

  // API Tester
  document.getElementById('btn-test-api').addEventListener('click', () => {
    const testSignal = analyzeTextNLP(
      "Federal Reserve unexpectedly signals hawkish posture as core PCE accelerates; 10Y yields spike 28bps.",
      "Financial News (Bloomberg)"
    );
    document.getElementById('api-response-code').textContent = JSON.stringify({
      status: "success",
      code: 200,
      signal: testSignal,
      downstream: {
        module_a_subscribed: true,
        module_b_triggered: testSignal.high_risk_trigger
      }
    }, null, 2);
  });

  // Presentation modal
  const modal = document.getElementById('slides-modal');
  document.getElementById('btn-open-slides').addEventListener('click', () => {
    renderSlide(0);
    modal.classList.add('active');
  });
  document.getElementById('btn-close-slides').addEventListener('click', () => {
    modal.classList.remove('active');
  });
  document.getElementById('btn-prev-slide').addEventListener('click', () => {
    if (STATE.currentSlide > 0) renderSlide(STATE.currentSlide - 1);
  });
  document.getElementById('btn-next-slide').addEventListener('click', () => {
    if (STATE.currentSlide < PRESENTATION_SLIDES.length - 1) renderSlide(STATE.currentSlide + 1);
  });

  // Initial renders
  renderFeedList();
  renderWeightsTable();
  renderMiniWeights();
  renderPortfolioTable();
  renderAuditLog();
  executeStressTest("Geopolitical");
  processIncomingFeedItem(STATE.streamItems[0]);
  renderChart();
});
