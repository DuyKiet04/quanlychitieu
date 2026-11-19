      /* ==========================================================================
       10. SCREEN 5: CÀI ĐẶT & HỒ SƠ NGƯỜI DÙNG (PROFILE & SETTINGS CONTROLLER)
       ========================================================================== */
      function renderSettingsScreen() {
        const initBal = Number(State.settings.initial_balance) || 0;
        const budget = Number(State.settings.monthly_budget) || 15000000;

        const initBalEl = document.getElementById("settingsInitialBalanceText");
        if (initBalEl) initBalEl.textContent = formatVND(initBal);

        const budgetEl = document.getElementById("settingsBudgetText");
        if (budgetEl) budgetEl.textContent = formatVND(budget);

        updateStorageStatus();
        applyUserProfileSettings();

        const rawSlots = State.settings.bottom_nav_slots;
        const slots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? rawSlots
            : ["overview", "wallets", "analytics", "settings"];
        const activeCount = slots.filter(Boolean).length;
        const badge = document.getElementById("settingsNavCustomizerBadge");
        if (badge) badge.textContent = `${activeCount} / 4 tab`;
      }

      /* Helper: Render Avatar Elements (Photo or Initials/Preset) */
      function renderAvatarElement(el, avatarValue, userName) {
        if (!el) return;
        if (
          avatarValue &&
          (avatarValue.startsWith("data:image/") ||
            avatarValue.startsWith("http") ||
            avatarValue.startsWith("blob:"))
        ) {
          el.innerHTML = `<img src="${avatarValue}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
          el.style.background = "transparent";
          el.style.color = "inherit";
        } else {
          const preset = AVATAR_PRESETS.find((p) => p.id === avatarValue);
          const displayText = preset
            ? preset.text
            : avatarValue && avatarValue.length <= 4
              ? avatarValue
              : userName
                ? userName.trim().slice(0, 2).toUpperCase()
                : "FM";
          const bg = preset
            ? preset.bg
            : "linear-gradient(135deg, #0E3834 0%, #2DA87B 100%)";
          const color = preset ? preset.color : "#FFFFFF";

          el.innerHTML = displayText;
          el.style.background = bg;
          el.style.color = color;
        }
      }

      /* Synchronize User Profile Across Entire App */
      function applyUserProfileSettings() {
        const name = State.settings.user_name || "FinMaster";
        const title = State.settings.user_title || "Hồ sơ cá nhân";
        const avatar = State.settings.user_avatar || "FM";

        // 1. Header Greeting & Avatar (Header trang)
        const greetingEl = document.getElementById("headerGreeting");
        if (greetingEl) greetingEl.textContent = name;

        const headerAvatar = document.getElementById("userAvatar");
        if (headerAvatar) renderAvatarElement(headerAvatar, avatar, name);

        // 2. Sidebar Header Greeting & Avatar (ĐỒNG BỘ 100% VỚI HEADER TRANG)
        const sidebarGreeting = document.getElementById("sidebarHeaderGreeting");
        if (sidebarGreeting) sidebarGreeting.textContent = name;

        const sidebarAvatar = document.getElementById("sidebarUserAvatar");
        if (sidebarAvatar) renderAvatarElement(sidebarAvatar, avatar, name);

        // 3. Settings Screen Profile Hero Card
        const profileName = document.getElementById("settingsProfileName");
        if (profileName) profileName.textContent = name;

        const profileTitle = document.getElementById("settingsProfileTitle");
        if (profileTitle) profileTitle.textContent = title;

        const profileAvatar = document.getElementById("settingsProfileAvatar");
        if (profileAvatar) renderAvatarElement(profileAvatar, avatar, name);
      }

      function openUserProfileModal() {
        const modal = document.getElementById("userProfileModal");
        if (!modal) return;

        const nameInput = document.getElementById("userProfileNameInput");
        const titleInput = document.getElementById("userProfileTitleInput");

        const curName = State.settings.user_name || "FinMaster";
        const curTitle = State.settings.user_title || "Hồ sơ cá nhân";
        const curAvatar = State.settings.user_avatar || "FM";

        tempProfileAvatarData = curAvatar;

        if (nameInput) nameInput.value = curName;
        if (titleInput) titleInput.value = curTitle;

        updateModalAvatarPreview();
        renderAvatarPresetsList();

        modal.classList.add("active");
        lucide.createIcons();
      }

      function updateModalAvatarPreview() {
        const preview = document.getElementById("modalAvatarPreview");
        const removeBtn = document.getElementById("removeCustomAvatarBtn");
        const nameInput = document.getElementById("userProfileNameInput");
        const name = nameInput ? nameInput.value : "";

        renderAvatarElement(preview, tempProfileAvatarData, name);

        if (removeBtn) {
          const isCustomImg =
            tempProfileAvatarData &&
            (tempProfileAvatarData.startsWith("data:image/") ||
              tempProfileAvatarData.startsWith("http") ||
              tempProfileAvatarData.startsWith("blob:"));
          removeBtn.style.display = isCustomImg ? "inline-flex" : "none";
        }
      }

      function renderAvatarPresetsList() {
        const container = document.getElementById("avatarPresetsList");
        if (!container) return;
        container.innerHTML = "";

        AVATAR_PRESETS.forEach((p) => {
          const isSelected = tempProfileAvatarData === p.id;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "avatar-preset-btn" + (isSelected ? " active" : "");
          btn.style.background = p.bg;
          btn.style.color = p.color;
          btn.textContent = p.text;
          btn.title = `Biểu tượng ${p.text}`;

          btn.onclick = () => {
            tempProfileAvatarData = p.id;
            updateModalAvatarPreview();
            renderAvatarPresetsList();
          };

          container.appendChild(btn);
        });
      }

      async function handleUserAvatarFileChange(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
          showToast("Đang tối ưu ảnh đại diện...");
          const result = await compressImageFile(file);
          tempProfileAvatarData = result.dataUrl;
          updateModalAvatarPreview();
          renderAvatarPresetsList();
          showToast('Đã tải ảnh lên! Nhấn "Lưu hồ sơ" để hoàn tất.');
        } catch (err) {
          console.error("Lỗi tải ảnh avatar:", err);
          showToast("Không thể xử lý ảnh, vui lòng thử lại!", true);
        } finally {
          e.target.value = "";
        }
      }

      async function saveUserProfile() {
        const nameInput = document.getElementById("userProfileNameInput");
        const titleInput = document.getElementById("userProfileTitleInput");
        const nameVal = nameInput ? nameInput.value.trim() : "";
        const titleVal = titleInput ? titleInput.value.trim() : "";

        if (!nameVal) {
          showToast("Vui lòng nhập tên người dùng!", true);
          return;
        }

        const avatarVal = tempProfileAvatarData || "FM";

        State.settings.user_name = nameVal;
        State.settings.user_title = titleVal || "Quản lý tài khoản & Thiết lập";
        State.settings.user_avatar = avatarVal;

        await DB.put("settings", { key: "user_name", value: nameVal });
        await DB.put("settings", {
          key: "user_title",
          value: titleVal || "Quản lý tài khoản & Thiết lập",
        });
        await DB.put("settings", { key: "user_avatar", value: avatarVal });

        const modal = document.getElementById("userProfileModal");
        if (modal) modal.classList.remove("active");

        applyUserProfileSettings();
        showToast("Cập nhật hồ sơ thành công!");
      }

      /* ==========================================================================
       10B. DYNAMIC FLOATING BOTTOM NAVIGATION & CUSTOMIZER
       ========================================================================== */
      function renderBottomNavigationTabs() {
        const container = document.getElementById("bottomNavItemsGrid");
        if (!container) return;

        const rawSlots = State.settings.bottom_nav_slots;
        const slots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? rawSlots
            : ["overview", "wallets", "analytics", "settings"];

        let html = "";

        const renderTab = (pageId, idx) => {
          if (!pageId) {
            return `
            <button class="nav-item empty-slot" data-slot="${idx}" onclick="openNavSlotPickerModal(${idx})" title="Vị trí trống - Chạm để thêm trang">
              <div class="nav-icon-wrap" style="opacity: 0.45; border: 1.5px dashed var(--border-card); border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
                <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
              </div>
              <span class="nav-label" style="opacity: 0.5;">+ Thêm</span>
            </button>
          `;
          }

          const page =
            ALL_APP_PAGES.find((p) => p.id === pageId) || ALL_APP_PAGES[0];
          const isActive =
            State.activeTab === page.id ||
            (page.id === "analytics" &&
              State.activeTab === "calendar" &&
              !slots.includes("calendar")) ||
            (page.id === "settings" &&
              (State.activeTab === "work" ||
                State.activeTab === "nav-customizer" ||
                State.activeTab === "budgets" ||
                State.activeTab === "categories" ||
                State.activeTab === "recurring") &&
              !slots.includes(State.activeTab));

          return `
          <button class="nav-item ${isActive ? "active" : ""}" data-tab="${page.id}" data-slot="${idx}" onclick="handleNavTabClick('${page.id}')" title="${page.name}">
            <div class="nav-icon-wrap">
              ${page.svg}
            </div>
            <span class="nav-label">${page.label}</span>
          </button>
        `;
        };

        // Slot 0 & 1 (Trái)
        html += renderTab(slots[0], 0);
        html += renderTab(slots[1], 1);

        // Khối đệm trung tâm cho nút dấu + nổi bật
        html += `<div class="nav-center-spacer" aria-hidden="true"></div>`;

        // Slot 2 & 3 (Phải)
        html += renderTab(slots[2], 2);
        html += renderTab(slots[3], 3);

        container.innerHTML = html;
        lucide.createIcons();
      }

      function handleNavTabClick(pageId) {
        if (pageId === "calendar") {
          State.analyticsViewMode = "calendar";
          switchActiveScreen("analytics");
          document
            .getElementById("analyticsViewModeChartsBtn")
            ?.classList.remove("active");
          document
            .getElementById("analyticsViewModeCalendarBtn")
            ?.classList.add("active");
          const chartsView = document.getElementById("analyticsChartsView");
          const calView = document.getElementById("analyticsCalendarView");
          if (chartsView) chartsView.style.display = "none";
          if (calView) calView.style.display = "block";
          renderFinancialCalendar();
        } else {
          switchActiveScreen(pageId);
        }
      }

      /* Render Nav Customizer View in its dedicated sub-screen */
      function renderBottomNavCustomizer() {
        const container = document.getElementById(
          "navCustomizerSlotsContainer",
        );
        const allPagesContainer = document.getElementById(
          "navCustomizerAllPagesList",
        );
        const badge = document.getElementById("settingsNavCustomizerBadge");

        const rawSlots = State.settings.bottom_nav_slots;
        const slots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? rawSlots
            : ["overview", "wallets", "analytics", "settings"];

        const activeCount = slots.filter(Boolean).length;
        if (badge) badge.textContent = `${activeCount} / 4 tab`;

        if (container) {
          let html = "";

          const renderCustomizerSlot = (pageId, idx) => {
            if (!pageId) {
              // Hiển thị icon dấu + bấm vào thì thêm trang
              return `
              <div class="nav-customizer-slot empty-slot" onclick="openNavSlotPickerModal(${idx})" title="Chạm để thêm trang vào vị trí này">
                <button type="button" class="nav-slot-add-btn">
                  <i data-lucide="plus" style="width: 20px; height: 20px;"></i>
                  <span>Thêm</span>
                </button>
              </div>
            `;
            }

            const page = ALL_APP_PAGES.find((p) => p.id === pageId) || {
              label: pageId,
              name: pageId,
              icon: "file",
              color: "#10B981",
            };

            // Hiển thị icon trang và dấu X ở góc trên để bấm vào xóa/ẩn icon trang
            return `
            <div class="nav-customizer-slot">
              <button type="button" class="nav-slot-remove-btn" onclick="removeNavSlot(${idx})" title="Gỡ ${page.name} khỏi thanh điều hướng">
                ✕
              </button>
              <div style="width: 28px; height: 28px; border-radius: 8px; background: ${page.color}15; color: ${page.color}; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="${page.icon}" style="width: 16px; height: 16px;"></i>
              </div>
              <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${page.label}</span>
            </div>
          `;
          };

          // Slot 0 & 1
          html += renderCustomizerSlot(slots[0], 0);
          html += renderCustomizerSlot(slots[1], 1);

          // Điểm trung tâm đại diện cho nút + trên thanh điều hướng
          html += `
          <div class="nav-customizer-center-dot" title="Nút trung tâm (+)">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          </div>
        `;

          // Slot 2 & 3
          html += renderCustomizerSlot(slots[2], 2);
          html += renderCustomizerSlot(slots[3], 3);

          container.innerHTML = html;
        }

        // Render danh sách 8 trang trong ứng dụng trên trang Tùy biến
        if (allPagesContainer) {
          allPagesContainer.innerHTML = "";
          ALL_APP_PAGES.forEach((page) => {
            const assignedIdx = slots.indexOf(page.id);
            const isAssigned = assignedIdx !== -1;

            const row = document.createElement("div");
            row.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: var(--bg-card-subtle);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-sm);
            gap: 10px;
          `;

            row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: ${page.color}15; color: ${page.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${page.icon}" style="width: 16px; height: 16px;"></i>
              </div>
              <div style="min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.84rem; font-weight: 700; color: var(--text-primary);">${page.name}</span>
                  <span style="font-size: 0.65rem; font-weight: 700; background: var(--bg-card); color: var(--text-secondary); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border-subtle);">${page.label}</span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${page.desc}
                </div>
              </div>
            </div>
            <div style="flex-shrink: 0;">
              ${
                isAssigned
                  ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.68rem; font-weight: 800; color: var(--mint); background: var(--bg-card); padding: 3px 8px; border-radius: 99px; border: 1px solid var(--border-subtle);">
                    Tab ${assignedIdx + 1}
                  </span>
                  <button type="button" class="btn-icon-subtle" onclick="removeNavSlot(${assignedIdx})" title="Gỡ khỏi tab" style="width: 26px; height: 26px; border-radius: 50%; color: var(--expense); background: var(--expense-bg); border: none; font-size: 11px; font-weight: 800; cursor: pointer;">
                    ✕
                  </button>
                </div>
              `
                  : `
                <button type="button" onclick="quickAssignFirstEmptyNavSlot('${page.id}')" style="padding: 5px 12px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                  <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Ghim
                </button>
              `
              }
            </div>
          `;

            allPagesContainer.appendChild(row);
          });
        }

        lucide.createIcons();
      }

      async function quickAssignFirstEmptyNavSlot(pageId) {
        const rawSlots = State.settings.bottom_nav_slots;
        const slots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? [...rawSlots]
            : ["overview", "wallets", "analytics", "settings"];

        const emptyIdx = slots.indexOf(null);
        if (emptyIdx !== -1) {
          await assignNavSlot(emptyIdx, pageId);
        } else {
          showToast("Cả 4 vị trí đã đầy! Chọn một vị trí để thay thế.", true);
          openNavSlotPickerModal(0);
        }
      }

      /* Gỡ trang khỏi thanh điều hướng (Thế bằng dấu +) */
      async function removeNavSlot(slotIdx) {
        const rawSlots = State.settings.bottom_nav_slots;
        const slots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? [...rawSlots]
            : ["overview", "wallets", "analytics", "settings"];

        const removedId = slots[slotIdx];
        const page = ALL_APP_PAGES.find((p) => p.id === removedId);

        slots[slotIdx] = null;
        State.settings.bottom_nav_slots = slots;
        await DB.put("settings", { key: "bottom_nav_slots", value: slots });

        renderBottomNavCustomizer();
        renderBottomNavigationTabs();
        showToast(`Đã gỡ ${page ? page.name : "trang"} khỏi thanh điều hướng!`);
      }

      /* Mở modal chọn trang gán vào slot */
      function openNavSlotPickerModal(slotIdx) {
        currentSlotPickerIdx = slotIdx;
        const modal = document.getElementById("navSlotPickerModal");
        const title = document.getElementById("navSlotPickerTitle");
        const list = document.getElementById("navSlotPickerList");
        if (!modal || !list) return;

        const slotNames = [
          "Vị trí 1 (Trái cùng)",
          "Vị trí 2 (Cạnh trái)",
          "Vị trí 3 (Cạnh phải)",
          "Vị trí 4 (Phải cùng)",
        ];
        if (title)
          title.textContent = `Ghim trang vào ${slotNames[slotIdx] || `Vị trí ${slotIdx + 1}`}`;

        const rawSlots = State.settings.bottom_nav_slots;
        const currentSlots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? rawSlots
            : ["overview", "wallets", "analytics", "settings"];

        list.innerHTML = "";
        ALL_APP_PAGES.forEach((page) => {
          const isAlreadyInNav = currentSlots.includes(page.id);
          const assignedIdx = currentSlots.indexOf(page.id);
          const isCurrentSlot = assignedIdx === slotIdx;

          const card = document.createElement("div");
          card.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          margin-bottom: 8px;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s ease;
        `;

          card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${page.color}15; color: ${page.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i data-lucide="${page.icon}" style="width: 18px; height: 18px;"></i>
            </div>
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">${page.name}</span>
                <span style="font-size: 0.65rem; font-weight: 700; background: var(--bg-card); color: var(--text-secondary); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-subtle);">${page.label}</span>
              </div>
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${page.desc}
              </div>
            </div>
          </div>
          <div style="margin-left: 10px; flex-shrink: 0;">
            ${
              isCurrentSlot
                ? `
              <span style="font-size: 0.72rem; font-weight: 800; color: var(--mint); display: inline-flex; align-items: center; gap: 3px;">
                <i data-lucide="check" style="width: 14px; height: 14px;"></i> Đang chọn
              </span>
            `
                : isAlreadyInNav
                  ? `
              <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); background: var(--bg-card); padding: 3px 8px; border-radius: 99px;">
                Đã ghim vị trí ${assignedIdx + 1}
              </span>
            `
                  : `
              <button type="button" style="padding: 6px 14px; border-radius: 99px; background: var(--primary); color: #fff; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                Ghim vào
              </button>
            `
            }
          </div>
        `;

          card.onclick = () => assignNavSlot(slotIdx, page.id);
          list.appendChild(card);
        });

        modal.classList.add("active");
        lucide.createIcons();
      }

      /* Gán trang vào slot */
      async function assignNavSlot(slotIdx, pageId) {
        const rawSlots = State.settings.bottom_nav_slots;
        const slots =
          Array.isArray(rawSlots) && rawSlots.length === 4
            ? [...rawSlots]
            : ["overview", "wallets", "analytics", "settings"];

        // Nếu trang này đang ở slot khác, chuyển slot đó thành null để tránh trùng
        const oldIdx = slots.indexOf(pageId);
        if (oldIdx !== -1 && oldIdx !== slotIdx) {
          slots[oldIdx] = null;
        }

        slots[slotIdx] = pageId;
        State.settings.bottom_nav_slots = slots;
        await DB.put("settings", { key: "bottom_nav_slots", value: slots });

        const modal = document.getElementById("navSlotPickerModal");
        if (modal) modal.classList.remove("active");

        renderBottomNavCustomizer();
        renderBottomNavigationTabs();

        const page = ALL_APP_PAGES.find((p) => p.id === pageId);
        showToast(
          `Đã ghim ${page ? page.name : "trang"} vào thanh điều hướng!`,
        );
      }

      /* Khôi phục thanh điều hướng về mặc định */
      async function resetBottomNavSlots() {
        const defaultSlots = ["overview", "wallets", "analytics", "settings"];
        State.settings.bottom_nav_slots = defaultSlots;
        await DB.put("settings", {
          key: "bottom_nav_slots",
          value: defaultSlots,
        });

        renderBottomNavCustomizer();
        renderBottomNavigationTabs();
        showToast("Đã khôi phục thanh điều hướng mặc định!");
      }

      /* Wallet Management & Form Handlers */
      let selectedWalletColor = "#34D399";
      let selectedWalletIcon = "landmark";

      function initWalletModalControls(chosenColor, chosenIcon) {
        selectedWalletColor = chosenColor || "#34D399";
        selectedWalletIcon = chosenIcon || "landmark";

        // 1. Color Palette
        const palette = document.getElementById("walletColorPalette");
        if (palette) {
          palette.innerHTML = "";
          COLOR_PALETTE.forEach((c) => {
            const dot = document.createElement("div");
            dot.style.cssText = `width: 32px; height: 32px; border-radius: 50%; background-color: ${c}; cursor: pointer; transition: transform 0.15s ease;`;
            dot.style.border =
              c.toLowerCase() === selectedWalletColor.toLowerCase()
                ? "3px solid var(--text-primary)"
                : "2px solid transparent";
            if (c.toLowerCase() === selectedWalletColor.toLowerCase())
              dot.style.transform = "scale(1.15)";

            dot.onclick = () => {
              selectedWalletColor = c;
              palette.querySelectorAll("div").forEach((d) => {
                d.style.border = "2px solid transparent";
                d.style.transform = "scale(1)";
              });
              dot.style.border = "3px solid var(--text-primary)";
              dot.style.transform = "scale(1.15)";
            };
            palette.appendChild(dot);
          });
        }

        // 2. Icon Picker
        const iconPicker = document.getElementById("walletIconPicker");
        if (iconPicker) {
          iconPicker.innerHTML = "";
          const WALLET_ICONS = [
            "landmark",
            "wallet",
            "banknote",
            "credit-card",
            "smartphone",
            "piggy-bank",
            "coins",
            "dollar-sign",
            "shield-check",
            "briefcase",
            "receipt",
            "shopping-bag",
          ];
          WALLET_ICONS.forEach((ic) => {
            const item = document.createElement("div");
            item.style.cssText =
              "padding: 10px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease;";
            const isSelected = ic === selectedWalletIcon;
            item.style.background = isSelected
              ? "var(--primary)"
              : "var(--bg-card-subtle)";
            item.style.color = isSelected ? "#FFFFFF" : "var(--text-secondary)";
            item.style.border = isSelected
              ? "1px solid var(--primary)"
              : "1px solid var(--border-card)";

            item.innerHTML = `<i data-lucide="${ic}" style="width: 20px; height: 20px;"></i>`;

            item.onclick = () => {
              selectedWalletIcon = ic;
              iconPicker.querySelectorAll("div").forEach((d) => {
                d.style.background = "var(--bg-card-subtle)";
                d.style.color = "var(--text-secondary)";
                d.style.border = "1px solid var(--border-card)";
              });
              item.style.background = "var(--primary)";
              item.style.color = "#FFFFFF";
              item.style.border = "1px solid var(--primary)";
            };
            iconPicker.appendChild(item);
          });
        }
        lucide.createIcons();
      }

      function openAddWalletModal() {
        const modal = document.getElementById("walletFormModal");
        if (!modal) return;

        document.getElementById("walletFormTitle").textContent =
          "Thêm ví tài khoản mới";
        document.getElementById("walletFormEditId").value = "";
        document.getElementById("walletFormName").value = "";
        document.getElementById("walletFormType").value = "bank";
        document.getElementById("walletFormInitialBalance").value = "0";
        document.getElementById("walletFormIsDefault").checked =
          State.wallets.length === 0;

        initWalletModalControls("#34D399", "landmark");
        modal.classList.add("active");
        lucide.createIcons();
      }

      function openEditWalletModal(walletId) {
        const w = State.wallets.find((x) => x.id === walletId);
        if (!w) return;

        const modal = document.getElementById("walletFormModal");
        if (!modal) return;

        document.getElementById("walletFormTitle").textContent =
          `Chỉnh sửa ví: ${w.name}`;
        document.getElementById("walletFormEditId").value = w.id;
        document.getElementById("walletFormName").value = w.name;
        document.getElementById("walletFormType").value = w.type || "bank";
        document.getElementById("walletFormInitialBalance").value =
          formatNumberOnly(w.initialBalance || 0);
        document.getElementById("walletFormIsDefault").checked = !!w.isDefault;

        initWalletModalControls(w.color || "#34D399", w.icon || "landmark");
        modal.classList.add("active");
        lucide.createIcons();
      }

      async function saveWalletFromForm() {
        const name = document.getElementById("walletFormName").value.trim();
        if (!name) {
          showToast("Vui lòng nhập tên ví!", true);
          return;
        }

        const editId = document.getElementById("walletFormEditId").value;
        const type = document.getElementById("walletFormType").value;
        const initBal =
          parseVNDInput(
            document.getElementById("walletFormInitialBalance").value,
          ) || 0;
        const isDefault = document.getElementById(
          "walletFormIsDefault",
        ).checked;

        // Nếu ví này được đặt làm mặc định -> Bỏ mặc định các ví khác
        if (isDefault) {
          for (const w of State.wallets) {
            if (w.id !== editId && w.isDefault) {
              w.isDefault = false;
              await DB.put("wallets", w);
            }
          }
        }

        if (editId) {
          // Cập nhật ví hiện có
          const idx = State.wallets.findIndex((x) => x.id === editId);
          if (idx !== -1) {
            State.wallets[idx].name = name;
            State.wallets[idx].type = type;
            State.wallets[idx].initialBalance = initBal;
            State.wallets[idx].color = selectedWalletColor;
            State.wallets[idx].icon = selectedWalletIcon;
            State.wallets[idx].isDefault = isDefault;

            await DB.put("wallets", State.wallets[idx]);
            showToast("Đã cập nhật thông tin ví!");
          }
        } else {
          // Tạo ví mới
          const newWallet = {
            id: "w_" + Date.now(),
            name: name,
            type: type,
            initialBalance: initBal,
            icon: selectedWalletIcon,
            color: selectedWalletColor,
            isDefault: isDefault || State.wallets.length === 0,
          };
          await DB.put("wallets", newWallet);
          State.wallets.push(newWallet);
          showToast("Đã tạo ví mới thành công!");
        }

        document.getElementById("walletFormModal").classList.remove("active");
        populateWalletOptions();
        renderAllScreens();
      }

      async function deleteWalletPrompt(walletId) {
        const w = State.wallets.find((x) => x.id === walletId);
        if (!w) return;

        if (State.wallets.length <= 1) {
          showToast("Bạn phải giữ lại ít nhất 1 ví tài khoản!", true);
          return;
        }

        if (w.isDefault) {
          showToast(
            "Không thể xóa ví mặc định! Hãy đặt ví khác làm mặc định trước.",
            true,
          );
          return;
        }

        const usedTxs = State.transactions.filter(
          (t) =>
            t.walletId === walletId ||
            t.fromWalletId === walletId ||
            t.toWalletId === walletId,
        );
        const defaultWallet =
          State.wallets.find((x) => x.isDefault && x.id !== walletId) ||
          State.wallets.find((x) => x.id !== walletId);

        if (usedTxs.length > 0) {
          showConfirmDialog(
            "Xóa ví: " + w.name,
            `Ví này đang liên kết với ${usedTxs.length} giao dịch. Nếu xóa, các giao dịch này sẽ tự động chuyển sang ví "${defaultWallet.name}". Bạn có chắc chắn muốn xóa không?`,
            async () => {
              // Chuyển giao dịch sang ví mặc định
              for (const tx of usedTxs) {
                let changed = false;
                if (tx.walletId === walletId) {
                  tx.walletId = defaultWallet.id;
                  changed = true;
                }
                if (tx.fromWalletId === walletId) {
                  tx.fromWalletId = defaultWallet.id;
                  changed = true;
                }
                if (tx.toWalletId === walletId) {
                  tx.toWalletId = defaultWallet.id;
                  changed = true;
                }
                if (changed) await DB.put("transactions", tx);
              }

              await DB.delete("wallets", walletId);
              State.wallets = State.wallets.filter((x) => x.id !== walletId);

              populateWalletOptions();
              renderAllScreens();
              renderWalletList();
              showToast(`Đã xóa ví "${w.name}" và chuyển giao dịch an toàn!`);
            },
          );
        } else {
          showConfirmDialog(
            "Xóa ví tài khoản",
            `Bạn có chắc chắn muốn xóa ví "${w.name}" không?`,
            async () => {
              await DB.delete("wallets", walletId);
              State.wallets = State.wallets.filter((x) => x.id !== walletId);

              populateWalletOptions();
              renderAllScreens();
              renderWalletList();
              showToast(`Đã xóa ví "${w.name}" thành công!`);
            },
          );
        }
      }

      window.deleteWalletItem = deleteWalletPrompt;

      function openWalletManagerModal() {
        renderWalletList();
        document.getElementById("walletManageModal").classList.add("active");
        lucide.createIcons();
      }

      function renderWalletList() {
        const container = document.getElementById("walletListContainer");
        if (!container) return;
        container.innerHTML = "";
        const { walletBalances } = calculateFinancialBalances();

        State.wallets.forEach((w) => {
          const bal = walletBalances[w.id] || 0;
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.padding = "12px 14px";
          row.style.background = "var(--bg-card-subtle)";
          row.style.borderRadius = "var(--radius-md)";
          row.style.border = "1px solid var(--border-card)";

          row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${w.color || "#60A5FA"}20; color: ${w.color || "#60A5FA"}; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="${w.icon || "wallet"}" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.9rem; font-weight: 700;">${w.name}</span>
                ${w.isDefault ? '<span class="tx-badge" style="background: rgba(45,212,191,0.14); color: var(--mint); font-size: 0.65rem;">Mặc định</span>' : ""}
              </div>
              <div style="font-size: 0.76rem; color: var(--text-secondary);">${formatVND(bal)}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn-icon-subtle" onclick="document.getElementById('walletManageModal').classList.remove('active'); openEditWalletModal('${w.id}');" title="Chỉnh sửa" style="color: #2563EB; width: 34px; height: 34px;">
              <i data-lucide="pencil" style="width: 15px; height: 15px;"></i>
            </button>
            ${
              !w.isDefault
                ? `
              <button class="btn-icon-subtle" onclick="deleteWalletPrompt('${w.id}')" title="Xóa" style="color: var(--expense); width: 34px; height: 34px;">
                <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
              </button>
            `
                : ""
            }
          </div>
        `;
          container.appendChild(row);
        });
        lucide.createIcons();
      }

      function populateWalletOptions() {
        const select = document.getElementById("wizardWalletSelect");
        const fromSel = document.getElementById("transferFromWalletSelect");
        const toSel = document.getElementById("transferToWalletSelect");

        if (!select) return;
        select.innerHTML = "";
        if (fromSel) fromSel.innerHTML = "";
        if (toSel) toSel.innerHTML = "";

        const { walletBalances } = calculateFinancialBalances();

        State.wallets.forEach((w) => {
          const bal = walletBalances[w.id] || 0;
          const opt = document.createElement("option");
          opt.value = w.id;
          opt.textContent = `${w.name} (${formatVND(bal)})`;
          select.appendChild(opt);

          if (fromSel) {
            const optF = document.createElement("option");
            optF.value = w.id;
            optF.textContent = `${w.name} (${formatVND(bal)})`;
            fromSel.appendChild(optF);
          }

          if (toSel) {
            const optT = document.createElement("option");
            optT.value = w.id;
            optT.textContent = `${w.name} (${formatVND(bal)})`;
            toSel.appendChild(optT);
          }
        });
      }

      /* Wallet Transfer Modal Handler */
      function openTransferModal() {
        populateWalletOptions();
        document.getElementById("transferAmountInput").value = "";
        document.getElementById("transferDateInput").value = getTodayString();
        document.getElementById("transferNoteInput").value = "";
        document.getElementById("transferModal").classList.add("active");
      }

      async function executeWalletTransfer() {
        const fromId = document.getElementById(
          "transferFromWalletSelect",
        ).value;
        const toId = document.getElementById("transferToWalletSelect").value;
        const amt = parseVNDInput(
          document.getElementById("transferAmountInput").value,
        );
        const dateVal =
          document.getElementById("transferDateInput").value ||
          getTodayString();
        const noteVal = document
          .getElementById("transferNoteInput")
          .value.trim();

        if (fromId === toId) {
          showToast("Ví nguồn và ví đích không được trùng nhau!", true);
          return;
        }
        if (amt <= 0) {
          showToast("Số tiền chuyển phải lớn hơn 0!", true);
          return;
        }

        const txRecord = {
          id: "tx_tf_" + Date.now(),
          type: "transfer",
          amount: amt,
          fromWalletId: fromId,
          toWalletId: toId,
          date: dateVal,
          note: noteVal || "Chuyển tiền nội bộ",
          createdAt: Date.now(),
        };

        await DB.put("transactions", txRecord);
        State.transactions.unshift(txRecord);

        document.getElementById("transferModal").classList.remove("active");
        showToast("Chuyển tiền giữa các ví thành công!");
        populateWalletOptions();
        renderAllScreens();
      }
