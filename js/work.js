      /* ==========================================================================
       9. SCREEN 4: CÔNG VIỆC & NGÀY CÔNG (WORK FINANCE & WORKDAYS)
       ========================================================================== */
      function renderWorkFinanceScreen() {
        const { startStr, endStr } = getDateRangeFilter(
          State.workPeriod,
          State.workCustomStart,
          State.workCustomEnd,
        );
        const workTxs = State.transactions.filter(
          (t) =>
            t.isWork &&
            t.date >= startStr &&
            t.date <= endStr &&
            t.type !== "transfer",
        );

        let workIncome = 0;
        let workExpense = 0;
        const activeWorkDays = new Set();
        const workCatTotals = {};

        workTxs.forEach((t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === "income") {
            workIncome += amt;
            activeWorkDays.add(t.date);
          } else if (t.type === "expense") {
            workExpense += amt;
            activeWorkDays.add(t.date);
            workCatTotals[t.categoryId] =
              (workCatTotals[t.categoryId] || 0) + amt;
          }
        });

        const netWorkIncome = workIncome - workExpense;
        document.getElementById("workNetIncomeDisplay").textContent =
          (netWorkIncome >= 0 ? "+" : "") + formatVND(netWorkIncome);
        document.getElementById("workTotalIncome").textContent =
          "+" + formatVND(workIncome);
        document.getElementById("workTotalExpense").textContent =
          "-" + formatVND(workExpense);

        // Cập nhật nhãn nút Tùy chọn & Badge khoảng ngày trên màn hình Đi làm
        const filterLabelEl = document.getElementById("workPeriodBtnLabel");
        const filterBadgeEl = document.getElementById("workPeriodBadgeRange");
        if (filterLabelEl) {
          let labelText = "Tháng này";
          if (State.workPeriod === "7d") labelText = "7N";
          else if (State.workPeriod === "30d") labelText = "30N";
          else if (State.workPeriod === "this_month") labelText = "Tháng này";
          else if (State.workPeriod === "last_month") labelText = "Tháng trước";
          else if (State.workPeriod === "this_year") labelText = "Năm nay";
          else if (State.workPeriod === "all") labelText = "Tất cả";
          else if (State.workPeriod === "custom") labelText = "Tùy chỉnh";
          filterLabelEl.textContent = labelText;
        }
        if (filterBadgeEl) {
          if (State.workPeriod === "all") {
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

        const daysCount = Math.max(activeWorkDays.size, 1);
        document.getElementById("workActiveDaysCount").textContent =
          `${activeWorkDays.size} ngày`;

        const dailyExpAvg =
          activeWorkDays.size > 0
            ? Math.round(workExpense / activeWorkDays.size)
            : 0;
        const dailyIncAvg =
          activeWorkDays.size > 0
            ? Math.round(workIncome / activeWorkDays.size)
            : 0;

        document.getElementById("workDailyExpenseAvg").textContent =
          formatVND(dailyExpAvg);
        document.getElementById("workDailyIncomeAvg").textContent =
          formatVND(dailyIncAvg);

        // Work Comparison Chart
        renderWorkComparisonChart(workIncome, workExpense);

        // Breakdown of Work Expenses (Ăn trưa, Cà phê, Xăng...)
        const breakdownContainer = document.getElementById(
          "workExpenseBreakdownList",
        );
        breakdownContainer.innerHTML = "";

        const catIds = Object.keys(workCatTotals).sort(
          (a, b) => workCatTotals[b] - workCatTotals[a],
        );
        if (catIds.length === 0) {
          breakdownContainer.innerHTML =
            '<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 14px 0;">Chưa có chi phí đi làm trong kỳ này.</div>';
        } else {
          catIds.forEach((id) => {
            const cat = State.categories.find((c) => c.id === id) || {
              name: "Khác",
              color: "#38BDF8",
            };
            const amt = workCatTotals[id];
            const pct =
              workExpense > 0 ? ((amt / workExpense) * 100).toFixed(1) : 0;

            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.justifyContent = "space-between";
            row.style.padding = "8px 12px";
            row.style.background = "var(--bg-card-subtle)";
            row.style.borderRadius = "var(--radius-sm)";
            row.style.border = "1px solid var(--border-card)";

            row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${cat.color};"></span>
              <span style="font-size: 0.84rem; font-weight: 700;">${cat.name}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.86rem; font-weight: 800; color: var(--expense);">${formatVND(amt)}</span>
              <span style="font-size: 0.72rem; color: var(--text-secondary); margin-left: 6px;">(${pct}%)</span>
            </div>
          `;
            breakdownContainer.appendChild(row);
          });
        }

        // Work Transactions List
        const listContainer = document.getElementById("workTransactionsList");
        listContainer.innerHTML = "";
        if (workTxs.length === 0) {
          listContainer.innerHTML =
            '<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 16px 0;">Chưa có giao dịch công việc nào.</div>';
        } else {
          workTxs
            .sort((a, b) => b.date.localeCompare(a.date))
            .forEach((tx) => {
              listContainer.appendChild(createTransactionCardElement(tx));
            });
        }

        // Render Work Visual Calendar Grid (#workCalendarDaysGrid)
        const workCalGrid = document.getElementById("workCalendarDaysGrid");
        const workCalTitle = document.getElementById("workCalendarMonthTitle") || document.getElementById("workCalendarTitle");
        if (workCalGrid) {
          workCalGrid.innerHTML = "";
          const now = new Date();
          const y = now.getFullYear();
          const m = now.getMonth();
          if (workCalTitle)
            workCalTitle.textContent = `Lịch đi làm · Tháng ${m + 1}/${y}`;

          const firstDayOfMonth = new Date(y, m, 1);
          const lastDayOfMonth = new Date(y, m + 1, 0);
          let startDayOfWeek = firstDayOfMonth.getDay() - 1;
          if (startDayOfWeek === -1) startDayOfWeek = 6;
          const totalDays = lastDayOfMonth.getDate();
          const prevMonthLastDay = new Date(y, m, 0).getDate();

          for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const prevDay = prevMonthLastDay - i;
            const cell = document.createElement("div");
            cell.className = "cal-day-cell other-month";
            cell.textContent = prevDay;
            workCalGrid.appendChild(cell);
          }

          const todayStr = getTodayString();
          for (let d = 1; d <= totalDays; d++) {
            const curDateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayWorkTxs = State.transactions.filter(
              (t) => t.isWork && t.date === curDateStr,
            );
            let wInc = 0;
            let wExp = 0;
            let hasPhoto = false;

            dayWorkTxs.forEach((t) => {
              if (t.type === "income") wInc += Number(t.amount) || 0;
              if (t.type === "expense") wExp += Number(t.amount) || 0;
              if (t.receipt) hasPhoto = true;
            });

            const cell = document.createElement("div");
            cell.className = "cal-day-cell";
            if (curDateStr === todayStr) cell.classList.add("is-today");

            let photoBadgeHtml = hasPhoto
              ? `<span class="cal-day-photo-badge" title="Có ảnh chứng từ">📷</span>`
              : "";
            let badgesHtml = "";
            if (wInc > 0 && wExp > 0) {
              badgesHtml = `
              <span class="cal-day-amt-badge income">+${formatShortK(wInc)}</span>
              <span class="cal-day-amt-badge expense">-${formatShortK(wExp)}</span>
            `;
            } else if (wInc > 0) {
              badgesHtml = `<span class="cal-day-amt-badge income">+${formatShortK(wInc)}</span>`;
            } else if (wExp > 0) {
              badgesHtml = `<span class="cal-day-amt-badge expense">-${formatShortK(wExp)}</span>`;
            }

            cell.innerHTML = `
            <span>${d}</span>
            ${photoBadgeHtml}
            ${badgesHtml}
          `;

            cell.onclick = () => {
              document
                .querySelectorAll("#workCalendarDaysGrid .cal-day-cell")
                .forEach((c) => c.classList.remove("active-selected"));
              cell.classList.add("active-selected");
              if (listContainer) {
                listContainer.innerHTML = "";
                if (dayWorkTxs.length === 0) {
                  listContainer.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 14px 0;">Không có chi phí hay thu nhập công việc ngày ${formatDateDisplay(curDateStr)}.</div>`;
                } else {
                  dayWorkTxs.forEach((tx) =>
                    listContainer.appendChild(createTransactionCardElement(tx)),
                  );
                }
                lucide.createIcons();
              }
            };

            workCalGrid.appendChild(cell);
          }
        }

        lucide.createIcons();
      }

      function renderWorkComparisonChart(income, expense) {
        const ctx = document
          .getElementById("workComparisonChart")
          .getContext("2d");
        if (workComparisonChartInstance) workComparisonChartInstance.destroy();

        workComparisonChartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Thu nhập công việc", "Chi phí đi làm"],
            datasets: [
              {
                data: [income, expense],
                backgroundColor: ["#28A76B", "#38BDF8"],
                borderRadius: 8,
                barThickness: 36,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
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

      /* ==========================================================================
       9B. WORK DATE FILTER MODAL CONTROLLER
       ========================================================================== */
      let tempWorkPeriod = "this_month";
      let tempWorkStart = null;
      let tempWorkEnd = null;

      function openWorkDateModal() {
        const modal = document.getElementById("workDateModal");
        if (!modal) return;

        tempWorkPeriod = State.workPeriod || "this_month";
        tempWorkStart = State.workCustomStart;
        tempWorkEnd = State.workCustomEnd;

        const { startStr, endStr } = getDateRangeFilter(
          tempWorkPeriod,
          tempWorkStart,
          tempWorkEnd,
        );

        const startInput = document.getElementById("workModalStartDate");
        const endInput = document.getElementById("workModalEndDate");
        if (startInput)
          startInput.value =
            tempWorkPeriod === "all" ? "2020-01-01" : tempWorkStart || startStr;
        if (endInput)
          endInput.value =
            tempWorkPeriod === "all" ? getTodayString() : tempWorkEnd || endStr;

        // Highlight active preset button (7N, 30N, Tháng này, Tháng trước, Năm nay, Tất cả)
        document
          .querySelectorAll("#workModalPresetBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.preset === tempWorkPeriod,
            );
          });

        updateWorkModalLivePreview(
          startInput?.value || startStr,
          endInput?.value || endStr,
        );

        modal.classList.add("active");
        lucide.createIcons();
      }

      function closeWorkDateModal() {
        const modal = document.getElementById("workDateModal");
        if (modal) modal.classList.remove("active");
      }

      function selectWorkPreset(presetKey) {
        tempWorkPeriod = presetKey;
        tempWorkStart = null;
        tempWorkEnd = null;

        const { startStr, endStr } = getDateRangeFilter(presetKey);

        const startInput = document.getElementById("workModalStartDate");
        const endInput = document.getElementById("workModalEndDate");
        if (startInput)
          startInput.value = presetKey === "all" ? "2020-01-01" : startStr;
        if (endInput)
          endInput.value = presetKey === "all" ? getTodayString() : endStr;

        document
          .querySelectorAll("#workModalPresetBtns .modal-period-pill-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.preset === presetKey);
          });

        updateWorkModalLivePreview(
          startInput ? startInput.value : startStr,
          endInput ? endInput.value : endStr,
        );
      }

      function onWorkModalCustomDateChange() {
        const startInput = document.getElementById("workModalStartDate");
        const endInput = document.getElementById("workModalEndDate");
        if (!startInput || !endInput) return;

        const sVal = startInput.value;
        const eVal = endInput.value;

        if (sVal && eVal) {
          if (sVal > eVal) {
            showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc!", true);
            return;
          }
          tempWorkPeriod = "custom";
          tempWorkStart = sVal;
          tempWorkEnd = eVal;

          document
            .querySelectorAll("#workModalPresetBtns .modal-period-pill-btn")
            .forEach((btn) => {
              btn.classList.remove("active");
            });

          updateWorkModalLivePreview(sVal, eVal);
        }
      }

      function updateWorkModalLivePreview(startStr, endStr) {
        if (!startStr || !endStr) return;

        const workTxs = State.transactions.filter(
          (t) =>
            t.isWork &&
            t.date >= startStr &&
            t.date <= endStr &&
            t.type !== "transfer",
        );

        let inc = 0;
        let exp = 0;
        const activeDays = new Set();
        workTxs.forEach((t) => {
          const amt = Number(t.amount) || 0;
          if (t.type === "income") {
            inc += amt;
            activeDays.add(t.date);
          } else if (t.type === "expense") {
            exp += amt;
            activeDays.add(t.date);
          }
        });

        const net = inc - exp;

        const daysCountEl = document.getElementById("workModalDaysCount");
        if (daysCountEl) {
          if (tempWorkPeriod === "7d") daysCountEl.textContent = "7 ngày";
          else if (tempWorkPeriod === "30d")
            daysCountEl.textContent = "30 ngày";
          else if (tempWorkPeriod === "this_month")
            daysCountEl.textContent = "Tháng này";
          else if (tempWorkPeriod === "last_month")
            daysCountEl.textContent = "Tháng trước";
          else if (tempWorkPeriod === "this_year")
            daysCountEl.textContent = "Năm nay";
          else if (tempWorkPeriod === "all") daysCountEl.textContent = "Tất cả";
          else daysCountEl.textContent = `${activeDays.size} ngày làm`;
        }

        const incEl = document.getElementById("workModalPreviewIncome");
        if (incEl) incEl.textContent = "+" + formatNumberOnly(inc) + " ₫";

        const expEl = document.getElementById("workModalPreviewExpense");
        if (expEl) expEl.textContent = "-" + formatNumberOnly(exp) + " ₫";

        const netEl = document.getElementById("workModalPreviewNet");
        if (netEl) {
          netEl.textContent =
            (net >= 0 ? "+" : "") + formatNumberOnly(net) + " ₫";
          netEl.style.color = net >= 0 ? "var(--mint)" : "var(--expense)";
        }
      }

      function applyWorkDateModal() {
        const startInput = document.getElementById("workModalStartDate");
        const endInput = document.getElementById("workModalEndDate");

        if (tempWorkPeriod === "custom") {
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
          State.workPeriod = "custom";
          State.workCustomStart = startInput.value;
          State.workCustomEnd = endInput.value;
        } else {
          State.workPeriod = tempWorkPeriod;
          State.workCustomStart = null;
          State.workCustomEnd = null;
        }

        closeWorkDateModal();
        renderWorkFinanceScreen();
        showToast("Đã áp dụng thời gian xem công việc!");
      }

      function resetWorkDateModal() {
        tempWorkPeriod = "this_month";
        tempWorkStart = null;
        tempWorkEnd = null;
        State.workPeriod = "this_month";
        State.workCustomStart = null;
        State.workCustomEnd = null;

        closeWorkDateModal();
        renderWorkFinanceScreen();
        showToast("Đã đặt lại về Tháng này!");
      }
