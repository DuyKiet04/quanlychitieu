      /* ==========================================================================
       6. OVERVIEW DATE FILTER CONTROLLER & LIVE FINANCIAL PULSE
       ========================================================================== */
      let tempOverviewPeriod = "30d";
      let tempOverviewStart = null;
      let tempOverviewEnd = null;

      function openOverviewDateFilterModal() {
        const modal = document.getElementById("overviewDateFilterModal");
        if (!modal) return;

        tempOverviewPeriod = State.overviewPeriod || "30d";
        if (tempOverviewPeriod === "this_month") tempOverviewPeriod = "30d";
        tempOverviewStart = State.overviewCustomStart;
        tempOverviewEnd = State.overviewCustomEnd;

        const { startStr, endStr } = getDateRangeFilter(
          tempOverviewPeriod,
          tempOverviewStart,
          tempOverviewEnd,
        );

        const startInput = document.getElementById("modalFilterStartDate");
        const endInput = document.getElementById("modalFilterEndDate");
        if (startInput)
          startInput.value =
            tempOverviewPeriod === "all" ? "2020-01-01" : startStr;
        if (endInput)
          endInput.value =
            tempOverviewPeriod === "all" ? getTodayString() : endStr;

        // Highlight active pill button (7N, 30N, 6T, 12T)
        document
          .querySelectorAll("#modalPresetBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.preset === tempOverviewPeriod,
            );
          });

        updateOverviewDateFilterLivePreview(
          startInput?.value || startStr,
          endInput?.value || endStr,
        );

        modal.classList.add("active");
        lucide.createIcons();
      }

      function closeOverviewDateFilterModal() {
        const modal = document.getElementById("overviewDateFilterModal");
        if (modal) modal.classList.remove("active");
      }

      function selectOverviewPreset(presetKey) {
        tempOverviewPeriod = presetKey;
        tempOverviewStart = null;
        tempOverviewEnd = null;

        const { startStr, endStr } = getDateRangeFilter(presetKey);

        const startInput = document.getElementById("modalFilterStartDate");
        const endInput = document.getElementById("modalFilterEndDate");
        if (startInput)
          startInput.value = presetKey === "all" ? "2020-01-01" : startStr;
        if (endInput)
          endInput.value = presetKey === "all" ? getTodayString() : endStr;

        document
          .querySelectorAll("#modalPresetBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.preset === presetKey);
          });

        updateOverviewDateFilterLivePreview(
          startInput ? startInput.value : startStr,
          endInput ? endInput.value : endStr,
        );
      }

      function onModalCustomDateChange() {
        const startInput = document.getElementById("modalFilterStartDate");
        const endInput = document.getElementById("modalFilterEndDate");
        if (!startInput || !endInput) return;

        const sVal = startInput.value;
        const eVal = endInput.value;

        if (sVal && eVal) {
          if (sVal > eVal) {
            showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc!", true);
            return;
          }
          tempOverviewPeriod = "custom";
          tempOverviewStart = sVal;
          tempOverviewEnd = eVal;

          // Bỏ chọn các nút preset
          document
            .querySelectorAll("#modalPresetBtns .modal-period-pill-btn")
            .forEach((btn) => {
              btn.classList.remove("active");
            });

          updateOverviewDateFilterLivePreview(sVal, eVal);
        }
      }

      function updateOverviewDateFilterLivePreview(startStr, endStr) {
        if (!startStr || !endStr) return;

        const filtered = State.transactions.filter(
          (t) =>
            t.type !== "transfer" && t.date >= startStr && t.date <= endStr,
        );

        let inc = 0;
        let exp = 0;
        const catTotals = {};

        filtered.forEach((t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === "income") {
            inc += amt;
          } else if (t.type === "expense") {
            exp += amt;
            catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + amt;
          }
        });

        const net = inc - exp;

        // Tính số ngày
        let diffDays = 1;
        try {
          const dStart = new Date(startStr);
          const dEnd = new Date(endStr);
          const diffTime = Math.abs(dEnd - dStart);
          diffDays = Math.max(
            1,
            Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1,
          );
        } catch (e) {
          diffDays = 1;
        }

        // Tốc độ chi tiêu trung bình / ngày (Daily burn rate)
        const dailyBurn = Math.round(exp / diffDays);

        // Tìm danh mục chi nhiều nhất
        let topCatName = "Chưa có chi tiêu";
        const catIds = Object.keys(catTotals);
        if (catIds.length > 0 && exp > 0) {
          catIds.sort((a, b) => catTotals[b] - catTotals[a]);
          const topId = catIds[0];
          const topCatAmt = catTotals[topId];
          const topCatPct = Math.round((topCatAmt / exp) * 100);
          const catObj = State.categories.find((c) => c.id === topId);
          topCatName = `${catObj ? catObj.name : "Khác"} (${topCatPct}%)`;
        }

        // Cập nhật DOM trong modal
        const daysCountEl = document.getElementById("modalPreviewDaysCount");
        if (daysCountEl) daysCountEl.textContent = `${diffDays} ngày`;

        const incEl = document.getElementById("modalPreviewIncome");
        if (incEl) incEl.textContent = `+${formatNumberOnly(inc)} ₫`;

        const expEl = document.getElementById("modalPreviewExpense");
        if (expEl) expEl.textContent = `-${formatNumberOnly(exp)} ₫`;

        const netEl = document.getElementById("modalPreviewNet");
        if (netEl) {
          netEl.textContent =
            (net >= 0 ? "+" : "") + formatNumberOnly(net) + " ₫";
          netEl.style.color = net >= 0 ? "var(--mint)" : "var(--expense)";
        }

        const burnRateEl = document.getElementById("modalPreviewBurnRate");
        if (burnRateEl) {
          burnRateEl.textContent = `${formatNumberOnly(dailyBurn)} ₫ / ngày`;
        }

        const topCatEl = document.getElementById("modalPreviewTopCategory");
        if (topCatEl) {
          topCatEl.textContent = topCatName;
        }

        const healthBadge = document.getElementById("modalPreviewHealthBadge");
        if (healthBadge) {
          if (exp === 0 && inc === 0) {
            healthBadge.textContent = "Chưa có số liệu";
            healthBadge.style.background = "rgba(100, 116, 139, 0.12)";
            healthBadge.style.color = "#64748B";
          } else if (net >= 0 && inc > 0 && net / inc >= 0.25) {
            healthBadge.textContent = `Thặng dư tốt (+${Math.round((net / inc) * 100)}%)`;
            healthBadge.style.background = "rgba(16, 185, 129, 0.12)";
            healthBadge.style.color = "#059669";
          } else if (net >= 0) {
            healthBadge.textContent = "Dòng tiền an toàn";
            healthBadge.style.background = "rgba(16, 185, 129, 0.12)";
            healthBadge.style.color = "#059669";
          } else {
            healthBadge.textContent = `Thâm hụt (-${formatNumberOnly(Math.abs(net))} ₫)`;
            healthBadge.style.background = "rgba(239, 68, 68, 0.12)";
            healthBadge.style.color = "#DC2626";
          }
        }
      }

      function applyOverviewDateFilter() {
        const startInput = document.getElementById("modalFilterStartDate");
        const endInput = document.getElementById("modalFilterEndDate");

        if (tempOverviewPeriod === "custom") {
          if (
            !startInput ||
            !endInput ||
            !startInput.value ||
            !endInput.value
          ) {
            showToast("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc!", true);
            return;
          }
          if (startInput.value > endInput.value) {
            showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc!", true);
            return;
          }
          State.overviewPeriod = "custom";
          State.overviewCustomStart = startInput.value;
          State.overviewCustomEnd = endInput.value;
        } else {
          State.overviewPeriod = tempOverviewPeriod;
          State.overviewCustomStart = null;
          State.overviewCustomEnd = null;
        }

        closeOverviewDateFilterModal();
        renderOverviewScreen();
        showToast("Đã áp dụng khoảng thời gian phân tích!");
      }

      function resetOverviewDateFilterToDefault() {
        tempOverviewPeriod = "30d";
        tempOverviewStart = null;
        tempOverviewEnd = null;
        State.overviewPeriod = "30d";
        State.overviewCustomStart = null;
        State.overviewCustomEnd = null;

        closeOverviewDateFilterModal();
        renderOverviewScreen();
        showToast("Đã đặt lại về 30 ngày (30N)!");
      }

      /* ==========================================================================
       6B. ANALYTICS DATE FILTER MODAL CONTROLLER
       ========================================================================== */
      let tempAnalyticsPeriod = "this_month";
      let tempAnalyticsStart = null;
      let tempAnalyticsEnd = null;

      function openAnalyticsDateModal() {
        const modal = document.getElementById("analyticsDateModal");
        if (!modal) return;

        tempAnalyticsPeriod = State.analyticsPeriod || "this_month";
        tempAnalyticsStart = State.analyticsStartDate;
        tempAnalyticsEnd = State.analyticsEndDate;

        const { startStr, endStr } = getDateRangeFilter(
          tempAnalyticsPeriod,
          tempAnalyticsStart,
          tempAnalyticsEnd,
        );

        const startInput = document.getElementById("analyticsModalStartDate");
        const endInput = document.getElementById("analyticsModalEndDate");
        if (startInput)
          startInput.value =
            tempAnalyticsPeriod === "all" ? "2020-01-01" : startStr;
        if (endInput)
          endInput.value =
            tempAnalyticsPeriod === "all" ? getTodayString() : endStr;

        // Highlight active preset button (7N, 30N, Tháng này, Tháng trước, Năm nay, Tất cả)
        document
          .querySelectorAll("#analyticsModalPresetBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.preset === tempAnalyticsPeriod,
            );
          });

        updateAnalyticsModalLivePreview(
          startInput?.value || startStr,
          endInput?.value || endStr,
        );

        modal.classList.add("active");
        lucide.createIcons();
      }

      function closeAnalyticsDateModal() {
        const modal = document.getElementById("analyticsDateModal");
        if (modal) modal.classList.remove("active");
      }

      function selectAnalyticsPreset(presetKey) {
        tempAnalyticsPeriod = presetKey;
        tempAnalyticsStart = null;
        tempAnalyticsEnd = null;

        const { startStr, endStr } = getDateRangeFilter(presetKey);

        const startInput = document.getElementById("analyticsModalStartDate");
        const endInput = document.getElementById("analyticsModalEndDate");
        if (startInput)
          startInput.value = presetKey === "all" ? "2020-01-01" : startStr;
        if (endInput)
          endInput.value = presetKey === "all" ? getTodayString() : endStr;

        document
          .querySelectorAll("#analyticsModalPresetBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.preset === presetKey);
          });

        updateAnalyticsModalLivePreview(
          startInput ? startInput.value : startStr,
          endInput ? endInput.value : endStr,
        );
      }

      function onAnalyticsModalCustomDateChange() {
        const startInput = document.getElementById("analyticsModalStartDate");
        const endInput = document.getElementById("analyticsModalEndDate");
        if (!startInput || !endInput) return;

        const sVal = startInput.value;
        const eVal = endInput.value;

        if (sVal && eVal) {
          if (sVal > eVal) {
            showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc!", true);
            return;
          }
          tempAnalyticsPeriod = "custom";
          tempAnalyticsStart = sVal;
          tempAnalyticsEnd = eVal;

          document
            .querySelectorAll(
              "#analyticsModalPresetBtns .modal-period-pill-btn",
            )
            .forEach((btn) => {
              btn.classList.remove("active");
            });

          updateAnalyticsModalLivePreview(sVal, eVal);
        }
      }

      function updateAnalyticsModalLivePreview(startStr, endStr) {
        if (!startStr || !endStr) return;

        const filtered = State.transactions.filter(
          (t) =>
            t.type !== "transfer" && t.date >= startStr && t.date <= endStr,
        );

        let inc = 0;
        let exp = 0;
        filtered.forEach((t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === "income") inc += amt;
          else if (t.type === "expense") exp += amt;
        });

        const net = inc - exp;

        let diffDays = 1;
        try {
          const dStart = new Date(startStr);
          const dEnd = new Date(endStr);
          const diffTime = Math.abs(dEnd - dStart);
          diffDays = Math.max(
            1,
            Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1,
          );
        } catch (e) {
          diffDays = 1;
        }

        const daysCountEl = document.getElementById("analyticsModalDaysCount");
        if (daysCountEl) {
          if (tempAnalyticsPeriod === "this_month")
            daysCountEl.textContent = "Tháng này";
          else if (tempAnalyticsPeriod === "last_month")
            daysCountEl.textContent = "Tháng trước";
          else if (tempAnalyticsPeriod === "this_year")
            daysCountEl.textContent = "Năm nay";
          else if (tempAnalyticsPeriod === "all")
            daysCountEl.textContent = "Toàn bộ";
          else daysCountEl.textContent = `${diffDays} ngày`;
        }

        const incEl = document.getElementById("analyticsModalPreviewIncome");
        if (incEl) incEl.textContent = `+${formatNumberOnly(inc)} ₫`;

        const expEl = document.getElementById("analyticsModalPreviewExpense");
        if (expEl) expEl.textContent = `-${formatNumberOnly(exp)} ₫`;

        const netEl = document.getElementById("analyticsModalPreviewNet");
        if (netEl) {
          netEl.textContent =
            (net >= 0 ? "+" : "") + formatNumberOnly(net) + " ₫";
          netEl.style.color = net >= 0 ? "var(--mint)" : "var(--expense)";
        }
      }

      function applyAnalyticsDateModal() {
        const startInput = document.getElementById("analyticsModalStartDate");
        const endInput = document.getElementById("analyticsModalEndDate");

        if (tempAnalyticsPeriod === "custom") {
          if (
            !startInput ||
            !endInput ||
            !startInput.value ||
            !endInput.value
          ) {
            showToast("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc!", true);
            return;
          }
          if (startInput.value > endInput.value) {
            showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc!", true);
            return;
          }
          State.analyticsPeriod = "custom";
          State.analyticsStartDate = startInput.value;
          State.analyticsEndDate = endInput.value;
        } else {
          State.analyticsPeriod = tempAnalyticsPeriod;
          State.analyticsStartDate = null;
          State.analyticsEndDate = null;
        }

        closeAnalyticsDateModal();
        renderAnalyticsScreen();
        showToast("Đã áp dụng thời gian xem báo cáo!");
      }

      function resetAnalyticsDateModal() {
        tempAnalyticsPeriod = "this_month";
        tempAnalyticsStart = null;
        tempAnalyticsEnd = null;
        State.analyticsPeriod = "this_month";
        State.analyticsStartDate = null;
        State.analyticsEndDate = null;

        closeAnalyticsDateModal();
        renderAnalyticsScreen();
        showToast("Đã đặt lại về Tháng này!");
      }

      /* ==========================================================================
       6. SCREEN 1: TỔNG QUAN (OVERVIEW CONTROLLER)
       ========================================================================== */
      function renderOverviewScreen() {
        const { currentAvailableBalance, walletBalances } =
          calculateFinancialBalances();

        // Hero Balance Display
        const balanceEl = document.getElementById("overviewBalance");
        if (State.isBalanceHidden) {
          balanceEl.innerHTML =
            '<span class="num">••••••</span><span class="currency">₫</span>';
        } else {
          if (balanceEl.querySelector(".num")) {
            animateCountUp(balanceEl, currentAvailableBalance);
          } else {
            balanceEl.innerHTML = `<span class="num">${formatNumberOnly(currentAvailableBalance)}</span><span class="currency">₫</span>`;
          }
        }

        // Filter transactions for selected overview period
        const { startStr, endStr } = getDateRangeFilter(
          State.overviewPeriod,
          State.overviewCustomStart,
          State.overviewCustomEnd,
        );
        const filteredTxs = State.transactions.filter(
          (t) =>
            t.date >= startStr && t.date <= endStr && t.type !== "transfer",
        );

        let periodIncome = 0;
        let periodExpense = 0;
        let periodWorkExpense = 0;

        filteredTxs.forEach((t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === "income") periodIncome += amt;
          else if (t.type === "expense") {
            periodExpense += amt;
            if (t.isWork) periodWorkExpense += amt;
          }
        });

        const netIncome = periodIncome - periodExpense;
        document.getElementById("overviewNetIncome").textContent =
          (netIncome >= 0 ? "+" : "") + formatVND(netIncome);
        document.getElementById("overviewNetIncome").style.color =
          netIncome >= 0 ? "var(--mint-accent)" : "#FEB2B2";
        document.getElementById("overviewWorkExpense").textContent =
          formatVND(periodWorkExpense);

        animateCountUp(
          document.getElementById("overviewTotalIncome"),
          periodIncome,
          "+",
        );
        animateCountUp(
          document.getElementById("overviewTotalExpense"),
          periodExpense,
          "-",
        );

        // Cập nhật nhãn nút Tùy chọn & Badge khoảng ngày trong thẻ Phân tích tài chính
        const filterLabelEl = document.getElementById("overviewPeriodBtnLabel");
        const filterBadgeEl = document.getElementById(
          "overviewPeriodBadgeRange",
        );
        if (filterLabelEl) {
          let labelText = "30N";
          if (State.overviewPeriod === "7d") labelText = "7N";
          else if (
            State.overviewPeriod === "30d" ||
            State.overviewPeriod === "this_month"
          )
            labelText = "30N";
          else if (State.overviewPeriod === "6m") labelText = "6T";
          else if (
            State.overviewPeriod === "12m" ||
            State.overviewPeriod === "this_year"
          )
            labelText = "12T";
          else if (State.overviewPeriod === "today") labelText = "Hôm nay";
          else if (State.overviewPeriod === "all") labelText = "Tất cả";
          else if (State.overviewPeriod === "custom") labelText = "Tùy chỉnh";
          filterLabelEl.textContent = labelText;
        }
        if (filterBadgeEl) {
          if (State.overviewPeriod === "all") {
            filterBadgeEl.textContent = "Tất cả";
          } else {
            try {
              const sParts = startStr.split("-");
              const eParts = endStr.split("-");
              filterBadgeEl.textContent = `${sParts[2]}/${sParts[1]} - ${eParts[2]}/${eParts[1]}`;
            } catch (e) {
              filterBadgeEl.textContent = `${startStr} - ${endStr}`;
            }
          }
        }

        // Budget Progress calculation for Current Month
        renderOverviewBudgetBanner();
        renderTodaySpendingPulse();

        // Charts
        const isCatActive = document
          .getElementById("overviewCategoryPane")
          ?.classList.contains("active");
        if (isCatActive) {
          renderOverviewCategoryChart();
        } else {
          renderOverviewCashflowChart();
        }

        // Recent Transactions (Limit 6)
        renderOverviewRecentList();

        // Mini Map Live Preview on Overview Card
        renderOverviewMiniMap();

        // Realtime Financial Health Score & Dynamic Budget Alert
        renderFinancialHealthCard();
        renderBudgetAlertBanner();
      }

      function renderOverviewBudgetBanner() {
        const now = new Date();
        const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const thisMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        let monthSpent = 0;
        State.transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              t.date >= thisMonthStart &&
              t.date <= thisMonthEnd,
          )
          .forEach((t) => {
            monthSpent += Number(t.amount) || 0;
          });

        const monthlyBudget = Number(State.settings.monthly_budget) || 15000000;
        const remaining = monthlyBudget - monthSpent;
        const pct =
          monthlyBudget > 0
            ? Math.min(Math.round((monthSpent / monthlyBudget) * 100), 100)
            : 0;
        const rawPct =
          monthlyBudget > 0 ? (monthSpent / monthlyBudget) * 100 : 0;

        document.getElementById("budgetProgressSubtext").textContent =
          `Đã chi ${formatVND(monthSpent)} / Hạn mức ${formatVND(monthlyBudget)}`;
        document.getElementById("budgetRemainingAmount").textContent =
          formatVND(remaining);
        document.getElementById("budgetRemainingAmount").style.color =
          remaining >= 0 ? "var(--mint)" : "var(--expense)";

        const bar = document.getElementById("overviewProgressBar");
        bar.style.width = `${pct}%`;
        bar.className =
          "budget-bar" +
          (rawPct >= 100 ? " danger" : rawPct >= 80 ? " warning" : "");

        const badge = document.getElementById("budgetStatusBadge");
        if (rawPct >= 100) {
          badge.textContent = "Vượt hạn mức";
          badge.style.background = "var(--expense-bg)";
          badge.style.color = "var(--expense)";
        } else if (rawPct >= 80) {
          badge.textContent = "Cảnh báo 80%";
          badge.style.background = "var(--warning-bg)";
          badge.style.color = "var(--warning)";
        } else {
          badge.textContent = "An toàn";
          badge.style.background = "var(--income-bg)";
          badge.style.color = "var(--income)";
        }

        document.getElementById("budgetPercentLabel").textContent =
          `Đã dùng ${rawPct.toFixed(1)}%`;
        const daysLeft = lastDay - now.getDate();
        document.getElementById("budgetDaysLeftLabel").textContent =
          `Còn lại ${daysLeft} ngày trong tháng`;
      }

      function renderOverviewCashflowChart() {
        const ctx = document
          .getElementById("overviewCashflowChart")
          .getContext("2d");
        if (overviewCashflowChartInstance)
          overviewCashflowChartInstance.destroy();

        let range = State.overviewPeriod;
        if (range === "this_month" || !range) range = "30d";
        if (range === "today") range = "7d";
        if (range === "this_year" || range === "all") range = "12m";
        if (range === "custom") {
          const { startStr, endStr } = getDateRangeFilter(
            "custom",
            State.overviewCustomStart,
            State.overviewCustomEnd,
          );
          const diffDays = Math.max(
            1,
            Math.round(
              Math.abs(new Date(endStr) - new Date(startStr)) /
                (1000 * 60 * 60 * 24),
            ) + 1,
          );
          range =
            diffDays <= 14
              ? "7d"
              : diffDays <= 45
                ? "30d"
                : diffDays <= 200
                  ? "6m"
                  : "12m";
        }
        State.cashflowRange = range;

        const labels = [];
        const incomeData = [];
        const expenseData = [];

        const today = new Date();

        if (range === "7d" || range === "30d") {
          const daysCount = range === "7d" ? 7 : 30;
          for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            labels.push(`${d.getDate()}/${d.getMonth() + 1}`);

            let inc = 0,
              exp = 0;
            State.transactions
              .filter((t) => t.date === dateStr && t.type !== "transfer")
              .forEach((t) => {
                if (t.type === "income") inc += Number(t.amount) || 0;
                else if (t.type === "expense") exp += Number(t.amount) || 0;
              });
            incomeData.push(inc);
            expenseData.push(exp);
          }
        } else if (range === "6m" || range === "12m") {
          const monthsCount = range === "6m" ? 6 : 12;
          for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            labels.push(`T${d.getMonth() + 1}`);

            let inc = 0,
              exp = 0;
            State.transactions
              .filter(
                (t) =>
                  t.date &&
                  t.date.startsWith(`${y}-${m}`) &&
                  t.type !== "transfer",
              )
              .forEach((t) => {
                if (t.type === "income") inc += Number(t.amount) || 0;
                else if (t.type === "expense") exp += Number(t.amount) || 0;
              });
            incomeData.push(inc);
            expenseData.push(exp);
          }
        }

        overviewCashflowChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Thu nhập",
                data: incomeData,
                borderColor: "#28A76B",
                backgroundColor: "rgba(40, 167, 107, 0.08)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: labels.length <= 7 ? 3 : 0,
              },
              {
                label: "Chi tiêu",
                data: expenseData,
                borderColor: "#E75A4D",
                backgroundColor: "rgba(231, 90, 77, 0.08)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: labels.length <= 7 ? 3 : 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: {
                grid: { color: "rgba(0,0,0,0.03)" },
                ticks: {
                  callback: (v) =>
                    v >= 1000000
                      ? (v / 1000000).toFixed(1) + "M"
                      : v >= 1000
                        ? (v / 1000).toFixed(0) + "k"
                        : v,
                },
              },
            },
          },
        });
      }

      function renderOverviewCategoryChart() {
        const ctx = document
          .getElementById("overviewCategoryChart")
          .getContext("2d");
        const legend = document.getElementById("overviewCategoryLegend");
        legend.innerHTML = "";
        if (overviewCategoryChartInstance)
          overviewCategoryChartInstance.destroy();

        const { startStr, endStr } = getDateRangeFilter(
          State.overviewPeriod,
          State.overviewCustomStart,
          State.overviewCustomEnd,
        );
        const catTotals = {};
        let grandExpense = 0;

        State.transactions
          .filter(
            (t) =>
              t.type === "expense" && t.date >= startStr && t.date <= endStr,
          )
          .forEach((tx) => {
            const amt = Number(tx.amount) || 0;
            grandExpense += amt;
            catTotals[tx.categoryId] = (catTotals[tx.categoryId] || 0) + amt;
          });

        const catIds = Object.keys(catTotals);
        if (catIds.length === 0 || grandExpense === 0) {
          overviewCategoryChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: ["Chưa có"],
              datasets: [{ data: [1], backgroundColor: ["#E5ECE9"] }],
            },
            options: {
              responsive: true,
              cutout: "74%",
              plugins: { legend: { display: false } },
            },
          });
          legend.innerHTML =
            '<span style="font-size: 0.78rem; color: var(--text-secondary); margin: auto;">Chưa có chi tiêu kỳ này</span>';
          return;
        }

        catIds.sort((a, b) => catTotals[b] - catTotals[a]);
        const labels = [];
        const data = [];
        const bgColors = [];

        catIds.slice(0, 5).forEach((id) => {
          const cat = State.categories.find((c) => c.id === id) || {
            name: "Khác",
            color: "#BFE8D5",
          };
          const amount = catTotals[id];
          const percent = ((amount / grandExpense) * 100).toFixed(1);

          labels.push(cat.name);
          data.push(amount);
          bgColors.push(cat.color || "#BFE8D5");

          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.fontSize = "0.78rem";
          row.style.cursor = "pointer";
          row.onclick = () => {
            State.txFilter = "expense";
            State.txSearch = cat.name;
            document
              .querySelector('.nav-item[data-tab="transactions"]')
              .click();
            document.getElementById("txSearchInput").value = cat.name;
          };

          row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${cat.color}; flex-shrink: 0;"></span>
            <span style="font-weight: 700;">${cat.name}</span>
          </div>
          <span style="font-weight: 800; margin-left: 8px;">${percent}%</span>
        `;
          legend.appendChild(row);
        });

        overviewCategoryChartInstance = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: labels,
            datasets: [
              {
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: "#FFFFFF",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: { legend: { display: false } },
          },
        });
      }

      function renderOverviewRecentList() {
        const container = document.getElementById("overviewRecentList");
        container.innerHTML = "";

        const recent = [...State.transactions]
          .sort(
            (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
          )
          .slice(0, 5);

        if (recent.length === 0) {
          container.innerHTML = getKitbitzEmptySvg("tx");
          return;
        }

        recent.forEach((tx) => {
          container.appendChild(createTransactionCardElement(tx));
        });
        lucide.createIcons();
      }


/* ==========================================================================
   SMART QUICK ADD CONTROLLER (GHI CHÉP NHANH 1 CHẠM & TỰ ĐỘNG TẠO DANH MỤC)
   ========================================================================== */
let currentSmartCatSelectedIcon = null;
let currentSmartCatSelectedColor = null;

/* ==========================================================================
   AUTO-LOCATION SERVICE FOR SMART QUICK ADD
   ========================================================================== */
let cachedCurrentLocation = null;

function refreshCurrentLocationCache() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      let locResult = null;
      try {
        if (typeof window.reverseGeocodeVietnamese === "function") {
          locResult = await window.reverseGeocodeVietnamese(lat, lng);
        } else if (typeof reverseGeocodeVietnamese === "function") {
          locResult = await reverseGeocodeVietnamese(lat, lng);
        }
      } catch (e) {}

      cachedCurrentLocation = {
        lat,
        lng,
        address: locResult?.address || `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        road: locResult?.road || "",
        ward: locResult?.ward || "",
        district: locResult?.district || "",
        city: locResult?.city || "",
        timestamp: Date.now()
      };
    },
    (err) => {
      console.warn("GPS cache error:", err);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
  );
}
window.refreshCurrentLocationCache = refreshCurrentLocationCache;

