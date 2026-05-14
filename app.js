const page = document.body.dataset.page;

function setupGridHover() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const gridSize = 34;
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const glow = { x: mouse.x, y: mouse.y, opacity: 0 };
  let isHovering = false;
  let width = 0;
  let height = 0;

  canvas.className = "grid-hover-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawLine(x1, y1, x2, y2, alpha, widthValue) {
    context.strokeStyle = `rgba(21, 245, 186, ${alpha})`;
    context.lineWidth = widthValue;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  function render() {
    glow.x += (mouse.x - glow.x) * 0.12;
    glow.y += (mouse.y - glow.y) * 0.12;
    glow.opacity += ((isHovering ? 1 : 0) - glow.opacity) * 0.08;

    context.clearRect(0, 0, width, height);

    if (glow.opacity > 0.01) {
      const nearestX = Math.round(glow.x / gridSize) * gridSize;
      const nearestY = Math.round(glow.y / gridSize) * gridSize;
      const radius = 150;
      const verticalGradient = context.createLinearGradient(nearestX, glow.y - radius, nearestX, glow.y + radius);
      const horizontalGradient = context.createLinearGradient(glow.x - radius, nearestY, glow.x + radius, nearestY);
      const alpha = 0.5 * glow.opacity;

      verticalGradient.addColorStop(0, "rgba(21, 245, 186, 0)");
      verticalGradient.addColorStop(0.5, `rgba(21, 245, 186, ${alpha})`);
      verticalGradient.addColorStop(1, "rgba(21, 245, 186, 0)");
      horizontalGradient.addColorStop(0, "rgba(21, 245, 186, 0)");
      horizontalGradient.addColorStop(0.5, `rgba(21, 245, 186, ${alpha})`);
      horizontalGradient.addColorStop(1, "rgba(21, 245, 186, 0)");

      context.lineCap = "round";
      context.strokeStyle = verticalGradient;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(nearestX, glow.y - radius);
      context.lineTo(nearestX, glow.y + radius);
      context.stroke();

      context.strokeStyle = horizontalGradient;
      context.beginPath();
      context.moveTo(glow.x - radius, nearestY);
      context.lineTo(glow.x + radius, nearestY);
      context.stroke();

      drawLine(nearestX, glow.y - 26, nearestX, glow.y + 26, 0.16 * glow.opacity, 5);
      drawLine(glow.x - 26, nearestY, glow.x + 26, nearestY, 0.16 * glow.opacity, 5);
    }

    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointermove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    isHovering = true;
  });
  window.addEventListener("pointerleave", () => {
    isHovering = false;
  });

  resizeCanvas();
  render();
}

setupGridHover();

document.querySelectorAll("[data-nav]").forEach((link) => {
  if (link.dataset.nav === page) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
});

const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");

