      /* ==========================================================================
       FULL-SCREEN RECURRING TRANSACTIONS HUB & AUTOMATION CONTROLLER (#screen-recurring)
       ========================================================================== */
      let currentlyOpenRecurringSwipeWrapper = null;

      function closeCurrentRecurringSwipe() {
        if (!currentlyOpenRecurringSwipeWrapper) return;
        const card = currentlyOpenRecurringSwipeWrapper.querySelector(
          ".screen-recurring-card",
        );
        const editBtn = currentlyOpenRecurringSwipeWrapper.querySelector(
          ".recurring-action-btn.edit-btn",
        );
        const deleteBtn = currentlyOpenRecurringSwipeWrapper.querySelector(
          ".recurring-action-btn.delete-btn",
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
        currentlyOpenRecurringSwipeWrapper.classList.remove("swiped-open");
        currentlyOpenRecurringSwipeWrapper = null;
      }

      // Tính ngày tiếp theo của chu kỳ hàng tháng (Ví dụ: 2026-11-07 -> 2026-12-07)
      function calculateNextMonthlyDate(currentDateStr, targetDay) {
        if (!currentDateStr) currentDateStr = getTodayString();
        const parts = currentDateStr.split("-");
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
        const daysInNextMonth = new Date(y, m, 0).getDate();
        const d = Math.min(
          targetDay || parseInt(parts[2], 10) || 1,
          daysInNextMonth,
        );
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }

      // Tự động kiểm tra và ghi nhận các giao dịch định kỳ khi đến hạn
      async function checkAndProcessRecurringTransactions() {
        if (!State.recurring || State.recurring.length === 0) return;
        const todayStr = getTodayString();
        let autoRecordedCount = 0;

        for (const item of State.recurring) {
          if (item.active === false) continue;

          const dayOfMonth =
            item.dayOfMonth ||
            (item.startDate ? parseInt(item.startDate.split("-")[2], 10) : 1);
          let startDate = item.startDate;
          if (!startDate) {
            startDate = `${todayStr.slice(0, 8)}${String(dayOfMonth).padStart(2, "0")}`;
          }

          let lastDate = item.lastExecutedDate;

          // Nếu chưa từng thực hiện lần nào:
          // Nếu startDate <= todayStr -> Tự động ghi nhận kỳ đầu tiên vào startDate!
          if (!lastDate) {
            if (startDate <= todayStr) {
              const txId =
                "tx_rec_" + item.id + "_" + startDate.replace(/-/g, "");
              const existingTx = State.transactions.find(
                (t) =>
                  t.id === txId ||
                  (t.date === startDate && t.note === `Định kỳ: ${item.title}`),
              );
              if (!existingTx) {
                const txRecord = {
                  id: txId,
                  amount: item.amount,
                  type: item.type,
                  categoryId: item.categoryId,
                  walletId: item.walletId || "w_bank",
                  date: startDate,
                  note: `Định kỳ: ${item.title}`,
                  isWork: item.isWork || false,
                  createdAt: Date.now(),
                };
                await DB.put("transactions", txRecord);
                State.transactions.unshift(txRecord);
                autoRecordedCount++;
              }
              item.lastExecutedDate = startDate;
              await DB.put("recurring", item);
              lastDate = startDate;
            } else {
              continue;
            }
          }

          // Tự động cuốn chiếu các kỳ tiếp theo đến hiện tại
          let nextDate = calculateNextMonthlyDate(lastDate, dayOfMonth);
          let loopLimit = 0;

          while (nextDate <= todayStr && loopLimit < 36) {
            loopLimit++;
            const txId = "tx_rec_" + item.id + "_" + nextDate.replace(/-/g, "");
            const existingTx = State.transactions.find(
              (t) =>
                t.id === txId ||
                (t.date === nextDate && t.note === `Định kỳ: ${item.title}`),
            );
            if (!existingTx) {
              const txRecord = {
                id: txId,
                amount: item.amount,
                type: item.type,
                categoryId: item.categoryId,
                walletId: item.walletId || "w_bank",
                date: nextDate,
                note: `Định kỳ: ${item.title}`,
                isWork: item.isWork || false,
                createdAt: Date.now(),
              };
              await DB.put("transactions", txRecord);
              State.transactions.unshift(txRecord);
              autoRecordedCount++;
            }
            item.lastExecutedDate = nextDate;
            await DB.put("recurring", item);
            nextDate = calculateNextMonthlyDate(nextDate, dayOfMonth);
          }
        }

        if (autoRecordedCount > 0) {
          showToast(
            `Đã tự động ghi nhận ${autoRecordedCount} giao dịch định kỳ đến hạn!`,
          );
          renderAllScreens();
        }
      }

      function renderRecurringScreen() {
        const container = document.getElementById(
          "recurringScreenListContainer",
        );
        if (!container) return;

        let incTotal = 0;
        let expTotal = 0;
        let incCount = 0;
        let expCount = 0;

        State.recurring.forEach((r) => {
          if (r.active !== false) {
            if (r.type === "income") {
              incTotal += Number(r.amount) || 0;
              incCount++;
            } else {
              expTotal += Number(r.amount) || 0;
              expCount++;
            }
          }
        });

        // Update Bento Summary Badges
        const incTotalEl = document.getElementById(
          "recurringScreenIncomeTotal",
        );
        const incCountEl = document.getElementById(
          "recurringScreenIncomeCount",
        );
        const expTotalEl = document.getElementById(
          "recurringScreenExpenseTotal",
        );
        const expCountEl = document.getElementById(
          "recurringScreenExpenseCount",
        );

        if (incTotalEl) incTotalEl.textContent = "+" + formatVND(incTotal);
        if (incCountEl)
          incCountEl.textContent = `${incCount} khoản thu / tháng`;
        if (expTotalEl) expTotalEl.textContent = "-" + formatVND(expTotal);
        if (expCountEl)
          expCountEl.textContent = `${expCount} khoản chi / tháng`;

        // Filter by Type & Search
        const filter = State.recurringFilter || "all";
        const search = (State.recurringSearch || "").toLowerCase().trim();

        let items = [...State.recurring];
        if (filter === "income")
          items = items.filter((r) => r.type === "income");
        else if (filter === "expense")
          items = items.filter((r) => r.type === "expense");

        if (search) {
          items = items.filter((r) => {
            const cat =
              State.categories.find((c) => c.id === r.categoryId)?.name || "";
            return (
              r.title.toLowerCase().includes(search) ||
              cat.toLowerCase().includes(search)
            );
          });
        }

        container.innerHTML = "";

        if (items.length === 0) {
          container.innerHTML = `
          <div class="editorial-card" style="text-align: center; padding: 28px 16px; color: var(--text-secondary);">
            <i data-lucide="repeat" style="width: 28px; height: 28px; margin: 0 auto 8px; opacity: 0.5;"></i>
            <div style="font-size: 0.82rem; font-weight: 700;">Chưa có khoản định kỳ nào</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Chạm vào dấu + ở thanh điều hướng dưới đáy để tạo khoản định kỳ đầu tiên.</div>
            <button type="button" onclick="openRecurringFormModal()" style="margin-top: 12px; padding: 6px 16px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.74rem; font-weight: 700; cursor: pointer;">+ Thêm định kỳ</button>
          </div>
        `;
          lucide.createIcons();
          return;
        }

        items.forEach((item) => {
          const cardEl = createRecurringCardElement(item);
          container.appendChild(cardEl);
        });

        lucide.createIcons();
      }

      function createRecurringCardElement(item) {
        const cat = State.categories.find((c) => c.id === item.categoryId) || {
          name: "Khác",
          icon: "tag",
          color: "#60A5FA",
        };
        const wallet = State.wallets.find((w) => w.id === item.walletId) || {
          name: "Ví mặc định",
        };
        const isInc = item.type === "income";
        const dayOfMonth =
          item.dayOfMonth ||
          (item.startDate ? parseInt(item.startDate.split("-")[2], 10) : 1);
        const nextDue = calculateNextMonthlyDate(
          item.lastExecutedDate || item.startDate,
          dayOfMonth,
        );

        const wrapper = document.createElement("div");
        wrapper.className = "recurring-swipe-wrapper";
        wrapper.id = `recSwipe_${item.id}`;

        wrapper.innerHTML = `
        <div class="recurring-swipe-actions">
          <button type="button" class="recurring-action-btn edit-btn" title="Sửa định kỳ">
            <i data-lucide="pencil" style="width: 17px; height: 17px;"></i>
            <span>Sửa</span>
          </button>
          <button type="button" class="recurring-action-btn delete-btn" title="Xóa định kỳ">
            <i data-lucide="trash-2" style="width: 17px; height: 17px;"></i>
            <span>Xóa</span>
          </button>
        </div>

        <div class="screen-recurring-card" id="recCardItem_${item.id}">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: ${cat.color}20; color: ${cat.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i data-lucide="${cat.icon || "repeat"}" style="width: 20px; height: 20px;"></i>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</span>
                ${item.isWork ? '<span class="tx-badge work" style="font-size: 0.62rem; flex-shrink: 0;"><i data-lucide="briefcase" style="width: 8px; height: 8px;"></i> Work</span>' : ""}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>Ngày <b>${dayOfMonth}</b> hàng tháng</span>
                <span>·</span>
                <span>${cat.name}</span>
                <span>·</span>
                <span style="color: var(--text-muted);">${wallet.name}</span>
              </div>
              <div style="font-size: 0.68rem; color: var(--mint); margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="clock" style="width: 11px; height: 11px;"></i>
                <span>Kỳ kế tiếp: <b>${formatDateDisplay(nextDue)}</b></span>
              </div>
            </div>
          </div>

          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.95rem; font-weight: 800; color: ${isInc ? "var(--income)" : "var(--expense)"};">
              ${isInc ? "+" : "-"}${formatVND(item.amount)}
            </div>
            <button type="button" class="btn-icon-subtle" onclick="event.stopPropagation(); applyRecurringNow('${item.id}')" title="Ghi nhận ngay hôm nay" style="margin-top: 4px; padding: 3px 8px; height: 24px; width: auto; border-radius: 99px; font-size: 0.65rem; font-weight: 700; color: var(--primary); background: var(--primary-light); border: 1px solid var(--border-card);">
              Ghi nhận ngay
            </button>
          </div>
        </div>
      `;

        const card = wrapper.querySelector(".screen-recurring-card");
        const editBtn = wrapper.querySelector(".recurring-action-btn.edit-btn");
        const deleteBtn = wrapper.querySelector(
          ".recurring-action-btn.delete-btn",
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
            currentlyOpenRecurringSwipeWrapper &&
            currentlyOpenRecurringSwipeWrapper !== wrapper
          ) {
            closeCurrentRecurringSwipe();
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
              currentlyOpenRecurringSwipeWrapper = wrapper;
            } else {
              card.style.transform = "translateX(0px)";
              editBtn.style.transform = "scale(0)";
              editBtn.style.opacity = "0";
              deleteBtn.style.transform = "scale(0)";
              deleteBtn.style.opacity = "0";
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenRecurringSwipeWrapper === wrapper)
                currentlyOpenRecurringSwipeWrapper = null;
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
            closeCurrentRecurringSwipe();
            return;
          }
          openRecurringFormModal(item.id);
        });

        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentRecurringSwipe();
          openRecurringFormModal(item.id);
        });

        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentRecurringSwipe();
          deleteRecurringItem(item.id);
        });

        return wrapper;
      }

      function openRecurringFormModal(itemId = null) {
        const modal = document.getElementById("recurringFormModal");
        if (!modal) return;

        const editIdInput = document.getElementById("recurringEditId");
        const titleInput = document.getElementById("recurringTitleInput");
        const amtInput = document.getElementById("recurringAmountInput");
        const catSelect = document.getElementById("recurringCategorySelect");
        const walletSelect = document.getElementById("recurringWalletSelect");
        const dateInput = document.getElementById("recurringStartDateInput");
        const isWorkToggle = document.getElementById("recurringIsWorkToggle");
        const activeToggle = document.getElementById("recurringActiveToggle");
        const modalTitle = document.getElementById("recurringFormTitle");
        const typeTabs = document.querySelectorAll(
          "#recurringFormTypeTabs .pill-tab-btn",
        );

        if (walletSelect) {
          walletSelect.innerHTML = "";
          State.wallets.forEach((w) => {
            const opt = document.createElement("option");
            opt.value = w.id;
            opt.textContent = w.name;
            walletSelect.appendChild(opt);
          });
        }

        const populateCategories = (type) => {
          if (!catSelect) return;
          catSelect.innerHTML = "";
          const cats = State.categories.filter((c) => c.type === type);
          cats.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            catSelect.appendChild(opt);
          });
        };

        if (itemId) {
          const item = State.recurring.find((r) => r.id === itemId);
          if (!item) return;

          if (editIdInput) editIdInput.value = item.id;
          if (titleInput) titleInput.value = item.title;
          if (amtInput) amtInput.value = formatNumberOnly(item.amount);
          if (isWorkToggle) isWorkToggle.checked = !!item.isWork;
          if (activeToggle) activeToggle.checked = item.active !== false;

          typeTabs.forEach((b) =>
            b.classList.toggle("active", b.dataset.rftype === item.type),
          );
          populateCategories(item.type);
          if (catSelect) catSelect.value = item.categoryId;
          if (walletSelect)
            walletSelect.value =
              item.walletId || State.wallets[0]?.id || "w_bank";

          const defaultDate =
            item.startDate ||
            `${getTodayString().slice(0, 8)}${String(item.dayOfMonth || 1).padStart(2, "0")}`;
          if (dateInput) dateInput.value = defaultDate;

          if (modalTitle)
            modalTitle.innerHTML =
              '<i data-lucide="repeat" style="width: 16px; height: 16px; color: var(--primary);"></i> Chỉnh sửa khoản định kỳ';
        } else {
          if (editIdInput) editIdInput.value = "";
          if (titleInput) titleInput.value = "";
          if (amtInput) amtInput.value = "";
          if (isWorkToggle) isWorkToggle.checked = false;
          if (activeToggle) activeToggle.checked = true;

          typeTabs.forEach((b) =>
            b.classList.toggle("active", b.dataset.rftype === "income"),
          );
          populateCategories("income");
          if (walletSelect) walletSelect.selectedIndex = 0;
          if (dateInput) dateInput.value = getTodayString();

          if (modalTitle)
            modalTitle.innerHTML =
              '<i data-lucide="repeat" style="width: 16px; height: 16px; color: var(--primary);"></i> Thêm khoản định kỳ mới';
        }

        modal.classList.add("active");
        lucide.createIcons();
      }

      function closeRecurringFormModal() {
        const modal = document.getElementById("recurringFormModal");
        if (modal) modal.classList.remove("active");
      }

      window.openRecurringFormModal = openRecurringFormModal;
      window.closeRecurringFormModal = closeRecurringFormModal;
      window.openRecurringModal = () => switchActiveScreen("recurring");

      window.setRecurringFormAmount = (amt) => {
        const input = document.getElementById("recurringAmountInput");
        if (input) input.value = formatNumberOnly(amt);
      };

      async function saveRecurringFromForm() {
        const editId = document.getElementById("recurringEditId")?.value.trim();
        const title = document
          .getElementById("recurringTitleInput")
          ?.value.trim();
        const amt = parseVNDInput(
          document.getElementById("recurringAmountInput")?.value || 0,
        );
        const activeTypeBtn = document.querySelector(
          "#recurringFormTypeTabs .pill-tab-btn.active",
        );
        const type = activeTypeBtn ? activeTypeBtn.dataset.rftype : "income";
        const categoryId = document.getElementById(
          "recurringCategorySelect",
        )?.value;
        const walletId = document.getElementById(
          "recurringWalletSelect",
        )?.value;
        const startDate =
          document.getElementById("recurringStartDateInput")?.value ||
          getTodayString();
        const isWork =
          document.getElementById("recurringIsWorkToggle")?.checked || false;
        const active =
          document.getElementById("recurringActiveToggle")?.checked || false;

        if (!title) {
          showToast("Vui lòng nhập tên khoản định kỳ!", true);
          return;
        }
        if (amt <= 0) {
          showToast("Số tiền định kỳ phải lớn hơn 0!", true);
          return;
        }
        if (!categoryId) {
          showToast("Vui lòng chọn danh mục!", true);
          return;
        }
        if (!startDate) {
          showToast("Vui lòng chọn ngày bắt đầu áp dụng!", true);
          return;
        }

        const dayOfMonth = parseInt(startDate.split("-")[2], 10);
        const todayStr = getTodayString();

        if (editId) {
          const idx = State.recurring.findIndex((r) => r.id === editId);
          if (idx !== -1) {
            const existing = State.recurring[idx];
            existing.title = title;
            existing.type = type;
            existing.amount = amt;
            existing.categoryId = categoryId;
            existing.walletId = walletId;
            existing.startDate = startDate;
            existing.dayOfMonth = dayOfMonth;
            existing.isWork = isWork;
            existing.active = active;

            await DB.put("recurring", existing);
            showToast("Đã cập nhật khoản định kỳ!");
          }
        } else {
          const newId = "rec_" + Date.now();
          const newItem = {
            id: newId,
            title: title,
            type: type,
            amount: amt,
            categoryId: categoryId,
            walletId: walletId,
            startDate: startDate,
            dayOfMonth: dayOfMonth,
            lastExecutedDate: null,
            isWork: isWork,
            active: active,
          };

          if (startDate <= todayStr && active) {
            const txId = "tx_rec_" + newId + "_" + startDate.replace(/-/g, "");
            const txRecord = {
              id: txId,
              amount: amt,
              type: type,
              categoryId: categoryId,
              walletId: walletId || "w_bank",
              date: startDate,
              note: `Định kỳ: ${title}`,
              isWork: isWork,
              createdAt: Date.now(),
            };
            await DB.put("transactions", txRecord);
            State.transactions.unshift(txRecord);
            newItem.lastExecutedDate = startDate;
            showToast(
              `Đã tạo định kỳ và ghi nhận giao dịch ngày ${formatDateDisplay(startDate)}!`,
            );
          } else {
            showToast("Đã lưu khoản định kỳ mới!");
          }

          await DB.put("recurring", newItem);
          State.recurring.push(newItem);
        }

        closeRecurringFormModal();
        await checkAndProcessRecurringTransactions();
        renderRecurringScreen();
        renderOverviewScreen();
        renderAllScreens();
      }

      async function deleteRecurringItem(itemId) {
        const item = State.recurring.find((r) => r.id === itemId);
        if (!item) return;

        showConfirmDialog(
          "Xóa khoản định kỳ",
          `Bạn có chắc chắn muốn xóa khoản định kỳ "${item.title}" không? (Các giao dịch đã ghi nhận trong lịch sử sẽ vẫn được giữ nguyên).`,
          async () => {
            await DB.delete("recurring", itemId);
            State.recurring = State.recurring.filter((r) => r.id !== itemId);
            showToast(`Đã xóa khoản định kỳ "${item.title}"!`);
            renderRecurringScreen();
            renderOverviewScreen();
          },
        );
      }

      window.deleteRecurringItem = deleteRecurringItem;

      window.applyRecurringNow = (itemId) => {
        const item = State.recurring.find((r) => r.id === itemId);
        if (!item) return;

        const todayStr = getTodayString();
        showConfirmDialog(
          "Ghi nhận giao dịch định kỳ",
          `Bạn có muốn tạo giao dịch "${item.title}" (${formatVND(item.amount)}) vào hôm nay (${formatDateDisplay(todayStr)}) không?`,
          async () => {
            const txRecord = {
              id: "tx_rec_" + Date.now(),
              amount: item.amount,
              type: item.type,
              categoryId: item.categoryId,
              walletId: item.walletId || "w_cash",
              date: todayStr,
              note: `Định kỳ: ${item.title}`,
              isWork: item.isWork || false,
              createdAt: Date.now(),
            };

            await DB.put("transactions", txRecord);
            State.transactions.unshift(txRecord);

            item.lastExecutedDate = todayStr;
            await DB.put("recurring", item);

            showToast(`Đã ghi nhận giao dịch "${item.title}"!`);
            renderAllScreens();
          },
        );
      };
