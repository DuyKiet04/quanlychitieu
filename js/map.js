/* ==========================================================================
   SPENDING MAP & GEO-ANALYTICS CONTROLLER (MODERN FINTECH MAP RADAR)
   ========================================================================== */

const KNOWN_GEO_LOCATIONS = [
  {
    keywords: ["nguyễn huệ", "bến nghé", "q.1", "quận 1"],
    lat: 10.7744,
    lng: 106.7027,
    name: "Bến Nghé, Quận 1",
  },
  {
    keywords: ["lê duẩn", "nhà thờ", "bưu điện", "diamond"],
    lat: 10.7828,
    lng: 106.6993,
    name: "Bến Nghé, Quận 1",
  },
  {
    keywords: ["landmark", "bình thạnh", "phường 22", "vinhomes"],
    lat: 10.795,
    lng: 106.7218,
    name: "Phường 22, Bình Thạnh",
  },
  {
    keywords: ["thảo điền", "thủ đức", "quận 2", "an phú"],
    lat: 10.8035,
    lng: 106.736,
    name: "Thảo Điền, TP. Thủ Đức",
  },
  {
    keywords: ["bến thành", "lê lợi", "chợ bến thành"],
    lat: 10.7725,
    lng: 106.698,
    name: "Bến Thành, Quận 1",
  },
  {
    keywords: ["hồ con rùa", "quận 3", "võ văn tần", "trần cao vân"],
    lat: 10.7826,
    lng: 106.6961,
    name: "Võ Thị Sáu, Quận 3",
  },
  {
    keywords: ["phú mỹ hưng", "quận 7", "tân phong", "crescent"],
    lat: 10.7294,
    lng: 106.7118,
    name: "Tân Phong, Quận 7",
  },
  {
    keywords: ["tân sơn nhất", "tân bình", "trường sơn", "sân bay"],
    lat: 10.8164,
    lng: 106.6653,
    name: "Phường 2, Tân Bình",
  },
  {
    keywords: ["phú nhuận", "phan xích long", "hoa phượng"],
    lat: 10.796,
    lng: 106.6872,
    name: "Phường 2, Phú Nhuận",
  },
  {
    keywords: ["quận 10", "sư vạn hạnh", "vạn hạnh mall"],
    lat: 10.7712,
    lng: 106.6685,
    name: "Phường 12, Quận 10",
  },
  {
    keywords: ["gò vấp", "quang trung", "phan văn trị"],
    lat: 10.8385,
    lng: 106.6658,
    name: "Phường 10, Gò Vấp",
  },
];

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function resolveTransactionCoordinates(tx) {
  if (
    tx.location &&
    typeof tx.location === "object" &&
    tx.location.lat &&
    tx.location.lng
  ) {
    return {
      lat: Number(tx.location.lat),
      lng: Number(tx.location.lng),
      address: tx.location.address || "",
    };
  }
  const textToSearch = (
    (tx.location?.address || "") +
    " " +
    (tx.note || "")
  ).toLowerCase();
  if (textToSearch.trim()) {
    for (const loc of KNOWN_GEO_LOCATIONS) {
      if (loc.keywords.some((k) => textToSearch.includes(k))) {
        return {
          lat: loc.lat,
          lng: loc.lng,
          address: loc.name,
          isEstimated: true,
        };
      }
    }
  }
  return null;
}

/**
 * Initialize Leaflet Map with Google Maps / Modern Tiles
 */
function initSpendingMap() {
  const container = document.getElementById("spendingMapContainer");
  if (!container) return;
  if (spendingMap) return;
  if (typeof L === "undefined") {
    console.warn("Leaflet is not loaded yet");
    return;
  }

  spendingMap = L.map("spendingMapContainer", {
    zoomControl: false,
    attributionControl: false,
    maxZoom: 20,
    minZoom: 5,
  }).setView([10.7769, 106.7009], 13); // Default to center of Ho Chi Minh City

  State.mapLayerType = State.mapLayerType || "digital";
  State.mapHeatmapEnabled = State.mapHeatmapEnabled ?? false;

  mapTileLayer = getMapTileLayer(State.mapLayerType);
  mapTileLayer.addTo(spendingMap);

  spendingHeatmapLayer = L.layerGroup().addTo(spendingMap);
  mapMarkersLayer = L.layerGroup().addTo(spendingMap);

  // Update visible stats & heatmap on pan / zoom
  spendingMap.on("moveend", () => {
    updateMapVisibleStats();
  });
}

/**
 * Multi-Provider Map Tiles (Google Maps, Esri ArcGIS, OpenStreetMap)
 */
function getMapTileLayer(type = "digital") {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  if (type === "satellite" || type === "google_satellite") {
    // 1. Google Maps Vệ tinh Hybrid: Ảnh vệ tinh siêu nét + Tên đường tiếng Việt
    return L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        attribution: "© Google Maps Satellite",
      }
    );
  } else if (type === "esri" || type === "arcgis") {
    // 2. Esri ArcGIS World Street Map: Đô thị chuyên nghiệp, sạch sẽ, không đỏ, không rối
    return L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "© Esri ArcGIS",
      }
    );
  } else if (type === "osm") {
    // 3. OpenStreetMap Chuẩn (Bản đồ chuẩn quốc tế, không màu đỏ)
    return L.tileLayer(
      "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      {
        subdomains: ["a", "b", "c"],
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }
    );
  } else {
    // 4. Mặc định: Bản đồ số Google Maps (tiếng Việt)
    if (isDark) {
      // Esri ArcGIS Dark Gray Canvas cho Dark Mode
      return L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "© Esri ArcGIS Dark",
        }
      );
    } else {
      // Google Maps Bản đồ số tiếng Việt: hiển thị đầy đủ tên đường, ngõ hẻm chuẩn VN
      return L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
        {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 20,
          attribution: "© Google Maps",
        }
      );
    }
  }
}

