/* ==========================================================================
   SCREEN: TÀI CHÍNH ĐI LÀM (COMPACT WORK EXPENSES & INCOME DASHBOARD)
   - Xem chi tiêu đi làm theo tháng: Lương nhận, Tiêu đi làm, Còn lại, % Tiêu
   - Khoản chi tiêu tốn nhiều nhất cho đi làm (Top 1) kèm mức trung bình ngày
   - Phân bổ chi phí đi làm theo danh mục (Thanh tỷ trọng & danh sách xếp hạng)
   - Lịch mini chi tiêu đi làm từng ngày (bấm ngày để lọc danh sách)
   - Danh sách chi tiết các khoản chi tiêu đi làm
   ========================================================================== */

let workCalendarDate = new Date();
let selectedWorkDayFilter = null;

function changeWorkMonth(delta) {
  workCalendarDate.setMonth(workCalendarDate.getMonth() + delta);
  selectedWorkDayFilter = null;
  renderWorkFinanceScreen();
  if (typeof triggerHaptic === "function") triggerHaptic("light");
}
window.changeWorkMonth = changeWorkMonth;

function selectWorkDayFilter(dateStr) {
  if (selectedWorkDayFilter === dateStr) {
    selectedWorkDayFilter = null;
  } else {
    selectedWorkDayFilter = dateStr;
  }
  renderWorkFinanceScreen();
  if (typeof triggerHaptic === "function") triggerHaptic("light");
}
window.selectWorkDayFilter = selectWorkDayFilter;

function clearWorkDayFilter() {
  selectedWorkDayFilter = null;
  renderWorkFinanceScreen();
  if (typeof triggerHaptic === "function") triggerHaptic("light");
}
window.clearWorkDayFilter = clearWorkDayFilter;

function formatCompactK(val) {
  const num = Math.abs(Number(val) || 0);
  if (num >= 1000000) {
    const m = (num / 1000000).toFixed(1).replace(".0", "");
    return m + "M";
  }
  if (num >= 1000) {
    const k = Math.round(num / 1000);
    return k + "k";
  }
  return num.toString();
}

/**
 * Render category icon safely: handles Lucide icon identifiers or Unicode emojis.
 */
function renderWorkCatIcon(cat, size = 18) {
  const icon = (cat && cat.icon) || "briefcase";
  const color = (cat && cat.color) || "var(--primary)";
  if (/^[a-z0-9-]+$/.test(icon)) {
    return `<i data-lucide="${icon}" style="width: ${size}px; height: ${size}px; color: ${color};"></i>`;
  }
  return `<span style="font-size: ${size}px; line-height: 1;">${icon}</span>`;
}