async function getAutoLocationForSmartExpense(timeoutMs = 2800) {
  if (cachedCurrentLocation && (Date.now() - cachedCurrentLocation.timestamp < 300000)) {
    return cachedCurrentLocation;
  }

  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(cachedCurrentLocation || null);
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let locResult = null;
        try {
          if (typeof window.reverseGeocodeVietnamese === "function") {
            locResult = await window.reverseGeocodeVietnamese(lat, lng);
          } else if (typeof reverseGeocodeVietnamese === "function") {
            locResult = await reverseGeocodeVietnamese(lat, lng);
          }
        } catch (e) {}

        const loc = {
          lat,
          lng,
          address: locResult?.address || `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          road: locResult?.road || "",
          ward: locResult?.ward || "",
          district: locResult?.district || "",
          city: locResult?.city || "",
          timestamp: Date.now()
        };
        cachedCurrentLocation = loc;
        resolve(loc);
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve(cachedCurrentLocation || null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 300000 }
    );
  });
}
window.getAutoLocationForSmartExpense = getAutoLocationForSmartExpense;

async function handleSmartQuickAddSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById("smartQuickAddInput");
  if (!input) return;

  const val = input.value.trim();
  if (!val) {
    showToast("Vui lòng nhập cú pháp (ví dụ: Đổ xăng 50k đi làm, Ăn trưa 45k)", true);
    input.focus();
    return;
  }

  const parsed = parseSmartExpenseText(val, State.categories, State.wallets);
  if (!parsed || !parsed.amount) {
    showToast("Không nhận diện được số tiền! Vui lòng thử lại (vd: Đổ xăng 50k)", true);
    input.focus();
    return;
  }

  // Tự động nhận diện vị trí GPS hiện tại
  const autoLoc = await getAutoLocationForSmartExpense(2800);
  if (autoLoc) {
    parsed.location = {
      address: autoLoc.address,
      road: autoLoc.road || "",
      ward: autoLoc.ward || "",
      district: autoLoc.district || "",
      city: autoLoc.city || "",
      lat: autoLoc.lat,
      lng: autoLoc.lng
    };
    parsed.locationName = autoLoc.address;
  }

  // A. Trường hợp đã khớp danh mục có sẵn
  if (parsed.matchedCategory) {
    const newTx = {
      id: "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      amount: parsed.amount,
      type: parsed.type,
      categoryId: parsed.matchedCategory.id,
      walletId: parsed.walletId,
      note: parsed.note,
      isWork: !!parsed.isWork,
      date: getTodayString(),
      location: parsed.location || null,
      locationName: parsed.locationName || null,
      createdAt: Date.now()
    };

    try {
      await DB.put("transactions", newTx);
      State.transactions.unshift(newTx);

      if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
        SoundEngine.play("success");
      }
      if (typeof launchConfetti === "function") {
        launchConfetti();
      }

      const sign = parsed.type === "income" ? "+" : "-";
      const workTag = parsed.isWork ? " · 💼 Đi làm" : "";
      const locTag = parsed.location?.road
        ? ` · 📍 ${parsed.location.road}`
        : (parsed.location?.address ? ` · 📍 ${parsed.location.address.split(",")[0]}` : "");
      showToast(`✓ Đã ghi: ${parsed.note} (${sign}${formatVND(parsed.amount)}${workTag}${locTag})`);

      input.value = "";
      input.blur();

      renderAllScreens();
    } catch (err) {
      console.error("Lỗi khi ghi nhanh giao dịch:", err);
      showToast("Không thể lưu giao dịch. Vui lòng thử lại!", true);
    }
    return;
  }

  // B. Trường hợp chưa có danh mục trong hệ thống -> Mở Smart Category Prompt Modal
  window._pendingSmartTx = parsed;
  openSmartCategoryPromptModal(parsed);
}

function applyQuickPreset(text) {
  const input = document.getElementById("smartQuickAddInput");
  if (!input) return;
  input.value = text;
  handleSmartQuickAddSubmit();
}

/* ==========================================================================
   SMART CATEGORY PROMPT MODAL CONTROLLER
   ========================================================================== */
function openSmartCategoryPromptModal(parsed) {
  const modal = document.getElementById("smartCategoryPromptModal");
  if (!modal || !parsed) return;

  const noteEl = document.getElementById("smartCatTxNote");
  const amtEl = document.getElementById("smartCatTxAmount");
  const badgesEl = document.getElementById("smartCatTxBadges");
  const autoNameEl = document.getElementById("smartCatAutoNameBadge");
  const autoIconEl = document.getElementById("smartCatAutoIcon");
  const autoIconBox = document.getElementById("smartCatAutoIconBox");

  const sign = parsed.type === "income" ? "+" : "-";
  if (noteEl) noteEl.textContent = parsed.note;
  if (amtEl) {
    amtEl.textContent = `${sign}${formatVND(parsed.amount)}`;
    amtEl.style.color = parsed.type === "income" ? "var(--income)" : "var(--expense)";
  }

  if (badgesEl) {
    const wObj = State.wallets.find(w => w.id === parsed.walletId) || { name: "Tiền mặt" };
    badgesEl.innerHTML = `
      <span class="tx-wallet-tag">${wObj.name}</span>
      ${parsed.isWork ? '<span class="tx-badge work"><i data-lucide="briefcase" style="width: 8px; height: 8px"></i> Đi làm</span>' : ''}
    `;
  }

  if (autoNameEl) {
    autoNameEl.textContent = `"${parsed.candidateCategoryName}"`;
  }

  const catNameEl = document.getElementById("smartCatTxCategoryName");
  if (catNameEl) {
    catNameEl.textContent = parsed.candidateCategoryName;
  }

  const guessed = parsed.guessedAttributes || { icon: "tag", color: "#10B981" };
  if (autoIconEl) {
    autoIconEl.setAttribute("data-lucide", guessed.icon || "tag");
  }
  if (autoIconBox) {
    autoIconBox.style.backgroundColor = `${guessed.color}25`;
    autoIconBox.style.color = guessed.color;
  }

  // Suggested existing category
  const suggestWrap = document.getElementById("smartCatSuggestWrap");
  if (suggestWrap) {
    if (parsed.suggestedCategory) {
      suggestWrap.style.display = "block";
      const sName = document.getElementById("smartCatSuggestName");
      const sIcon = document.getElementById("smartCatSuggestIcon");
      const sBox = document.getElementById("smartCatSuggestIconBox");
      if (sName) sName.textContent = parsed.suggestedCategory.name;
      if (sIcon) sIcon.setAttribute("data-lucide", parsed.suggestedCategory.icon || "tag");
      if (sBox) {
        sBox.style.backgroundColor = `${parsed.suggestedCategory.color}25`;
        sBox.style.color = parsed.suggestedCategory.color;
      }
    } else {
      suggestWrap.style.display = "none";
    }
  }

  // Custom Form fields
  const customNameInput = document.getElementById("smartCatCustomNameInput");
  const customTypeSelect = document.getElementById("smartCatCustomTypeSelect");
  if (customNameInput) customNameInput.value = parsed.candidateCategoryName;
  if (customTypeSelect) customTypeSelect.value = parsed.type;

  currentSmartCatSelectedIcon = guessed.icon || "tag";
  currentSmartCatSelectedColor = guessed.color || "#10B981";

  renderSmartCatIconPicker(currentSmartCatSelectedIcon);
  renderSmartCatColorPicker(currentSmartCatSelectedColor);
  renderSmartCatExistingChips();

  modal.classList.add("active");
  lucide.createIcons();
}

function closeSmartCategoryPromptModal() {
  const modal = document.getElementById("smartCategoryPromptModal");
  if (modal) modal.classList.remove("active");
  window._pendingSmartTx = null;
}

function renderSmartCatIconPicker(activeIcon) {
  const container = document.getElementById("smartCatIconRow");
  if (!container) return;
  const icons = [
    "fuel", "car", "coffee", "utensils", "scissors", "wrench", "dumbbell", 
    "paw-print", "book-open", "film", "gamepad-2", "gift", "shopping-bag", 
    "receipt", "plane", "heart-pulse", "briefcase", "banknote", "award", "tag"
  ];
  container.innerHTML = "";
  icons.forEach(ic => {
    const item = document.createElement("div");
    item.className = `smart-cat-icon-item ${ic === activeIcon ? "active" : ""}`;
    item.dataset.icon = ic;
    item.innerHTML = `<i data-lucide="${ic}" style="width: 16px; height: 16px"></i>`;
    item.onclick = () => selectSmartCatIcon(ic);
    container.appendChild(item);
  });
}

function selectSmartCatIcon(icon) {
  currentSmartCatSelectedIcon = icon;
  document.querySelectorAll("#smartCatIconRow .smart-cat-icon-item").forEach(el => {
    el.classList.toggle("active", el.dataset.icon === icon);
  });
}

function renderSmartCatColorPicker(activeColor) {
  const container = document.getElementById("smartCatColorRow");
  if (!container) return;
  const colors = [
    "#F97316", "#3B82F6", "#10B981", "#EC4899", "#8B5CF6", "#F59E0B", "#06B6D4", "#64748B", "#EF4444", "#34D399"
  ];
  container.innerHTML = "";
  colors.forEach(col => {
    const item = document.createElement("div");
    item.className = `smart-cat-color-item ${col === activeColor ? "active" : ""}`;
    item.dataset.color = col;
    item.style.backgroundColor = col;
    item.onclick = () => selectSmartCatColor(col);
    container.appendChild(item);
  });
}

function selectSmartCatColor(color) {
  currentSmartCatSelectedColor = color;
  document.querySelectorAll("#smartCatColorRow .smart-cat-color-item").forEach(el => {
    el.classList.toggle("active", el.dataset.color === color);
  });
}

function renderSmartCatExistingChips() {
  const container = document.getElementById("smartCatExistingChips");
  if (!container) return;
  container.innerHTML = "";
  State.categories.forEach(c => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "smart-cat-chip";
    chip.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${c.color || 'var(--primary)'}"></span>
      <span>${c.name}</span>
    `;
    chip.onclick = () => executeAssignExistingCategoryAndSave(c.id);
    container.appendChild(chip);
  });
}

