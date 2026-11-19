      /* ==========================================================================
       FULL-SCREEN CATEGORY HUB & CATEGORIZED ICONS (#screen-categories)
       ========================================================================== */
      let activeCatIconGroup = "food";
      let currentCatSelectedIcon = "utensils";
      let currentlyOpenCategorySwipeWrapper = null;

      function closeCurrentCategorySwipe() {
        if (!currentlyOpenCategorySwipeWrapper) return;
        const card = currentlyOpenCategorySwipeWrapper.querySelector(
          ".screen-category-card",
        );
        const editBtn = currentlyOpenCategorySwipeWrapper.querySelector(
          ".category-action-btn.edit-btn",
        );
        const deleteBtn = currentlyOpenCategorySwipeWrapper.querySelector(
          ".category-action-btn.delete-btn",
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
        currentlyOpenCategorySwipeWrapper.classList.remove("swiped-open");
        currentlyOpenCategorySwipeWrapper = null;
      }

      function createCategoryCardElement(cat, txCount, monthAmt, budgetAmt) {
        const wrapper = document.createElement("div");
        wrapper.className = "category-swipe-wrapper";
        wrapper.id = `categorySwipe_${cat.id}`;

        wrapper.innerHTML = `
        <div class="category-swipe-actions">
          <button type="button" class="category-action-btn edit-btn" title="Sửa danh mục">
            <i data-lucide="pencil" style="width: 17px; height: 17px;"></i>
            <span>Sửa</span>
          </button>
          <button type="button" class="category-action-btn delete-btn" title="Xóa danh mục">
            <i data-lucide="trash-2" style="width: 17px; height: 17px;"></i>
            <span>Xóa</span>
          </button>
        </div>

        <div class="screen-category-card" id="categoryCardItem_${cat.id}">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: ${cat.color}25; color: ${cat.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px ${cat.color}20;">
              <i data-lucide="${cat.icon || "tag"}" style="width: 20px; height: 20px;"></i>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.name}</span>
                ${cat.type === "expense" && budgetAmt > 0 ? `<span style="font-size: 0.62rem; font-weight: 700; background: var(--primary-light); color: var(--primary); padding: 1px 6px; border-radius: 99px; flex-shrink: 0;">Hạn mức: ${formatVND(budgetAmt)}</span>` : ""}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>${txCount} giao dịch</span>
                <span>·</span>
                <span>${cat.type === "expense" ? "Chi" : "Thu"} tháng: <b style="color: ${cat.type === "expense" ? "var(--expense)" : "var(--income)"};">${formatVND(monthAmt)}</b></span>
              </div>
            </div>
          </div>
          <div style="color: var(--text-muted); font-size: 0.65rem; display: flex; align-items: center; gap: 2px; flex-shrink: 0;">
            <i data-lucide="chevron-left" style="width: 13px; height: 13px;"></i> Vuốt
          </div>
        </div>
      `;

        const card = wrapper.querySelector(".screen-category-card");
        const editBtn = wrapper.querySelector(".category-action-btn.edit-btn");
        const deleteBtn = wrapper.querySelector(
          ".category-action-btn.delete-btn",
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
            currentlyOpenCategorySwipeWrapper &&
            currentlyOpenCategorySwipeWrapper !== wrapper
          ) {
            closeCurrentCategorySwipe();
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
              currentlyOpenCategorySwipeWrapper = wrapper;
            } else {
              card.style.transform = "translateX(0px)";
              editBtn.style.transform = "scale(0)";
              editBtn.style.opacity = "0";
              deleteBtn.style.transform = "scale(0)";
              deleteBtn.style.opacity = "0";
              wrapper.classList.remove("swiped-open");
              if (currentlyOpenCategorySwipeWrapper === wrapper)
                currentlyOpenCategorySwipeWrapper = null;
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
            closeCurrentCategorySwipe();
            return;
          }
          openEditCategoryModal(cat.id);
        });

        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentCategorySwipe();
          openEditCategoryModal(cat.id);
        });

        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeCurrentCategorySwipe();
          deleteCategoryItem(cat.id);
        });

        return wrapper;
      }

      function renderCategoriesScreen() {
        const container = document.getElementById("catScreenListContainer");
        if (!container) return;

        const now = new Date();
        const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const thisMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        // Stats for expense vs income
        let expCount = 0;
        let incCount = 0;
        let expSpentMonth = 0;
        let incSpentMonth = 0;

        const catTxCountMap = {};
        const catSpentMonthMap = {};

        State.categories.forEach((c) => {
          if (c.type === "expense") expCount++;
          else incCount++;
        });

        State.transactions.forEach((t) => {
          catTxCountMap[t.categoryId] = (catTxCountMap[t.categoryId] || 0) + 1;
          if (t.date >= thisMonthStart && t.date <= thisMonthEnd) {
            const amt = Number(t.amount) || 0;
            catSpentMonthMap[t.categoryId] =
              (catSpentMonthMap[t.categoryId] || 0) + amt;
            if (t.type === "expense") expSpentMonth += amt;
            else if (t.type === "income") incSpentMonth += amt;
          }
        });

        // Update Bento Summary Badges
        const expCountEl = document.getElementById("catScreenExpenseCount");
        const expSpentEl = document.getElementById("catScreenExpenseSpent");
        const incCountEl = document.getElementById("catScreenIncomeCount");
        const incSpentEl = document.getElementById("catScreenIncomeSpent");

        if (expCountEl) expCountEl.textContent = `${expCount} nhóm`;
        if (expSpentEl)
          expSpentEl.textContent = `Chi: ${formatVND(expSpentMonth)}`;
        if (incCountEl) incCountEl.textContent = `${incCount} nhóm`;
        if (incSpentEl)
          incSpentEl.textContent = `Thu: ${formatVND(incSpentMonth)}`;

        // Filter by Type (expense vs income) and Search
        const activeType = State.categoryScreenType || "expense";
        const search = (State.categorySearch || "").toLowerCase().trim();

        let filteredCats = State.categories.filter(
          (c) => c.type === activeType,
        );
        if (search) {
          filteredCats = filteredCats.filter((c) =>
            c.name.toLowerCase().includes(search),
          );
        }

        container.innerHTML = "";

        if (filteredCats.length === 0) {
          container.innerHTML = `
          <div class="editorial-card" style="text-align: center; padding: 28px 16px; color: var(--text-secondary);">
            <i data-lucide="tag" style="width: 28px; height: 28px; margin: 0 auto 8px; opacity: 0.5;"></i>
            <div style="font-size: 0.82rem; font-weight: 700;">Không tìm thấy danh mục nào</div>
            <button type="button" onclick="openCreateCategoryModal()" style="margin-top: 10px; padding: 6px 14px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.74rem; font-weight: 700; cursor: pointer;">+ Thêm danh mục</button>
          </div>
        `;
          lucide.createIcons();
          return;
        }

        filteredCats.forEach((cat) => {
          const txCount = catTxCountMap[cat.id] || 0;
          const monthAmt = catSpentMonthMap[cat.id] || 0;
          const budgetAmt = State.categoryBudgets[cat.id] || 0;
          const cardEl = createCategoryCardElement(
            cat,
            txCount,
            monthAmt,
            budgetAmt,
          );
          container.appendChild(cardEl);
        });

        lucide.createIcons();
      }

      function openCreateCategoryModal() {
        const modal = document.getElementById("createCategoryModal");
        if (!modal) return;
        document.getElementById("editCategoryId").value = "";
        document.getElementById("createCategoryTitle").textContent =
          "Thêm danh mục";
        document.getElementById("newCategoryName").value = "";
        document.getElementById("newCategoryType").value =
          State.categoryScreenType || "expense";

        activeCatIconGroup = "food";
        currentCatSelectedIcon = "utensils";
        initCategoryCreateModal(currentCatSelectedIcon, activeCatIconGroup);

        modal.classList.add("active");
        lucide.createIcons();
      }

      function openEditCategoryModal(catId) {
        const cat = State.categories.find((c) => c.id === catId);
        if (!cat) return;

        const modal = document.getElementById("createCategoryModal");
        if (!modal) return;

        document.getElementById("editCategoryId").value = cat.id;
        document.getElementById("createCategoryTitle").textContent =
          "Sửa danh mục";
        document.getElementById("newCategoryName").value = cat.name;
        document.getElementById("newCategoryType").value = cat.type;

        // Find which group contains this icon
        currentCatSelectedIcon = cat.icon || "tag";
        const groupFound = ICON_CATEGORIES.find((g) =>
          g.icons.includes(currentCatSelectedIcon),
        );
        activeCatIconGroup = groupFound ? groupFound.id : "food";

        initCategoryCreateModal(
          currentCatSelectedIcon,
          activeCatIconGroup,
          cat.color,
        );

        modal.classList.add("active");
        lucide.createIcons();
      }

      function initCategoryCreateModal(
        selectedIcon = "utensils",
        selectedGroup = "food",
        selectedColor = null,
      ) {
        currentCatSelectedIcon = selectedIcon;
        activeCatIconGroup = selectedGroup;

        const labelEl = document.getElementById("selectedCatIconName");
        if (labelEl) labelEl.textContent = currentCatSelectedIcon;

        // Render Color Palette
        const palette = document.getElementById("catColorPalette");
        if (palette) {
          palette.innerHTML = "";
          COLOR_PALETTE.forEach((color, idx) => {
            const isSelected = selectedColor
              ? selectedColor === color
              : idx === 0;
            const item = document.createElement("div");
            item.style.width = "28px";
            item.style.height = "28px";
            item.style.borderRadius = "50%";
            item.style.backgroundColor = color;
            item.style.cursor = "pointer";
            item.style.border = isSelected
              ? "2.5px solid var(--charcoal)"
              : "1px solid rgba(0,0,0,0.15)";
            item.dataset.color = color;
            item.onclick = () => {
              document
                .querySelectorAll("#catColorPalette div")
                .forEach(
                  (d) => (d.style.border = "1px solid rgba(0,0,0,0.15)"),
                );
              item.style.border = "2.5px solid var(--charcoal)";
            };
            palette.appendChild(item);
          });
        }

        // Render Group Tabs
        const groupTabsContainer = document.getElementById("catIconGroupTabs");
        if (groupTabsContainer) {
          groupTabsContainer.innerHTML = "";
          ICON_CATEGORIES.forEach((group) => {
            const isActive = group.id === activeCatIconGroup;
            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = `cat-icon-group-pill ${isActive ? "active" : ""}`;
            pill.innerHTML = `<i data-lucide="${group.icon}" style="width: 13px; height: 13px;"></i> <span>${group.name}</span>`;
            pill.onclick = () => {
              activeCatIconGroup = group.id;
              document
                .querySelectorAll("#catIconGroupTabs .cat-icon-group-pill")
                .forEach((p) => p.classList.remove("active"));
              pill.classList.add("active");
              renderCategorizedIconPicker(group.id, currentCatSelectedIcon);
            };
            groupTabsContainer.appendChild(pill);
          });
        }

        renderCategorizedIconPicker(activeCatIconGroup, currentCatSelectedIcon);
        lucide.createIcons();
      }

      function renderCategorizedIconPicker(groupId, currentSelected) {
        const iconPicker = document.getElementById("catIconPicker");
        if (!iconPicker) return;
        iconPicker.innerHTML = "";

        const group =
          ICON_CATEGORIES.find((g) => g.id === groupId) || ICON_CATEGORIES[0];
        const iconsToRender = group.icons;

        iconsToRender.forEach((ic) => {
          const isSelected = ic === currentSelected;
          const item = document.createElement("div");
          item.className = `cat-icon-pick-item ${isSelected ? "selected" : ""}`;
          item.dataset.icon = ic;
          item.innerHTML = `<i data-lucide="${ic}" style="width: 18px; height: 18px;"></i>`;
          item.title = ic;

          item.onclick = () => {
            currentCatSelectedIcon = ic;
            const labelEl = document.getElementById("selectedCatIconName");
            if (labelEl) labelEl.textContent = ic;
            document
              .querySelectorAll("#catIconPicker .cat-icon-pick-item")
              .forEach((d) => d.classList.remove("selected"));
            item.classList.add("selected");
          };

          iconPicker.appendChild(item);
        });

        lucide.createIcons();
      }

      /* Category Management Functions (Modal Support) */
      function openCategoryManagerModal() {
        renderCategoryManagerList();
        document.getElementById("categoryManagerModal").classList.add("active");
        lucide.createIcons();
      }

      function renderCategoryManagerList() {
        const container = document.getElementById("categoryManagerList");
        if (!container) return;
        container.innerHTML = "";

        const activeTab =
          document.querySelector("#categoryTabFilter .pill-tab-btn.active")
            ?.dataset.cattab || "expense";
        const cats = State.categories.filter((c) => c.type === activeTab);

        cats.forEach((c) => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.padding = "10px 14px";
          row.style.background = "var(--bg-card-subtle)";
          row.style.borderRadius = "var(--radius-sm)";
          row.style.border = "1px solid var(--border-card)";

          row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${c.color}25; color: ${c.color}; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="${c.icon || "tag"}" style="width: 16px; height: 16px;"></i>
            </div>
            <span style="font-size: 0.88rem; font-weight: 700;">${c.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn-icon-subtle" onclick="document.getElementById('categoryManagerModal').classList.remove('active'); openEditCategoryModal('${c.id}');" title="Sửa" style="color: var(--primary); width: 32px; height: 32px;">
              <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="btn-icon-subtle" onclick="deleteCategoryItem('${c.id}')" title="Xóa" style="color: var(--expense); width: 32px; height: 32px;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        `;
          container.appendChild(row);
        });
        lucide.createIcons();
      }

      window.deleteCategoryItem = async (catId) => {
        const cat = State.categories.find((c) => c.id === catId);
        const catName = cat ? cat.name : "danh mục này";
        const isUsed = State.transactions.some((t) => t.categoryId === catId);
        if (isUsed) {
          showToast(
            `Không thể xóa "${catName}" vì đang có giao dịch sử dụng!`,
            true,
          );
          return;
        }
        showConfirmDialog(
          "Xóa danh mục",
          `Bạn có chắc chắn muốn xóa danh mục "${catName}" không?`,
          async () => {
            await DB.delete("categories", catId);
            State.categories = State.categories.filter((c) => c.id !== catId);
            if (State.categoryBudgets[catId]) {
              delete State.categoryBudgets[catId];
              await DB.delete("category_budgets", catId);
            }
            renderCategoryManagerList();
            renderCategoriesScreen();
            renderBudgetsScreen();
            renderWizardCategoryGrid();
            showToast("Đã xóa danh mục!");
          },
        );
      };

      async function saveNewCategory() {
        const editId = document.getElementById("editCategoryId")?.value.trim();
        const name = document.getElementById("newCategoryName").value.trim();
        const type = document.getElementById("newCategoryType").value;
        const selectedColor =
          document.querySelector('#catColorPalette div[style*="2.5px solid"]')
            ?.dataset.color ||
          document.querySelector('#catColorPalette div[style*="2px solid"]')
            ?.dataset.color ||
          "#34D399";
        const selectedIcon =
          currentCatSelectedIcon ||
          document.querySelector("#catIconPicker .cat-icon-pick-item.selected")
            ?.dataset.icon ||
          "tag";

        if (!name) {
          showToast("Vui lòng nhập tên danh mục!", true);
          return;
        }

        if (editId) {
          // Edit existing category
          const idx = State.categories.findIndex((c) => c.id === editId);
          if (idx !== -1) {
            State.categories[idx].name = name;
            State.categories[idx].type = type;
            State.categories[idx].color = selectedColor;
            State.categories[idx].icon = selectedIcon;
            await DB.put("categories", State.categories[idx]);
            showToast("Đã cập nhật danh mục thành công!");
          }
        } else {
          // Create new category
          const newCat = {
            id: "c_" + Date.now(),
            name: name,
            type: type,
            color: selectedColor,
            icon: selectedIcon,
          };
          await DB.put("categories", newCat);
          State.categories.push(newCat);
          showToast("Đã tạo danh mục mới!");
        }

        document
          .getElementById("createCategoryModal")
          .classList.remove("active");
        document.getElementById("newCategoryName").value = "";
        document.getElementById("editCategoryId").value = "";

        renderWizardCategoryGrid();
        renderCategoryManagerList();
        renderCategoriesScreen();
        renderBudgetsScreen();
        renderOverviewScreen();
      }

      /* Backup, Restore & CSV UTF-8 Export */
      async function backupAllDataJSON() {
        const backupData = {
          version: DB_VERSION,
          exportedAt: new Date().toISOString(),
          transactions: State.transactions,
          categories: State.categories,
          settings: State.settings,
          wallets: State.wallets,
          recurring: State.recurring,
          categoryBudgets: State.categoryBudgets,
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FinMaster_Backup_${getTodayString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Đã tải xuống tệp sao lưu JSON!");
      }

      async function restoreFromJSONFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.transactions || !Array.isArray(data.transactions)) {
              throw new Error("Cấu trúc tệp không hợp lệ!");
            }

            showConfirmDialog(
              "Khôi phục dữ liệu",
              "Toàn bộ dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ tệp sao lưu. Bạn có muốn tiếp tục?",
              async () => {
                await DB.clear("transactions");
                await DB.clear("categories");
                await DB.clear("wallets");
                await DB.clear("recurring");
                await DB.clear("category_budgets");

                for (const tx of data.transactions)
                  await DB.put("transactions", tx);
                for (const c of data.categories || DEFAULT_CATEGORIES)
                  await DB.put("categories", c);
                for (const w of data.wallets || DEFAULT_WALLETS)
                  await DB.put("wallets", w);
                for (const r of data.recurring || [])
                  await DB.put("recurring", r);
                if (data.settings) {
                  for (const [k, v] of Object.entries(data.settings)) {
                    await DB.put("settings", { key: k, value: v });
                  }
                }

                await loadAllDataFromIndexedDB();
                showToast("Khôi phục dữ liệu thành công!");
              },
            );
          } catch (err) {
            console.error(err);
            showToast("Tệp sao lưu không hợp lệ hoặc bị lỗi!", true);
          }
        };
        reader.readAsText(file);
      }

      function exportToCSV() {
        if (State.transactions.length === 0) {
          showToast("Không có giao dịch nào để xuất CSV!", true);
          return;
        }

        // Prepend UTF-8 BOM so Excel opens Vietnamese diacritics cleanly!
        let csv =
          "\uFEFFMã GD,Ngày,Loại,Danh mục,Số tiền (VNĐ),Ví,Công việc,Vị trí,Ghi chú\n";

        State.transactions.forEach((t) => {
          const cat =
            State.categories.find((c) => c.id === t.categoryId)?.name || "Khác";
          const wallet =
            State.wallets.find((w) => w.id === t.walletId)?.name || "Tiền mặt";
          const typeStr =
            t.type === "income"
              ? "Thu nhập"
              : t.type === "transfer"
                ? "Chuyển ví"
                : "Chi tiêu";
          const noteEscaped = (t.note || "").replace(/"/g, '""');
          const locEscaped = (t.location?.address || "").replace(/"/g, '""');

          csv += `"${t.id}","${t.date}","${typeStr}","${cat}",${t.amount},"${wallet}","${t.isWork ? "Có" : "Không"}","${locEscaped}","${noteEscaped}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FinMaster_Transactions_${getTodayString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Đã xuất báo cáo CSV thành công!");
      }

      async function updateStorageStatus() {
        const text = document.getElementById("dbStorageStatusText");
        if (navigator.storage && navigator.storage.estimate) {
          try {
            const est = await navigator.storage.estimate();
            const usedMB = (est.usage / (1024 * 1024)).toFixed(2);
            text.textContent = `Đang sử dụng ~${usedMB} MB IndexedDB`;
          } catch {
            text.textContent = `${State.transactions.length} giao dịch được lưu an toàn`;
          }
        } else {
          text.textContent = `${State.transactions.length} giao dịch được lưu an toàn`;
        }
      }

      /* Danger Zone Reset */
      async function resetAllData() {
        showConfirmDialog(
          "Xóa vĩnh viễn toàn bộ dữ liệu",
          "Mọi giao dịch, danh mục tùy chỉnh, số dư ví và cài đặt sẽ bị xóa sạch hoàn toàn. Hành động này không thể hoàn tác!",
          async () => {
            await DB.clear("transactions");
            await DB.clear("categories");
            await DB.clear("wallets");
            await DB.clear("settings");
            await DB.clear("recurring");
            await DB.clear("category_budgets");

            await seedDefaultData();
            await loadAllDataFromIndexedDB();
            showToast("Đã làm mới toàn bộ dữ liệu!");
          },
        );
      }
