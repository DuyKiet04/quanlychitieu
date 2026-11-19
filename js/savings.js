      /* ==========================================================================
       SAVINGS GOALS CONTROLLER (#screen-savings)
       ========================================================================== */
      let currentlyOpenSavingsSwipeWrapper = null;

      function closeCurrentSavingsSwipe() {
        if (!currentlyOpenSavingsSwipeWrapper) return;
        const card = currentlyOpenSavingsSwipeWrapper.querySelector(
          ".screen-savings-card",
        );
        const editBtn = currentlyOpenSavingsSwipeWrapper.querySelector(
          ".savings-action-btn.edit-btn",
        );
        const deleteBtn = currentlyOpenSavingsSwipeWrapper.querySelector(
          ".savings-action-btn.delete-btn",
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
        currentlyOpenSavingsSwipeWrapper.classList.remove("swiped-open");
        currentlyOpenSavingsSwipeWrapper = null;
      }

      function renderSavingsGoalsScreen() {
        const container = document.getElementById("savingsGoalsListContainer");
        if (!container) return;

        const goals = State.savingsGoals || [];
        const totalTarget = goals.reduce(
          (s, g) => s + (Number(g.targetAmount) || 0),
          0,
        );
        const totalCurrent = goals.reduce(
          (s, g) => s + (Number(g.currentAmount) || 0),
          0,
        );
        const overallPct =
          totalTarget > 0
            ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100)
            : 0;

        const heroTotal = document.getElementById(
          "savingsHeroTotalAccumulated",
        );
        const heroTarget = document.getElementById(
          "savingsHeroOverallTargetText",
        );
        const heroPct = document.getElementById("savingsHeroOverallPctText");
        const heroBar = document.getElementById("savingsHeroOverallBar");

        if (heroTotal) heroTotal.textContent = formatVND(totalCurrent);
        if (heroTarget)
          heroTarget.textContent = `Mục tiêu: ${formatVND(totalTarget)}`;
        if (heroPct) heroPct.textContent = `${overallPct}%`;
        if (heroBar) heroBar.style.width = `${overallPct}%`;

        container.innerHTML = "";
        if (goals.length === 0) {
          container.innerHTML = `
          <div class="editorial-card" style="text-align: center; padding: 32px 16px; color: var(--text-secondary);">
            <i data-lucide="piggy-bank" style="width: 32px; height: 32px; margin: 0 auto 10px; opacity: 0.5; color: #DB2777;"></i>
            <div style="font-size: 0.88rem; font-weight: 700;">Chưa có mục tiêu tiết kiệm nào</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px; max-width: 280px; margin-left: auto; margin-right: auto;">
              Thiết lập mục tiêu mua sắm, quỹ khẩn cấp hoặc đầu tư và theo dõi tiến độ nạp tiền.
            </div>
            <div style="font-size: 0.72rem; color: #DB2777; margin-top: 10px; font-weight: 700;">
              Chạm vào dấu + ở thanh điều hướng dưới đáy để tạo mục tiêu mới
            </div>
          </div>
        `;
          lucide.createIcons();
          return;
        }

        goals.forEach((goal) => {
          const cardEl = createSavingsCardElement(goal);
          container.appendChild(cardEl);
        });

        lucide.createIcons();
      }
      window.renderSavingsGoalsScreen = renderSavingsGoalsScreen;

      function createSavingsCardElement(goal) {
        const target = Number(goal.targetAmount) || 1;
        const current = Number(goal.currentAmount) || 0;
        const pct = Math.min(Math.round((current / target) * 100), 100);

        let daysLeftStr = "";
        if (goal.deadline) {
          const diffDays = Math.ceil(
            (new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays > 0) daysLeftStr = `Còn ${diffDays} ngày`;
          else if (diffDays === 0) daysLeftStr = "Hôm nay đến hạn";
          else daysLeftStr = `Quá hạn ${Math.abs(diffDays)} ngày`;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "savings-swipe-wrapper";
        wrapper.id = `savingsSwipe_${goal.id}`;

        wrapper.innerHTML = `
        <div class="savings-swipe-actions">
          <button type="button" class="savings-action-btn edit-btn" title="Sửa mục tiêu">
            <i data-lucide="pencil" style="width: 17px; height: 17px;"></i>
            <span>Sửa</span>
          </button>
          <button type="button" class="savings-action-btn delete-btn" title="Xóa mục tiêu">
            <i data-lucide="trash-2" style="width: 17px; height: 17px;"></i>
            <span>Xóa</span>
          </button>
        </div>

        <div class="screen-savings-card" id="savingsCardItem_${goal.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(219, 39, 119, 0.15); color: #DB2777; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${goal.icon || "piggy-bank"}" style="width: 20px; height: 20px;"></i>
              </div>
              <div>
                <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">${goal.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 1px;">
                  ${goal.deadline ? `Hạn chót: ${formatDateDisplay(goal.deadline)} ${daysLeftStr ? '· <b style="color: var(--primary);">' + daysLeftStr + "</b>" : ""}` : "Không thời hạn"}
                </div>
              </div>
            </div>
            <span class="tx-badge" style="background: ${pct >= 100 ? "rgba(52, 211, 153, 0.2)" : "rgba(219, 39, 119, 0.12)"}; color: ${pct >= 100 ? "var(--income)" : "#DB2777"}; font-weight: 800; font-size: 0.78rem;">
              ${pct}%
            </span>
          </div>

          <div class="savings-progress-track" style="height: 8px; background: var(--bg-card-subtle); border-radius: 99px; overflow: hidden; margin-bottom: 6px;">
            <div class="savings-progress-fill" style="width: ${pct}%; height: 100%; background: ${pct >= 100 ? "var(--income)" : "linear-gradient(90deg, #F472B6, #DB2777)"}; border-radius: 99px; transition: width 0.4s var(--ease-spring);"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 10px;">
            <span>Đã tích lũy: <b style="color: var(--text-primary);">${formatVND(current)}</b></span>
            <span>Mục tiêu: <b style="color: var(--text-primary);">${formatVND(target)}</b></span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
            <button type="button" onclick="event.stopPropagation(); openDepositSavingsModal('${goal.id}')" style="height: 32px; padding: 0 14px; border-radius: var(--radius-full); background: var(--income); color: #fff; border: none; font-size: 0.74rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(40, 167, 107, 0.25);">
              <i data-lucide="plus" style="width: 13px; height: 13px;"></i> Nạp tiền
            </button>
            <div style="font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 3px;">
              <i data-lucide="chevron-left" style="width: 12px; height: 12px;"></i> Vuốt để sửa / xóa
            </div>
          </div>
        </div>
      `;

        const card = wrapper.querySelector(".screen-savings-card");
        const editBtn = wrapper.querySelector(".savings-action-btn.edit-btn");
        const deleteBtn = wrapper.querySelector(
          ".savings-action-btn.delete-btn",
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
            currentlyOpenSavingsSwipeWrapper &&
            currentlyOpenSavingsSwipeWrapper !== wrapper
          ) {
            closeCurrentSavingsSwipe();
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
              currentlyOpenSavingsSwipeWrapper = wrapper;
            } else {
              card.style.transform = "translateX(0px)";
              editBtn.style.transform = "scale(0)";
              editBtn.style.opacity = "0";
              deleteBtn.style.transform = "scale(0)";
              deleteBtn.style.opacity = "0";
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenSavingsSwipeWrapper === wrapper)
                currentlyOpenSavingsSwipeWrapper = null;
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

        card.addEventListener("click", () => {
          if (hasDragged) return;
          if (wrapper.classList.contains("swiped-open")) {
            closeCurrentSavingsSwipe();
          }
        });

        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentSavingsSwipe();
          openCreateSavingsGoalModal(goal.id);
        });

        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentSavingsSwipe();
          deleteSavingsGoal(goal.id);
        });

        return wrapper;
      }

      /* ==========================================================================
       SAVINGS GOALS MODAL & CRUD CONTROLLER
       ========================================================================== */
      function openCreateSavingsGoalModal(editId = null) {
        if (typeof closeCurrentSavingsSwipe === "function")
          closeCurrentSavingsSwipe();
        const modal = document.getElementById("savingsGoalModal");
        if (!modal) return;
        const titleEl = document.getElementById("savingsGoalModalTitle");
        const idInput = document.getElementById("savingsGoalId");
        const nameInput = document.getElementById("savingsGoalName");
        const targetInput = document.getElementById("savingsGoalTargetAmount");
        const currentInput = document.getElementById(
          "savingsGoalCurrentAmount",
        );
        const deadlineInput = document.getElementById("savingsGoalDeadline");
        const iconSelect = document.getElementById("savingsGoalIcon");

        if (editId) {
          const goal = (State.savingsGoals || []).find((g) => g.id === editId);
          if (goal) {
            if (titleEl) titleEl.textContent = "Chỉnh sửa mục tiêu";
            if (idInput) idInput.value = goal.id;
            if (nameInput) nameInput.value = goal.name || "";
            if (targetInput)
              targetInput.value = (
                Number(goal.targetAmount) || 0
              ).toLocaleString("vi-VN");
            if (currentInput)
              currentInput.value = (
                Number(goal.currentAmount) || 0
              ).toLocaleString("vi-VN");
            if (deadlineInput) deadlineInput.value = goal.deadline || "";
            if (iconSelect) iconSelect.value = goal.icon || "piggy-bank";
          }
        } else {
          if (titleEl) titleEl.textContent = "Mục tiêu tiết kiệm mới";
          if (idInput) idInput.value = "";
          if (nameInput) nameInput.value = "";
          if (targetInput) targetInput.value = "";
          if (currentInput) currentInput.value = "0";
          if (deadlineInput) deadlineInput.value = "";
          if (iconSelect) iconSelect.value = "piggy-bank";
        }

        modal.classList.add("active");
        lucide.createIcons();
      }
      window.openCreateSavingsGoalModal = openCreateSavingsGoalModal;

      function closeSavingsGoalModal() {
        const modal = document.getElementById("savingsGoalModal");
        if (modal) modal.classList.remove("active");
      }
      window.closeSavingsGoalModal = closeSavingsGoalModal;

      async function saveSavingsGoal() {
        const idInput = document.getElementById("savingsGoalId")?.value.trim();
        const name = document.getElementById("savingsGoalName")?.value.trim();
        const targetStr =
          document
            .getElementById("savingsGoalTargetAmount")
            ?.value.replace(/[^0-9]/g, "") || "0";
        const currentStr =
          document
            .getElementById("savingsGoalCurrentAmount")
            ?.value.replace(/[^0-9]/g, "") || "0";
        const deadline =
          document.getElementById("savingsGoalDeadline")?.value || "";
        const icon =
          document.getElementById("savingsGoalIcon")?.value || "piggy-bank";

        const targetAmount = Number(targetStr);
        const currentAmount = Number(currentStr);

        if (!name) {
          showToast("Vui lòng nhập tên mục tiêu!", true);
          return;
        }
        if (targetAmount <= 0) {
          showToast("Vui lòng nhập số tiền mục tiêu lớn hơn 0!", true);
          return;
        }

        if (!State.savingsGoals) State.savingsGoals = [];

        if (idInput) {
          const idx = State.savingsGoals.findIndex((g) => g.id === idInput);
          if (idx !== -1) {
            State.savingsGoals[idx] = {
              ...State.savingsGoals[idx],
              name,
              targetAmount,
              currentAmount,
              deadline,
              icon,
              updatedAt: Date.now(),
            };
            await DB.put("savings_goals", State.savingsGoals[idx]);
            showToast("Đã cập nhật mục tiêu tiết kiệm!");
          }
        } else {
          const newGoal = {
            id: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            targetAmount,
            currentAmount,
            deadline,
            icon,
            createdAt: Date.now(),
          };
          State.savingsGoals.push(newGoal);
          await DB.put("savings_goals", newGoal);
          showToast("Đã tạo mục tiêu tiết kiệm mới!");
        }

        if (typeof SoundEngine !== "undefined") SoundEngine.play("success");
        if (typeof triggerHaptic === "function") triggerHaptic("success");
        closeSavingsGoalModal();
        renderSavingsGoalsScreen();
      }
      window.saveSavingsGoal = saveSavingsGoal;

      async function deleteSavingsGoal(goalId) {
        if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu tiết kiệm này?"))
          return;
        if (!State.savingsGoals) return;
        State.savingsGoals = State.savingsGoals.filter((g) => g.id !== goalId);
        await DB.delete("savings_goals", goalId);
        if (typeof SoundEngine !== "undefined") SoundEngine.play("delete");
        if (typeof triggerHaptic === "function") triggerHaptic("warning");
        showToast("Đã xóa mục tiêu tiết kiệm!");
        renderSavingsGoalsScreen();
      }
      window.deleteSavingsGoal = deleteSavingsGoal;

      /* Nạp tiền vào quỹ tiết kiệm */
      function openDepositSavingsModal(goalId) {
        const goal = (State.savingsGoals || []).find((g) => g.id === goalId);
        if (!goal) return;
        const modal = document.getElementById("depositSavingsModal");
        if (!modal) return;

        const idInput = document.getElementById("depositGoalId");
        const nameText = document.getElementById("depositGoalNameText");
        const progressText = document.getElementById(
          "depositGoalCurrentProgressText",
        );
        const amountInput = document.getElementById("depositAmountInput");
        const walletSelect = document.getElementById("depositWalletSelect");

        if (idInput) idInput.value = goal.id;
        if (nameText) nameText.textContent = goal.name;
        if (progressText)
          progressText.textContent = `Hiện có: ${formatVND(goal.currentAmount || 0)} / Mục tiêu: ${formatVND(goal.targetAmount || 0)}`;
        if (amountInput) amountInput.value = "";

        if (walletSelect) {
          walletSelect.innerHTML = (State.wallets || [])
            .map(
              (w) => `
          <option value="${w.id}">${w.name} (${formatVND(w.balance || 0)})</option>
        `,
            )
            .join("");
        }

        modal.classList.add("active");
        lucide.createIcons();
      }
      window.openDepositSavingsModal = openDepositSavingsModal;

      function closeDepositSavingsModal() {
        const modal = document.getElementById("depositSavingsModal");
        if (modal) modal.classList.remove("active");
      }
      window.closeDepositSavingsModal = closeDepositSavingsModal;

      async function submitDepositSavings() {
        const goalId = document.getElementById("depositGoalId")?.value;
        const amountStr =
          document
            .getElementById("depositAmountInput")
            ?.value.replace(/[^0-9]/g, "") || "0";
        const walletId = document.getElementById("depositWalletSelect")?.value;
        const depositAmt = Number(amountStr);

        if (depositAmt <= 0) {
          showToast("Vui lòng nhập số tiền nạp lớn hơn 0!", true);
          return;
        }

        const goal = (State.savingsGoals || []).find((g) => g.id === goalId);
        if (!goal) return;

        goal.currentAmount = (Number(goal.currentAmount) || 0) + depositAmt;
        await DB.put("savings_goals", goal);

        // Trừ tiền từ ví nếu có
        if (walletId && State.wallets) {
          const wallet = State.wallets.find((w) => w.id === walletId);
          if (wallet) {
            wallet.balance = (Number(wallet.balance) || 0) - depositAmt;
            await DB.put("wallets", wallet);
          }
        }

        if (typeof SoundEngine !== "undefined") SoundEngine.play("success");
        if (typeof triggerHaptic === "function") triggerHaptic("success");
        showToast(`Đã nạp ${formatVND(depositAmt)} vào mục tiêu ${goal.name}!`);
        closeDepositSavingsModal();
        renderSavingsGoalsScreen();
        if (typeof renderWalletsScreen === "function") renderWalletsScreen();
        if (typeof renderOverviewScreen === "function") renderOverviewScreen();
      }
      window.submitDepositSavings = submitDepositSavings;