async function executeAutoCreateCategoryAndSave() {
  const p = window._pendingSmartTx;
  if (!p) return;

  const newCat = {
    id: "c_" + Date.now(),
    name: p.candidateCategoryName,
    type: p.type,
    icon: p.guessedAttributes?.icon || "tag",
    color: p.guessedAttributes?.color || "#10B981"
  };

  try {
    await DB.put("categories", newCat);
    State.categories.push(newCat);

    const newTx = {
      id: "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      amount: p.amount,
      type: p.type,
      categoryId: newCat.id,
      walletId: p.walletId,
      note: p.note,
      isWork: !!p.isWork,
      date: getTodayString(),
      location: p.location || null,
      locationName: p.locationName || (p.location ? p.location.address : null),
      createdAt: Date.now()
    };

    await DB.put("transactions", newTx);
    State.transactions.unshift(newTx);

    if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
      SoundEngine.play("success");
    }
    if (typeof launchConfetti === "function") {
      launchConfetti();
    }

    const sign = p.type === "income" ? "+" : "-";
    const workTag = p.isWork ? " · 💼 Đi làm" : "";
    showToast(`✓ Đã tạo danh mục "${newCat.name}" & ghi nhận ${sign}${formatVND(p.amount)}${workTag}!`);

    const input = document.getElementById("smartQuickAddInput");
    if (input) input.value = "";

    closeSmartCategoryPromptModal();
    renderAllScreens();
  } catch (err) {
    console.error("Lỗi khi tự động tạo danh mục và lưu giao dịch:", err);
    showToast("Không thể tạo danh mục. Vui lòng thử lại!", true);
  }
}

