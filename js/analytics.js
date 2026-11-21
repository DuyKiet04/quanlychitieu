      /* ==========================================================================
       8. SCREEN 3: PHÂN TÍCH & LỊCH TÀI CHÍNH (ANALYTICS & CALENDAR)
       ========================================================================== */
      let currentAnalyticsTab = "category";

      function switchAnalyticsTab(tabKey) {
        currentAnalyticsTab = tabKey;
        const tabs = [
          {
            key: "category",
            btn: document.getElementById("tabAnalyticsCategoryBtn"),
            pane: document.getElementById("paneAnalyticsCategory"),
          },
          {
            key: "trend",
            btn: document.getElementById("tabAnalyticsTrendBtn"),
            pane: document.getElementById("paneAnalyticsTrend"),
          },
          {
            key: "heatmap",
            btn: document.getElementById("tabAnalyticsHeatmapBtn"),
            pane: document.getElementById("paneAnalyticsHeatmap"),
          },
        ];

        tabs.forEach((t) => {
          if (t.btn) t.btn.classList.toggle("active", t.key === tabKey);
          if (t.pane) {
            t.pane.classList.toggle("active", t.key === tabKey);
            t.pane.style.display = t.key === tabKey ? "block" : "none";
          }
        });

        const { startStr, endStr } = getDateRangeFilter(
          State.analyticsPeriod,
          State.analyticsStartDate,
          State.analyticsEndDate,
        );
        const dStart = new Date(startStr);
        const dEnd = new Date(endStr);
        const diffDays = Math.max(
          Math.ceil(Math.abs(dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1,
          1,
        );

        if (tabKey === "trend") {
          renderAnalyticsTrendChart(startStr, endStr, diffDays);
        } else if (tabKey === "category") {
          const totalExp = State.transactions
            .filter(
              (t) =>
                t.type === "expense" && t.date >= startStr && t.date <= endStr,
            )
            .reduce((s, t) => s + (Number(t.amount) || 0), 0);
          renderAnalyticsCategoryDonutChart(startStr, endStr, totalExp);
        }

        lucide.createIcons();
      }

      function renderAnalyticsScreen() {
        if (State.analyticsViewMode === "calendar") {
          renderFinancialCalendar();
          return;
        }

        const { startStr, endStr } = getDateRangeFilter(
          State.analyticsPeriod,
          State.analyticsStartDate,
          State.analyticsEndDate,
        );
        const filtered = State.transactions.filter(
          (t) =>
            t.date >= startStr && t.date <= endStr && t.type !== "transfer",
        );

        let totalInc = 0;
        let totalExp = 0;
        const dayTotals = {};

        filtered.forEach((t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === "income") totalInc += amt;
          else if (t.type === "expense") {
            totalExp += amt;
            dayTotals[t.date] = (dayTotals[t.date] || 0) + amt;
          }
        });

        const net = totalInc - totalExp;

        // 1. Cập nhật thanh tiêu đề hiển thị thời gian & nhãn nút
        const periodLabels = {
          today: "Hôm nay",
          "7d": "7 ngày gần nhất",
          "30d": "30 ngày gần nhất",
          this_month: "Tháng này",
          last_month: "Tháng trước",
          this_year: "Năm nay",
          all: "Toàn bộ thời gian",
        };

        const rangeDisplayEl = document.getElementById(
          "analyticsPeriodRangeDisplay",
        );
        if (rangeDisplayEl) {
          if (State.analyticsPeriod === "custom") {
            rangeDisplayEl.textContent = `${formatDateDisplay(startStr)} - ${formatDateDisplay(endStr)}`;
          } else if (State.analyticsPeriod === "this_month") {
            const now = new Date();
            rangeDisplayEl.textContent = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
          } else {
            rangeDisplayEl.textContent =
              periodLabels[State.analyticsPeriod] || "Tháng này";
          }
        }

        const btnLabelEl = document.getElementById("analyticsPeriodBtnLabel");
        if (btnLabelEl) {
          if (State.analyticsPeriod === "this_month")
            btnLabelEl.textContent = "Tháng này";
          else if (State.analyticsPeriod === "7d")
            btnLabelEl.textContent = "7N";
          else if (State.analyticsPeriod === "30d")
            btnLabelEl.textContent = "30N";
          else if (State.analyticsPeriod === "last_month")
            btnLabelEl.textContent = "Tháng trước";
          else if (State.analyticsPeriod === "this_year")
            btnLabelEl.textContent = "Năm nay";
          else if (State.analyticsPeriod === "all")
            btnLabelEl.textContent = "Tất cả";
          else btnLabelEl.textContent = "Tùy chọn";
        }

        // 2. Cập nhật Thẻ Trung Tâm Hero: Dòng tiền ròng & Thu vs Chi
        const netEl = document.getElementById("kpiNetIncome");
        if (netEl) netEl.textContent = (net >= 0 ? "+" : "") + formatVND(net);

        const totalIncEl = document.getElementById("kpiTotalIncome");
        if (totalIncEl) totalIncEl.textContent = "+" + formatVND(totalInc);

        const totalExpEl = document.getElementById("kpiTotalExpense");
        if (totalExpEl) totalExpEl.textContent = "-" + formatVND(totalExp);

        // Thanh tỷ lệ Thu vs Chi
        const totalFlow = totalInc + totalExp;
        const incPct =
          totalFlow > 0 ? Math.round((totalInc / totalFlow) * 100) : 50;
        const expPct = totalFlow > 0 ? 100 - incPct : 50;

        const incRatioBar = document.getElementById("kpiIncomeRatioBar");
        const expRatioBar = document.getElementById("kpiExpenseRatioBar");
        const incPctLabel = document.getElementById("kpiIncomePercentLabel");
        const expPctLabel = document.getElementById("kpiExpensePercentLabel");

        if (incRatioBar) incRatioBar.style.width = `${incPct}%`;
        if (expRatioBar) expRatioBar.style.width = `${expPct}%`;
        if (incPctLabel) incPctLabel.textContent = `Thu vào: ${incPct}%`;
        if (expPctLabel) expPctLabel.textContent = `Chi ra: ${expPct}%`;

        // Badge đánh giá sức khỏe tài chính
        const healthBadge = document.getElementById("kpiHealthStatusBadge");
        if (healthBadge) {
          if (totalInc === 0 && totalExp === 0) {
            healthBadge.textContent = "Chưa có dữ liệu";
            healthBadge.style.background = "rgba(255, 255, 255, 0.18)";
            healthBadge.style.color = "#FFFFFF";
          } else if (net >= 0 && totalInc > 0 && net / totalInc >= 0.25) {
            const savePct = Math.round((net / totalInc) * 100);
            healthBadge.textContent = `✓ Tiết kiệm tốt (+${savePct}%)`;
            healthBadge.style.background = "rgba(52, 211, 153, 0.28)";
            healthBadge.style.color = "#A7F3D0";
          } else if (net >= 0) {
            healthBadge.textContent = "✓ Dòng tiền cân bằng";
            healthBadge.style.background = "rgba(52, 211, 153, 0.22)";
            healthBadge.style.color = "#D1FAE5";
          } else {
            healthBadge.textContent = `⚠️ Bội chi (-${formatNumberOnly(Math.abs(net))} ₫)`;
            healthBadge.style.background = "rgba(248, 113, 113, 0.3)";
            healthBadge.style.color = "#FECACA";
          }
        }

        // Period duration in days
        const dStart = new Date(startStr);
        const dEnd = new Date(endStr);
        const diffTime = Math.abs(dEnd - dStart);
        const diffDays = Math.max(
          Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1,
          1,
        );

        // Chi tiêu TB / ngày
        const dailyAvg = Math.round(totalExp / diffDays);
        const dailyAvgEl = document.getElementById("kpiDailyAvg");
        if (dailyAvgEl) dailyAvgEl.textContent = formatVND(dailyAvg);

        // Số giao dịch
        const totalTxEl = document.getElementById("kpiTotalTx");
        if (totalTxEl) totalTxEl.textContent = `${filtered.length} GD`;

        // Ngày chi nhiều nhất (Peak Day)
        let peakDay = "Chưa có";
        let peakAmt = 0;
        Object.entries(dayTotals).forEach(([day, amt]) => {
          if (amt > peakAmt) {
            peakAmt = amt;
            peakDay = `${formatDateDisplay(day)} (${formatVND(amt)})`;
          }
        });
        const peakDayEl = document.getElementById("kpiPeakDay");
        if (peakDayEl) peakDayEl.textContent = peakDay;

        // Initial & End Balances placeholders
        const initBal = Number(State.settings.initial_balance) || 0;
        const startBalEl = document.getElementById("kpiStartBalance");
        const endBalEl = document.getElementById("kpiEndBalance");
        if (startBalEl) startBalEl.textContent = formatVND(initBal);
        if (endBalEl) endBalEl.textContent = formatVND(initBal + net);

        // 3. So Sánh Với Kỳ Liền Kề Trước
        renderPeriodComparison(startStr, endStr, diffDays, totalExp);

        // 4. Vẽ biểu đồ các tab
        renderAnalyticsCategoryDonutChart(startStr, endStr, totalExp);
        renderAnalyticsTrendChart(startStr, endStr, diffDays);
        renderAdaptiveCalendarHeatmap(startStr, endStr);

        lucide.createIcons();
      }

      /* Month-over-Month / Period Comparison Analysis */
      function renderPeriodComparison(
        startStr,
        endStr,
        durationDays,
        currentExpense,
      ) {
        const prevEnd = new Date(startStr);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - durationDays + 1);

        const prevStartStr = prevStart.toISOString().split("T")[0];
        const prevEndStr = prevEnd.toISOString().split("T")[0];

        let prevExpense = 0;
        const prevCatTotals = {};
        const currCatTotals = {};

        State.transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              t.date >= prevStartStr &&
              t.date <= prevEndStr,
          )
          .forEach((t) => {
            const amt = Number(t.amount) || 0;
            prevExpense += amt;
            prevCatTotals[t.categoryId] =
              (prevCatTotals[t.categoryId] || 0) + amt;
          });

        State.transactions
          .filter(
            (t) =>
              t.type === "expense" && t.date >= startStr && t.date <= endStr,
          )
          .forEach((t) => {
            const amt = Number(t.amount) || 0;
            currCatTotals[t.categoryId] =
              (currCatTotals[t.categoryId] || 0) + amt;
          });

        const badge = document.getElementById("kpiPeriodCompareBadge");
        const detail = document.getElementById("kpiPeriodCompareDetail");

        if (badge && detail) {
          if (prevExpense === 0) {
            badge.textContent = "Chưa có dữ liệu";
            badge.style.background = "var(--bg-card-subtle)";
            badge.style.color = "var(--text-secondary)";
            detail.textContent = `Kỳ này: ${formatVND(currentExpense)}`;
            detail.title = `Kỳ này: ${formatVND(currentExpense)}`;
          } else {
            const diffAmt = currentExpense - prevExpense;
            const diffPct = ((diffAmt / prevExpense) * 100).toFixed(1);

            if (diffAmt > 0) {
              badge.textContent = `+${diffPct}%`;
              badge.style.background = "var(--expense-bg)";
              badge.style.color = "var(--expense)";
              detail.textContent = `Tăng ${formatVND(diffAmt)} vs kỳ trước`;
              detail.title = `Chi tiêu tăng ${formatVND(diffAmt)} so với kỳ trước (${formatVND(prevExpense)}).`;
            } else {
              badge.textContent = `${diffPct}%`;
              badge.style.background = "var(--income-bg)";
              badge.style.color = "var(--income)";
              detail.textContent = `Giảm ${formatVND(Math.abs(diffAmt))} vs kỳ trước`;
              detail.title = `Tiết kiệm được ${formatVND(Math.abs(diffAmt))} so với kỳ trước (${formatVND(prevExpense)}).`;
            }
          }
        }

        // Find top increased and decreased categories
        let maxIncreaseCat = null;
        let maxIncreaseAmt = 0;
        let maxDecreaseCat = null;
        let maxDecreaseAmt = 0;

        const allCatIds = new Set([
          ...Object.keys(prevCatTotals),
          ...Object.keys(currCatTotals),
        ]);
        allCatIds.forEach((id) => {
          const cur = currCatTotals[id] || 0;
          const prev = prevCatTotals[id] || 0;
          const diff = cur - prev;
          if (diff > maxIncreaseAmt) {
            maxIncreaseAmt = diff;
            maxIncreaseCat =
              State.categories.find((c) => c.id === id)?.name || id;
          }
          if (diff < maxDecreaseAmt) {
            maxDecreaseAmt = diff;
            maxDecreaseCat =
              State.categories.find((c) => c.id === id)?.name || id;
          }
        });

        const incCatEl = document.getElementById("kpiTopIncreaseCat");
        const saveCatEl = document.getElementById("kpiTopSaveCat");
        if (incCatEl) {
          const fullIncText = maxIncreaseCat
            ? `${maxIncreaseCat} (+${formatNumberOnly(maxIncreaseAmt)} ₫)`
            : "Không";
          incCatEl.textContent = fullIncText;
          incCatEl.title = fullIncText;
        }
        if (saveCatEl) {
          const fullSaveText = maxDecreaseCat
            ? `${maxDecreaseCat} (-${formatNumberOnly(Math.abs(maxDecreaseAmt))} ₫)`
            : "Không";
          saveCatEl.textContent = fullSaveText;
          saveCatEl.title = fullSaveText;
        }
      }

      /* Biểu Đồ Tròn Donut & Danh Sách Top Danh Mục Chi Tiêu */
      function renderAnalyticsCategoryDonutChart(startStr, endStr, totalExp) {
        const canvas = document.getElementById("analyticsCategoryDonutChart");
        const rankContainer = document.getElementById(
          "analyticsCategoryRankList",
        );
        if (!canvas || !rankContainer) return;

        if (analyticsCategoryDonutChartInstance) {
          analyticsCategoryDonutChartInstance.destroy();
          analyticsCategoryDonutChartInstance = null;
        }

        const catTotals = {};
        State.transactions
          .filter(
            (t) =>
              t.type === "expense" && t.date >= startStr && t.date <= endStr,
          )
          .forEach((t) => {
            const amt = Number(t.amount) || 0;
            catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + amt;
          });

        const catIds = Object.keys(catTotals).sort(
          (a, b) => catTotals[b] - catTotals[a],
        );

        if (catIds.length === 0 || totalExp === 0) {
          rankContainer.innerHTML =
            '<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 24px 0;">Chưa có khoản chi tiêu nào trong khoảng thời gian này.</div>';
          const ctx = canvas.getContext("2d");
          analyticsCategoryDonutChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: ["Chưa có dữ liệu"],
              datasets: [
                {
                  data: [1],
                  backgroundColor: ["#E2E8F0"],
                  borderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: "72%",
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
              },
            },
          });
          return;
        }

        const labels = [];
        const data = [];
        const colors = [];

        rankContainer.innerHTML = "";

        catIds.forEach((id) => {
          const cat = State.categories.find((c) => c.id === id) || {
            name: "Khác",
            color: "#BFE8D5",
            icon: "tag",
          };
          const amt = catTotals[id];
          const pct = ((amt / totalExp) * 100).toFixed(1);

          labels.push(cat.name);
          data.push(amt);
          colors.push(cat.color || "#2DA87B");

          const item = document.createElement("div");
          item.className = "cat-rank-item";
          item.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <div style="width: 26px; height: 26px; border-radius: 8px; background: ${cat.color || "#2DA87B"}18; color: ${cat.color || "#2DA87B"}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${cat.icon || "tag"}" style="width: 14px; height: 14px;"></i>
              </div>
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.name}</span>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span style="font-size: 0.82rem; font-weight: 800; color: var(--text-primary);">${formatVND(amt)}</span>
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); margin-left: 4px;">(${pct}%)</span>
            </div>
          </div>
          <div class="cat-rank-bar-bg">
            <div class="cat-rank-bar-fill" style="width: ${pct}%; background: ${cat.color || "#2DA87B"};"></div>
          </div>
        `;
          rankContainer.appendChild(item);
        });

        const ctx = canvas.getContext("2d");
        analyticsCategoryDonutChartInstance = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: labels,
            datasets: [
              {
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "var(--bg-card, #FFFFFF)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const val = context.parsed || 0;
                    const p =
                      totalExp > 0 ? ((val / totalExp) * 100).toFixed(1) : 0;
                    return ` ${context.label}: ${formatVND(val)} (${p}%)`;
                  },
                },
              },
            },
          },
        });

        lucide.createIcons();
      }

      /* Auto-Grouping Trend Line Chart (<45d day, 45-180d week, >180d month) */
      function renderAnalyticsTrendChart(startStr, endStr, durationDays) {
        const canvas = document.getElementById("analyticsTrendChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (analyticsTrendChartInstance) analyticsTrendChartInstance.destroy();

        const badge = document.getElementById("analyticsGroupingBadge");
        const labels = [];
        const expenseData = [];
        const incomeData = [];

        if (durationDays <= 45) {
          badge.textContent = "Gom nhóm theo ngày";
          const cur = new Date(startStr);
          const end = new Date(endStr);
          while (cur <= end) {
            const dStr = cur.toISOString().split("T")[0];
            labels.push(`${cur.getDate()}/${cur.getMonth() + 1}`);

            let inc = 0,
              exp = 0;
            State.transactions
              .filter((t) => t.date === dStr && t.type !== "transfer")
              .forEach((t) => {
                if (t.type === "income") inc += Number(t.amount) || 0;
                else if (t.type === "expense") exp += Number(t.amount) || 0;
              });
            incomeData.push(inc);
            expenseData.push(exp);
            cur.setDate(cur.getDate() + 1);
          }
        } else if (durationDays <= 180) {
          badge.textContent = "Gom nhóm theo tuần";
          const cur = new Date(startStr);
          const end = new Date(endStr);
          let weekIdx = 1;
          while (cur <= end) {
            const wStart = new Date(cur);
            const wEnd = new Date(cur);
            wEnd.setDate(wEnd.getDate() + 6);
            if (wEnd > end) wEnd.setTime(end.getTime());

            const wStartStr = wStart.toISOString().split("T")[0];
            const wEndStr = wEnd.toISOString().split("T")[0];

            labels.push(
              `W${weekIdx} (${wStart.getDate()}/${wStart.getMonth() + 1})`,
            );

            let inc = 0,
              exp = 0;
            State.transactions
              .filter(
                (t) =>
                  t.date >= wStartStr &&
                  t.date <= wEndStr &&
                  t.type !== "transfer",
              )
              .forEach((t) => {
                if (t.type === "income") inc += Number(t.amount) || 0;
                else if (t.type === "expense") exp += Number(t.amount) || 0;
              });
            incomeData.push(inc);
            expenseData.push(exp);

            cur.setDate(cur.getDate() + 7);
            weekIdx++;
          }
        } else {
          badge.textContent = "Gom nhóm theo tháng";
          const cur = new Date(startStr);
          const end = new Date(endStr);
          while (cur <= end) {
            const y = cur.getFullYear();
            const m = cur.getMonth();
            const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
            labels.push(`T${m + 1}/${y}`);

            let inc = 0,
              exp = 0;
            State.transactions
              .filter(
                (t) =>
                  t.date &&
                  t.date.startsWith(monthKey) &&
                  t.type !== "transfer",
              )
              .forEach((t) => {
                if (t.type === "income") inc += Number(t.amount) || 0;
                else if (t.type === "expense") exp += Number(t.amount) || 0;
              });
            incomeData.push(inc);
            expenseData.push(exp);

            cur.setMonth(cur.getMonth() + 1);
            cur.setDate(1);
          }
        }

        analyticsTrendChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Chi tiêu",
                data: expenseData,
                borderColor: "#E75A4D",
                backgroundColor: "rgba(231, 90, 77, 0.08)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: labels.length <= 14 ? 3 : 0,
              },
              {
                label: "Thu nhập",
                data: incomeData,
                borderColor: "#28A76B",
                backgroundColor: "rgba(40, 167, 107, 0.08)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: labels.length <= 14 ? 3 : 0,
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

      /* Adaptive Calendar Heatmap for Selected Date Range */
      function renderAdaptiveCalendarHeatmap(startStr, endStr) {
        const container = document.getElementById("analyticsHeatmapGrid");
        if (!container) return;
        container.innerHTML = "";

        const descEl = document.getElementById("heatmapPeriodDesc");
        if (descEl)
          descEl.textContent = `Cường độ chi tiêu từ ${formatDateDisplay(startStr)} đến ${formatDateDisplay(endStr)}`;

        const daySpendMap = {};
        let maxSpend = 0;

        State.transactions
          .filter(
            (t) =>
              t.type === "expense" && t.date >= startStr && t.date <= endStr,
          )
          .forEach((t) => {
            const amt = Number(t.amount) || 0;
            daySpendMap[t.date] = (daySpendMap[t.date] || 0) + amt;
            if (daySpendMap[t.date] > maxSpend) maxSpend = daySpendMap[t.date];
          });

        const cur = new Date(startStr);
        const end = new Date(endStr);
        const cells = [];

        while (cur <= end) {
          cells.push(cur.toISOString().split("T")[0]);
          cur.setDate(cur.getDate() + 1);
        }

        cells.forEach((dStr) => {
          const amt = daySpendMap[dStr] || 0;
          const cell = document.createElement("div");
          cell.className = "heatmap-day-cell";
          cell.style.height = "34px";

          let bg = "var(--bg-card-subtle)";
          if (amt > 0 && maxSpend > 0) {
            const ratio = amt / maxSpend;
            if (ratio > 0.75) bg = "#E75A4D";
            else if (ratio > 0.5) bg = "#FB923C";
            else if (ratio > 0.25) bg = "#FBBF24";
            else bg = "#BFE8D5";
          }

          cell.style.backgroundColor = bg;
          if (bg === "#E75A4D" || bg === "#FB923C")
            cell.style.color = "#FFFFFF";

          const dNum = parseInt(dStr.split("-")[2], 10);
          cell.textContent = dNum;
          cell.title = `${formatDateDisplay(dStr)}: ${formatVND(amt)}`;

          cell.onclick = () => {
            showToast(`${formatDateDisplay(dStr)}: Chi ${formatVND(amt)}`);
          };

          container.appendChild(cell);
        });
      }

      function formatShortK(num) {
        const val = Math.abs(Number(num) || 0);
        if (val >= 1000000)
          return (val / 1000000).toFixed(1).replace(".0", "") + "M";
        if (val >= 1000) return Math.round(val / 1000) + "k";
        return String(val);
      }

      /* Financial Calendar Sub-View (Arka Style) */
      function renderFinancialCalendar() {
        const calDate = State.financialCalendarDate;
        const y = calDate.getFullYear();
        const m = calDate.getMonth();

        // 1. Tiêu đề tháng & năm
        const monthTitleEl = document.getElementById("calCurrentMonthTitle");
        if (monthTitleEl) {
          monthTitleEl.textContent = `Tháng ${m + 1}, ${y}`;
        }

        // 2. Thống kê toàn diện dòng tiền tháng đang hiển thị
        const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
        const monthTxs = State.transactions.filter(
          (t) => t.date && t.date.startsWith(monthPrefix),
        );

        let monthIncome = 0;
        let monthExpense = 0;
        monthTxs.forEach((t) => {
          if (t.type === "income") monthIncome += Number(t.amount) || 0;
          else if (t.type === "expense") monthExpense += Number(t.amount) || 0;
        });
        const monthNet = monthIncome - monthExpense;

        const mIncEl = document.getElementById("calMonthIncomeText");
        if (mIncEl) mIncEl.textContent = "+" + formatVND(monthIncome);

        const mExpEl = document.getElementById("calMonthExpenseText");
        if (mExpEl) mExpEl.textContent = "-" + formatVND(monthExpense);

        const mNetEl = document.getElementById("calMonthNetText");
        if (mNetEl) {
          mNetEl.textContent = (monthNet >= 0 ? "+" : "") + formatVND(monthNet);
          mNetEl.className = `cal-metric-val ${monthNet >= 0 ? "income-text" : "expense-text"}`;
        }

        const mCountEl = document.getElementById("calCurrentMonthTxCount");
        if (mCountEl) {
          mCountEl.textContent = `${monthTxs.length} giao dịch`;
        }

        // 3. Xây dựng ô ngày trong lưới lịch
        const grid = document.getElementById("financialCalendarGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const firstDayOfMonth = new Date(y, m, 1);
        const lastDayOfMonth = new Date(y, m + 1, 0);

        // Sunday is 0 -> Đổi để Thứ Hai là 0, Chủ Nhật là 6
        let startDayOfWeek = firstDayOfMonth.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;

        const totalDays = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(y, m, 0).getDate();

        // Các ngày mờ của tháng trước
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
          const prevDay = prevMonthLastDay - i;
          const cell = document.createElement("div");
          cell.className = "cal-day-cell other-month";
          cell.innerHTML = `<span class="cal-day-num">${prevDay}</span>`;
          grid.appendChild(cell);
        }

        const todayStr = getTodayString();
        let selectedDayStr = State.selectedCalDay;
        if (!selectedDayStr || !selectedDayStr.startsWith(monthPrefix)) {
          selectedDayStr = todayStr.startsWith(monthPrefix)
            ? todayStr
            : `${monthPrefix}-01`;
          State.selectedCalDay = selectedDayStr;
        }

        // Vẽ các ngày chính thức của tháng
        for (let d = 1; d <= totalDays; d++) {
          const curDateStr = `${monthPrefix}-${String(d).padStart(2, "0")}`;
          const cell = document.createElement("div");
          cell.className = "cal-day-cell";
          if (curDateStr === todayStr) cell.classList.add("is-today");
          if (curDateStr === selectedDayStr)
            cell.classList.add("active-selected");

          // Thống kê thu chi ngày này
          const dayTxs = State.transactions.filter(
            (t) => t.date === curDateStr,
          );
          let dayInc = 0;
          let dayExp = 0;
          let hasPhoto = false;

          dayTxs.forEach((t) => {
            if (t.type === "income") dayInc += Number(t.amount) || 0;
            else if (t.type === "expense") dayExp += Number(t.amount) || 0;
            if (t.receipt) hasPhoto = true;
          });

          // Hiệu ứng nhiệt nếu chi tiêu nhiều (>= 500k)
          if (dayExp >= 500000) {
            cell.classList.add("high-spending");
          }

          let chipsHtml = "";
          if (dayExp > 0) {
            chipsHtml += `<span class="cal-amt-chip expense">-${formatShortK(dayExp)}</span>`;
          }
          if (dayInc > 0) {
            chipsHtml += `<span class="cal-amt-chip income">+${formatShortK(dayInc)}</span>`;
          }

          let dotIconsHtml = "";
          if (hasPhoto) {
            dotIconsHtml += `<i data-lucide="paperclip" class="cal-chip-icon" style="width: 9px; height: 9px;"></i>`;
          }

          cell.innerHTML = `
            <div class="cal-cell-top">
              <span class="cal-day-num">${d}</span>
              ${dotIconsHtml}
            </div>
            <div class="cal-cell-chips">
              ${chipsHtml}
            </div>
          `;

          cell.onclick = () => {
            State.selectedCalDay = curDateStr;
            document
              .querySelectorAll(".cal-day-cell")
              .forEach((c) => c.classList.remove("active-selected"));
            cell.classList.add("active-selected");
            if (typeof triggerHaptic === "function") triggerHaptic("light");
            renderSelectedDayDetail(curDateStr);
          };

          grid.appendChild(cell);
        }

        lucide.createIcons();
        renderSelectedDayDetail(selectedDayStr);
      }

      function renderSelectedDayDetail(dateStr) {
        if (!dateStr) dateStr = getTodayString();

        // Format tiêu đề ngày thân thiện tiếng Việt
        const parts = dateStr.split("-").map(Number);
        const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const weekdays = [
          "Chủ Nhật",
          "Thứ Hai",
          "Thứ Ba",
          "Thứ Tư",
          "Thứ Năm",
          "Thứ Sáu",
          "Thứ Bảy",
        ];
        const dayTitle = `${weekdays[dObj.getDay()]}, ${parts[2]} thg ${parts[1]}`;

        const titleEl = document.getElementById("calSelectedDayTitle");
        if (titleEl) titleEl.textContent = dayTitle;

        const dayTxs = State.transactions.filter((t) => t.date === dateStr);
        let dayInc = 0;
        let dayExp = 0;

        dayTxs.forEach((t) => {
          if (t.type === "income") dayInc += Number(t.amount) || 0;
          else if (t.type === "expense") dayExp += Number(t.amount) || 0;
        });

        const dayNet = dayInc - dayExp;

        const daySubEl = document.getElementById("calSelectedDaySub");
        if (daySubEl) {
          daySubEl.textContent =
            dayTxs.length > 0
              ? `${dayTxs.length} giao dịch phát sinh`
              : "Không có giao dịch";
        }

        const dIncEl = document.getElementById("calDayIncomeText");
        if (dIncEl) dIncEl.textContent = "+" + formatVND(dayInc);

        const dExpEl = document.getElementById("calDayExpenseText");
        if (dExpEl) dExpEl.textContent = "-" + formatVND(dayExp);

        const dNetEl = document.getElementById("calDayNetText");
        if (dNetEl) {
          dNetEl.textContent = (dayNet >= 0 ? "+" : "") + formatVND(dayNet);
          dNetEl.className = `val ${dayNet >= 0 ? "income-text" : "expense-text"}`;
        }

        const listContainer = document.getElementById("calDayTxList");
        if (!listContainer) return;
        listContainer.innerHTML = "";

        if (dayTxs.length === 0) {
          listContainer.innerHTML = `
            <div class="cal-empty-day-state">
              <div class="cal-empty-icon-box">
                <i data-lucide="coffee" style="width: 20px; height: 20px;"></i>
              </div>
              <div class="cal-empty-text">Ngày này không có chi tiêu nào</div>
              <button class="cal-empty-add-btn" type="button" onclick="openTransactionWizard(null, false, { date: '${dateStr}' })">
                <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                <span>Ghi chép cho ngày này</span>
              </button>
            </div>
          `;
          lucide.createIcons();
          return;
        }

        dayTxs.forEach((tx) => {
          listContainer.appendChild(createTransactionCardElement(tx));
        });
        lucide.createIcons();
      }
