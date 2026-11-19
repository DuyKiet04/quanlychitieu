      /* ==========================================================================
       SPENDING MAP & GEO-ANALYTICS CONTROLLER
       ========================================================================== */
      const KNOWN_GEO_LOCATIONS = [
        {
          keywords: ["nguyễn huệ", "bến nghé", "q.1", "quận 1"],
          lat: 10.7744,
          lng: 106.7027,
          name: "Bến Nghé, Quận 1",
        },
        {
          keywords: ["lê duẩn", "nhà thờ", "bưu điện"],
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
          keywords: ["hồ con rùa", "quận 3", "võ văn tần"],
          lat: 10.7826,
          lng: 106.6961,
          name: "Võ Thị Sáu, Quận 3",
        },
        {
          keywords: ["phú mỹ hưng", "quận 7", "tân phong"],
          lat: 10.7294,
          lng: 106.7118,
          name: "Tân Phong, Quận 7",
        },
        {
          keywords: ["tân sơn nhất", "tân bình", "trường sơn"],
          lat: 10.8164,
          lng: 106.6653,
          name: "Phường 2, Tân Bình",
        },
        {
          keywords: ["phú nhuận", "phan xích long"],
          lat: 10.796,
          lng: 106.6872,
          name: "Phường 2, Phú Nhuận",
        },
        {
          keywords: ["quận 10", "sư vạn hạnh"],
          lat: 10.7712,
          lng: 106.6685,
          name: "Phường 12, Quận 10",
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

      function initSpendingMap() {
        const container = document.getElementById("spendingMapContainer");
        if (!container) return;
        if (spendingMap) return;
        if (typeof L === "undefined") {
          console.warn("Leaflet is not loaded yet");
          return;
        }

        // Initialize Leaflet Map with Google Maps Tiles
        spendingMap = L.map("spendingMapContainer", {
          zoomControl: false, // Sử dụng cụm FAB và cảm ứng đa điểm để toàn màn hình thoáng đạt
          attributionControl: false,
          maxZoom: 20,
          minZoom: 5,
        }).setView([10.7769, 106.7009], 13); // Mặc định trung tâm TP.HCM

        State.mapLayerType = State.mapLayerType || "google_roadmap";
        mapTileLayer = getMapTileLayer(State.mapLayerType);
        mapTileLayer.addTo(spendingMap);

        mapMarkersLayer = L.layerGroup().addTo(spendingMap);

        // Cập nhật thống kê chi tiêu trong khung nhìn khi di chuyển bản đồ
        spendingMap.on("moveend", () => {
          updateMapVisibleStats();
        });
      }

      /* Google Maps Tile Provider: Số (Roadmap), Vệ tinh kết hợp nhãn đường (Satellite Hybrid), Địa hình (Terrain) */
      function getMapTileLayer(type = "digital") {
        if (type === "satellite" || type === "google_satellite") {
          // Vệ tinh sạch sắc nét độ phân giải cao, không icon thương mại rác
          return L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              maxZoom: 19,
              attribution: "© Esri World Imagery",
            },
          );
        } else {
          // Mặc định: Bản đồ số OpenStreetMap sạch sẽ, 100% miễn phí vĩnh viễn, không API key, không watermark
          return L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              subdomains: ["a", "b", "c"],
              maxZoom: 19,
              attribution: "© OpenStreetMap contributors",
            },
          );
        }
      }

      function switchGoogleMapLayer() {
        if (!spendingMap) return;
        const isSat = (State.mapLayerType === "satellite" || State.mapLayerType === "google_satellite");
        State.mapLayerType = isSat ? "digital" : "satellite";

        if (mapTileLayer) spendingMap.removeLayer(mapTileLayer);
        mapTileLayer = getMapTileLayer(State.mapLayerType);
        mapTileLayer.addTo(spendingMap);

        const badge = document.getElementById("mapFabLayerBadge");
        if (badge) {
          if (State.mapLayerType === "satellite") {
            badge.textContent = "Vệ tinh";
            badge.style.background = "#10B981";
            showToast("Bản đồ: Chế độ Vệ tinh");
          } else {
            badge.textContent = "Bản đồ số";
            badge.style.background = "#2563EB";
            showToast("Bản đồ: Chế độ Bản đồ số gọn gàng");
          }
        }
      }

      function updateMapThemeLayer(forceType = null) {
        if (!spendingMap) return;
        if (forceType) State.mapLayerType = forceType;
        if (mapTileLayer) spendingMap.removeLayer(mapTileLayer);
        mapTileLayer = getMapTileLayer(State.mapLayerType || "digital");
        mapTileLayer.addTo(spendingMap);
      }

      function renderSpendingMapScreen() {
        initSpendingMap();
        if (!spendingMap) return;

        setTimeout(() => {
          if (spendingMap) spendingMap.invalidateSize();
        }, 100);

        const period = State.mapPeriod || "all";
        const type = State.mapType || "all";
        const search = (State.mapSearch || "").toLowerCase().trim();
        const radiusKm = Number(State.mapRadius) || 0;
        const userLoc = State.userGpsCoords;

        const { startStr, endStr } = getDateRangeFilter(period);

        let locatedTxs = [];
        let unlocatedCount = 0;

        State.transactions.forEach((tx) => {
          // Filter by period
          if (tx.date < startStr || tx.date > endStr) return;
          // Filter by type
          if (type === "expense" && tx.type !== "expense") return;
          if (type === "income" && tx.type !== "income") return;
          if (type === "work" && !tx.isWork) return;

          // Search keyword filter
          if (search) {
            const cat =
              State.categories.find((c) => c.id === tx.categoryId)?.name || "";
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
              const dist = getDistanceKm(
                userLoc.lat,
                userLoc.lng,
                coords.lat,
                coords.lng,
              );
              if (dist > radiusKm) return;
            }
            locatedTxs.push({ tx, coords });
          } else {
            unlocatedCount++;
          }
        });

        // Clear previous markers
        if (mapMarkersLayer) mapMarkersLayer.clearLayers();

        // Cluster transactions at the same hotspot to prevent overlapping
        const clusters = [];
        locatedTxs.forEach(({ tx, coords }) => {
          let matchedCluster = null;
          for (const cl of clusters) {
            const dist = getDistanceKm(cl.lat, cl.lng, coords.lat, coords.lng);
            if (
              dist < 0.06 ||
              (cl.address &&
                coords.address &&
                cl.address.toLowerCase() === coords.address.toLowerCase())
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

        clusters.forEach((cluster) => {
          const isCluster = cluster.txs.length > 1;
          let totalExp = 0;
          let totalInc = 0;
          cluster.txs.forEach((t) => {
            if (t.type === "income") totalInc += Number(t.amount) || 0;
            else if (t.type === "expense") totalExp += Number(t.amount) || 0;
          });

          const firstTx = cluster.txs[0];
          const cat = State.categories.find(
            (c) => c.id === firstTx.categoryId,
          ) || { name: "Khác", icon: "tag", color: "#10B981" };
          const isSelected = cluster.txs.some(
            (t) => t.id === State.mapSelectedTxId,
          );

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
                <i data-lucide="${cat.icon || "tag"}" style="width: 16px; height: 16px; color: #fff;"></i>
              </div>
            </div>
          `;
          } else {
            // GOM NHÓM ĐỊA ĐIỂM: HIỆN SỐ GIAO DỊCH TRÊN ĐẦU & TỔNG CHI / THU
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
              <div class="cluster-counter-badge">${cluster.txs.length} GD</div>
              <div class="map-pin-bubble ${totalInc > 0 && totalExp === 0 ? "income" : "expense"}">
                <span>${bubbleText}</span>
              </div>
              <div class="map-pin-icon-wrap" style="background-color: var(--primary);">
                <i data-lucide="layers" style="width: 16px; height: 16px; color: #fff;"></i>
              </div>
            </div>
          `;
          }

          const icon = L.divIcon({
            className: "custom-div-icon",
            html: pinHtml,
            iconSize: [44, 58],
            iconAnchor: [22, 58],
            popupAnchor: [0, -56],
          });

          const marker = L.marker([cluster.lat, cluster.lng], { icon: icon });

          // QUIET LUXURY POPUP WITH RECEIPT THUMBNAIL PREVIEW
          let popupContent = "";
          if (!isCluster) {
            const isInc = firstTx.type === "income";
            const color = cat.color || (isInc ? "#10B981" : "#EF4444");
            const amtStr = formatVND(firstTx.amount);

            popupContent = `
            <div style="font-family: inherit; padding: 6px; min-width: 210px; max-width: 250px;">
              ${
                firstTx.receipt
                  ? `
                <div style="margin-bottom: 8px; border-radius: 8px; overflow: hidden; max-height: 100px; border: 1px solid var(--border-subtle);">
                  <img src="${firstTx.receipt}" style="width: 100%; height: 100px; object-fit: cover; display: block;" alt="Hóa đơn">
                </div>
              `
                  : ""
              }
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 99px; background: ${color}20; color: ${color};">${cat.name}</span>
                ${firstTx.isWork ? '<span style="font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 99px; background: var(--work-bg); color: var(--work);">Work</span>' : ""}
              </div>
              <div style="font-size: 1.25rem; font-weight: 800; color: ${isInc ? "var(--income)" : "var(--expense)"}; margin-bottom: 4px;">
                ${isInc ? "+" : "-"}${amtStr}
              </div>
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; line-height: 1.3;">
                ${firstTx.note || cat.name}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 10px;">
                <i data-lucide="map-pin" style="width: 10px; height: 10px; display: inline-block;"></i> ${cluster.address} · ${formatDateDisplay(firstTx.date)}
              </div>
              <div style="display: flex; gap: 6px;">
                <button onclick="openTxDetailModal(State.transactions.find(t => t.id === '${firstTx.id}'))" style="flex: 1; padding: 6px 10px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.74rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(14,56,52,0.25);">
                  Chi tiết
                </button>
                <a href="https://www.google.com/maps?q=${cluster.lat},${cluster.lng}" target="_blank" rel="noopener noreferrer" style="padding: 6px 10px; border-radius: 99px; background: var(--bg-card-subtle); color: var(--mint); border: 1px solid var(--border-card); font-size: 0.74rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="external-link" style="width: 11px; height: 11px;"></i> Maps
                </a>
              </div>
            </div>
          `;
          } else {
            // Multi-Transaction Quiet Luxury Cluster Popup
            let txItemsHtml = "";
            cluster.txs.forEach((t) => {
              const tCat = State.categories.find(
                (c) => c.id === t.categoryId,
              ) || { name: "Khác", color: "#10B981" };
              const tIsInc = t.type === "income";
              txItemsHtml += `
              <div onclick="openTxDetailModal(State.transactions.find(x => x.id === '${t.id}'))" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 4px; border-bottom: 1px solid var(--border-subtle); cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                  ${t.receipt ? `<img src="${t.receipt}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover; flex-shrink: 0;" alt="Hóa đơn">` : ""}
                  <div style="min-width: 0;">
                    <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.note || tCat.name}</div>
                    <div style="font-size: 0.68rem; color: var(--text-secondary);">${formatDateDisplay(t.date)}</div>
                  </div>
                </div>
                <div style="font-size: 0.8rem; font-weight: 800; color: ${tIsInc ? "var(--income)" : "var(--expense)"}; margin-left: 6px; flex-shrink: 0;">
                  ${tIsInc ? "+" : "-"}${formatVND(t.amount)}
                </div>
              </div>
            `;
            });

            popupContent = `
            <div style="font-family: inherit; padding: 6px; min-width: 230px; max-width: 280px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">
                  📍 ${cluster.address}
                </div>
                <span class="tx-badge" style="background: var(--primary); color: #fff; font-weight: 800; font-size: 0.68rem;">${cluster.txs.length} GD</span>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 8px; background: var(--bg-card-subtle); padding: 4px 8px; border-radius: 6px;">
                <span>Tổng chi: <b style="color: var(--expense);">-${formatVND(totalExp)}</b></span>
                ${totalInc > 0 ? ` · Thu: <b style="color: var(--income);">+${formatVND(totalInc)}</b>` : ""}
              </div>
              <div style="max-height: 180px; overflow-y: auto; margin-bottom: 8px;">
                ${txItemsHtml}
              </div>
              <a href="https://www.google.com/maps?q=${cluster.lat},${cluster.lng}" target="_blank" rel="noopener noreferrer" style="width: 100%; padding: 6px 10px; border-radius: 99px; background: var(--bg-card-subtle); color: var(--mint); border: 1px solid var(--border-card); font-size: 0.74rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; box-sizing: border-box;">
                <i data-lucide="external-link" style="width: 11px; height: 11px;"></i> Mở vị trí trên Google Maps
              </a>
            </div>
          `;
          }

          marker.bindPopup(popupContent, {
            maxWidth: 280,
            className: "quiet-luxury-popup",
          });

          marker.on("click", () => {
            State.mapSelectedTxId = firstTx.id;
            document
              .querySelectorAll(".luxury-map-pin")
              .forEach((p) => p.classList.remove("active"));
            const pinEl = document.getElementById(
              isCluster
                ? `mapPinCluster_${firstTx.id}`
                : `mapPin_${firstTx.id}`,
            );
            if (pinEl) pinEl.classList.add("active");

            // Highlight and scroll card in carousel
            document
              .querySelectorAll(".map-tx-mini-card")
              .forEach((c) => c.classList.remove("active"));
            const cardEl = document.getElementById(`mapTxCard_${firstTx.id}`);
            if (cardEl) {
              cardEl.classList.add("active");
              cardEl.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }
          });

          marker.addTo(mapMarkersLayer);
          bounds.push([cluster.lat, cluster.lng]);
        });

        // Fit map bounds if markers exist and not zoomed
        if (bounds.length > 0 && !State.mapSelectedTxId) {
          spendingMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }

        // Render Transaction Carousel
        renderMapTxCarousel(locatedTxs);

        // Render Hotspots Ranking
        renderMapHotspots(locatedTxs);

        // Update Viewport Stats
        updateMapVisibleStats(locatedTxs);

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
        lucide.createIcons();
      }

      function renderMapTxCarousel(locatedTxs) {
        const carousel = document.getElementById("mapTxCarousel");
        if (!carousel) return;

        if (locatedTxs.length === 0) {
          carousel.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); font-size: 0.78rem; padding: 12px 14px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-card); box-shadow: 0 4px 14px rgba(0,0,0,0.1);">
            Không có giao dịch nào trong bộ lọc này.
          </div>
        `;
          return;
        }

        carousel.innerHTML = "";
        locatedTxs.forEach(({ tx, coords }) => {
          const cat = State.categories.find((c) => c.id === tx.categoryId) || {
            name: "Khác",
            icon: "tag",
            color: "#10B981",
          };
          const isInc = tx.type === "income";
          const color = cat.color || "#10B981";

          const card = document.createElement("div");
          card.className =
            "map-tx-mini-card" +
            (State.mapSelectedTxId === tx.id ? " active" : "");
          card.id = `mapTxCard_${tx.id}`;

          card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
              <div style="width: 24px; height: 24px; border-radius: 6px; background: ${color}20; color: ${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${cat.icon || "tag"}" style="width: 14px; height: 14px;"></i>
              </div>
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.name}</span>
            </div>
            <div style="font-size: 0.88rem; font-weight: 800; color: ${isInc ? "var(--income)" : "var(--expense)"}; white-space: nowrap;">
              ${isInc ? "+" : "-"}${formatVND(tx.amount)}
            </div>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;">
            ${tx.note || coords.address || "Không có ghi chú"}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; padding-top: 4px; border-top: 1px solid var(--border-subtle);">
            <span style="color: var(--mint); display: inline-flex; align-items: center; gap: 3px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <i data-lucide="map-pin" style="width: 10px; height: 10px; flex-shrink: 0;"></i> ${coords.address || "Xem vị trí"}
            </span>
            <span style="font-weight: 700; color: var(--primary);">Xem &rarr;</span>
          </div>
        `;

          card.onclick = () => {
            State.mapSelectedTxId = tx.id;
            document
              .querySelectorAll(".map-tx-mini-card")
              .forEach((c) => c.classList.remove("active"));
            card.classList.add("active");

            if (spendingMap) {
              spendingMap.flyTo([coords.lat, coords.lng], 16, {
                duration: 0.8,
              });
              document
                .querySelectorAll(".luxury-map-pin")
                .forEach((p) => p.classList.remove("active"));
              const pinEl = document.getElementById(`mapPin_${tx.id}`);
              if (pinEl) pinEl.classList.add("active");
            }
          };

          carousel.appendChild(card);
        });

        lucide.createIcons();
      }

      function renderMapHotspots(locatedTxs) {
        const container = document.getElementById("mapHotspotsList");
        if (!container) return;

        if (locatedTxs.length === 0) {
          container.innerHTML =
            '<div style="font-size: 0.78rem; color: var(--text-secondary); text-align: center; padding: 12px 0;">Chưa có dữ liệu điểm nóng.</div>';
          return;
        }

        // Group expenses by address / area
        const areaMap = {};
        let totalHotspotExpense = 0;

        locatedTxs.forEach(({ tx, coords }) => {
          if (tx.type !== "expense") return;
          const areaName = coords.address
            ? coords.address.split(",").slice(-2).join(",").trim() ||
              coords.address
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
          .slice(0, 4);

        if (ranked.length === 0) {
          container.innerHTML =
            '<div style="font-size: 0.78rem; color: var(--text-secondary); text-align: center; padding: 12px 0;">Chưa có khoản chi tiêu nào có vị trí.</div>';
          return;
        }

        container.innerHTML = "";
        ranked.forEach((item, index) => {
          const pct =
            totalHotspotExpense > 0
              ? ((item.amount / totalHotspotExpense) * 100).toFixed(0)
              : 0;
          const row = document.createElement("div");
          row.className = "hotspot-rank-item";
          row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${index === 0 ? "var(--expense)" : "var(--bg-card)"}; color: ${index === 0 ? "#fff" : "var(--text-secondary)"}; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-card);">
              ${index + 1}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.name}
              </div>
              <div style="font-size: 0.68rem; color: var(--text-secondary);">
                ${item.count} giao dịch · chiếm ${pct}% chi tiêu
              </div>
            </div>
          </div>
          <div style="text-align: right; margin-left: 8px;">
            <div style="font-size: 0.88rem; font-weight: 800; color: var(--expense);">${formatVND(item.amount)}</div>
            <span style="font-size: 0.68rem; font-weight: 700; color: var(--mint); cursor: pointer;">Bay đến &rarr;</span>
          </div>
        `;

          row.onclick = () => {
            if (spendingMap) {
              spendingMap.flyTo([item.lat, item.lng], 16, { duration: 1 });
              showToast(`Đã di chuyển đến: ${item.name}`);
            }
          };

          container.appendChild(row);
        });
      }

      function updateMapVisibleStats(allLocated = null) {
        if (!spendingMap) return;

        const bounds = spendingMap.getBounds();
        let visibleExpense = 0;
        let visibleCount = 0;
        const wardCounts = {};

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
              const wName = coords.address
                ? coords.address.split(",")[0].trim()
                : "Khu vực khác";
              wardCounts[wName] =
                (wardCounts[wName] || 0) + (Number(tx.amount) || 0);
            }
          }
        });

        const totalAmtEl = document.getElementById("mapVisibleTotalAmount");
        const countEl = document.getElementById("mapPointCountText");
        const avgEl = document.getElementById("mapVisibleAvgExpense");
        const topWardEl = document.getElementById("mapTopWardSummary");

        if (totalAmtEl) totalAmtEl.textContent = formatVND(visibleExpense);
        if (countEl) countEl.textContent = `${visibleCount} điểm`;
        if (avgEl) {
          const avg =
            visibleCount > 0 ? Math.round(visibleExpense / visibleCount) : 0;
          avgEl.textContent = `Trung bình: ${formatVND(avg)}/điểm`;
        }

        if (topWardEl) {
          const sortedWards = Object.entries(wardCounts).sort(
            (a, b) => b[1] - a[1],
          );
          if (sortedWards.length > 0) {
            topWardEl.innerHTML = `Khu vực tiêu nhiều nhất: <b style="color: var(--text-primary);">${sortedWards[0][0]}</b> (${formatVND(sortedWards[0][1])})`;
          } else {
            topWardEl.textContent =
              "Chưa có khoản chi nào trong khung nhìn này.";
          }
        }
      }

      function locateUserOnMap() {
        if (!navigator.geolocation) {
          showToast("Trình duyệt không hỗ trợ Geolocation!", true);
          return;
        }
        showToast("Đang kết nối vệ tinh GPS...");

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

              mapUserMarker = L.marker([lat, lng], { icon: userIcon }).addTo(
                spendingMap,
              );
              mapUserMarker
                .bindPopup("<b>Vị trí hiện tại của bạn</b>")
                .openPopup();

              spendingMap.flyTo([lat, lng], 14, { duration: 1 });

              // If radius filter is active, draw circle
              updateMapRadiusCircle();
              renderSpendingMapScreen();
            }

            showToast("Đã xác định vị trí của bạn!");
          },
          (err) => {
            console.warn("GPS error:", err);
            showToast("Không thể lấy vị trí GPS hiện tại!", true);
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      }

      function updateMapRadiusCircle() {
        if (!spendingMap) return;
        if (mapRadiusCircle) {
          spendingMap.removeLayer(mapRadiusCircle);
          mapRadiusCircle = null;
        }

        const radiusKm = Number(State.mapRadius) || 0;
        if (radiusKm > 0 && State.userGpsCoords) {
          mapRadiusCircle = L.circle(
            [State.userGpsCoords.lat, State.userGpsCoords.lng],
            {
              radius: radiusKm * 1000,
              color: "#2DA87B",
              fillColor: "#2DA87B",
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: "4, 4",
            },
          ).addTo(spendingMap);

          spendingMap.fitBounds(mapRadiusCircle.getBounds(), {
            padding: [30, 30],
          });
        }
      }

      async function autoAssignSampleCoordinates() {
        let count = 0;
        for (let i = 0; i < State.transactions.length; i++) {
          const tx = State.transactions[i];
          if (!tx.location || !tx.location.lat) {
            const sample =
              KNOWN_GEO_LOCATIONS[count % KNOWN_GEO_LOCATIONS.length];
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
          const located = State.transactions.filter(
            (t) => resolveTransactionCoordinates(t) !== null,
          );
          el.textContent = `${located.length} điểm chi tiêu GPS`;
        }
      }

      /* Mini Map Live Preview on Overview Card Controller */
      function renderOverviewMiniMap() {
        const container = document.getElementById("overviewMiniMap");
        if (!container || typeof L === "undefined") return;

        const located = State.transactions.filter(
          (t) => resolveTransactionCoordinates(t) !== null,
        );
        updateOverviewMapBannerStats(located.length);

        // Initialize Leaflet mini map instance if not created yet
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

          // Google Maps Roadmap tiles
          L.tileLayer(
            "https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
            {
              subdomains: ["0", "1", "2", "3"],
              maxZoom: 20,
            },
          ).addTo(overviewMiniMap);

          overviewMiniMapMarkersLayer = L.layerGroup().addTo(overviewMiniMap);
        }

        // Clear previous mini pins
        if (overviewMiniMapMarkersLayer) {
          overviewMiniMapMarkersLayer.clearLayers();
        }

        const bounds = [];
        const previewTxs = located.slice(0, 6);

        previewTxs.forEach((tx) => {
          const coords = resolveTransactionCoordinates(tx);
          if (!coords) return;

          const isInc = tx.type === "income";
          const shortAmt =
            tx.amount >= 1000000
              ? (tx.amount / 1000000).toFixed(1) + "M"
              : (tx.amount / 1000).toFixed(0) + "k";

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

          L.marker([coords.lat, coords.lng], { icon: icon }).addTo(
            overviewMiniMapMarkersLayer,
          );
          bounds.push([coords.lat, coords.lng]);
        });

        if (bounds.length > 0) {
          overviewMiniMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
        } else {
          overviewMiniMap.setView([10.7769, 106.7009], 13);
        }

        setTimeout(() => {
          if (overviewMiniMap) overviewMiniMap.invalidateSize();
          lucide.createIcons();
        }, 180);
      }

      /* Render All Screens Function */
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