async function executeAssignExistingCategoryAndSave(specificCatId) {
  const p = window._pendingSmartTx;
  if (!p) return;

  const catId = specificCatId || p.suggestedCategory?.id;
  if (!catId) {
    showToast("Vui lòng chọn danh mục!", true);
    return;
  }

  const catObj = State.categories.find(c => c.id === catId);

  const newTx = {
    id: "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    amount: p.amount,
    type: p.type,
    categoryId: catId,
    walletId: p.walletId,
    note: p.note,
    isWork: !!p.isWork,
    date: getTodayString(),
      location: p.location || null,
      locationName: p.locationName || (p.location ? p.location.address : null),
      createdAt: Date.now()
  };

  try {
    await DB.put("transactions", newTx);
    State.transactions.unshift(newTx);

    if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
      SoundEngine.play("success");
    }
    if (typeof launchConfetti === "function") {
      launchConfetti();
    }

    const sign = p.type === "income" ? "+" : "-";
    const workTag = p.isWork ? " · 💼 Đi làm" : "";
    const catName = catObj?.name ? ` [${catObj.name}]` : "";
    showToast(`✓ Đã ghi: ${p.note}${catName} (${sign}${formatVND(p.amount)}${workTag})`);

    const input = document.getElementById("smartQuickAddInput");
    if (input) input.value = "";

    closeSmartCategoryPromptModal();
    renderAllScreens();
  } catch (err) {
    console.error("Lỗi khi gán danh mục có sẵn:", err);
    showToast("Không thể lưu giao dịch. Vui lòng thử lại!", true);
  }
}