function switchGoogleMapLayer() {
  if (!spendingMap) return;
  const layers = ["digital", "satellite", "esri", "osm"];
  let curIdx = layers.indexOf(State.mapLayerType);
  if (curIdx === -1) curIdx = 0;
  State.mapLayerType = layers[(curIdx + 1) % layers.length];

  if (mapTileLayer) spendingMap.removeLayer(mapTileLayer);
  mapTileLayer = getMapTileLayer(State.mapLayerType);
  mapTileLayer.addTo(spendingMap);

  const label = document.getElementById("mapFabLayerBadge") || document.getElementById("mapFabLayerLabel");
  const layerInfo = {
    digital: { label: "Google", toast: "Đã đổi sang: Google Maps Số (Tiếng Việt)" },
    satellite: { label: "Vệ tinh", toast: "Đã đổi sang: Google Maps Vệ tinh Hybrid" },
    esri: { label: "ArcGIS", toast: "Đã đổi sang: Esri ArcGIS World Street" },
    osm: { label: "OSM", toast: "Đã đổi sang: OpenStreetMap Chuẩn" },
  };

  const current = layerInfo[State.mapLayerType] || layerInfo.digital;
  if (label) label.textContent = current.label;
  showToast(current.toast);
}

/**
 * Toggle Spending Heatmap
 */
function toggleMapHeatmap() {
  State.mapHeatmapEnabled = !State.mapHeatmapEnabled;
  const badge = document.getElementById("mapHeatmapBadge");
  if (badge) {
    if (State.mapHeatmapEnabled) {
      badge.textContent = "ON";
      badge.setAttribute("data-status", "on");
      badge.classList.add("active");
      showToast("Heatmap chi tiêu: Đang BẬT");
    } else {
      badge.textContent = "OFF";
      badge.setAttribute("data-status", "off");
      badge.classList.remove("active");
      showToast("Heatmap chi tiêu: Đã TẮT");
    }
  }
  renderSpendingMapScreen();
}

/**
 * Update map tile on light/dark mode switch
 */
function updateMapThemeLayer(forceType = null) {
  if (!spendingMap) return;
  if (forceType) State.mapLayerType = forceType;
  if (mapTileLayer) spendingMap.removeLayer(mapTileLayer);
  mapTileLayer = getMapTileLayer(State.mapLayerType || "digital");
  mapTileLayer.addTo(spendingMap);
}

/**
 * Render Financial Heatmap Overlay
 */
