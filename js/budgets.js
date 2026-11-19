      /* ==========================================================================
       FULL-SCREEN BUDGET HUB CONTROLLER (#screen-budgets)
       ========================================================================== */
      function openMonthlyBudgetModal() {
        const budgetInput = document.getElementById("budgetInput");
        if (budgetInput) {
          budgetInput.value = formatNumberOnly(
            State.settings.monthly_budget || 15000000,
          );
        }
        document.getElementById("budgetModal")?.classList.add("active");
      }

      let currentlyOpenBudgetSwipeWrapper = null;

      function closeCurrentBudgetSwipe() {
        if (!currentlyOpenBudgetSwipeWrapper) return;
        const card = currentlyOpenBudgetSwipeWrapper.querySelector(
          ".screen-budget-card",
        );
        const editBtn = currentlyOpenBudgetSwipeWrapper.querySelector(
          ".budget-action-btn.edit-btn",
        );
        const deleteBtn = currentlyOpenBudgetSwipeWrapper.querySelector(
          ".budget-action-btn.delete-btn",
        );
        if (card) card.style.transform = "translateX(0px)";
        if (editBtn) {
          editBtn.style.transform = "scale(0)";
          editBtn.style.opacity = "0";
        }
        if (deleteBtn) {
          deleteBtn.style.transform = "scale(0)";
          deleteBtn.style.opacity = "0";
        }
        currentlyOpenBudgetSwipeWrapper.classList.remove("swiped-open");
        currentlyOpenBudgetSwipeWrapper = null;
      }

      function createBudgetCardElement(cat, budgetAmt, spent) {
        const remaining = budgetAmt - spent;
        const pct =
          budgetAmt > 0
            ? Math.min(Math.round((spent / budgetAmt) * 100), 100)
            : 0;
        const rawPct = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0;
        const isOver = budgetAmt > 0 && spent > budgetAmt;

        const wrapper = document.createElement("div");
        wrapper.className = "budget-swipe-wrapper";
        wrapper.id = `budgetSwipe_${cat.id}`;

        wrapper.innerHTML = `
        <div class="budget-swipe-actions">
          <button type="button" class="budget-action-btn edit-btn" title="Sửa hạn mức">
            <i data-lucide="pencil" style="width: 17px; height: 17px;"></i>
            <span>Sửa</span>
          </button>
          <button type="button" class="budget-action-btn delete-btn" title="Xóa hạn mức">
            <i data-lucide="trash-2" style="width: 17px; height: 17px;"></i>
            <span>Xóa</span>
          </button>
        </div>

        <div class="screen-budget-card" id="budgetCardItem_${cat.id}">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 38px; height: 38px; border-radius: 11px; background: ${cat.color}20; color: ${cat.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${cat.icon || "tag"}" style="width: 19px; height: 19px;"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.name}</span>
                  ${isOver ? '<span style="font-size: 0.62rem; font-weight: 800; background: var(--expense-bg); color: var(--expense); padding: 1.5px 6px; border-radius: 99px; flex-shrink: 0;">Vượt</span>' : ""}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 1px;">
                  Đã chi: <b style="color: ${spent > 0 ? "var(--expense)" : "var(--text-secondary)"};">${formatVND(spent)}</b>
                </div>
              </div>
            </div>

            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 0.92rem; font-weight: 800; color: ${budgetAmt > 0 ? "var(--text-primary)" : "var(--text-muted)"};">
                ${budgetAmt > 0 ? formatVND(budgetAmt) : "Chưa đặt"}
              </div>
              <div style="font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
                <i data-lucide="chevron-left" style="width: 12px; height: 12px;"></i> Vuốt sửa/xóa
              </div>
            </div>
          </div>

          <!-- Progress Bar Track -->
          <div class="budget-track" style="height: 6px; margin: 6px 0 2px;">
            <div class="budget-bar ${rawPct >= 100 ? "danger" : rawPct >= 80 ? "warning" : ""}" style="width: ${budgetAmt > 0 ? pct : 0}%;"></div>
          </div>

          <!-- Sub Stats & Quick Adjust Chips -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 2px;">
            <span style="font-size: 0.68rem; color: var(--text-secondary);">
              ${
                budgetAmt > 0
                  ? remaining >= 0
                    ? `Còn lại: <b style="color: var(--income);">${formatVND(remaining)}</b> (${rawPct.toFixed(0)}%)`
                    : `Vượt mức: <b style="color: var(--expense);">${formatVND(Math.abs(remaining))}</b> (${rawPct.toFixed(0)}%)`
                  : "Chưa thiết lập hạn mức riêng"
              }
            </span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button type="button" class="budget-quick-adjust-btn" onclick="event.stopPropagation(); adjustCategoryBudget('${cat.id}', 200000)">+200k</button>
              <button type="button" class="budget-quick-adjust-btn" onclick="event.stopPropagation(); adjustCategoryBudget('${cat.id}', 500000)">+500k</button>
              <button type="button" class="budget-quick-adjust-btn" onclick="event.stopPropagation(); adjustCategoryBudget('${cat.id}', 1000000)">+1tr</button>
            </div>
          </div>
        </div>
      `;

        const card = wrapper.querySelector(".screen-budget-card");
        const editBtn = wrapper.querySelector(".budget-action-btn.edit-btn");
        const deleteBtn = wrapper.querySelector(
          ".budget-action-btn.delete-btn",
        );

        let isPointerDown = false;
        let startX = 0;
        let startY = 0;
        let currentOffsetX = 0;
        let isSwiping = false;
        let hasDragged = false;
        const snapWidth = -116;

        const updateScale = (progress) => {
          const p = Math.min(Math.max(progress, 0), 1);
          const scaleVal = 0.05 + 0.95 * p;
          editBtn.style.transform = `scale(${scaleVal})`;
          editBtn.style.opacity = `${p}`;
          deleteBtn.style.transform = `scale(${scaleVal})`;
          deleteBtn.style.opacity = `${p}`;
        };

        card.addEventListener("pointerdown", (e) => {
          if (e.target.closest("button")) return;
          if (e.button !== 0 && e.pointerType === "mouse") return;
          if (
            currentlyOpenBudgetSwipeWrapper &&
            currentlyOpenBudgetSwipeWrapper !== wrapper
          ) {
            closeCurrentBudgetSwipe();
          }
          isPointerDown = true;
          hasDragged = false;
          isSwiping = false;
          startX = e.clientX;
          startY = e.clientY;
          currentOffsetX = wrapper.classList.contains("swiped-open")
            ? snapWidth
            : 0;
        });

        card.addEventListener("pointermove", (e) => {
          if (!isPointerDown) return;
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;

          if (!isSwiping) {
            if (Math.abs(deltaX) > 7 && Math.abs(deltaX) > Math.abs(deltaY)) {
              isSwiping = true;
              hasDragged = true;
              try {
                card.setPointerCapture(e.pointerId);
              } catch {}
              wrapper.classList.add("dragging");
              card.classList.add("dragging");
            } else if (Math.abs(deltaY) > 8) {
              isPointerDown = false;
              return;
            }
          }

          if (isSwiping) {
            let newX = currentOffsetX + deltaX;
            if (newX > 0) newX = newX * 0.2;
            if (newX < snapWidth) {
              newX = snapWidth + (newX - snapWidth) * 0.25;
            }
            card.style.transform = `translateX(${newX}px)`;
            const dist = Math.max(0, -newX);
            const progress = Math.min(dist / Math.abs(snapWidth), 1);
            updateScale(progress);
          }
        });

        const finishSwipe = () => {
          if (!isPointerDown) return;
          isPointerDown = false;

          if (isSwiping) {
            wrapper.classList.remove("dragging");
            card.classList.remove("dragging");

            const matrix = new DOMMatrix(
              window.getComputedStyle(card).transform,
            );
            const curX = matrix.m41;

            if (curX < -45) {
              card.style.transform = `translateX(${snapWidth}px)`;
              editBtn.style.transform = "scale(1)";
              editBtn.style.opacity = "1";
              deleteBtn.style.transform = "scale(1)";
              deleteBtn.style.opacity = "1";
              wrapper.classList.add("swiped-open");
              currentlyOpenBudgetSwipeWrapper = wrapper;
            } else {
              card.style.transform = "translateX(0px)";
              editBtn.style.transform = "scale(0)";
              editBtn.style.opacity = "0";
              deleteBtn.style.transform = "scale(0)";
              deleteBtn.style.opacity = "0";
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenBudgetSwipeWrapper === wrapper)
                currentlyOpenBudgetSwipeWrapper = null;
            }
          }
        };

        card.addEventListener("pointerup", (e) => {
          try {
            card.releasePointerCapture(e.pointerId);
          } catch {}
          finishSwipe();
        });

        card.addEventListener("pointercancel", () => {
          finishSwipe();
        });

        card.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          if (hasDragged) return;

          if (wrapper.classList.contains("swiped-open")) {
            closeCurrentBudgetSwipe();
            return;
          }
          openCreateBudgetModal(cat.id);
        });

        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentBudgetSwipe();
          openCreateBudgetModal(cat.id);
        });

        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentBudgetSwipe();
          adjustCategoryBudget(cat.id, 0, true);
        });

        return wrapper;
      }

      function openCreateBudgetModal(categoryId = null) {
        const modal = document.getElementById("budgetCreateModal");
        if (!modal) return;

        const select = document.getElementById("budgetCreateCategorySelect");
        const amountInput = document.getElementById("budgetCreateAmountInput");
        const hiddenId = document.getElementById("budgetCreateCategoryId");
        const modalTitle = document.getElementById("budgetCreateModalTitle");
        const catGroup = document.getElementById("budgetCreateCategoryGroup");
        const scopeTabs = document.querySelectorAll(
          "#budgetCreateScopeTabs .pill-tab-btn",
        );

        if (select) {
          select.innerHTML = "";
          const expenseCats = State.categories.filter(
            (c) => c.type === "expense",
          );
          expenseCats.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
          });
        }

        scopeTabs.forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.bscope === "category");
        });
        if (catGroup) catGroup.style.display = "block";

        if (categoryId) {
          if (hiddenId) hiddenId.value = categoryId;
          if (select) select.value = categoryId;
          const curAmt = State.categoryBudgets[categoryId] || 0;
          if (amountInput)
            amountInput.value = curAmt > 0 ? formatNumberOnly(curAmt) : "";
          if (modalTitle)
            modalTitle.innerHTML =
              '<i data-lucide="target" style="width: 16px; height: 16px; color: var(--primary);"></i> Chỉnh sửa ngân sách';
        } else {
          if (hiddenId) hiddenId.value = "";
          if (select && select.options.length > 0) {
            select.selectedIndex = 0;
            const firstCatId = select.value;
            const curAmt = State.categoryBudgets[firstCatId] || 0;
            if (amountInput)
              amountInput.value = curAmt > 0 ? formatNumberOnly(curAmt) : "";
          } else {
            if (amountInput) amountInput.value = "";
          }
          if (modalTitle)
            modalTitle.innerHTML =
              '<i data-lucide="target" style="width: 16px; height: 16px; color: var(--primary);"></i> Thiết lập ngân sách';
        }

        modal.classList.add("active");
        lucide.createIcons();
      }

      function closeCreateBudgetModal() {
        const modal = document.getElementById("budgetCreateModal");
        if (modal) modal.classList.remove("active");
      }

      window.openCreateBudgetModal = openCreateBudgetModal;
      window.closeCreateBudgetModal = closeCreateBudgetModal;

      window.setBudgetModalAmount = (amt) => {
        const input = document.getElementById("budgetCreateAmountInput");
        if (input) input.value = formatNumberOnly(amt);
      };

      async function saveBudgetFromModal() {
        const activeScopeBtn = document.querySelector(
          "#budgetCreateScopeTabs .pill-tab-btn.active",
        );
        const scope = activeScopeBtn
          ? activeScopeBtn.dataset.bscope
          : "category";
        const amountInput = document.getElementById("budgetCreateAmountInput");
        const amt = parseVNDInput(amountInput ? amountInput.value : 0);

        if (scope === "monthly") {
          if (amt <= 0) {
            showToast("Vui lòng nhập ngân sách tổng tháng lớn hơn 0!", true);
            return;
          }
          State.settings.monthly_budget = amt;
          await DB.put("settings", { key: "monthly_budget", value: amt });
          showToast("Đã lưu ngân sách tháng: " + formatVND(amt));
        } else {
          const select = document.getElementById("budgetCreateCategorySelect");
          const catId = select
            ? select.value
            : document.getElementById("budgetCreateCategoryId")?.value;
          if (!catId) {
            showToast("Vui lòng chọn danh mục để đặt hạn mức!", true);
            return;
          }
          State.categoryBudgets[catId] = amt;
          await DB.put("category_budgets", { categoryId: catId, amount: amt });
          const catObj = State.categories.find((c) => c.id === catId);
          showToast(
            amt > 0
              ? `Đã lưu hạn mức ${catObj ? catObj.name : ""}: ${formatVND(amt)}`
              : `Đã xóa hạn mức ${catObj ? catObj.name : ""}`,
          );
        }

        closeCreateBudgetModal();
        renderBudgetsScreen();
        renderOverviewScreen();
        renderCategoryBudgetsList();
      }

      function renderBudgetsScreen() {
        const container = document.getElementById("budgetScreenListContainer");
        if (!container) return;

        const now = new Date();
        const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const thisMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        // Calculate expense for each category this month
        const spentMap = {};
        let totalSpentMonth = 0;
        State.transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              t.date >= thisMonthStart &&
              t.date <= thisMonthEnd,
          )
          .forEach((t) => {
            const amt = Number(t.amount) || 0;
            spentMap[t.categoryId] = (spentMap[t.categoryId] || 0) + amt;
            totalSpentMonth += amt;
          });

        // Update Monthly Total Budget Card
        const monthlyBudget = State.settings.monthly_budget || 15000000;
        const totalRemaining = monthlyBudget - totalSpentMonth;
        const totalPct =
          monthlyBudget > 0
            ? Math.min(Math.round((totalSpentMonth / monthlyBudget) * 100), 100)
            : 0;
        const totalRawPct =
          monthlyBudget > 0 ? (totalSpentMonth / monthlyBudget) * 100 : 0;

        const limitEl = document.getElementById("budgetScreenMonthlyLimit");
        const progBarEl = document.getElementById(
          "budgetScreenTotalProgressBar",
        );
        const spentEl = document.getElementById("budgetScreenTotalSpentText");
        const remEl = document.getElementById("budgetScreenTotalRemainingText");

        if (limitEl) limitEl.textContent = formatVND(monthlyBudget);
        if (progBarEl) {
          progBarEl.style.width = `${totalPct}%`;
          progBarEl.style.background =
            totalRawPct >= 100
              ? "#EF4444"
              : totalRawPct >= 80
                ? "#F59E0B"
                : "#34D399";
        }
        if (spentEl)
          spentEl.textContent = `Đã chi: ${formatVND(totalSpentMonth)}`;
        if (remEl) {
          remEl.textContent =
            totalRemaining >= 0
              ? `Còn lại: ${formatVND(totalRemaining)} (${totalRawPct.toFixed(0)}%)`
              : `Vượt: ${formatVND(Math.abs(totalRemaining))} (${totalRawPct.toFixed(0)}%)`;
        }

        // Filter expense categories
        const filter = State.budgetFilter || "all";
        const search = (State.budgetSearch || "").toLowerCase().trim();

        let expenseCats = State.categories.filter((c) => c.type === "expense");

        if (filter === "set") {
          expenseCats = expenseCats.filter(
            (c) => (State.categoryBudgets[c.id] || 0) > 0,
          );
        } else if (filter === "unset") {
          expenseCats = expenseCats.filter(
            (c) => !(State.categoryBudgets[c.id] || 0),
          );
        }

        if (search) {
          expenseCats = expenseCats.filter((c) =>
            c.name.toLowerCase().includes(search),
          );
        }

        container.innerHTML = "";

        if (expenseCats.length === 0) {
          container.innerHTML = `
          <div class="editorial-card" style="text-align: center; padding: 28px 16px; color: var(--text-secondary);">
            <i data-lucide="inbox" style="width: 28px; height: 28px; margin: 0 auto 8px; opacity: 0.5;"></i>
            <div style="font-size: 0.82rem; font-weight: 700;">Không có danh mục nào khớp bộ lọc</div>
            <button type="button" onclick="openCreateBudgetModal()" style="margin-top: 10px; padding: 6px 14px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.74rem; font-weight: 700; cursor: pointer;">+ Thiết lập ngân sách</button>
          </div>
        `;
          lucide.createIcons();
          return;
        }

        expenseCats.forEach((cat) => {
          const budgetAmt = State.categoryBudgets[cat.id] || 0;
          const spent = spentMap[cat.id] || 0;
          const cardEl = createBudgetCardElement(cat, budgetAmt, spent);
          container.appendChild(cardEl);
        });

        lucide.createIcons();
      }

      window.saveCategoryBudgetFromScreen = async (categoryId, rawVal) => {
        const amt = parseVNDInput(rawVal);
        State.categoryBudgets[categoryId] = amt;
        await DB.put("category_budgets", {
          categoryId: categoryId,
          amount: amt,
        });
        showToast("Đã cập nhật hạn mức danh mục!");
        renderBudgetsScreen();
        renderCategoryBudgetsList();
        renderOverviewScreen();
      };

      window.adjustCategoryBudget = async (
        categoryId,
        deltaOrSet,
        isClear = false,
      ) => {
        let newAmt = 0;
        if (isClear) {
          newAmt = 0;
        } else {
          const cur = State.categoryBudgets[categoryId] || 0;
          newAmt = cur + deltaOrSet;
        }
        State.categoryBudgets[categoryId] = newAmt;
        await DB.put("category_budgets", {
          categoryId: categoryId,
          amount: newAmt,
        });
        showToast(
          newAmt > 0
            ? `Hạn mức: ${formatVND(newAmt)}`
            : "Đã xóa hạn mức danh mục",
        );
        renderBudgetsScreen();
        renderCategoryBudgetsList();
        renderOverviewScreen();
      };

      /* Category Budgets Manager (Modal Bottom Sheet Legacy Support) */
      function openCategoryBudgetsModal() {
        renderCategoryBudgetsList();
        document.getElementById("categoryBudgetsModal").classList.add("active");
        lucide.createIcons();
      }

      function renderCategoryBudgetsList() {
        const container = document.getElementById(
          "categoryBudgetsListContainer",
        );
        if (!container) return;
        container.innerHTML = "";

        const now = new Date();
        const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const thisMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        // Calculate expense for each category this month
        const spentMap = {};
        State.transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              t.date >= thisMonthStart &&
              t.date <= thisMonthEnd,
          )
          .forEach((t) => {
            spentMap[t.categoryId] =
              (spentMap[t.categoryId] || 0) + (Number(t.amount) || 0);
          });

        const expenseCats = State.categories.filter(
          (c) => c.type === "expense",
        );

        expenseCats.forEach((cat) => {
          const budgetAmt = State.categoryBudgets[cat.id] || 0;
          const spent = spentMap[cat.id] || 0;
          const remaining = budgetAmt - spent;
          const pct =
            budgetAmt > 0
              ? Math.min(Math.round((spent / budgetAmt) * 100), 100)
              : 0;
          const rawPct = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0;

          const row = document.createElement("div");
          row.className = "cat-budget-row";
          row.innerHTML = `
          <div class="cat-budget-top">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${cat.color};"></span>
              <span style="font-size: 0.88rem; font-weight: 700;">${cat.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="text" inputmode="numeric" value="${budgetAmt > 0 ? formatNumberOnly(budgetAmt) : ""}" placeholder="Chưa đặt"
                id="catBudgetValue_${cat.id}"
                style="width: 100px; height: 32px; border-radius: var(--radius-sm); border: 1px solid var(--border-card); padding: 0 8px; font-size: 0.82rem; font-weight: 700; text-align: right;"
                onchange="saveSingleCategoryBudget('${cat.id}', this.value)">
              <span style="font-size: 0.75rem; color: var(--text-secondary);">₫</span>
            </div>
          </div>
          <div class="budget-track" style="height: 6px; margin: 8px 0 6px;">
            <div class="budget-bar ${rawPct >= 100 ? "danger" : rawPct >= 80 ? "warning" : ""}" style="width: ${pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-secondary);">
            <span>Đã chi: ${formatVND(spent)}</span>
            <span>${budgetAmt > 0 ? `Còn lại: ${formatVND(remaining)} (${rawPct.toFixed(0)}%)` : "Chưa thiết lập ngân sách"}</span>
          </div>
        `;
          container.appendChild(row);
        });
      }

      window.saveSingleCategoryBudget = async (categoryId, rawVal) => {
        const amt = parseVNDInput(rawVal);
        State.categoryBudgets[categoryId] = amt;
        await DB.put("category_budgets", {
          categoryId: categoryId,
          amount: amt,
        });
        showToast("Đã cập nhật hạn mức danh mục!");
        renderCategoryBudgetsList();
        renderBudgetsScreen();
        renderOverviewScreen();
      };