async function executeCustomCreateCategoryAndSave() {
  const p = window._pendingSmartTx;
  if (!p) return;

  const nameInput = document.getElementById("smartCatCustomNameInput");
  const typeSelect = document.getElementById("smartCatCustomTypeSelect");
  const catName = nameInput ? nameInput.value.trim() : "";
  const catType = typeSelect ? typeSelect.value : (p.type || "expense");

  if (!catName) {
    showToast("Vui lòng nhập tên danh mục!", true);
    if (nameInput) nameInput.focus();
    return;
  }

  const newCat = {
    id: "c_" + Date.now(),
    name: catName,
    type: catType,
    icon: currentSmartCatSelectedIcon || "tag",
    color: currentSmartCatSelectedColor || "#10B981"
  };

  try {
    await DB.put("categories", newCat);
    State.categories.push(newCat);

    const newTx = {
      id: "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      amount: p.amount,
      type: catType,
      categoryId: newCat.id,
      walletId: p.walletId,
      note: p.note,
      isWork: !!p.isWork,
      date: getTodayString(),
      location: p.location || null,
      locationName: p.locationName || (p.location ? p.location.address : null),
      createdAt: Date.now()
    };

    await DB.put("transactions", newTx);
    State.transactions.unshift(newTx);

    if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
      SoundEngine.play("success");
    }
    if (typeof launchConfetti === "function") {
      launchConfetti();
    }

    const sign = catType === "income" ? "+" : "-";
    const workTag = p.isWork ? " · 💼 Đi làm" : "";
    showToast(`✓ Đã tạo danh mục "${newCat.name}" & ghi nhận ${sign}${formatVND(p.amount)}${workTag}!`);

    const input = document.getElementById("smartQuickAddInput");
    if (input) input.value = "";

    closeSmartCategoryPromptModal();
    renderAllScreens();
  } catch (err) {
    console.error("Lỗi khi tạo danh mục tùy chỉnh:", err);
    showToast("Không thể tạo danh mục. Vui lòng thử lại!", true);
  }
}