function renderSpendingHeatmap(locatedTxs) {
  if (!spendingHeatmapLayer) return;
  spendingHeatmapLayer.clearLayers();

  if (!State.mapHeatmapEnabled || !locatedTxs || locatedTxs.length === 0) return;

  // Group expenses by coordinates
  const heatPoints = {};
  locatedTxs.forEach(({ tx, coords }) => {
    if (tx.type !== "expense") return;
    const key = `${coords.lat.toFixed(3)}_${coords.lng.toFixed(3)}`;
    if (!heatPoints[key]) {
      heatPoints[key] = {
        lat: coords.lat,
        lng: coords.lng,
        totalExp: 0,
        count: 0,
      };
    }
    heatPoints[key].totalExp += Number(tx.amount) || 0;
    heatPoints[key].count++;
  });

  Object.values(heatPoints).forEach((pt) => {
    // Dynamic atmospheric radiant aura (140px to 260px)
    const size = Math.min(260, Math.max(140, Math.round(Math.log10(pt.totalExp + 1000) * 36)));
    const icon = L.divIcon({
      className: "heatmap-div-icon",
      html: `<div class="heatmap-glow-circle" style="width: ${size}px; height: ${size}px;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    L.marker([pt.lat, pt.lng], { icon: icon, interactive: false }).addTo(spendingHeatmapLayer);
  });
}

/**
 * Render Full Spending Map Screen
 */
function renderSpendingMapScreen() {
  initSpendingMap();
  if (!spendingMap) return;

  setTimeout(() => {
    if (spendingMap) spendingMap.invalidateSize();
  }, 100);

  const period = State.mapPeriod || "this_month";
  const type = State.mapType || "all";
  const search = (State.mapSearch || "").toLowerCase().trim();
  const radiusKm = Number(State.mapRadius) || 0;
  const userLoc = State.userGpsCoords;

  const { startStr, endStr } = getDateRangeFilter(period);

  let locatedTxs = [];
  let unlocatedCount = 0;

  State.transactions.forEach((tx) => {
    // Filter by period
    if (period !== "all") {
      if (tx.date < startStr || tx.date > endStr) return;
    }

    // Filter by type
    if (type === "expense" && tx.type !== "expense") return;
    if (type === "income" && tx.type !== "income") return;
    if (type === "work" && !tx.isWork) return;

    // Search keyword filter
    if (search) {
      const cat = State.categories.find((c) => c.id === tx.categoryId)?.name || "";
      const match =
        (tx.note || "").toLowerCase().includes(search) ||
        (tx.location?.address || "").toLowerCase().includes(search) ||
        cat.toLowerCase().includes(search);
      if (!match) return;
    }

    const coords = resolveTransactionCoordinates(tx);
    if (coords) {
      // Radius filter if active
      if (radiusKm > 0 && userLoc) {
        const dist = getDistanceKm(userLoc.lat, userLoc.lng, coords.lat, coords.lng);
        if (dist > radiusKm) return;
      }
      locatedTxs.push({ tx, coords });
    } else {
      unlocatedCount++;
    }
  });

  // Clear previous markers
  if (mapMarkersLayer) mapMarkersLayer.clearLayers();

  // Render Spending Heatmap if ON
  renderSpendingHeatmap(locatedTxs);

  // Cluster transactions at the same hotspot to prevent overlapping
  const clusters = [];
  locatedTxs.forEach(({ tx, coords }) => {
    let matchedCluster = null;
    for (const cl of clusters) {
      const dist = getDistanceKm(cl.lat, cl.lng, coords.lat, coords.lng);
      if (
        dist < 0.05 ||
        (cl.address && coords.address && cl.address.toLowerCase() === coords.address.toLowerCase())
      ) {
        matchedCluster = cl;
        break;
      }
    }
    if (matchedCluster) {
      matchedCluster.txs.push(tx);
    } else {
      clusters.push({
        lat: coords.lat,
        lng: coords.lng,
        address: coords.address || "Địa điểm chi tiêu",
        txs: [tx],
      });
    }
  });

  const bounds = [];
  let activeClusterToRender = null;

  clusters.forEach((cluster) => {
    const isCluster = cluster.txs.length > 1;
    let totalExp = 0;
    let totalInc = 0;
    cluster.txs.forEach((t) => {
      if (t.type === "income") totalInc += Number(t.amount) || 0;
      else if (t.type === "expense") totalExp += Number(t.amount) || 0;
    });

    const firstTx = cluster.txs[0];
    const cat = State.categories.find((c) => c.id === firstTx.categoryId) || {
      name: "Khác",
      icon: "tag",
      color: "#10B981",
    };
    const isSelected = cluster.txs.some((t) => t.id === State.mapSelectedTxId);
    if (isSelected) {
      activeClusterToRender = cluster;
    }

    let pinHtml = "";
    if (!isCluster) {
      const isInc = firstTx.type === "income";
      const color = cat.color || (isInc ? "#10B981" : "#EF4444");
      const shortAmt = formatShortK(firstTx.amount);

      pinHtml = `
        <div class="luxury-map-pin ${isSelected ? "active" : ""}" id="mapPin_${firstTx.id}">
          <div class="map-pin-bubble ${isInc ? "income" : "expense"}">
            <span>${isInc ? "+" : "-"}${shortAmt}</span>
          </div>
          <div class="map-pin-icon-wrap" style="background-color: ${color};">
            <i data-lucide="${cat.icon || "tag"}" style="width: 15px; height: 15px; color: #fff;"></i>
          </div>
        </div>
      `;
    } else {
      let bubbleText = "";
      if (totalExp > 0 && totalInc > 0) {
        bubbleText = `-${formatShortK(totalExp)} | +${formatShortK(totalInc)}`;
      } else if (totalExp > 0) {
        bubbleText = `-${formatShortK(totalExp)}`;
      } else {
        bubbleText = `+${formatShortK(totalInc)}`;
      }

      pinHtml = `
        <div class="luxury-map-pin luxury-cluster-pin ${isSelected ? "active" : ""}" id="mapPinCluster_${firstTx.id}">
          <div class="map-pin-bubble ${totalInc > 0 && totalExp === 0 ? "income" : "expense"}">
            <span>${bubbleText}</span>
          </div>
          <div class="map-pin-icon-wrap" style="background-color: var(--primary);">
            <i data-lucide="layers" style="width: 15px; height: 15px; color: #fff;"></i>
          </div>
        </div>
      `;
    }

    // Mathematical Precision Anchor alignment:
    // Pin width: 42px, height: 54px. Bottom tip is at [21, 54]!
    const icon = L.divIcon({
      className: "custom-div-icon",
      html: pinHtml,
      iconSize: [42, 54],
      iconAnchor: [21, 54],
      popupAnchor: [0, -52],
    });

    const marker = L.marker([cluster.lat, cluster.lng], { icon: icon });

    // Compact Quiet Luxury Popup
    let popupContent = "";
    if (!isCluster) {
      const isInc = firstTx.type === "income";
      const color = cat.color || (isInc ? "#10B981" : "#EF4444");
      const amtStr = formatVND(firstTx.amount);

      popupContent = `
        <div style="font-family: inherit; padding: 4px; min-width: 200px; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
            <span style="font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 99px; background: ${color}20; color: ${color};">${cat.name}</span>
            ${firstTx.isWork ? '<span style="font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 99px; background: var(--work-bg); color: var(--work);">Đi làm</span>' : ""}
          </div>
          <div style="font-size: 1.05rem; font-weight: 800; color: ${isInc ? "var(--income)" : "var(--expense)"}; margin-bottom: 2px;">
            ${isInc ? "+" : "-"}${amtStr}
          </div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; line-height: 1.25;">
            ${firstTx.note || cat.name}
          </div>
          <div style="font-size: 0.68rem; color: var(--text-secondary); margin-bottom: 8px;">
            📍 ${cluster.address}
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="openTxDetailModal(State.transactions.find(t => t.id === '${firstTx.id}'))" style="flex: 1; padding: 5px 10px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.72rem; font-weight: 700; cursor: pointer;">
              Chi tiết
            </button>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${cluster.lat},${cluster.lng}" target="_blank" rel="noopener noreferrer" style="padding: 5px 10px; border-radius: 99px; background: var(--bg-card-subtle); color: var(--mint); border: 1px solid var(--border-card); font-size: 0.72rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">
              Chỉ đường
            </a>
          </div>
        </div>
      `;
    } else {
      popupContent = `
        <div style="font-family: inherit; padding: 4px; min-width: 210px; max-width: 250px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
            <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-primary); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📍 ${cluster.address}</span>
            <span style="font-size: 0.64rem; font-weight: 800; padding: 2px 6px; border-radius: 99px; background: var(--primary); color: #fff;">${cluster.txs.length} GD</span>
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 6px;">
            Tổng chi: <b style="color: var(--expense);">-${formatVND(totalExp)}</b>
          </div>
          <button onclick="selectMapClusterById('${firstTx.id}')" style="width: 100%; padding: 5px 10px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.72rem; font-weight: 700; cursor: pointer;">
            Xem chi tiết điểm này
          </button>
        </div>
      `;
    }

    // Clean click: highlight pin and open bottom card without redundant overlapping popup balloon!
    marker.on("click", (e) => {
      if (e && e.originalEvent) {
        e.originalEvent.stopPropagation();
      }
      selectClusterOnMap(cluster);
    });

    marker.addTo(mapMarkersLayer);
    bounds.push([cluster.lat, cluster.lng]);
  });

  // Fit map bounds if markers exist and not zoomed
  if (bounds.length > 0 && !State.mapSelectedTxId) {
    spendingMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }

  // Render or update Selected Transaction Bottom Card
  if (activeClusterToRender) {
    renderSelectedTxCard(activeClusterToRender);
  } else if (clusters.length > 0) {
    // Show the first or most recent transaction by default
    renderSelectedTxCard(clusters[0]);
  } else {
    renderSelectedTxCard(null);
  }

  // Render Hotspots Ranking in Sheet
  renderMapHotspots(locatedTxs);

  // Update Viewport & Area Stats
  updateMapVisibleStats(locatedTxs);

  // Sync Time Chips active button
  syncTimeChipsActive(period);

  // Update Unlocated Helper Card
  const helperCard = document.getElementById("mapUnlocatedHelperCard");
  const unlocatedText = document.getElementById("mapUnlocatedCountText");
  if (helperCard && unlocatedText) {
    if (unlocatedCount > 0) {
      helperCard.style.display = "block";
      unlocatedText.textContent = `Có ${unlocatedCount} giao dịch chưa có tọa độ GPS`;
    } else {
      helperCard.style.display = "none";
    }
  }

  updateOverviewMapBannerStats(locatedTxs.length);
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/**
 * Sync Active Time Filter Chip UI
 */
function syncTimeChipsActive(period) {
  document.querySelectorAll("#mapTimeChipsBar .map-chip-btn").forEach((btn) => {
    if (btn.dataset.mperiod === period) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  document.querySelectorAll("#mapPeriodTabs .sheet-segmented-btn, #mapPeriodTabs .pill-tab-btn").forEach((btn) => {
    if (btn.dataset.mperiod === period) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/**
 * Handle Marker / Cluster Click
 */
function selectClusterOnMap(cluster) {
  if (!cluster || !cluster.txs || cluster.txs.length === 0) return;
  const firstTx = cluster.txs[0];
  State.mapSelectedTxId = firstTx.id;

  // Highlight pin
  document.querySelectorAll(".luxury-map-pin").forEach((p) => p.classList.remove("active"));
  const pinEl = document.getElementById(
    cluster.txs.length > 1 ? `mapPinCluster_${firstTx.id}` : `mapPin_${firstTx.id}`
  );
  if (pinEl) pinEl.classList.add("active");

  // Pan smoothly with vertical offset so pin is placed comfortably in upper map area above bottom card
  if (spendingMap) {
    const curZoom = spendingMap.getZoom();
    const targetZoom = Math.max(curZoom, 15);
    const bounds = spendingMap.getBounds();
    const latSpan = bounds ? (bounds.getNorth() - bounds.getSouth()) : 0.01;
    const offsetLat = cluster.lat - (latSpan * 0.12);
    spendingMap.flyTo([offsetLat, cluster.lng], targetZoom, { duration: 0.5 });
  }

  renderSelectedTxCard(cluster);
}

window.selectMapClusterById = function (txId) {
  const tx = State.transactions.find((t) => t.id === txId);
  if (!tx) return;
  const coords = resolveTransactionCoordinates(tx);
  if (!coords) return;
  selectClusterOnMap({ lat: coords.lat, lng: coords.lng, address: coords.address, txs: [tx] });
};

/**
 * Render Modern Selected Transaction Bottom Card (Image 3)
 */
function renderSelectedTxCard(cluster) {
  const card = document.getElementById("mapSelectedTxCard");
  const content = document.getElementById("mapSelectedTxCardContent");
  if (!card || !content) return;

  if (!cluster || !cluster.txs || cluster.txs.length === 0) {
    card.classList.add("hidden");
    card.style.display = "none";
    card.style.transform = "";
    card.style.opacity = "";
    return;
  }

  card.classList.remove("hidden");
  card.style.display = "block";
  card.style.transform = "";
  card.style.opacity = "";

  const isCluster = cluster.txs.length > 1;
  const firstTx = cluster.txs[0];

  if (!isCluster) {
    // -------------------------------------------------------------------------
    // SINGLE TRANSACTION CARD (GỌN GÀNG, KHÔNG DÙNG NÚT X, KÉO VUỐT ĐỂ ĐÓNG)
    // -------------------------------------------------------------------------
    const cat = State.categories.find((c) => c.id === firstTx.categoryId) || {
      name: "Khác",
      icon: "tag",
      color: "#10B981",
    };
    const isInc = firstTx.type === "income";
    const catColor = cat.color || (isInc ? "#10B981" : "#EF4444");
    const wallet = State.wallets.find((w) => w.id === firstTx.walletId) || { name: "Tiền mặt" };

    const receiptHtml = firstTx.receipt ? `
      <div class="map-slide-photo-wrap" onclick="openMapReceiptLightbox('${firstTx.id}')">
        <img src="${firstTx.receipt}" class="map-slide-photo" alt="Hóa đơn" />
      </div>
    ` : "";

    content.innerHTML = `
      <div class="map-card-header">
        <div class="map-card-cat-wrap">
          <div class="map-card-cat-icon" style="background-color: ${catColor}18; color: ${catColor};">
            <i data-lucide="${cat.icon || "tag"}" style="width: 17px; height: 17px;"></i>
          </div>
          <div class="map-card-title-box">
            <div class="map-card-cat-name">${firstTx.note || cat.name}</div>
            <div class="map-card-tx-meta">${cat.name} · ${formatDateDisplay(firstTx.date)} · ${wallet.name}</div>
          </div>
        </div>
        <div class="map-card-amount-box">
          <div class="map-card-amt ${isInc ? "income" : "expense"}">
            ${isInc ? "+" : "-"}${formatVND(firstTx.amount)}
          </div>
        </div>
      </div>

      ${receiptHtml}

      <div class="map-card-address-row">
        <i data-lucide="map-pin" style="width: 11px; height: 11px; color: var(--mint); flex-shrink: 0;"></i>
        <span>${cluster.address || "Vị trí giao dịch"}</span>
      </div>

      <div class="map-card-actions">
        <a class="map-card-subtle-btn" href="https://www.google.com/maps/dir/?api=1&destination=${cluster.lat},${cluster.lng}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="navigation" style="width: 12px; height: 12px;"></i>
          <span>Chỉ đường</span>
        </a>
        <button class="map-card-primary-btn" onclick="openTxDetailModal(State.transactions.find(t => t.id === '${firstTx.id}'))">
          <span>Chi tiết</span>
          <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
    `;
  } else {
    // -------------------------------------------------------------------------
    // MULTI-TRANSACTION CLUSTER (GỌN GÀNG, KHÔNG CÓ NÚT X, KÉO VUỐT ĐỂ ĐÓNG)
    // -------------------------------------------------------------------------
    let totalExp = 0;
    let totalInc = 0;
    cluster.txs.forEach((t) => {
      if (t.type === "income") totalInc += Number(t.amount) || 0;
      else if (t.type === "expense") totalExp += Number(t.amount) || 0;
    });

    // Generate Carousel Slides for ALL transactions
    let slidesHtml = "";
    cluster.txs.forEach((t, idx) => {
      const cat = State.categories.find((c) => c.id === t.categoryId) || {
        name: "Khác",
        icon: "tag",
        color: "#10B981",
      };
      const isInc = t.type === "income";
      const catColor = cat.color || (isInc ? "#10B981" : "#EF4444");
      const wallet = State.wallets.find((w) => w.id === t.walletId) || { name: "Tiền mặt" };

      const slideReceiptHtml = t.receipt ? `
        <div class="map-slide-photo-wrap" onclick="openMapReceiptLightbox('${t.id}')">
          <img src="${t.receipt}" class="map-slide-photo" alt="Hóa đơn" />
        </div>
      ` : "";

      slidesHtml += `
        <div class="map-tx-slide" data-idx="${idx + 1}">
          <div class="map-tx-slide-header">
            <div class="map-tx-slide-cat">
              <div class="map-tx-slide-icon" style="background-color: ${catColor}18; color: ${catColor};">
                <i data-lucide="${cat.icon || "tag"}" style="width: 16px; height: 16px;"></i>
              </div>
              <div class="map-tx-slide-title-wrap">
                <div class="map-tx-slide-note">${t.note || cat.name}</div>
                <div class="map-tx-slide-meta">${cat.name} · ${formatDateDisplay(t.date)} · ${wallet.name}</div>
              </div>
            </div>
            <div class="map-tx-slide-amt ${isInc ? "income" : "expense"}">
              ${isInc ? "+" : "-"}${formatVND(t.amount)}
            </div>
          </div>

          ${slideReceiptHtml}

          <div class="map-slide-actions">
            <button class="map-slide-btn" onclick="openTxDetailModal(State.transactions.find(x => x.id === '${t.id}'))">
              <span>Chi tiết</span>
            </button>
            <a class="map-slide-dir-btn" href="https://www.google.com/maps/dir/?api=1&destination=${cluster.lat},${cluster.lng}" target="_blank" rel="noopener noreferrer">
              <i data-lucide="navigation" style="width: 11px; height: 11px;"></i>
              <span>Chỉ đường</span>
            </a>
          </div>
        </div>
      `;
    });

    // Generate Full List View items for ALL transactions
    let listItemsHtml = "";
    cluster.txs.forEach((t) => {
      const cat = State.categories.find((c) => c.id === t.categoryId) || {
        name: "Khác",
        icon: "tag",
        color: "#10B981",
      };
      const isInc = t.type === "income";
      const catColor = cat.color || (isInc ? "#10B981" : "#EF4444");

      const thumbImg = t.receipt ? `
        <img src="${t.receipt}" class="map-tx-list-thumb" onclick="event.stopPropagation(); openMapReceiptLightbox('${t.id}')" alt="Ảnh" />
      ` : `
        <div style="width: 32px; height: 32px; border-radius: 8px; background: ${catColor}18; color: ${catColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="${cat.icon || "tag"}" style="width: 15px; height: 15px;"></i>
        </div>
      `;

      listItemsHtml += `
        <div class="map-tx-list-item" onclick="openTxDetailModal(State.transactions.find(x => x.id === '${t.id}'))">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
            ${thumbImg}
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 0.78rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${t.note || cat.name}
              </div>
              <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 1px;">
                ${cat.name} · ${formatDateDisplay(t.date)}
              </div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.82rem; font-weight: 800; color: ${isInc ? "var(--income)" : "var(--expense)"};">
              ${isInc ? "+" : "-"}${formatVND(t.amount)}
            </div>
          </div>
        </div>
      `;
    });

    const dotsHtml = cluster.txs.map((_, i) => `<span class="map-dot ${i === 0 ? "active" : ""}"></span>`).join("");

    content.innerHTML = `
      <!-- Cluster Header: clean, minimal, NO X BUTTON -->
      <div class="map-card-header">
        <div class="map-card-cat-wrap">
          <div class="map-card-cat-icon" style="background-color: var(--primary-light); color: var(--primary);">
            <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="map-card-title-box">
            <div class="map-card-cat-name">${cluster.txs.length} giao dịch tại đây</div>
            <div class="map-card-tx-meta">📍 ${cluster.address}</div>
          </div>
        </div>
        <div class="map-card-amount-box">
          <div class="map-card-amt expense">-${formatVND(totalExp)}</div>
        </div>
      </div>

      <!-- Minimal Controls Row: Dots + Nav + List Toggle -->
      <div class="map-carousel-subbar">
        <div class="map-carousel-dots" id="mapCarouselDots">
          ${dotsHtml}
        </div>
        <div class="map-carousel-nav-btns">
          <button type="button" class="map-carousel-arrow-btn" onclick="scrollMapCarousel(-1)" title="Trước">
            <i data-lucide="chevron-left" style="width: 13px; height: 13px;"></i>
          </button>
          <button type="button" class="map-carousel-arrow-btn" onclick="scrollMapCarousel(1)" title="Tiếp">
            <i data-lucide="chevron-right" style="width: 13px; height: 13px;"></i>
          </button>
          <button type="button" class="map-view-toggle-btn" id="mapViewToggleBtn" onclick="toggleMapClusterView()">
            <i data-lucide="list" style="width: 12px; height: 12px;"></i>
            <span>Danh sách</span>
          </button>
        </div>
      </div>

      <!-- Swipeable Cards Carousel ("Lướt ngang") -->
      <div class="map-tx-carousel-wrap" id="mapCarouselWrap">
        <div class="map-tx-carousel" id="mapTxCarousel">
          ${slidesHtml}
        </div>
      </div>

      <!-- Full Scrollable List (Initially hidden) -->
      <div class="map-tx-full-list" id="mapListWrap" style="display: none;">
        ${listItemsHtml}
      </div>
    `;
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();

  // Attach drag-to-dismiss gesture engine (Drag down to dismiss, drag up with rubber band)
  attachMapCardDragEngine();

  // Attach carousel swipe tracker to update dots
  setTimeout(() => {
    const carousel = document.getElementById("mapTxCarousel");
    if (carousel) {
      carousel.addEventListener("scroll", () => {
        const slide = carousel.firstElementChild;
        if (!slide) return;
        const slideWidth = slide.offsetWidth + 8;
        const curIdx = Math.min(cluster.txs.length - 1, Math.max(0, Math.round(carousel.scrollLeft / slideWidth)));
        const dots = document.querySelectorAll("#mapCarouselDots .map-dot");
        dots.forEach((dot, i) => {
          dot.classList.toggle("active", i === curIdx);
        });
      }, { passive: true });
    }
  }, 50);
}

/**
 * Share transaction location
 */
window.shareMapTx = function (txId, lat, lng) {
  const tx = State.transactions.find((t) => t.id === txId);
  const title = tx ? `${tx.note || "Giao dịch"} - ${formatVND(tx.amount)}` : "Vị trí giao dịch";
  const url = `https://www.google.com/maps?q=${lat},${lng}`;

  if (navigator.share) {
    navigator
      .share({
        title: title,
        text: `Địa điểm giao dịch FinMaster: ${title}`,
        url: url,
      })
      .catch(() => { });
  } else {
    navigator.clipboard?.writeText(`${title} - ${url}`);
    showToast("Đã sao chép liên kết vị trí vào bộ nhớ tạm!");
  }
};

/**
 * Render Hotspots Ranking in Bottom Sheet
 */
function renderMapHotspots(locatedTxs) {
  const container = document.getElementById("mapHotspotsList");
  if (!container) return;

  if (locatedTxs.length === 0) {
    container.innerHTML =
      '<div style="font-size: 0.78rem; color: var(--text-secondary); text-align: center; padding: 16px 0;">Chưa có dữ liệu điểm nóng.</div>';
    return;
  }

  const areaMap = {};
  let totalHotspotExpense = 0;

  locatedTxs.forEach(({ tx, coords }) => {
    if (tx.type !== "expense") return;
    const areaName = coords.address
      ? coords.address.split(",").slice(-2).join(",").trim() || coords.address
      : "Khu vực trung tâm";
    if (!areaMap[areaName]) {
      areaMap[areaName] = {
        name: areaName,
        amount: 0,
        count: 0,
        lat: coords.lat,
        lng: coords.lng,
      };
    }
    areaMap[areaName].amount += Number(tx.amount) || 0;
    areaMap[areaName].count++;
    totalHotspotExpense += Number(tx.amount) || 0;
  });

  const ranked = Object.values(areaMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (ranked.length === 0) {
    container.innerHTML =
      '<div style="font-size: 0.78rem; color: var(--text-secondary); text-align: center; padding: 16px 0;">Chưa có khoản chi nào có tọa độ.</div>';
    return;
  }

  container.innerHTML = "";
  ranked.forEach((item, index) => {
    const pct = totalHotspotExpense > 0 ? Math.round((item.amount / totalHotspotExpense) * 100) : 0;
    const rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-subtle";
    const rankText = index < 3 ? `#${index + 1}` : `${index + 1}`;

    const row = document.createElement("div");
    row.className = "hotspot-rank-card";
    row.innerHTML = `
      <div class="hotspot-rank-badge ${rankClass}">
        ${rankText}
      </div>
      <div class="hotspot-info-col">
        <div class="hotspot-title">${item.name}</div>
        <div class="hotspot-subtext">${item.count} giao dịch · chiếm ${pct}% chi tiêu</div>
        <div class="hotspot-progress-track">
          <div class="hotspot-progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
      <div class="hotspot-action-col">
        <div class="hotspot-amount">-${formatVND(item.amount)}</div>
        <div class="hotspot-fly-btn">Bay đến &nearr;</div>
      </div>
    `;

    row.onclick = () => {
      if (spendingMap) {
        spendingMap.flyTo([item.lat, item.lng], 16, { duration: 0.8 });
        showToast(`Đã di chuyển đến: ${item.name}`);
        document.getElementById("mapHotspotsSheetModal")?.classList.remove("active");
      }
    };

    container.appendChild(row);
  });
}

/**
 * Update Viewport & Area Statistics
 */
function updateMapVisibleStats(allLocated = null) {
  if (!spendingMap) return;

  const bounds = spendingMap.getBounds();
  let visibleExpense = 0;
  let visibleCount = 0;

  const list =
    allLocated ||
    State.transactions
      .map((tx) => {
        const coords = resolveTransactionCoordinates(tx);
        return coords ? { tx, coords } : null;
      })
      .filter(Boolean);

  list.forEach(({ tx, coords }) => {
    if (bounds.contains([coords.lat, coords.lng])) {
      visibleCount++;
      if (tx.type === "expense") {
        visibleExpense += Number(tx.amount) || 0;
      }
    }
  });

  const totalAmtEl = document.getElementById("mapVisibleTotalAmount");
  const countEl = document.getElementById("mapPointCountText");
  const areaTotalEl = document.getElementById("mapAreaSummaryTotal");

  if (totalAmtEl) totalAmtEl.textContent = formatVND(visibleExpense);
  if (countEl) countEl.textContent = `${visibleCount} giao dịch`;
  if (areaTotalEl) areaTotalEl.textContent = formatVND(visibleExpense);
}

/**
 * Locate User via GPS
 */
function locateUserOnMap() {
  if (!navigator.geolocation) {
    showToast("Trình duyệt không hỗ trợ Geolocation!", true);
    return;
  }
  showToast("Đang định vị GPS...");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      State.userGpsCoords = { lat, lng };

      if (spendingMap) {
        if (mapUserMarker) spendingMap.removeLayer(mapUserMarker);

        const userIcon = L.divIcon({
          className: "custom-user-icon",
          html: '<div class="user-gps-pulse-marker" title="Vị trí của bạn"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        mapUserMarker = L.marker([lat, lng], { icon: userIcon }).addTo(spendingMap);
        spendingMap.flyTo([lat, lng], 15, { duration: 0.8 });
        renderSpendingMapScreen();
      }

      showToast("Đã xác định vị trí của bạn!");
    },
    (err) => {
      console.warn("GPS error:", err);
      showToast("Không thể lấy vị trí GPS hiện tại!", true);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/**
 * Auto-assign sample coordinates if some transactions lack GPS
 */
async function autoAssignSampleCoordinates() {
  let count = 0;
  for (let i = 0; i < State.transactions.length; i++) {
    const tx = State.transactions[i];
    if (!tx.location || !tx.location.lat) {
      const sample = KNOWN_GEO_LOCATIONS[count % KNOWN_GEO_LOCATIONS.length];
      tx.location = {
        address: tx.location?.address || sample.name,
        lat: sample.lat + (Math.random() - 0.5) * 0.008,
        lng: sample.lng + (Math.random() - 0.5) * 0.008,
      };
      await DB.put("transactions", tx);
      count++;
    }
  }
  showToast(`Đã gắn tọa độ vị trí cho ${count} giao dịch!`);
  renderSpendingMapScreen();
}

function updateOverviewMapBannerStats(count = null) {
  const el = document.getElementById("overviewMapStatsSummary");
  if (!el) return;
  if (count !== null) {
    el.textContent = `${count} điểm chi tiêu GPS`;
  } else {
    const located = State.transactions.filter((t) => resolveTransactionCoordinates(t) !== null);
    el.textContent = `${located.length} điểm chi tiêu GPS`;
  }
}

/**
 * Mini Map Live Preview on Overview Card
 */
function renderOverviewMiniMap() {
  const container = document.getElementById("overviewMiniMap");
  if (!container || typeof L === "undefined") return;

  const located = State.transactions.filter((t) => resolveTransactionCoordinates(t) !== null);
  updateOverviewMapBannerStats(located.length);

  if (!overviewMiniMap) {
    overviewMiniMap = L.map("overviewMiniMap", {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView([10.7769, 106.7009], 13);

    L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: 20,
    }).addTo(overviewMiniMap);

    overviewMiniMapMarkersLayer = L.layerGroup().addTo(overviewMiniMap);
  }

  if (overviewMiniMapMarkersLayer) {
    overviewMiniMapMarkersLayer.clearLayers();
  }

  const bounds = [];
  const previewTxs = located.slice(0, 6);

  previewTxs.forEach((tx) => {
    const coords = resolveTransactionCoordinates(tx);
    if (!coords) return;

    const isInc = tx.type === "income";
    const shortAmt = formatShortK(tx.amount);

    const pinHtml = `
      <div class="overview-mini-pin ${isInc ? "income" : "expense"}">
        <span class="mini-pin-tag">${isInc ? "+" : "-"}${shortAmt}</span>
        <span class="mini-pin-arrow"></span>
      </div>
    `;

    const icon = L.divIcon({
      className: "overview-mini-div-icon",
      html: pinHtml,
      iconSize: [42, 24],
      iconAnchor: [21, 24],
    });

    L.marker([coords.lat, coords.lng], { icon: icon }).addTo(overviewMiniMapMarkersLayer);
    bounds.push([coords.lat, coords.lng]);
  });

  if (bounds.length > 0) {
    overviewMiniMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  } else {
    overviewMiniMap.setView([10.7769, 106.7009], 13);
  }

  setTimeout(() => {
    if (overviewMiniMap) overviewMiniMap.invalidateSize();
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }, 180);
}

/**
 * Render All Screens Function
 */
function renderAllScreens() {
  renderOverviewScreen();
  renderWalletsScreen();
  renderTransactionsScreen();
  renderAnalyticsScreen();
  renderWorkFinanceScreen();
  renderSettingsScreen();
  updateOverviewMapBannerStats();
  renderOverviewMiniMap();
  if (State.activeTab === "map") renderSpendingMapScreen();
  if (State.activeTab === "nav-customizer") renderBottomNavCustomizer();
  if (State.activeTab === "budgets") renderBudgetsScreen();
  if (State.activeTab === "categories") renderCategoriesScreen();
  if (State.activeTab === "recurring") renderRecurringScreen();
}

// Window exports
window.locateUserOnMap = locateUserOnMap;
window.switchGoogleMapLayer = switchGoogleMapLayer;
window.toggleMapHeatmap = toggleMapHeatmap;
window.renderSpendingMapScreen = renderSpendingMapScreen;

// =========================================================================
// CAROUSEL & LIGHTBOX CONTROLLERS
// =========================================================================
function closeMapSelectedTxCard() {
  const card = document.getElementById("mapSelectedTxCard");
  if (card) {
    card.classList.add("hidden");
    card.style.display = "none";
    card.style.transform = "";
    card.style.opacity = "";
  }
  State.mapSelectedTxId = null;
  document.querySelectorAll(".luxury-map-pin").forEach((p) => p.classList.remove("active"));
}
window.closeMapSelectedTxCard = closeMapSelectedTxCard;

function scrollMapCarousel(direction) {
  const carousel = document.getElementById("mapTxCarousel");
  if (!carousel || !carousel.firstElementChild) return;
  const slide = carousel.firstElementChild;
  const slideWidth = slide.offsetWidth + 8;
  carousel.scrollBy({ left: direction * slideWidth, behavior: "smooth" });
}
window.scrollMapCarousel = scrollMapCarousel;

function toggleMapClusterView() {
  const carouselWrap = document.getElementById("mapCarouselWrap");
  const listWrap = document.getElementById("mapListWrap");
  const toggleBtn = document.getElementById("mapViewToggleBtn");
  if (!carouselWrap || !listWrap || !toggleBtn) return;

  const isList = listWrap.style.display !== "none";
  if (isList) {
    listWrap.style.display = "none";
    carouselWrap.style.display = "block";
    toggleBtn.innerHTML = '<i data-lucide="list" style="width: 12px; height: 12px;"></i> <span>Danh sách</span>';
  } else {
    carouselWrap.style.display = "none";
    listWrap.style.display = "flex";
    toggleBtn.innerHTML = '<i data-lucide="layout-grid" style="width: 12px; height: 12px;"></i> <span>Thẻ lướt</span>';
  }
  if (window.lucide?.createIcons) window.lucide.createIcons();
}
window.toggleMapClusterView = toggleMapClusterView;

function openMapReceiptLightbox(txId) {
  const tx = State.transactions.find((t) => t.id === txId);
  if (!tx || !tx.receipt) return;
  const modal = document.getElementById("mapReceiptLightboxModal");
  if (!modal) return;

  const imgEl = document.getElementById("mapLightboxImg");
  const noteEl = document.getElementById("mapLightboxNote");
  const amtEl = document.getElementById("mapLightboxAmt");
  const dateEl = document.getElementById("mapLightboxDate");

  if (imgEl) imgEl.src = tx.receipt;
  if (noteEl) noteEl.textContent = tx.note || "Hóa đơn";
  if (amtEl) amtEl.textContent = `${tx.type === "income" ? "+" : "-"}${formatVND(tx.amount)}`;
  if (dateEl) dateEl.textContent = formatDateDisplay(tx.date);

  modal.classList.add("active");
  if (window.lucide?.createIcons) window.lucide.createIcons();
}
window.openMapReceiptLightbox = openMapReceiptLightbox;

function closeMapReceiptLightbox() {
  const modal = document.getElementById("mapReceiptLightboxModal");
  if (modal) modal.classList.remove("active");
}
window.closeMapReceiptLightbox = closeMapReceiptLightbox;


/**
 * Attach Native Drag to Dismiss Engine to the Map Bottom Card
 * Pull down smoothly to dismiss with physics, pull up with rubber-band
 */
function attachMapCardDragEngine() {
  const card = document.getElementById("mapSelectedTxCard");
  if (!card || card._hasMapCardDrag) return;
  card._hasMapCardDrag = true;

  let startY = 0;
  let startX = 0;
  let currentY = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let isDragging = false;
  let dragDirectionDecided = false;
  let isHorizontalGesture = false;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
    currentY = startY;
    lastY = startY;
    lastTime = Date.now();
    velocityY = 0;
    isDragging = false;
    dragDirectionDecided = false;
    isHorizontalGesture = false;
  }

  function onTouchMove(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    currentY = touch.clientY;
    const deltaY = currentY - startY;
    const deltaX = touch.clientX - startX;

    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 10) {
      velocityY = (currentY - lastY) / dt;
      lastY = currentY;
      lastTime = now;
    }

    if (!dragDirectionDecided) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        dragDirectionDecided = true;
        // If swiping horizontally inside the carousel, do NOT initiate vertical drag
        if (Math.abs(deltaX) > Math.abs(deltaY) && e.target.closest(".map-tx-carousel")) {
          isHorizontalGesture = true;
          return;
        }
      } else {
        return;
      }
    }

    if (isHorizontalGesture) return;

    if (deltaY > 5 || deltaY < -5) {
      if (!isDragging) {
        isDragging = true;
        card.classList.add("is-dragging");
        card.style.transition = "none";
      }

      if (deltaY > 0) {
        // Drag down: 1:1 finger tracking
        card.style.transform = `translateY(${deltaY}px)`;
      } else {
        // Drag up: rubber-band elastic resistance
        const resisted = deltaY * 0.22;
        card.style.transform = `translateY(${resisted}px)`;
      }

      if (e.cancelable) e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (!isDragging) {
      return;
    }

    card.classList.remove("is-dragging");
    const deltaY = currentY - startY;
    const isFlickDown = velocityY > 0.38 && deltaY > 30;
    const isOverThreshold = deltaY > 75;

    if (isFlickDown || isOverThreshold) {
      card.style.transition = "transform 0.24s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease";
      card.style.transform = "translateY(110%)";
      card.style.opacity = "0";

      try {
        if (navigator.vibrate) navigator.vibrate(8);
      } catch (_) {}

      setTimeout(() => {
        closeMapSelectedTxCard();
      }, 240);
    } else {
      card.style.transition = "transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.2)";
      card.style.transform = "translateY(0)";

      setTimeout(() => {
        card.style.transform = "";
        card.style.transition = "";
      }, 340);
    }

    isDragging = false;
  }

  card.addEventListener("touchstart", onTouchStart, { passive: true });
  card.addEventListener("touchmove", onTouchMove, { passive: false });
  card.addEventListener("touchend", onTouchEnd, { passive: true });
  card.addEventListener("touchcancel", onTouchEnd, { passive: true });
}
window.attachMapCardDragEngine = attachMapCardDragEngine;
