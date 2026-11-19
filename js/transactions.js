      /* ==========================================================================
       TRANSACTION FILTER & SORT MODAL CONTROLLER
       ========================================================================== */
      let tempTxFilterConfig = {
        sort: "date_desc",
        type: "all",
        categoryId: "all",
        walletId: "all",
        period: "all",
        customStart: null,
        customEnd: null,
        minAmount: null,
        maxAmount: null,
        hasReceipt: false,
        hasLocation: false,
      };

      function openTxFilterModal() {
        const modal = document.getElementById("txFilterModal");
        if (!modal) return;

        tempTxFilterConfig = { ...(State.txFilterConfig || {}) };

        // Populate Category dropdown
        const catSelect = document.getElementById("modalTxCategorySelect");
        if (catSelect) {
          catSelect.innerHTML = '<option value="all">Tất cả danh mục</option>';
          State.categories.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.type === "expense" ? "🔻" : "🔺"} ${c.name}`;
            catSelect.appendChild(opt);
          });
          catSelect.value = tempTxFilterConfig.categoryId || "all";
        }

        // Populate Wallet dropdown
        const walletSelect = document.getElementById("modalTxWalletSelect");
        if (walletSelect) {
          walletSelect.innerHTML = '<option value="all">Tất cả các ví</option>';
          State.wallets.forEach((w) => {
            const opt = document.createElement("option");
            opt.value = w.id;
            opt.textContent = w.name;
            walletSelect.appendChild(opt);
          });
          walletSelect.value = tempTxFilterConfig.walletId || "all";
        }

        // Sync Sort buttons
        document
          .querySelectorAll("#modalTxSortBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.txsort === tempTxFilterConfig.sort,
            );
          });

        // Sync Type buttons
        document
          .querySelectorAll("#modalTxTypeBtns .filter-pill-chip")
          .forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.txtype === tempTxFilterConfig.type,
            );
          });

        // Sync Period buttons & Date Inputs
        document
          .querySelectorAll("#modalTxPeriodBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.txperiod === tempTxFilterConfig.period,
            );
          });

        const sInput = document.getElementById("modalTxFilterStartDate");
        const eInput = document.getElementById("modalTxFilterEndDate");
        if (sInput) sInput.value = tempTxFilterConfig.customStart || "";
        if (eInput) eInput.value = tempTxFilterConfig.customEnd || "";

        // Sync Min/Max amount
        const minInput = document.getElementById("modalTxFilterMinAmount");
        const maxInput = document.getElementById("modalTxFilterMaxAmount");
        if (minInput)
          minInput.value =
            tempTxFilterConfig.minAmount !== null &&
            tempTxFilterConfig.minAmount !== undefined
              ? tempTxFilterConfig.minAmount
              : "";
        if (maxInput)
          maxInput.value =
            tempTxFilterConfig.maxAmount !== null &&
            tempTxFilterConfig.maxAmount !== undefined
              ? tempTxFilterConfig.maxAmount
              : "";

        // Sync Checkboxes
        const rCheck = document.getElementById("modalTxHasReceiptCheckbox");
        const lCheck = document.getElementById("modalTxHasLocationCheckbox");
        if (rCheck) rCheck.checked = Boolean(tempTxFilterConfig.hasReceipt);
        if (lCheck) lCheck.checked = Boolean(tempTxFilterConfig.hasLocation);

        onTxFilterChangeLiveCount();

        modal.classList.add("active");
        lucide.createIcons();
      }

      function closeTxFilterModal() {
        const modal = document.getElementById("txFilterModal");
        if (modal) modal.classList.remove("active");
      }

      function setTxFilterSort(sortKey) {
        tempTxFilterConfig.sort = sortKey;
        document
          .querySelectorAll("#modalTxSortBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.txsort === sortKey);
          });
        onTxFilterChangeLiveCount();
      }

      function setTxFilterType(typeKey) {
        tempTxFilterConfig.type = typeKey;
        document
          .querySelectorAll("#modalTxTypeBtns .filter-pill-chip")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.txtype === typeKey);
          });
        onTxFilterChangeLiveCount();
      }

      function setTxFilterPeriod(periodKey) {
        tempTxFilterConfig.period = periodKey;
        document
          .querySelectorAll("#modalTxPeriodBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.txperiod === periodKey);
          });

        const sInput = document.getElementById("modalTxFilterStartDate");
        const eInput = document.getElementById("modalTxFilterEndDate");
        if (periodKey === "all") {
          if (sInput) sInput.value = "";
          if (eInput) eInput.value = "";
          tempTxFilterConfig.customStart = null;
          tempTxFilterConfig.customEnd = null;
        } else {
          const { startStr, endStr } = getDateRangeFilter(periodKey);
          if (sInput) sInput.value = startStr;
          if (eInput) eInput.value = endStr;
          tempTxFilterConfig.customStart = startStr;
          tempTxFilterConfig.customEnd = endStr;
        }
        onTxFilterChangeLiveCount();
      }

      function onTxFilterCustomDateChange() {
        const sInput = document.getElementById("modalTxFilterStartDate");
        const eInput = document.getElementById("modalTxFilterEndDate");
        if (sInput && eInput && sInput.value && eInput.value) {
          tempTxFilterConfig.period = "custom";
          tempTxFilterConfig.customStart = sInput.value;
          tempTxFilterConfig.customEnd = eInput.value;
          document
            .querySelectorAll("#modalTxPeriodBtns .modal-period-pill-btn")
            .forEach((btn) => {
              btn.classList.remove("active");
            });
          onTxFilterChangeLiveCount();
        }
      }

      function setTxAmountShortcut(min, max) {
        const minInput = document.getElementById("modalTxFilterMinAmount");
        const maxInput = document.getElementById("modalTxFilterMaxAmount");
        if (minInput) minInput.value = min > 0 ? min : "";
        if (maxInput) maxInput.value = max > 0 ? max : "";
        onTxFilterChangeLiveCount();
      }

      function getFilteredTxMatches(cfg) {
        const todayStr = getTodayString();
        let list = [...State.transactions];

        // 1. Search Query
        if (State.txSearch) {
          const q = State.txSearch.toLowerCase();
          list = list.filter((t) => {
            const cat =
              State.categories
                .find((c) => c.id === t.categoryId)
                ?.name.toLowerCase() || "";
            const note = (t.note || "").toLowerCase();
            const amt = String(t.amount);
            return cat.includes(q) || note.includes(q) || amt.includes(q);
          });
        }

        // 2. Type Filter
        if (cfg.type === "expense")
          list = list.filter((t) => t.type === "expense");
        else if (cfg.type === "income")
          list = list.filter((t) => t.type === "income");
        else if (cfg.type === "transfer")
          list = list.filter((t) => t.type === "transfer");
        else if (cfg.type === "work") list = list.filter((t) => t.isWork);
        else if (cfg.type === "future")
          list = list.filter((t) => t.date > todayStr);

        // 3. Category Filter
        if (cfg.categoryId && cfg.categoryId !== "all") {
          list = list.filter((t) => t.categoryId === cfg.categoryId);
        }

        // 4. Wallet Filter
        if (cfg.walletId && cfg.walletId !== "all") {
          list = list.filter(
            (t) =>
              t.walletId === cfg.walletId ||
              t.fromWalletId === cfg.walletId ||
              t.toWalletId === cfg.walletId,
          );
        }

        // 5. Period Filter
        if (cfg.period && cfg.period !== "all") {
          const { startStr, endStr } = getDateRangeFilter(
            cfg.period,
            cfg.customStart,
            cfg.customEnd,
          );
          list = list.filter((t) => t.date >= startStr && t.date <= endStr);
        }

        // 6. Min & Max Amount Filter
        if (
          cfg.minAmount !== null &&
          cfg.minAmount !== undefined &&
          cfg.minAmount > 0
        ) {
          list = list.filter((t) => Number(t.amount) >= cfg.minAmount);
        }
        if (
          cfg.maxAmount !== null &&
          cfg.maxAmount !== undefined &&
          cfg.maxAmount > 0
        ) {
          list = list.filter((t) => Number(t.amount) <= cfg.maxAmount);
        }

        // 7. Special flags
        if (cfg.hasReceipt) {
          list = list.filter((t) =>
            Boolean(t.receipt || t.receiptBlob || t.receiptDataUrl),
          );
        }
        if (cfg.hasLocation) {
          list = list.filter((t) =>
            Boolean(t.location && (t.location.lat || t.location.address)),
          );
        }

        // 8. Sort
        list.sort((a, b) => {
          const amtA = Number(a.amount) || 0;
          const amtB = Number(b.amount) || 0;
          if (cfg.sort === "date_asc")
            return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
          if (cfg.sort === "amount_desc")
            return amtB - amtA || b.date.localeCompare(a.date);
          if (cfg.sort === "amount_asc")
            return amtA - amtB || b.date.localeCompare(a.date);
          return b.date.localeCompare(a.date) || b.createdAt - a.createdAt; // date_desc default
        });

        return list;
      }

      function onTxFilterChangeLiveCount() {
        const catVal =
          document.getElementById("modalTxCategorySelect")?.value || "all";
        const walletVal =
          document.getElementById("modalTxWalletSelect")?.value || "all";
        const minVal = document.getElementById("modalTxFilterMinAmount")?.value;
        const maxVal = document.getElementById("modalTxFilterMaxAmount")?.value;
        const rCheck =
          document.getElementById("modalTxHasReceiptCheckbox")?.checked ||
          false;
        const lCheck =
          document.getElementById("modalTxHasLocationCheckbox")?.checked ||
          false;

        tempTxFilterConfig.categoryId = catVal;
        tempTxFilterConfig.walletId = walletVal;
        tempTxFilterConfig.minAmount = minVal ? Number(minVal) : null;
        tempTxFilterConfig.maxAmount = maxVal ? Number(maxVal) : null;
        tempTxFilterConfig.hasReceipt = rCheck;
        tempTxFilterConfig.hasLocation = lCheck;

        const matches = getFilteredTxMatches(tempTxFilterConfig);
        const countEl = document.getElementById("modalTxLiveMatchCount");
        if (countEl) countEl.textContent = matches.length;
      }

      function resetTxFilterForm() {
        tempTxFilterConfig = {
          sort: "date_desc",
          type: "all",
          categoryId: "all",
          walletId: "all",
          period: "all",
          customStart: null,
          customEnd: null,
          minAmount: null,
          maxAmount: null,
          hasReceipt: false,
          hasLocation: false,
        };

        if (document.getElementById("modalTxCategorySelect"))
          document.getElementById("modalTxCategorySelect").value = "all";
        if (document.getElementById("modalTxWalletSelect"))
          document.getElementById("modalTxWalletSelect").value = "all";
        if (document.getElementById("modalTxFilterStartDate"))
          document.getElementById("modalTxFilterStartDate").value = "";
        if (document.getElementById("modalTxFilterEndDate"))
          document.getElementById("modalTxFilterEndDate").value = "";
        if (document.getElementById("modalTxFilterMinAmount"))
          document.getElementById("modalTxFilterMinAmount").value = "";
        if (document.getElementById("modalTxFilterMaxAmount"))
          document.getElementById("modalTxFilterMaxAmount").value = "";
        if (document.getElementById("modalTxHasReceiptCheckbox"))
          document.getElementById("modalTxHasReceiptCheckbox").checked = false;
        if (document.getElementById("modalTxHasLocationCheckbox"))
          document.getElementById("modalTxHasLocationCheckbox").checked = false;

        document
          .querySelectorAll("#modalTxSortBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.txsort === "date_desc");
          });
        document
          .querySelectorAll("#modalTxTypeBtns .filter-pill-chip")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.txtype === "all");
          });
        document
          .querySelectorAll("#modalTxPeriodBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.txperiod === "all");
          });

        onTxFilterChangeLiveCount();
        showToast("Đã đặt lại các tiêu chí lọc!");
      }

      function applyTxFilterForm() {
        onTxFilterChangeLiveCount();
        State.txFilterConfig = { ...tempTxFilterConfig };
        closeTxFilterModal();
        renderTransactionsScreen();
        showToast("Đã áp dụng bộ lọc giao dịch!");
      }

      function removeTxFilterCriterion(key) {
        if (!State.txFilterConfig) return;
        if (key === "type") State.txFilterConfig.type = "all";
        else if (key === "categoryId") State.txFilterConfig.categoryId = "all";
        else if (key === "walletId") State.txFilterConfig.walletId = "all";
        else if (key === "period") {
          State.txFilterConfig.period = "all";
          State.txFilterConfig.customStart = null;
          State.txFilterConfig.customEnd = null;
        } else if (key === "amount") {
          State.txFilterConfig.minAmount = null;
          State.txFilterConfig.maxAmount = null;
        } else if (key === "hasReceipt")
          State.txFilterConfig.hasReceipt = false;
        else if (key === "hasLocation")
          State.txFilterConfig.hasLocation = false;
        else if (key === "sort") State.txFilterConfig.sort = "date_desc";
        else if (key === "all") {
          State.txFilterConfig = {
            sort: "date_desc",
            type: "all",
            categoryId: "all",
            walletId: "all",
            period: "all",
            customStart: null,
            customEnd: null,
            minAmount: null,
            maxAmount: null,
            hasReceipt: false,
            hasLocation: false,
          };
        }
        renderTransactionsScreen();
      }

      /* ==========================================================================
       7. SCREEN 2: GIAO DỊCH (TIMELINE UI CONTROLLER)
       ========================================================================== */
      function renderTransactionsScreen() {
        // Render Wallets Snapshot chips
        const walletChipsContainer =
          document.getElementById("walletTabChipsList");
        if (walletChipsContainer) {
          walletChipsContainer.innerHTML = "";
          const { walletBalances } = calculateFinancialBalances();
          State.wallets.forEach((w) => {
            const bal =
              walletBalances[w.id] !== undefined ? walletBalances[w.id] : 0;
            const chip = document.createElement("div");
            chip.style.cssText =
              "padding: 6px 12px; border-radius: var(--radius-sm); background: var(--bg-card-subtle); border: 1px solid var(--border-card); display: flex; align-items: center; gap: 8px; flex-shrink: 0;";
            chip.innerHTML = `
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${w.color || "#34D399"};"></div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600;">${w.name}</div>
              <div style="font-size: 0.82rem; font-weight: 800; color: var(--text-primary);">${formatVND(bal)}</div>
            </div>
          `;
            walletChipsContainer.appendChild(chip);
          });
        }

        // Calculate active criteria count
        const cfg = State.txFilterConfig || {
          sort: "date_desc",
          type: "all",
          categoryId: "all",
          walletId: "all",
          period: "all",
          customStart: null,
          customEnd: null,
          minAmount: null,
          maxAmount: null,
          hasReceipt: false,
          hasLocation: false,
        };

        let activeCount = 0;
        if (cfg.type && cfg.type !== "all") activeCount++;
        if (cfg.categoryId && cfg.categoryId !== "all") activeCount++;
        if (cfg.walletId && cfg.walletId !== "all") activeCount++;
        if (cfg.period && cfg.period !== "all") activeCount++;
        if (
          (cfg.minAmount && cfg.minAmount > 0) ||
          (cfg.maxAmount && cfg.maxAmount > 0)
        )
          activeCount++;
        if (cfg.hasReceipt) activeCount++;
        if (cfg.hasLocation) activeCount++;
        if (cfg.sort && cfg.sort !== "date_desc") activeCount++;

        // Update filter count badge on toolbar
        const badge = document.getElementById("txActiveFilterBadge");
        if (badge) {
          if (activeCount > 0) {
            badge.style.display = "flex";
            badge.textContent = activeCount;
          } else {
            badge.style.display = "none";
          }
        }

        // Render Active Filter Tags Bar
        const tagsBar = document.getElementById("txActiveFilterTagsBar");
        if (tagsBar) {
          if (activeCount > 0) {
            tagsBar.style.display = "flex";
            tagsBar.innerHTML = "";

            if (cfg.type && cfg.type !== "all") {
              const typeLabels = {
                expense: "Chi tiêu",
                income: "Thu nhập",
                transfer: "Chuyển ví",
                work: "Đi làm",
                future: "Dự kiến",
              };
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('type')">Loại: ${typeLabels[cfg.type] || cfg.type} <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (cfg.categoryId && cfg.categoryId !== "all") {
              const catObj = State.categories.find(
                (c) => c.id === cfg.categoryId,
              );
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('categoryId')">DM: ${catObj ? catObj.name : "Danh mục"} <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (cfg.walletId && cfg.walletId !== "all") {
              const wObj = State.wallets.find((w) => w.id === cfg.walletId);
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('walletId')">Ví: ${wObj ? wObj.name : "Ví"} <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (cfg.period && cfg.period !== "all") {
              const periodLabels = {
                today: "Hôm nay",
                "7d": "7 ngày",
                this_month: "Tháng này",
                last_month: "Tháng trước",
                custom: "Tùy chỉnh",
              };
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('period')">Kỳ: ${periodLabels[cfg.period] || cfg.period} <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (
              (cfg.minAmount && cfg.minAmount > 0) ||
              (cfg.maxAmount && cfg.maxAmount > 0)
            ) {
              const amtLabel =
                (cfg.minAmount ? `>${formatNumberOnly(cfg.minAmount)}` : "") +
                (cfg.maxAmount ? ` <${formatNumberOnly(cfg.maxAmount)}` : "");
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('amount')">Tiền: ${amtLabel} <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (cfg.hasReceipt) {
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('hasReceipt')">Có hóa đơn <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (cfg.hasLocation) {
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('hasLocation')">Có GPS <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            if (cfg.sort && cfg.sort !== "date_desc") {
              const sortLabels = {
                date_asc: "Cũ nhất",
                amount_desc: "Tiền lớn ↓",
                amount_asc: "Tiền nhỏ ↑",
              };
              tagsBar.innerHTML += `<div class="active-filter-tag" onclick="removeTxFilterCriterion('sort')">Xếp: ${sortLabels[cfg.sort]} <i data-lucide="x" style="width: 12px; height: 12px;"></i></div>`;
            }
            tagsBar.innerHTML += `<div class="active-filter-tag" style="background: rgba(239, 68, 68, 0.1); color: var(--expense); border-color: rgba(239, 68, 68, 0.25);" onclick="removeTxFilterCriterion('all')">Xóa tất cả</div>`;
          } else {
            tagsBar.style.display = "none";
          }
        }

        const container = document.getElementById(
          "transactionsTimelineContainer",
        );
        container.innerHTML = "";

        let list = getFilteredTxMatches(cfg);

        if (list.length === 0) {
          container.innerHTML = getKitbitzEmptySvg("tx");
          return;
        }

        // Group by Date for Timeline UI
        const grouped = {};
        list.forEach((tx) => {
          if (!grouped[tx.date]) grouped[tx.date] = [];
          grouped[tx.date].push(tx);
        });

        const dates = Object.keys(grouped);
        dates.forEach((dStr) => {
          const dayTxs = grouped[dStr];
          let dayIncome = 0;
          let dayExpense = 0;

          dayTxs.forEach((t) => {
            if (t.type === "income") dayIncome += Number(t.amount) || 0;
            else if (t.type === "expense") dayExpense += Number(t.amount) || 0;
          });

          const groupDiv = document.createElement("div");
          groupDiv.className = "tx-timeline-group";

          const headerDiv = document.createElement("div");
          headerDiv.className = "tx-group-header";
          headerDiv.innerHTML = `
          <span>${formatDateWithWeekday(dStr)}</span>
          <span style="font-size: 0.74rem;">
            ${dayIncome > 0 ? `<span class="income-text">+${formatVND(dayIncome)}</span> ` : ""}
            ${dayExpense > 0 ? `<span class="expense-text">-${formatVND(dayExpense)}</span>` : ""}
          </span>
        `;
          groupDiv.appendChild(headerDiv);

          dayTxs.forEach((tx) => {
            groupDiv.appendChild(createTransactionCardElement(tx));
          });

          container.appendChild(groupDiv);
        });

        lucide.createIcons();
      }

      /* ==========================================================================
       SCREEN 2A: VÍ TÀI KHOẢN CHUYÊN BIỆT (WALLETS MANAGEMENT CONTROLLER)
       ========================================================================== */
      function renderWalletsScreen() {
        const { currentAvailableBalance, walletBalances } =
          calculateFinancialBalances();

        // 1. Tổng tài sản các ví
        const totalAssetsEl = document.getElementById(
          "walletsTotalAssetsAmount",
        );
        if (totalAssetsEl) {
          if (State.isBalanceHidden) {
            totalAssetsEl.textContent = "•••••• ₫";
          } else {
            totalAssetsEl.textContent = formatVND(currentAvailableBalance);
          }
        }

        // 2. Số lượng ví
        const countBadge = document.getElementById("walletsCountBadge");
        if (countBadge) countBadge.textContent = State.wallets.length;

        // 3. Phân bổ tài sản Allocation Bar
        const allocationBar = document.getElementById("walletsAllocationBar");
        if (allocationBar) {
          allocationBar.innerHTML = "";
          const positiveTotal = State.wallets.reduce((sum, w) => {
            const bal = walletBalances[w.id] || 0;
            return sum + (bal > 0 ? bal : 0);
          }, 0);

          if (positiveTotal > 0) {
            State.wallets.forEach((w) => {
              const bal = walletBalances[w.id] || 0;
              if (bal > 0) {
                const pct = ((bal / positiveTotal) * 100).toFixed(1);
                const segment = document.createElement("div");
                segment.style.width = `${pct}%`;
                segment.style.height = "100%";
                segment.style.backgroundColor = w.color || "#34D399";
                segment.title = `${w.name}: ${pct}% (${formatVND(bal)})`;
                allocationBar.appendChild(segment);
              }
            });
          } else {
            allocationBar.innerHTML =
              '<div style="width: 100%; height: 100%; background: rgba(255,255,255,0.2);"></div>';
          }
        }

        // 4. Danh sách các thẻ ví (Wallets Cards Container - Hỗ trợ Vuốt sang trái để Hiện to dần nút Sửa/Xóa)
        const cardsContainer = document.getElementById("walletsCardsContainer");
        if (cardsContainer) {
          cardsContainer.innerHTML = "";
          if (State.wallets.length === 0) {
            cardsContainer.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; background: var(--bg-card-subtle); border-radius: var(--radius-md); border: 1px dashed var(--border-card);">
              <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Chưa có ví tài khoản nào</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); max-width: 260px; margin: 0 auto 14px;">Bấm nút + ở thanh điều hướng để thêm ví tiền mặt hoặc tài khoản ngân hàng.</div>
              <button onclick="openAddWalletModal()" style="padding: 8px 18px; border-radius: var(--radius-full); background: var(--primary); color: #fff; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer;">+ Thêm ví mới</button>
            </div>
          `;
          } else {
            State.wallets.forEach((w) => {
              const bal = walletBalances[w.id] || 0;
              const pctOfTotal =
                currentAvailableBalance > 0
                  ? Math.max(
                      0,
                      Math.round((bal / currentAvailableBalance) * 100),
                    )
                  : 0;
              cardsContainer.appendChild(
                createWalletCardElement(
                  w,
                  bal,
                  pctOfTotal,
                  currentAvailableBalance,
                ),
              );
            });
          }
        }

        // 5. Lịch sử chuyển tiền nội bộ giữa các ví
        const transferHistoryContainer = document.getElementById(
          "walletsTransferHistoryList",
        );
        if (transferHistoryContainer) {
          transferHistoryContainer.innerHTML = "";
          const transfers = State.transactions
            .filter((t) => t.type === "transfer")
            .sort(
              (a, b) =>
                b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
            )
            .slice(0, 5);

          if (transfers.length === 0) {
            transferHistoryContainer.innerHTML =
              '<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 18px 0; background: var(--bg-card-subtle); border-radius: var(--radius-md); border: 1px dashed var(--border-card);">Chưa có lịch sử chuyển tiền giữa các ví.</div>';
          } else {
            transfers.forEach((tx) => {
              transferHistoryContainer.appendChild(
                createTransactionCardElement(tx),
              );
            });
          }
        }

        lucide.createIcons();
      }