/* ==========================================================================
   FINANCIAL HEALTH CARD CONTROLLER
   ========================================================================== */
function renderFinancialHealthCard() {
  const card = document.getElementById("financialHealthCard");
  if (!card || typeof calculateFinancialHealth !== "function") return;

  const health = calculateFinancialHealth();

  const scoreEl = document.getElementById("healthScoreValue");
  if (scoreEl) {
    animateCountUp(scoreEl, health.score, "", "");
  }

  const badgeEl = document.getElementById("healthStatusBadge");
  if (badgeEl) {
    badgeEl.textContent = health.status;
    badgeEl.style.color = health.badgeColor;
    badgeEl.style.backgroundColor = health.badgeBg;
  }

  const gaugeBar = document.getElementById("healthGaugeProgress");
  if (gaugeBar) {
    gaugeBar.setAttribute("stroke-dasharray", `${health.score}, 100`);
    gaugeBar.style.stroke = health.badgeColor;
  }

  const savingsRateEl = document.getElementById("healthSavingsRate");
  const savingsBarEl = document.getElementById("healthSavingsBar");
  if (savingsRateEl) {
    savingsRateEl.textContent = health.income > 0 ? `${health.savingsRate}%` : "Chưa có thu";
  }
  if (savingsBarEl) {
    savingsBarEl.style.width = `${Math.min(100, Math.max(0, health.savingsRate))}%`;
  }

  const budgetRateEl = document.getElementById("healthBudgetRate");
  const budgetBarEl = document.getElementById("healthBudgetBar");
  if (budgetRateEl) {
    if (health.budgetPercent >= 100) {
      budgetRateEl.textContent = `Bội chi (${health.budgetPercent}%)`;
      budgetRateEl.style.color = "var(--expense)";
    } else if (health.budgetPercent >= 80) {
      budgetRateEl.textContent = `Cảnh báo (${health.budgetPercent}%)`;
      budgetRateEl.style.color = "var(--warning)";
    } else {
      budgetRateEl.textContent = `${health.budgetPercent}% (An toàn)`;
      budgetRateEl.style.color = "var(--text-primary)";
    }
  }
  if (budgetBarEl) {
    budgetBarEl.style.width = `${Math.min(100, health.budgetPercent)}%`;
    budgetBarEl.style.background = health.budgetPercent >= 100 ? "var(--expense)" : health.budgetPercent >= 80 ? "var(--warning)" : "var(--mint)";
  }

  const adviceEl = document.getElementById("healthAdviceText");
  if (adviceEl) {
    adviceEl.textContent = health.advice;
  }
}