navToggle?.addEventListener("click", () => {
  const isOpen = siteHeader?.classList.toggle("nav-open") || false;
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    siteHeader?.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const coinMeta = {
  ethereum: { name: "Ethereum", symbol: "ETH" },
  bitcoin: { name: "Bitcoin", symbol: "BTC" },
  solana: { name: "Solana", symbol: "SOL" },
  "polygon-ecosystem-token": { name: "Polygon", symbol: "MATIC" },
  arbitrum: { name: "Arbitrum", symbol: "ARB" },
};

let marketData = [];
let selectedChartCoin = "ethereum";

async function loadPrices() {
  const grid = document.querySelector("#priceGrid");
  const message = document.querySelector("#priceMessage");
  const button = document.querySelector("#refreshPrices");

  if (!grid || !message) return;

  const ids = Object.keys(coinMeta).join(",");
  const endpoint = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=5&page=1&sparkline=true&price_change_percentage=24h`;

  message.textContent = "Fetching latest prices from CoinGecko...";
  if (button) button.disabled = true;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("CoinGecko request failed");
    marketData = (await response.json()).filter((coin) => typeof coin.current_price === "number");

    grid.innerHTML = marketData
      .map((coin) => {
        const meta = coinMeta[coin.id] || { name: coin.name, symbol: coin.symbol.toUpperCase() };
        const price = coin.current_price;
        const change = coin.price_change_percentage_24h;
        const direction = change >= 0 ? "up" : "down";
        const label = change >= 0 ? "Up" : "Down";

        return `
          <article class="price-card" data-chart-coin="${coin.id}">
            <span class="coin-symbol">${meta.symbol}</span>
            <h2>${meta.name}</h2>
            <p class="price-value">${formatUsd(price)}</p>
            <p class="change ${direction}">
              <span class="arrow ${direction}" aria-hidden="true"></span>
              <span>${label} ${Math.abs(change || 0).toFixed(2)}% in 24h</span>
            </p>
            ${createSparkline(coin.sparkline_in_7d?.price || [], direction)}
          </article>
        `;
      })
      .join("");

    renderChartTabs();
    renderMarketChart(selectedChartCoin);
    document.querySelectorAll("[data-chart-coin]").forEach((card) => {
      card.addEventListener("click", () => selectChartCoin(card.dataset.chartCoin));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectChartCoin(card.dataset.chartCoin);
        }
      });
    });
    syncActivePriceCards();
    message.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    message.textContent = "Could not load live prices. Check your connection and try Refresh.";
  } finally {
    if (button) button.disabled = false;
  }
}

function formatUsd(value) {
  if (typeof value !== "number") return "$--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(value);
}

function selectChartCoin(coinId) {
  selectedChartCoin = coinId;
  renderChartTabs();
  renderMarketChart(coinId);
  syncActivePriceCards();
}

function syncActivePriceCards() {
  document.querySelectorAll("[data-chart-coin]").forEach((card) => {
    const isActive = card.dataset.chartCoin === selectedChartCoin;
    card.classList.toggle("active", isActive);
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", String(isActive));
    card.setAttribute("tabindex", "0");
  });
}

function renderChartTabs() {
  const tabs = document.querySelector("#chartTabs");
  if (!tabs || !marketData.length) return;

  tabs.innerHTML = marketData
    .map((coin) => {
      const meta = coinMeta[coin.id] || { symbol: coin.symbol.toUpperCase() };
      const active = coin.id === selectedChartCoin ? "active" : "";
      return `<button class="${active}" type="button" data-tab-coin="${coin.id}">${meta.symbol}</button>`;
    })
    .join("");

  tabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectChartCoin(button.dataset.tabCoin));
  });
}

function renderMarketChart(coinId) {
  const svg = document.querySelector("#marketChart");
  const title = document.querySelector("#chartTitle");
  if (!svg || !marketData.length) return;

  const coin = marketData.find((item) => item.id === coinId) || marketData[0];
  const meta = coinMeta[coin.id] || { name: coin.name, symbol: coin.symbol.toUpperCase() };
  const points = coin.sparkline_in_7d?.price?.length
    ? coin.sparkline_in_7d.price
    : createFallbackTrend(coin.current_price, coin.price_change_percentage_24h);
  const path = createChartPath(points, 900, 320, 26);
  const areaPath = `${path} L 874 294 L 26 294 Z`;
  const direction = (points[points.length - 1] || 0) >= (points[0] || 0) ? "up" : "down";
  const stroke = direction === "up" ? "#15F5BA" : "#ff6b6b";
  const lastY = getChartY(points, points.length - 1, 320, 26);

  selectedChartCoin = coin.id;
  title.textContent = `${meta.name} trend`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${stroke}" stop-opacity="0.32"></stop>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="898" height="318" rx="28" fill="#211951"></rect>
    <g stroke="#836FFF" stroke-opacity="0.18" stroke-width="1">
      <line x1="50" y1="70" x2="850" y2="70"></line>
      <line x1="50" y1="155" x2="850" y2="155"></line>
      <line x1="50" y1="240" x2="850" y2="240"></line>
    </g>
    <path d="${areaPath}" fill="url(#chartFill)"></path>
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
    <circle cx="874" cy="${lastY.toFixed(2)}" r="7" fill="${stroke}"></circle>
    <text x="52" y="48" fill="#F0F3FF" font-size="18" font-weight="800">${meta.symbol} ${formatUsd(coin.current_price)}</text>
    <text x="52" y="284" fill="#F0F3FF" opacity="0.72" font-size="14">Live CoinGecko sparkline, 7 days</text>
    <g class="chart-hover" opacity="0">
      <line id="chartHoverLine" x1="26" y1="42" x2="26" y2="294" stroke="#F0F3FF" stroke-opacity="0.42" stroke-width="2" stroke-dasharray="6 8"></line>
      <circle id="chartHoverDot" cx="26" cy="294" r="8" fill="${stroke}" stroke="#F0F3FF" stroke-width="3"></circle>
      <g id="chartTooltip" transform="translate(44 62)">
        <rect width="168" height="64" rx="14" fill="#F8FAFF" stroke="#836FFF" stroke-opacity="0.35"></rect>
        <text id="chartTooltipPrice" x="16" y="26" fill="#211951" font-size="16" font-weight="800"></text>
        <text id="chartTooltipTime" x="16" y="48" fill="#615B86" font-size="12" font-weight="800"></text>
      </g>
    </g>
    <rect id="chartHitArea" x="26" y="26" width="848" height="268" fill="transparent"></rect>
  `;

  setupChartInteraction(svg, points, meta.symbol);
}

function createSparkline(points, direction) {
  if (!points.length) return "";
  const path = createChartPath(points.slice(-32), 180, 58, 4);
  const color = direction === "up" ? "#15F5BA" : "#ff6b6b";
  return `
    <svg class="mini-chart" viewBox="0 0 180 58" aria-hidden="true">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function createFallbackTrend(price, change) {
  const start = price / (1 + (change || 0) / 100);
  return Array.from({ length: 32 }, (_, index) => {
    const progress = index / 31;
    const wave = Math.sin(index * 0.9) * price * 0.006;
    return start + (price - start) * progress + wave;
  });
}

function createChartPath(points, width, height, padding) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points
    .map((value, index) => {
      const x = padding + (index / (points.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getChartY(points, index, height, padding) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const value = points[index] ?? points[points.length - 1];
  return height - padding - ((value - min) / range) * (height - padding * 2);
}

function getChartX(index, total, width, padding) {
  return padding + (index / (total - 1 || 1)) * (width - padding * 2);
}

function setupChartInteraction(svg, points, symbol) {
  const hover = svg.querySelector(".chart-hover");
  const line = svg.querySelector("#chartHoverLine");
  const dot = svg.querySelector("#chartHoverDot");
  const tooltip = svg.querySelector("#chartTooltip");
  const priceText = svg.querySelector("#chartTooltipPrice");
  const timeText = svg.querySelector("#chartTooltipTime");
  const hitArea = svg.querySelector("#chartHitArea");

  if (!hover || !line || !dot || !tooltip || !priceText || !timeText || !hitArea) return;

  function updateFromPointer(event) {
    const rect = svg.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * 900;
    const clampedX = Math.min(874, Math.max(26, viewX));
    const index = Math.round(((clampedX - 26) / 848) * (points.length - 1));
    const x = getChartX(index, points.length, 900, 26);
    const y = getChartY(points, index, 320, 26);
    const tooltipX = x > 690 ? x - 186 : x + 18;
    const tooltipY = y > 220 ? y - 82 : y + 18;
    const daysAgo = Math.max(0, 7 - (index / (points.length - 1 || 1)) * 7);

    hover.setAttribute("opacity", "1");
    line.setAttribute("x1", x.toFixed(2));
    line.setAttribute("x2", x.toFixed(2));
    dot.setAttribute("cx", x.toFixed(2));
    dot.setAttribute("cy", y.toFixed(2));
    tooltip.setAttribute("transform", `translate(${tooltipX.toFixed(2)} ${tooltipY.toFixed(2)})`);
    priceText.textContent = `${symbol} ${formatUsd(points[index])}`;
    timeText.textContent = index === points.length - 1 ? "Latest point" : `${daysAgo.toFixed(1)} days ago`;
  }

  hitArea.addEventListener("pointermove", updateFromPointer);
  hitArea.addEventListener("pointerdown", updateFromPointer);
  hitArea.addEventListener("pointerleave", () => hover.setAttribute("opacity", "0"));
}

document.querySelector("#refreshPrices")?.addEventListener("click", loadPrices);
if (page === "prices") loadPrices();

const minedHashes = { 1: "", 2: "" };

function getBlockElements(blockNumber) {
  return {
    data: document.querySelector(`#data${blockNumber}`),
    previous: document.querySelector(`#prev${blockNumber}`),
    nonce: document.querySelector(`#nonce${blockNumber}`),
    hash: document.querySelector(`#hash${blockNumber}`),
    validity: document.querySelector(`#validity${blockNumber}`),
    button: document.querySelector(`[data-mine="${blockNumber}"]`),
  };
}

async function sha256(text) {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function calculateHash(blockNumber) {
  const block = getBlockElements(blockNumber);
  return sha256(`${block.previous.value}|${block.data.value}|${block.nonce.value}`);
}

function setValidity(blockNumber, isValid) {
  const block = getBlockElements(blockNumber);
  block.validity.textContent = isValid ? "Block Valid" : "Block Invalid";
  block.validity.classList.toggle("valid", isValid);
}

async function refreshBlockState() {
  if (page !== "simulator") return;

  const block1 = getBlockElements(1);
  const block2 = getBlockElements(2);
  const currentHash1 = await calculateHash(1);

  if (!minedHashes[1]) {
    block1.hash.textContent = "Not mined yet";
    block2.previous.value = "";
  } else {
    block1.hash.textContent = currentHash1;
    block2.previous.value = currentHash1;
  }

  const block1Valid = Boolean(minedHashes[1]) && currentHash1 === minedHashes[1] && currentHash1.startsWith("00");
  setValidity(1, block1Valid);

  if (!minedHashes[2]) {
    block2.hash.textContent = "Not mined yet";
    setValidity(2, false);
    return;
  }

  const currentHash2 = await calculateHash(2);
  block2.hash.textContent = currentHash2;
  const block2Valid = block1Valid && currentHash2 === minedHashes[2] && currentHash2.startsWith("00");
  setValidity(2, block2Valid);
}

async function mineBlock(blockNumber) {
  const block = getBlockElements(blockNumber);
  block.button.disabled = true;
  block.button.textContent = "Mining...";

  let nonce = Number(block.nonce.value) || 0;
  let hash = "";

  do {
    block.nonce.value = nonce;
    hash = await calculateHash(blockNumber);
    nonce += 1;
  } while (!hash.startsWith("00"));

  minedHashes[blockNumber] = hash;
  block.hash.textContent = hash;
  block.button.disabled = false;
  block.button.textContent = `Mine Block ${blockNumber}`;

  await refreshBlockState();
}

if (page === "simulator") {
  document.querySelectorAll("textarea, input[type='number']").forEach((input) => {
    input.addEventListener("input", refreshBlockState);
  });

  document.querySelectorAll("[data-mine]").forEach((button) => {
    button.addEventListener("click", () => mineBlock(Number(button.dataset.mine)));
  });

  refreshBlockState();
}
