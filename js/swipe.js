      /* ==========================================================================
       SWIPE ACTION CONTROLLER (SWIPE LEFT TO REVEAL EDIT & DELETE BUTTONS)
       Cử chỉ: Kéo từ phải sang trái -> 2 nút Sửa & Xóa hiện to dần (scale 0 -> 1)
       Khi đóng: 2 nút thu nhỏ dần về 0 (scale 1 -> 0)
       ========================================================================== */
      let currentlyOpenSwipeWrapper = null;

      function closeCurrentSwipe() {
        if (currentlyOpenSwipeWrapper) {
          const card = currentlyOpenSwipeWrapper.querySelector(".tx-card-item");
          const editBtn = currentlyOpenSwipeWrapper.querySelector(
            ".tx-action-btn.edit-btn",
          );
          const deleteBtn = currentlyOpenSwipeWrapper.querySelector(
            ".tx-action-btn.delete-btn",
          );

          currentlyOpenSwipeWrapper.classList.remove("dragging");
          currentlyOpenSwipeWrapper.classList.remove("full-swipe-ready");
          if (card) {
            card.classList.remove("dragging");
            card.style.transform = "translateX(0px)";
          }
          if (editBtn) {
            editBtn.style.transform = "scale(0)";
            editBtn.style.opacity = "0";
          }
          if (deleteBtn) {
            deleteBtn.style.transform = "scale(0)";
            deleteBtn.style.opacity = "0";
          }
          currentlyOpenSwipeWrapper.classList.remove("swiped-open");
          currentlyOpenSwipeWrapper = null;
        }
      }

      // Đóng swipe đang mở khi click ra ngoài
      document.addEventListener(
        "pointerdown",
        (e) => {
          if (
            currentlyOpenSwipeWrapper &&
            !currentlyOpenSwipeWrapper.contains(e.target)
          ) {
            closeCurrentSwipe();
          }
          if (
            typeof currentlyOpenWalletSwipeWrapper !== "undefined" &&
            currentlyOpenWalletSwipeWrapper &&
            !currentlyOpenWalletSwipeWrapper.contains(e.target)
          ) {
            closeCurrentWalletSwipe();
          }
          if (
            typeof currentlyOpenBudgetSwipeWrapper !== "undefined" &&
            currentlyOpenBudgetSwipeWrapper &&
            !currentlyOpenBudgetSwipeWrapper.contains(e.target)
          ) {
            closeCurrentBudgetSwipe();
          }
          if (
            typeof currentlyOpenCategorySwipeWrapper !== "undefined" &&
            currentlyOpenCategorySwipeWrapper &&
            !currentlyOpenCategorySwipeWrapper.contains(e.target)
          ) {
            closeCurrentCategorySwipe();
          }
        },
        { passive: true },
      );

      // Hàm xóa giao dịch có xác nhận
      window.deleteTransactionById = async (txId) => {
        const tx = State.transactions.find((t) => t.id === txId);
        if (!tx) return;
        const isTransfer = tx.type === "transfer";
        const catName = isTransfer
          ? "Chuyển ví nội bộ"
          : State.categories.find((c) => c.id === tx.categoryId)?.name ||
            "Giao dịch";
        const amtStr = formatVND(tx.amount);

        showConfirmDialog(
          "Xóa giao dịch",
          `Bạn có chắc muốn xóa giao dịch "${catName}" (${amtStr}) này không?`,
          async () => {
            await DB.delete("transactions", txId);
            State.transactions = State.transactions.filter(
              (t) => t.id !== txId,
            );
            showToast("Đã xóa giao dịch thành công!");
            renderAllScreens();
          },
        );
      };

      /* Helper: Create Individual Transaction Card Element with Swipe Gestures */
      function createTransactionCardElement(tx) {
        const cat = State.categories.find((c) => c.id === tx.categoryId) || {
          name: "Khác",
          icon: "tag",
          color: "#CBD5E1",
        };
        const wallet = State.wallets.find((w) => w.id === tx.walletId) || {
          name: "Tiền mặt",
        };
        const todayStr = getTodayString();
        const isFuture = tx.date > todayStr;

        const isTransfer = tx.type === "transfer";
        const fromWallet =
          State.wallets.find((w) => w.id === tx.fromWalletId)?.name || "Ví gửi";
        const toWallet =
          State.wallets.find((w) => w.id === tx.toWalletId)?.name || "Ví nhận";

        const wrapper = document.createElement("div");
        wrapper.className = "tx-swipe-wrapper";
        wrapper.id = `txSwipe_${tx.id}`;

        let iconHtml = "";
        let titleText = "";
        let subText = "";
        let amountClass = "";
        let amountPrefix = "";

        if (isTransfer) {
          iconHtml = `<div class="tx-icon-box" style="background-color: #EDE9FE; color: #6D28D9;"><i data-lucide="arrow-left-right" style="width: 17px; height: 17px;"></i></div>`;
          titleText = `Chuyển: ${fromWallet} → ${toWallet}`;
          subText = `<span class="tx-badge transfer">Nội bộ</span> <span class="tx-wallet-tag">${formatDateDisplay(tx.date)}</span>`;
          amountClass = "";
          amountPrefix = "";
        } else {
          const isInc = tx.type === "income";
          amountClass = isInc ? "income-text" : "expense-text";
          amountPrefix = isInc ? "+" : "-";
          iconHtml = `<div class="tx-icon-box" style="background-color: ${cat.color}20; color: ${cat.color};"><i data-lucide="${cat.icon || "tag"}" style="width: 17px; height: 17px;"></i></div>`;
          titleText = tx.note ? tx.note : cat.name;

          const rawWallet = wallet.name || "Tiền mặt";
          const shortWallet = rawWallet
            .replace(/^Tài khoản\s+/i, "")
            .replace(/^Ví điện tử\s+/i, "Ví ")
            .replace(/^Thẻ tín dụng\s+/i, "Thẻ ");

          let shortLoc = "";
          if (tx.location && tx.location.address) {
            shortLoc = tx.location.address
              .split(",")[0]
              .trim()
              .replace(/^Đường\s+/i, "Đ.");
            if (shortLoc.length > 12) shortLoc = shortLoc.slice(0, 11) + "…";
          }

          const showCatTag = tx.note && cat.name && tx.note.trim().toLowerCase() !== cat.name.trim().toLowerCase();

          subText = `
          ${showCatTag ? `<span class="tx-badge" style="background: ${cat.color}20; color: ${cat.color}; font-weight: 700;">${cat.name}</span>` : ""}
          <span class="tx-wallet-tag" title="${rawWallet}">${shortWallet}</span>
          ${tx.isWork ? '<span class="tx-badge work"><i data-lucide="briefcase" style="width: 8px; height: 8px;"></i> Đi làm</span>' : ""}
          ${shortLoc ? `<span class="tx-badge location" title="${tx.location.address}"><i data-lucide="map-pin" style="width: 8px; height: 8px; flex-shrink: 0;"></i> <span>${shortLoc}</span></span>` : ""}
          ${isFuture ? '<span class="tx-badge future"><i data-lucide="clock" style="width: 8px; height: 8px;"></i> Dự kiến</span>' : ""}
          ${tx.receipt ? '<i data-lucide="paperclip" style="width: 11px; height: 11px; color: var(--text-muted); flex-shrink: 0;" title="Có hóa đơn"></i>' : ""}
        `;
        }

        wrapper.innerHTML = `
        <div class="tx-swipe-actions">
          <!-- Background đỏ kích hoạt khi lướt dài xóa kiểu Gmail -->
          <div class="tx-full-swipe-bg">
            <i data-lucide="trash-2" style="width: 20px; height: 20px;"></i>
            <span>Xóa</span>
          </div>
          <!-- 2 nút tròn khi lướt nhẹ -->
          <div class="tx-short-swipe-btns">
            <button class="tx-action-btn edit-btn" id="swipeEditBtn_${tx.id}" title="Sửa giao dịch" aria-label="Sửa">
              <i data-lucide="edit-3" style="width: 18px; height: 18px;"></i>
            </button>
            <button class="tx-action-btn delete-btn" id="swipeDelBtn_${tx.id}" title="Xóa giao dịch" aria-label="Xóa">
              <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>
        <div class="tx-card-item" id="txCardItem_${tx.id}">
          <div class="tx-left">
            ${iconHtml}
            <div class="tx-meta">
              <div class="tx-title-row">
                <span class="tx-title">${titleText}</span>
              </div>
              <div class="tx-sub-row">${subText}</div>
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${amountClass}">${amountPrefix}${formatVND(tx.amount)}</div>
            <div class="tx-time">${formatDateDisplay(tx.date)}</div>
          </div>
        </div>
      `;

        const card = wrapper.querySelector(".tx-card-item");
        const editBtn = wrapper.querySelector(".tx-action-btn.edit-btn");
        const deleteBtn = wrapper.querySelector(".tx-action-btn.delete-btn");

        // Cài đặt cử chỉ Pointer Drag (Hỗ trợ lướt nhẹ hiện 2 nút & lướt dài xóa luôn kiểu Gmail)
        let isPointerDown = false;
        let startX = 0;
        let startY = 0;
        let currentOffsetX = 0;
        let isSwiping = false;
        let hasDragged = false;
        let isFullSwipeReady = false;
        const snapWidth = -116; // Chiều rộng vừa khớp 2 nút tròn
        const longSwipeThreshold = -165; // Ngưỡng lướt dài xóa kiểu Gmail

        const updateScale = (progress) => {
          // Phóng to dần 2 nút từ 0 lên 1 khi kéo từ phải sang trái
          const p = Math.min(Math.max(progress, 0), 1);
          const scaleVal = 0.05 + 0.95 * p;
          editBtn.style.transform = `scale(${scaleVal})`;
          editBtn.style.opacity = `${p}`;
          deleteBtn.style.transform = `scale(${scaleVal})`;
          deleteBtn.style.opacity = `${p}`;
        };

        card.addEventListener("pointerdown", (e) => {
          if (e.button !== 0 && e.pointerType === "mouse") return;
          if (
            currentlyOpenSwipeWrapper &&
            currentlyOpenSwipeWrapper !== wrapper
          ) {
            closeCurrentSwipe();
          }
          isPointerDown = true;
          hasDragged = false;
          isSwiping = false;
          isFullSwipeReady = false;
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
            // Giới hạn không cho kéo sang phải
            if (newX > 0) newX = newX * 0.2;

            // Kéo dài sang trái: cho phép kéo tự do qua longSwipeThreshold
            // Chỉ thêm chút kháng lực nhẹ khi kéo quá 270px
            if (newX < -270) {
              newX = -270 + (newX - (-270)) * 0.35;
            }

            card.style.transform = `translateX(${newX}px)`;

            // Kiểm tra ngưỡng lướt dài kiểu Gmail
            if (newX < longSwipeThreshold) {
              if (!isFullSwipeReady) {
                isFullSwipeReady = true;
                wrapper.classList.add("full-swipe-ready");
                if (typeof triggerHaptic === "function") {
                  triggerHaptic("medium");
                }
              }
            } else {
              if (isFullSwipeReady) {
                isFullSwipeReady = false;
                wrapper.classList.remove("full-swipe-ready");
                if (typeof triggerHaptic === "function") {
                  triggerHaptic("light");
                }
              }
              // Tính độ tiến trình phóng to 2 nút khi ở khoảng lướt ngắn
              const dist = Math.max(0, -newX);
              const progress = Math.min(dist / Math.abs(snapWidth), 1);
              updateScale(progress);
            }
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

            if (curX <= longSwipeThreshold) {
              // ============================================================
              // 1. LƯỚT DÀI (LONG SWIPE) -> XÓA NGAY LẬP TỨC KIỂU GMAIL!
              // ============================================================
              isFullSwipeReady = false;
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenSwipeWrapper === wrapper) {
                currentlyOpenSwipeWrapper = null;
              }

              // Animate thẻ bay hoàn toàn sang trái (Slide out left)
              card.style.transition = "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease";
              card.style.transform = "translateX(-115%)";
              card.style.opacity = "0";

              setTimeout(async () => {
                // Thu gọn chiều cao wrapper mượt mà (Collapse height)
                wrapper.style.transition = "max-height 0.26s cubic-bezier(0.4, 0, 0.2, 1), margin 0.26s ease, opacity 0.2s ease, padding 0.26s ease";
                wrapper.style.maxHeight = wrapper.offsetHeight + "px";
                void wrapper.offsetHeight; // reflow
                wrapper.style.maxHeight = "0px";
                wrapper.style.marginBottom = "0px";
                wrapper.style.paddingTop = "0px";
                wrapper.style.paddingBottom = "0px";
                wrapper.style.opacity = "0";
                wrapper.style.overflow = "hidden";

                if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
                  SoundEngine.play("delete");
                }
                if (typeof triggerHaptic === "function") {
                  triggerHaptic("medium");
                }

                // Xóa khỏi Database & State
                await DB.delete("transactions", tx.id);
                const originalIndex = State.transactions.findIndex((t) => t.id === tx.id);
                State.transactions = State.transactions.filter((t) => t.id !== tx.id);

                // Cập nhật các màn hình & số dư
                setTimeout(() => {
                  renderAllScreens();
                }, 270);

                // Thông báo Toast có nút HOÀN TÁC chuẩn Gmail
                const txTitle = tx.note || cat.name || "Giao dịch";
                showToast(`Đã xóa: ${txTitle} (${formatVND(tx.amount)})`, false, async () => {
                  // Hoàn tác: Phục hồi lại giao dịch vào vị trí ban đầu
                  await DB.put("transactions", tx);
                  if (originalIndex >= 0) {
                    State.transactions.splice(originalIndex, 0, tx);
                  } else {
                    State.transactions.push(tx);
                  }
                  showToast("Đã hoàn tác giao dịch!");
                  renderAllScreens();
                });
              }, 140);

            } else if (curX < -45) {
              // ============================================================
              // 2. LƯỚT NHẸ -> SNAP MỞ 2 NÚT SỬA & XÓA NHƯ CŨ
              // ============================================================
              wrapper.classList.remove("full-swipe-ready");
              card.style.transform = `translateX(${snapWidth}px)`;
              editBtn.style.transform = "scale(1)";
              editBtn.style.opacity = "1";
              deleteBtn.style.transform = "scale(1)";
              deleteBtn.style.opacity = "1";
              wrapper.classList.add("swiped-open");
              currentlyOpenSwipeWrapper = wrapper;
            } else {
              // ============================================================
              // 3. ĐÓNG LẠI (SNAP CLOSED)
              // ============================================================
              wrapper.classList.remove("full-swipe-ready");
              card.style.transform = "translateX(0px)";
              editBtn.style.transform = "scale(0)";
              editBtn.style.opacity = "0";
              deleteBtn.style.transform = "scale(0)";
              deleteBtn.style.opacity = "0";
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenSwipeWrapper === wrapper)
                currentlyOpenSwipeWrapper = null;
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

        // Nhấp vào thẻ
        card.addEventListener("click", (e) => {
          if (hasDragged) return;

          // Nếu thẻ đang ở trạng thái mở vuốt thì click vào sẽ đóng thẻ
          if (wrapper.classList.contains("swiped-open")) {
            closeCurrentSwipe();
            return;
          }

          // Mở chi tiết giao dịch
          openTxDetailModal(tx);
        });

        // Bấm nút Sửa
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentSwipe();
          if (isTransfer) {
            showToast("Chuyển ví nội bộ không hỗ trợ sửa trực tiếp!", true);
          } else {
            openTransactionWizard(tx.id, false);
          }
        });

        // Bấm nút Xóa
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentSwipe();
          deleteTransactionById(tx.id);
        });

        return wrapper;
      }

      /* ==========================================================================
       WALLET SWIPE ACTION CONTROLLER (SWIPE LEFT TO REVEAL EDIT & DELETE)
       Cử chỉ: Kéo thẻ ví từ phải sang trái -> 2 nút Sửa & Xóa hiện to dần (scale 0 -> 1)
       Khi đóng: 2 nút thu nhỏ dần về 0 (scale 1 -> 0)
       ========================================================================== */
      let currentlyOpenWalletSwipeWrapper = null;

      function closeCurrentWalletSwipe() {
        if (!currentlyOpenWalletSwipeWrapper) return;
        const card =
          currentlyOpenWalletSwipeWrapper.querySelector(".wallet-card-item");
        const editBtn = currentlyOpenWalletSwipeWrapper.querySelector(
          ".wallet-action-btn.edit-btn",
        );
        const deleteBtn = currentlyOpenWalletSwipeWrapper.querySelector(
          ".wallet-action-btn.delete-btn",
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
        currentlyOpenWalletSwipeWrapper.classList.remove("swiped-open");
        currentlyOpenWalletSwipeWrapper = null;
      }

      function createWalletCardElement(
        w,
        bal,
        pctOfTotal,
        currentAvailableBalance,
      ) {
        const wrapper = document.createElement("div");
        wrapper.className = "wallet-swipe-wrapper";

        wrapper.innerHTML = `
        <div class="wallet-swipe-actions">
          <button class="wallet-action-btn edit-btn" title="Chỉnh sửa ví">
            <i data-lucide="pencil" style="width: 17px; height: 17px;"></i>
            <span>Sửa</span>
          </button>
          <button class="wallet-action-btn delete-btn" title="Xóa ví">
            <i data-lucide="trash-2" style="width: 17px; height: 17px;"></i>
            <span>Xóa</span>
          </button>
        </div>

        <div class="wallet-card-item" style="border-left: 4px solid ${w.color || "#34D399"};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 40px; height: 40px; border-radius: 11px; background: ${w.color || "#34D399"}20; color: ${w.color || "#34D399"}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${w.icon || "wallet"}" style="width: 20px; height: 20px;"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  <span style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${w.name}</span>
                  ${w.isDefault ? '<span class="tx-badge" style="background: rgba(45,212,191,0.14); color: var(--mint); font-size: 0.62rem; flex-shrink: 0;">Mặc định</span>' : ""}
                </div>
                <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${currentAvailableBalance > 0 ? `Chiếm ${pctOfTotal}% tài sản` : "Ví hoạt động"}
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; white-space: nowrap;">
              <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em;">
                ${State.isBalanceHidden ? "•••••• ₫" : formatVND(bal)}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 10px; margin-top: 4px;">
            <button type="button" class="btn-wallet-transfer" style="flex: 1; padding: 7px 10px; border-radius: var(--radius-sm); background: var(--bg-card-subtle); border: 1px solid var(--border-card); font-size: 0.74rem; font-weight: 700; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i data-lucide="arrow-left-right" style="width: 13px; height: 13px; color: var(--primary);"></i>
              Chuyển tiền
            </button>
            <button type="button" class="btn-wallet-txs" style="flex: 1; padding: 7px 10px; border-radius: var(--radius-sm); background: var(--bg-card-subtle); border: 1px solid var(--border-card); font-size: 0.74rem; font-weight: 700; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i data-lucide="receipt" style="width: 13px; height: 13px; color: var(--mint);"></i>
              Sổ giao dịch
            </button>
          </div>
        </div>
      `;

        const card = wrapper.querySelector(".wallet-card-item");
        const editBtn = wrapper.querySelector(".wallet-action-btn.edit-btn");
        const deleteBtn = wrapper.querySelector(
          ".wallet-action-btn.delete-btn",
        );
        const transferBtn = wrapper.querySelector(".btn-wallet-transfer");
        const txsBtn = wrapper.querySelector(".btn-wallet-txs");

        // Các nút thao tác trong card
        transferBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openTransferModal();
          setTimeout(() => {
            const sel = document.getElementById("transferFromWalletSelect");
            if (sel) sel.value = w.id;
          }, 50);
        });

        txsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          State.txFilter = "all";
          State.txSearch = w.name;
          switchActiveScreen("transactions");
          const searchInput = document.getElementById("txSearchInput");
          if (searchInput) searchInput.value = w.name;
        });

        // Cài đặt cử chỉ Pointer Drag Vuốt từ phải sang trái
        let isPointerDown = false;
        let startX = 0;
        let startY = 0;
        let currentOffsetX = 0;
        let isSwiping = false;
        let hasDragged = false;
        const snapWidth = -116; // Chiều rộng vừa khớp 2 nút tròn

        const updateScale = (progress) => {
          // Phóng to dần 2 nút từ 0 lên 1 khi kéo từ phải sang trái
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
            currentlyOpenWalletSwipeWrapper &&
            currentlyOpenWalletSwipeWrapper !== wrapper
          ) {
            closeCurrentWalletSwipe();
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
              currentlyOpenWalletSwipeWrapper = wrapper;
            } else {
              card.style.transform = "translateX(0px)";
              editBtn.style.transform = "scale(0)";
              editBtn.style.opacity = "0";
              deleteBtn.style.transform = "scale(0)";
              deleteBtn.style.opacity = "0";
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenWalletSwipeWrapper === wrapper)
                currentlyOpenWalletSwipeWrapper = null;
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

        // Nhấp vào thẻ
        card.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          if (hasDragged) return;

          if (wrapper.classList.contains("swiped-open")) {
            closeCurrentWalletSwipe();
            return;
          }

          // Mở chỉnh sửa ví khi chạm vào thẻ
          openEditWalletModal(w.id);
        });

        // Bấm nút Sửa
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentWalletSwipe();
          openEditWalletModal(w.id);
        });

        // Bấm nút Xóa
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentWalletSwipe();
          deleteWalletPrompt(w.id);
        });

        return wrapper;
      }