/* ==========================================================================
   SMART BUDGET OVERSPENDING ALERT BANNER CONTROLLER
   ========================================================================== */
function renderBudgetAlertBanner() {
  const banner = document.getElementById("overviewBudgetAlertBanner");
  if (!banner) return;

  const now = new Date();
  const curMonthPrefix = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const monthExpense = State.transactions
    .filter(t => t.type === "expense" && t.date && t.date.startsWith(curMonthPrefix))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const monthlyLimit = Number(State.settings && State.settings.monthly_budget) || State.monthlyBudgetLimit || 15000000;
  const pct = monthlyLimit > 0 ? (monthExpense / monthlyLimit) * 100 : 0;

  if (pct >= 80) {
    banner.style.display = "flex";
    const titleEl = document.getElementById("budgetAlertTitle");
    const descEl = document.getElementById("budgetAlertDesc");
    if (pct >= 100) {
      banner.className = "budget-alert-banner danger";
      if (titleEl) titleEl.textContent = "Vượt hạn mức ngân sách!";
      if (descEl) descEl.textContent = `Chi tiêu tháng (${formatVND(monthExpense)}) đã vượt hạn mức (${formatVND(monthlyLimit)})`;
    } else {
      banner.className = "budget-alert-banner";
      if (titleEl) titleEl.textContent = "Cảnh báo hạn mức tháng";
      if (descEl) descEl.textContent = `Bạn đã sử dụng ${pct.toFixed(0)}% hạn mức ngân sách (${formatVND(monthExpense)} / ${formatVND(monthlyLimit)})`;
    }
  } else {
    banner.style.display = "none";
  }
}