function renderWorkFinanceScreen() {
  const year = workCalendarDate.getFullYear();
  const month = workCalendarDate.getMonth();

  // 1. Month Stepper Label
  const monthLabelEl = document.getElementById("workCurrentMonthLabel");
  if (monthLabelEl) {
    monthLabelEl.textContent = `Tháng ${month + 1}, ${year}`;
  }

  // 2. Month Date Range: YYYY-MM-01 -> YYYY-MM-lastDay
  const pad2 = (n) => String(n).padStart(2, "0");
  const startStr = `${year}-${pad2(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endStr = `${year}-${pad2(month + 1)}-${pad2(lastDay)}`;

  // 3. Filter month work transactions (isWork === true)
  const allWorkTxs = (State.transactions || []).filter(
    (t) =>
      t.isWork &&
      t.date >= startStr &&
      t.date <= endStr &&
      t.type !== "transfer"
  );

  let workIncome = 0;
  let workExpense = 0;
  const activeExpenseDays = new Set();
  const catExpenseTotals = {};
  const catExpenseCounts = {};
  const dayExpenseMap = {};
  const dayIncomeMap = {};

  allWorkTxs.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      workIncome += amt;
      dayIncomeMap[t.date] = (dayIncomeMap[t.date] || 0) + amt;
    } else if (t.type === "expense") {
      workExpense += amt;
      activeExpenseDays.add(t.date);
      catExpenseTotals[t.categoryId] =
        (catExpenseTotals[t.categoryId] || 0) + amt;
      catExpenseCounts[t.categoryId] =
        (catExpenseCounts[t.categoryId] || 0) + 1;
      dayExpenseMap[t.date] = (dayExpenseMap[t.date] || 0) + amt;
    }
  });

  const netBalance = workIncome - workExpense;
  const burnRatePct =
    workIncome > 0 ? Math.round((workExpense / workIncome) * 100) : 0;

  // 4. Update Flow Card
  const salaryEl = document.getElementById("workSalaryReceived");
  if (salaryEl) salaryEl.textContent = "+" + formatVND(workIncome);

  const expenseEl = document.getElementById("workTotalExpense");
  if (expenseEl) expenseEl.textContent = "-" + formatVND(workExpense);

  const netEl = document.getElementById("workNetBalance");
  if (netEl) {
    netEl.textContent = (netBalance >= 0 ? "+" : "") + formatVND(netBalance);
    netEl.style.color = netBalance >= 0 ? "#6ee7b7" : "#fca5a5";
  }

  const burnRateBadge = document.getElementById("workBurnRateBadge");
  if (burnRateBadge) {
    if (workIncome > 0) {
      burnRateBadge.textContent = `Đã tiêu ${burnRatePct}% lương`;
      burnRateBadge.style.background =
        burnRatePct > 100 ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.18)";
    } else {
      burnRateBadge.textContent =
        workExpense > 0 ? "Chưa ghi lương" : "Chưa có dữ liệu";
      burnRateBadge.style.background = "rgba(255, 255, 255, 0.18)";
    }
  }

  const burnBar = document.getElementById("workBurnRateBar");
  if (burnBar) {
    burnBar.style.width = `${Math.min(burnRatePct, 100)}%`;
  }

  // 5. Calculate & Render Top Expense Highlight Card ("Chi tiêu nhiều nhất cho đi làm")
  const sortedCatIds = Object.keys(catExpenseTotals).sort(
    (a, b) => catExpenseTotals[b] - catExpenseTotals[a]
  );

  const topExpenseContent = document.getElementById("workTopExpenseContent");
  const dailyAvgEl = document.getElementById("workDailyExpenseAvg");
  const daysActive = activeExpenseDays.size;
  const dailyAvg = daysActive > 0 ? Math.round(workExpense / daysActive) : 0;

  if (dailyAvgEl) {
    dailyAvgEl.textContent = `TB: ${formatVND(dailyAvg)}/ngày`;
  }

  if (topExpenseContent) {
    if (sortedCatIds.length === 0) {
      topExpenseContent.innerHTML = `
        <div style="font-size: 0.74rem; color: var(--text-secondary); text-align: center; padding: 10px 0;">
          Chưa phát sinh chi phí đi làm trong tháng này.
        </div>`;
    } else {
      const topCatId = sortedCatIds[0];
      const topAmt = catExpenseTotals[topCatId];
      const topCount = catExpenseCounts[topCatId] || 1;
      const topPct =
        workExpense > 0 ? Math.round((topAmt / workExpense) * 100) : 0;
      const cat = (State.categories || []).find((c) => c.id === topCatId) || {
        name: "Chi phí đi làm",
        icon: "briefcase",
        color: "#f97316",
      };

      topExpenseContent.innerHTML = `
        <div class="work-top-expense-body">
          <div class="top-cat-icon-wrap" style="background: ${
            cat.color ? cat.color + "22" : "rgba(249, 115, 22, 0.12)"
          };">
            ${renderWorkCatIcon(cat, 20)}
          </div>
          <div class="top-cat-info">
            <div class="top-cat-name">${cat.name}</div>
            <div class="top-cat-sub">${topCount} lần chi · Chiếm ${topPct}% tổng chi đi làm</div>
          </div>
          <div class="top-cat-amount-wrap">
            <div class="top-cat-amount">-${formatVND(topAmt)}</div>
            <div class="top-cat-pct">#1 tốn nhất</div>
          </div>
        </div>`;
    }
  }

  // 6. Category Breakdown: Stacked Bar & List
  const catCountEl = document.getElementById("workExpenseCatCount");
  if (catCountEl) catCountEl.textContent = `${sortedCatIds.length} khoản chi`;

  const stackedBar = document.getElementById("workCatStackedBar");
  const breakdownList = document.getElementById("workExpenseBreakdownList");

  if (stackedBar) {
    stackedBar.innerHTML = "";
    if (workExpense > 0 && sortedCatIds.length > 0) {
      sortedCatIds.forEach((catId) => {
        const amt = catExpenseTotals[catId];
        const pct = (amt / workExpense) * 100;
        const cat = (State.categories || []).find((c) => c.id === catId);
        const color = cat && cat.color ? cat.color : "#3b82f6";
        const seg = document.createElement("div");
        seg.className = "work-stacked-segment";
        seg.style.width = `${pct}%`;
        seg.style.backgroundColor = color;
        seg.title = `${cat ? cat.name : "Khác"}: ${pct.toFixed(1)}%`;
        stackedBar.appendChild(seg);
      });
    }
  }

  if (breakdownList) {
    breakdownList.innerHTML = "";
    if (sortedCatIds.length === 0) {
      breakdownList.innerHTML = `
        <div style="font-size: 0.74rem; color: var(--text-secondary); text-align: center; padding: 10px 0;">
          Chưa có khoản chi nào
        </div>`;
    } else {
      sortedCatIds.forEach((catId) => {
        const amt = catExpenseTotals[catId];
        const count = catExpenseCounts[catId] || 1;
        const pct =
          workExpense > 0 ? Math.round((amt / workExpense) * 100) : 0;
        const cat = (State.categories || []).find((c) => c.id === catId) || {
          name: "Khoản chi khác",
          icon: "briefcase",
          color: "#64748b",
        };

        const item = document.createElement("div");
        item.style.cssText =
          "display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--border-card);";
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: ${
              cat.color ? cat.color + "20" : "var(--bg-card-subtle)"
            }; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${renderWorkCatIcon(cat, 15)}
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${cat.name}
              </div>
              <div style="font-size: 0.64rem; color: var(--text-secondary);">
                ${count} giao dịch (${pct}%)
              </div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.8rem; font-weight: 800; color: var(--expense);">-${formatVND(amt)}</div>
          </div>`;
        breakdownList.appendChild(item);
      });
    }
  }

  // 7. Mini Work Calendar Grid
  const calGrid = document.getElementById("workCalendarGrid");
  const activeDaysCountEl = document.getElementById("workActiveDaysCount");
  if (activeDaysCountEl)
    activeDaysCountEl.textContent = `${activeExpenseDays.size} ngày có chi tiêu`;

  if (calGrid) {
    calGrid.innerHTML = "";
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Monday-based: Mon=0, Tue=1, ..., Sun=6
    const leadSpaces = (firstDayIndex + 6) % 7;

    for (let i = 0; i < leadSpaces; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "work-cal-day empty";
      calGrid.appendChild(emptyCell);
    }

    const todayStr = typeof getTodayString === "function" ? getTodayString() : "";

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
      const dayCell = document.createElement("div");
      dayCell.className = "work-cal-day";
      if (dateStr === todayStr) dayCell.classList.add("today");
      if (dateStr === selectedWorkDayFilter)
        dayCell.classList.add("active-day-filter");

      const numEl = document.createElement("span");
      numEl.className = "work-cal-day-num";
      numEl.textContent = day;
      dayCell.appendChild(numEl);

      const dExp = dayExpenseMap[dateStr] || 0;
      const dInc = dayIncomeMap[dateStr] || 0;

      if (dExp > 0) {
        const expBadge = document.createElement("span");
        expBadge.className = "work-cal-day-badge expense";
        expBadge.textContent = "-" + formatCompactK(dExp);
        dayCell.appendChild(expBadge);
      }
      if (dInc > 0) {
        const incBadge = document.createElement("span");
        incBadge.className = "work-cal-day-badge income";
        incBadge.textContent = "+" + formatCompactK(dInc);
        dayCell.appendChild(incBadge);
      }

      dayCell.onclick = () => selectWorkDayFilter(dateStr);
      calGrid.appendChild(dayCell);
    }
  }

  // 8. Work Transactions List
  const clearFilterBtn = document.getElementById("workClearFilterBtn");
  const txHeading = document.getElementById("workTxListHeading");
  const txListContainer = document.getElementById("workTransactionsList");

  let displayTxs = allWorkTxs;
  if (selectedWorkDayFilter) {
    displayTxs = allWorkTxs.filter((t) => t.date === selectedWorkDayFilter);
    if (clearFilterBtn) clearFilterBtn.style.display = "inline-flex";
    if (txHeading) {
      const parts = selectedWorkDayFilter.split("-");
      txHeading.textContent = `Chi tiêu ngày ${parts[2]}/${parts[1]} (${displayTxs.length})`;
    }
  } else {
    if (clearFilterBtn) clearFilterBtn.style.display = "none";
    if (txHeading)
      txHeading.textContent = `Tất cả chi tiêu tháng (${displayTxs.length})`;
  }

  // Sort descending by date, then by id
  displayTxs.sort((a, b) =>
    b.date > a.date
      ? 1
      : b.date < a.date
        ? -1
        : (b.id || "").localeCompare(a.id || "")
  );

  if (txListContainer) {
    txListContainer.innerHTML = "";
    if (displayTxs.length === 0) {
      txListContainer.innerHTML = `
        <div style="font-size: 0.74rem; color: var(--text-secondary); text-align: center; padding: 18px 0;">
          ${
            selectedWorkDayFilter
              ? "Không có giao dịch nào trong ngày này."
              : "Chưa có khoản chi tiêu đi làm nào trong tháng."
          }
        </div>`;
    } else {
      displayTxs.forEach((t) => {
        const cat = (State.categories || []).find((c) => c.id === t.categoryId) || {
          name: t.type === "income" ? "Lương / Thu nhập" : "Chi tiêu khác",
          icon: t.type === "income" ? "banknote" : "briefcase",
          color: t.type === "income" ? "#10b981" : "#f97316",
        };
        const wallet = (State.wallets || []).find(
          (w) => w.id === t.walletId
        ) || { name: "Ví" };
        const amt = Number(t.amount) || 0;
        const isExp = t.type === "expense";

        const item = document.createElement("div");
        item.className = "work-tx-item";
        item.onclick = () => {
          if (typeof openTransactionWizard === "function") {
            openTransactionWizard(t.id);
          }
        };

        const dParts = (t.date || "").split("-");
        const dateFormatted =
          dParts.length === 3 ? `${dParts[2]}/${dParts[1]}` : t.date;

        item.innerHTML = `
          <div style="width: 34px; height: 34px; border-radius: 9px; background: ${
            cat.color ? cat.color + "1c" : "var(--bg-card-subtle)"
          }; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${renderWorkCatIcon(cat, 17)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${t.note ? t.note : cat.name}
            </div>
            <div style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 1px; display: flex; align-items: center; gap: 6px;">
              <span>${dateFormatted}</span>
              <span>·</span>
              <span>${wallet.name}</span>
              ${t.locationName ? `<span>· 📍 ${t.locationName}</span>` : ""}
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.84rem; font-weight: 800; color: ${
              isExp ? "var(--expense)" : "var(--income)"
            };">
              ${isExp ? "-" : "+"}${formatVND(amt)}
            </div>
          </div>`;
        txListContainer.appendChild(item);
      });
    }
  }

  if (window.lucide && lucide.createIcons) {
    lucide.createIcons();
  }
}
window.renderWorkFinanceScreen = renderWorkFinanceScreen;
