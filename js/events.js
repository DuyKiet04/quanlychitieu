      /* ==========================================================================
       SIDEBAR DRAWER CONTROLLER
       ========================================================================== */
      function openSidebar() {
        const overlay = document.getElementById("appSidebarOverlay");
        if (!overlay) return;
        overlay.classList.add("active");

        // Cập nhật thông tin nhanh trên Sidebar
        const { currentAvailableBalance } = calculateFinancialBalances();
        const userBalanceEl = document.getElementById("sidebarUserBalance");
        if (userBalanceEl) {
          userBalanceEl.textContent = State.isBalanceHidden
            ? "•••••• ₫"
            : formatVND(currentAvailableBalance);
        }

        const walletsBadge = document.getElementById("sidebarWalletsBadge");
        if (walletsBadge)
          walletsBadge.textContent = `${State.wallets.length} ví`;

        const txBadge = document.getElementById("sidebarTxCountBadge");
        if (txBadge) txBadge.textContent = `${State.transactions.length} GD`;

        // Cập nhật active state cho menu item
        document.querySelectorAll(".sidebar-nav-item").forEach((btn) => {
          const snav = btn.dataset.snav;
          const isActive =
            snav === State.activeTab ||
            (snav === "settings" &&
              (State.activeTab === "nav-customizer" ||
                State.activeTab === "budgets" ||
                State.activeTab === "categories" ||
                State.activeTab === "recurring"));
          btn.classList.toggle("active", isActive);
        });

        lucide.createIcons();
      }

      function closeSidebar() {
        const overlay = document.getElementById("appSidebarOverlay");
        if (overlay) overlay.classList.remove("active");
      }

      /* Screen Tab Navigation (Hiện từ PHẢI SANG TRÁI chuẩn iOS Push Transition) */
      function switchActiveScreen(tabName) {
        if (typeof triggerHaptic === "function") triggerHaptic("light");
        if (typeof closeCurrentSwipe === "function") closeCurrentSwipe();
        if (typeof closeCurrentWalletSwipe === "function")
          closeCurrentWalletSwipe();
        if (typeof closeCurrentBudgetSwipe === "function")
          closeCurrentBudgetSwipe();
        if (typeof closeCurrentCategorySwipe === "function")
          closeCurrentCategorySwipe();
        if (typeof closeCurrentRecurringSwipe === "function")
          closeCurrentRecurringSwipe();
        if (
          document
            .getElementById("txWizardOverlay")
            ?.classList.contains("active")
        ) {
          closeTransactionWizard();
        }
        State.activeTab = tabName;
        const navSlots = State.settings.bottom_nav_slots || [
          "overview",
          "wallets",
          "analytics",
          "settings",
        ];
        document
          .querySelectorAll("#bottomNavItemsGrid .nav-item")
          .forEach((btn) => {
            const t = btn.dataset.tab;
            const isActive =
              t === tabName ||
              (t === "analytics" &&
                tabName === "calendar" &&
                !navSlots.includes("calendar")) ||
              (t === "settings" &&
                (tabName === "work" ||
                  tabName === "nav-customizer" ||
                  tabName === "budgets" ||
                  tabName === "categories" ||
                  tabName === "recurring") &&
                !navSlots.includes(tabName));
            btn.classList.toggle("active", isActive);
          });

        // Cập nhật trạng thái nút Sidebar
        document.querySelectorAll(".sidebar-nav-item").forEach((btn) => {
          const snav = btn.dataset.snav;
          const isActive =
            snav === tabName ||
            (snav === "settings" &&
              (tabName === "nav-customizer" ||
                tabName === "budgets" ||
                tabName === "categories" ||
                tabName === "recurring"));
          btn.classList.toggle("active", isActive);
        });

        // Chuyển màn hình với animation trượt từ PHẢI SANG TRÁI (Slide in from Right to Left)
        document.querySelectorAll(".screen-view").forEach((screen) => {
          if (screen.id === `screen-${tabName}`) {
            screen.classList.add("active");
            if (window.anime) {
              anime({
                targets: screen,
                opacity: [0, 1],
                translateX: [50, 0], // Hiện từ phải sang trái
                duration: 280,
                easing: "easeOutQuad",
              });
            }
          } else {
            screen.classList.remove("active");
          }
        });

        // Tự động cuộn lên đầu màn hình
        const scrollContainer = document.querySelector(".main-scroll-view");
        if (scrollContainer)
          scrollContainer.scrollTo({ top: 0, behavior: "instant" });

        if (tabName === "overview") {
          renderOverviewScreen();
          setTimeout(() => {
            if (overviewMiniMap) overviewMiniMap.invalidateSize();
          }, 300);
        } else if (tabName === "wallets") renderWalletsScreen();
        else if (tabName === "transactions") renderTransactionsScreen();
        else if (tabName === "analytics") renderAnalyticsScreen();
        else if (tabName === "calendar") renderFinancialCalendar();
        else if (tabName === "work") renderWorkFinanceScreen();
        else if (tabName === "settings") renderSettingsScreen();
        else if (tabName === "nav-customizer") renderBottomNavCustomizer();
        else if (tabName === "budgets") renderBudgetsScreen();
        else if (tabName === "categories") renderCategoriesScreen();
        else if (tabName === "recurring") renderRecurringScreen();
        else if (tabName === "journal") renderJournalScreen();
        else if (tabName === "savings") renderSavingsGoalsScreen();
        else if (tabName === "map") {
          renderSpendingMapScreen();
          setTimeout(() => {
            if (spendingMap) {
              spendingMap.invalidateSize();
            }
          }, 150);
        }

        // HIỆU ỨNG LANDING PAGE: TỪNG THẺ HIỆN DẦN LÊN (STAGGERED FADE-UP)
        const activeScreenEl = document.getElementById(`screen-${tabName}`);
        if (activeScreenEl && window.anime) {
          setTimeout(() => {
            const cards = activeScreenEl.querySelectorAll(
              ".editorial-card, .hero-balance-card, .wallet-card-item, .tx-card-item, .bento-stat-card, .journal-card, .savings-card, .cat-item-swipe-wrapper, .budget-swipe-wrapper, .recurring-swipe-wrapper, .settings-group-card, .map-tx-mini-card",
            );
            if (cards.length > 0) {
              anime({
                targets: cards,
                opacity: [0, 1],
                translateY: [14, 0],
                delay: anime.stagger(38),
                duration: 360,
                easing: "easeOutCubic",
              });
            }
          }, 60);
        }

        lucide.createIcons();
      }

      /* ==========================================================================
       13. SEEDING & DATA INITIALIZATION
       ========================================================================== */
      async function seedDefaultData() {
        const existingCats = await DB.getAll("categories");
        if (existingCats.length === 0) {
          for (const cat of DEFAULT_CATEGORIES) await DB.put("categories", cat);
        }

        const existingWallets = await DB.getAll("wallets");
        if (existingWallets.length === 0) {
          for (const w of DEFAULT_WALLETS) await DB.put("wallets", w);
        }

        const existingRec = await DB.getAll("recurring");
        if (existingRec.length === 0) {
          for (const r of DEFAULT_RECURRING) await DB.put("recurring", r);
        }

        const existingTxs = await DB.getAll("transactions");
        if (existingTxs.length === 0) {
          const todayStr = getTodayString();
          const sampleTxs = [
            {
              id: "tx_seed_1",
              amount: 45000,
              type: "expense",
              categoryId: "c_coffee",
              walletId: "w_cash",
              date: todayStr,
              note: "Cà phê sáng cùng bạn bè",
              isWork: false,
              location: {
                address: "Đường Nguyễn Huệ, Phường Bến Nghé",
                lat: 10.7744,
                lng: 106.7027,
              },
              createdAt: Date.now() - 3600000,
            },
            {
              id: "tx_seed_2",
              amount: 180000,
              type: "expense",
              categoryId: "c_work_exp",
              walletId: "w_bank",
              date: todayStr,
              note: "Tiếp khách bàn hợp đồng dự án",
              isWork: true,
              location: {
                address: "Đường Lê Duẩn, Phường Bến Nghé",
                lat: 10.7828,
                lng: 106.6993,
              },
              createdAt: Date.now() - 7200000,
            },
            {
              id: "tx_seed_3",
              amount: 320000,
              type: "expense",
              categoryId: "c_food",
              walletId: "w_bank",
              date: todayStr,
              note: "Ăn tối cùng gia đình Landmark 81",
              isWork: false,
              location: {
                address: "Landmark 81, Phường 22, Bình Thạnh",
                lat: 10.795,
                lng: 106.7218,
              },
              createdAt: Date.now() - 10800000,
            },
            {
              id: "tx_seed_4",
              amount: 85000,
              type: "expense",
              categoryId: "c_shop",
              walletId: "w_ewallet",
              date: todayStr,
              note: "Mua sách nghệ thuật Thảo Điền",
              isWork: false,
              location: {
                address: "Đường Thảo Điền, TP. Thủ Đức",
                lat: 10.8035,
                lng: 106.736,
              },
              createdAt: Date.now() - 14400000,
            },
            {
              id: "tx_seed_5",
              amount: 65000,
              type: "expense",
              categoryId: "c_coffee",
              walletId: "w_cash",
              date: todayStr,
              note: "Trà sữa gặp bạn Hồ Con Rùa",
              isWork: false,
              location: {
                address: "Hồ Con Rùa, Phường Võ Thị Sáu, Quận 3",
                lat: 10.7826,
                lng: 106.6961,
              },
              createdAt: Date.now() - 18000000,
            },
          ];
          for (const t of sampleTxs) await DB.put("transactions", t);
        }

        const initBalSetting = await DB.get("settings", "initial_balance");
        if (!initBalSetting) {
          await DB.put("settings", { key: "initial_balance", value: 0 });
          await DB.put("settings", {
            key: "initial_balance_date",
            value: getTodayString(),
          });
          await DB.put("settings", { key: "monthly_budget", value: 15000000 });
          await DB.put("settings", { key: "dark_mode", value: false });
          await DB.put("settings", { key: "hide_balance", value: false });
        }

        const userNameSetting = await DB.get("settings", "user_name");
        if (!userNameSetting) {
          await DB.put("settings", {
            key: "user_name",
            value: "FinMaster User",
          });
          await DB.put("settings", {
            key: "user_title",
            value: "Quản lý tài khoản & Thiết lập",
          });
          await DB.put("settings", { key: "user_avatar", value: "FM" });
          await DB.put("settings", {
            key: "bottom_nav_slots",
            value: ["overview", "wallets", "analytics", "settings"],
          });
        }
      }

      async function loadAllDataFromIndexedDB() {
        State.transactions = await DB.getAll("transactions");
        State.categories = await DB.getAll("categories");
        State.wallets = await DB.getAll("wallets");
        State.recurring = await DB.getAll("recurring");
        State.journals = (await DB.getAll("journals")) || [];
        State.savingsGoals = (await DB.getAll("savings_goals")) || [];

        const settingsArr = await DB.getAll("settings");
        State.settings = {};
        settingsArr.forEach((s) => (State.settings[s.key] = s.value));

        const catBudgetsArr = await DB.getAll("category_budgets");
        State.categoryBudgets = {};
        catBudgetsArr.forEach(
          (b) => (State.categoryBudgets[b.categoryId] = b.amount),
        );

        // User Profile & Bottom Nav Defaults
        if (!State.settings.user_name)
          State.settings.user_name = "FinMaster User";
        if (!State.settings.user_title)
          State.settings.user_title = "Quản lý tài khoản & Thiết lập";
        if (!State.settings.user_avatar) State.settings.user_avatar = "FM";
        if (
          !State.settings.bottom_nav_slots ||
          !Array.isArray(State.settings.bottom_nav_slots)
        ) {
          State.settings.bottom_nav_slots = [
            "overview",
            "wallets",
            "analytics",
            "settings",
          ];
        }

        // Apply Dark Mode Setting
        if (State.settings.dark_mode) {
          document.documentElement.setAttribute("data-theme", "dark");
          const sw = document.getElementById("darkModeSwitch");
          if (sw) sw.checked = true;
          document
            .getElementById("themeIcon")
            ?.setAttribute("data-lucide", "sun");
        } else {
          document.documentElement.removeAttribute("data-theme");
          const sw = document.getElementById("darkModeSwitch");
          if (sw) sw.checked = false;
          document
            .getElementById("themeIcon")
            ?.setAttribute("data-lucide", "moon");
        }

        // Apply Hide Balance Setting
        if (State.settings.hide_balance) {
          State.isBalanceHidden = true;
          document.getElementById("hideBalanceDefaultSwitch").checked = true;
          document
            .getElementById("eyeIcon")
            .setAttribute("data-lucide", "eye-off");
        }

        // Apply Color Theme Setting
        const colorTheme = State.settings.color_theme || "emerald";
        setColorTheme(colorTheme, false);

        // Apply Image Quality Setting
        const imgQuality = State.settings.image_quality || "high";
        document
          .querySelectorAll("#imageQualityChipsBar .quality-preset-chip")
          .forEach((c) => {
            c.classList.toggle("active", c.dataset.quality === imgQuality);
          });

        // Apply Passcode Setting
        const passcodeToggle = document.getElementById("passcodeEnableToggle");
        if (passcodeToggle) {
          passcodeToggle.checked = !!State.settings.passcode_enabled;
        }
        const changePasscodeRow = document.getElementById("changePasscodeRow");
        if (changePasscodeRow) {
          changePasscodeRow.style.display = State.settings.passcode_enabled
            ? "flex"
            : "none";
        }

        // Apply Sound Settings
        const volSlider = document.getElementById("soundVolumeSlider");
        const volText = document.getElementById("soundVolumeValueText");
        const volVal =
          State.settings.sound_volume !== undefined
            ? State.settings.sound_volume
            : 80;
        if (volSlider) volSlider.value = volVal;
        if (volText) volText.textContent = `${volVal}%`;

        const swClick = document.getElementById("soundClickToggle");
        if (swClick) swClick.checked = State.settings.sound_click !== false;

        const swNotify = document.getElementById("soundNotifyToggle");
        if (swNotify) swNotify.checked = State.settings.sound_notify !== false;

        const swSuccess = document.getElementById("soundSuccessToggle");
        if (swSuccess)
          swSuccess.checked = State.settings.sound_success !== false;

        const swDelete = document.getElementById("soundDeleteToggle");
        if (swDelete) swDelete.checked = State.settings.sound_delete !== false;

        // Apply Haptic Feedback Setting
        const hapticSwitch = document.getElementById("hapticFeedbackSwitch");
        if (hapticSwitch) {
          hapticSwitch.checked = State.settings.haptic_enabled !== false;
        }

        applyUserProfileSettings();
        renderBottomNavigationTabs();
        renderBottomNavCustomizer();

        populateWalletOptions();
        await checkAndProcessRecurringTransactions();
        renderAllScreens();
        lucide.createIcons();
      }

      /* ==========================================================================
       14. EVENT LISTENERS INITIALIZATION
       ========================================================================== */
      function initEventListeners() {
        // Sidebar Navigation Drawer Controls
        document
          .getElementById("headerSidebarToggleBtn")
          ?.addEventListener("click", openSidebar);
        document
          .getElementById("closeSidebarBtn")
          ?.addEventListener("click", closeSidebar);

        const sidebarOverlay = document.getElementById("appSidebarOverlay");
        if (sidebarOverlay) {
          sidebarOverlay.addEventListener("click", (e) => {
            if (e.target === sidebarOverlay) closeSidebar();
          });
        }

        // Sidebar navigation items (Hiện từ phải sang trái)
        document.querySelectorAll(".sidebar-nav-item").forEach((btn) => {
          btn.addEventListener("click", () => {
            const snav = btn.dataset.snav;
            closeSidebar();
            switchActiveScreen(snav);
          });
        });

        // Bottom Navigation items (Được quản lý đồng bộ bởi renderBottomNavigationTabs và handleNavTabClick)
        document
          .querySelectorAll("#bottomNavItemsGrid .nav-item")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              if (btn.dataset.tab) handleNavTabClick(btn.dataset.tab);
            });
          });

        // User Profile & Navigation Customizer Listeners
        document
          .getElementById("settingsProfileHeroCard")
          ?.addEventListener("click", openUserProfileModal);
        document
          .getElementById("closeUserProfileModalBtn")
          ?.addEventListener("click", () => {
            document
              .getElementById("userProfileModal")
              ?.classList.remove("active");
          });
        document
          .getElementById("userProfileModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "userProfileModal")
              e.target.classList.remove("active");
          });

        document
          .getElementById("closeNavSlotPickerModalBtn")
          ?.addEventListener("click", () => {
            document
              .getElementById("navSlotPickerModal")
              ?.classList.remove("active");
          });
        document
          .getElementById("navSlotPickerModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "navSlotPickerModal")
              e.target.classList.remove("active");
          });

        document
          .getElementById("userAvatarFileInput")
          ?.addEventListener("change", handleUserAvatarFileChange);
        document
          .getElementById("removeCustomAvatarBtn")
          ?.addEventListener("click", () => {
            tempProfileAvatarData = "FM";
            updateModalAvatarPreview();
            renderAvatarPresetsList();
          });

        // Live update avatar preview when user types name
        document
          .getElementById("userProfileNameInput")
          ?.addEventListener("input", () => {
            const isCustomImg =
              tempProfileAvatarData &&
              (tempProfileAvatarData.startsWith("data:image/") ||
                tempProfileAvatarData.startsWith("http") ||
                tempProfileAvatarData.startsWith("blob:"));
            if (
              !isCustomImg &&
              !AVATAR_PRESETS.some((p) => p.id === tempProfileAvatarData)
            ) {
              updateModalAvatarPreview();
            }
          });

        // Center Add Button (+): Tích hợp đồng bộ toàn hệ thống theo màn hình hiện tại
        document
          .getElementById("openAddTransactionBtn")
          ?.addEventListener("click", () => {
            triggerHaptic("medium");
            if (State.activeTab === "wallets") {
              openAddWalletModal();
              return;
            }
            if (State.activeTab === "budgets") {
              openCreateBudgetModal();
              return;
            }
            if (State.activeTab === "categories") {
              openCreateCategoryModal();
              return;
            }
            if (State.activeTab === "recurring") {
              openRecurringFormModal();
              return;
            }
            if (State.activeTab === "journal") {
              openNewJournalModal();
              return;
            }
            if (State.activeTab === "savings") {
              openCreateSavingsGoalModal();
              return;
            }
            if (State.activeTab === "wallets") {
              openAddWalletModal();
              return;
            }
            if (State.activeTab === "budgets") {
              openCreateBudgetModal();
              return;
            }
            if (State.activeTab === "categories") {
              openCreateCategoryModal();
              return;
            }
            if (State.activeTab === "recurring") {
              openRecurringFormModal();
              return;
            }
            if (State.activeTab === "journal") {
              openNewJournalModal();
              return;
            }
            if (State.activeTab === "savings") {
              openCreateSavingsGoalModal();
              return;
            }
            const isFromWork = State.activeTab === "work";
            openTransactionWizard(null, true, { isWork: isFromWork });
          });

        // Passcode Keypad Button Clicks
        document.querySelectorAll(".passcode-key").forEach((btn) => {
          btn.addEventListener("click", () => {
            onPasscodeKeypadPress(btn.dataset.key);
          });
        });

        // Passcode Pin Lock Controls
        document
          .getElementById("changePinBtn")
          ?.addEventListener("click", openPasscodeSettingsModal);

        // Sound Volume Slider
        document
          .getElementById("soundVolumeSlider")
          ?.addEventListener("input", async (e) => {
            const vol = Number(e.target.value);
            const txt = document.getElementById("soundVolumeValueText");
            if (txt) txt.textContent = `${vol}%`;
            State.settings.sound_volume = vol;
            await DB.put("settings", { key: "sound_volume", value: vol });
          });

        // Sound Toggles & Tests
        [
          "soundClickToggle",
          "soundNotifyToggle",
          "soundSuccessToggle",
          "soundDeleteToggle",
        ].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener("change", async (e) => {
              const key = id
                .replace("Toggle", "")
                .replace("sound", "sound_")
                .toLowerCase();
              State.settings[key] = e.target.checked;
              await DB.put("settings", { key: key, value: e.target.checked });
              if (e.target.checked && typeof SoundEngine !== "undefined")
                SoundEngine.play(key.replace("sound_", ""));
            });
          }
        });

        document
          .getElementById("btnTestSoundClick")
          ?.addEventListener("click", () => SoundEngine.play("click"));
        document
          .getElementById("btnTestSoundNotify")
          ?.addEventListener("click", () => SoundEngine.play("notify"));
        document
          .getElementById("btnTestSoundSuccess")
          ?.addEventListener("click", () => SoundEngine.play("success"));
        document
          .getElementById("btnTestSoundDelete")
          ?.addEventListener("click", () => SoundEngine.play("delete"));

        // Theme Preset Chips
        document.querySelectorAll(".theme-preset-chip").forEach((btn) => {
          btn.addEventListener("click", () => {
            setColorTheme(btn.dataset.colortheme);
          });
        });

        // Global Sound on Interactive Element Clicks
        document.addEventListener(
          "click",
          (e) => {
            if (
              e.target.closest(
                "button, .nav-item, .sidebar-nav-item, .pill-tab-btn, .chip-btn, .theme-preset-chip, .quality-preset-chip, .mood-chip-btn, .passcode-key",
              )
            ) {
              if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
                SoundEngine.play("click");
              }
            }
          },
          { passive: true },
        );

        // Budget Create Modal Controls
        document
          .getElementById("closeBudgetCreateModalBtn")
          ?.addEventListener("click", closeCreateBudgetModal);
        document
          .getElementById("cancelBudgetCreateBtn")
          ?.addEventListener("click", closeCreateBudgetModal);
        document
          .getElementById("saveBudgetCreateBtn")
          ?.addEventListener("click", saveBudgetFromModal);
        document
          .getElementById("budgetCreateModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "budgetCreateModal") closeCreateBudgetModal();
          });
        document
          .getElementById("budgetCreateCategorySelect")
          ?.addEventListener("change", (e) => {
            const catId = e.target.value;
            const curAmt = State.categoryBudgets[catId] || 0;
            const input = document.getElementById("budgetCreateAmountInput");
            if (input) input.value = curAmt > 0 ? formatNumberOnly(curAmt) : "";
          });
        document
          .querySelectorAll("#budgetCreateScopeTabs .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#budgetCreateScopeTabs .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              const scope = btn.dataset.bscope;
              const catGroup = document.getElementById(
                "budgetCreateCategoryGroup",
              );
              const amountInput = document.getElementById(
                "budgetCreateAmountInput",
              );
              if (scope === "monthly") {
                if (catGroup) catGroup.style.display = "none";
                if (amountInput)
                  amountInput.value = formatNumberOnly(
                    State.settings.monthly_budget || 15000000,
                  );
              } else {
                if (catGroup) catGroup.style.display = "block";
                const select = document.getElementById(
                  "budgetCreateCategorySelect",
                );
                const curCatId = select ? select.value : "";
                const curAmt = State.categoryBudgets[curCatId] || 0;
                if (amountInput)
                  amountInput.value =
                    curAmt > 0 ? formatNumberOnly(curAmt) : "";
              }
            });
          });
        document
          .getElementById("budgetCreateAmountInput")
          ?.addEventListener("input", (e) => {
            e.target.value = e.target.value
              .replace(/[^0-9]/g, "")
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          });

        // Hero Quick Action Buttons
        document
          .getElementById("heroTransferBtn")
          ?.addEventListener("click", () => openTransferModal());
        document
          .getElementById("heroBudgetBtn")
          ?.addEventListener("click", () => switchActiveScreen("budgets"));
        document
          .getElementById("heroCalendarBtn")
          ?.addEventListener("click", () => {
            switchActiveScreen("calendar");
          });

        document
          .getElementById("viewAllTxBtn")
          ?.addEventListener("click", () => {
            switchActiveScreen("transactions");
          });

        // Overview Insights Segmented Switcher (Dòng tiền <-> Cơ cấu chi tiêu)
        const tabCashflowBtn = document.getElementById(
          "overviewTabCashflowBtn",
        );
        const tabCategoryBtn = document.getElementById(
          "overviewTabCategoryBtn",
        );
        const cashflowPane = document.getElementById("overviewCashflowPane");
        const categoryPane = document.getElementById("overviewCategoryPane");

        if (tabCashflowBtn && tabCategoryBtn) {
          tabCashflowBtn.addEventListener("click", () => {
            tabCashflowBtn.classList.add("active");
            tabCategoryBtn.classList.remove("active");
            if (cashflowPane) cashflowPane.classList.add("active");
            if (categoryPane) categoryPane.classList.remove("active");
            renderOverviewCashflowChart();
          });

          tabCategoryBtn.addEventListener("click", () => {
            tabCategoryBtn.classList.add("active");
            tabCashflowBtn.classList.remove("active");
            if (categoryPane) categoryPane.classList.add("active");
            if (cashflowPane) cashflowPane.classList.remove("active");
            renderOverviewCategoryChart();
          });
        }

        // Modals Backdrop Dismiss
        document
          .getElementById("overviewDateFilterModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "overviewDateFilterModal")
              closeOverviewDateFilterModal();
          });
        document
          .getElementById("analyticsDateModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "analyticsDateModal") closeAnalyticsDateModal();
          });
        document
          .getElementById("workDateModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "workDateModal") closeWorkDateModal();
          });
        document
          .getElementById("txFilterModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "txFilterModal") closeTxFilterModal();
          });

        // Eye Visibility Toggle
        document
          .getElementById("toggleBalanceVisibilityBtn")
          ?.addEventListener("click", () => {
            State.isBalanceHidden = !State.isBalanceHidden;
            const icon = document.getElementById("eyeIcon");
            icon.setAttribute(
              "data-lucide",
              State.isBalanceHidden ? "eye-off" : "eye",
            );
            renderOverviewScreen();
            lucide.createIcons();
          });

        // Theme Toggle Buttons
        const toggleTheme = () => {
          const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";
          if (isDark) {
            document.documentElement.removeAttribute("data-theme");
            const sw = document.getElementById("darkModeSwitch");
            if (sw) sw.checked = false;
            document
              .getElementById("themeIcon")
              ?.setAttribute("data-lucide", "moon");
            DB.put("settings", { key: "dark_mode", value: false });
          } else {
            document.documentElement.setAttribute("data-theme", "dark");
            const sw = document.getElementById("darkModeSwitch");
            if (sw) sw.checked = true;
            document
              .getElementById("themeIcon")
              ?.setAttribute("data-lucide", "sun");
            DB.put("settings", { key: "dark_mode", value: true });
          }
          updateMapThemeLayer();
          lucide.createIcons();
        };

        document
          .getElementById("themeToggleBtn")
          ?.addEventListener("click", toggleTheme);
        document
          .getElementById("darkModeSwitch")
          ?.addEventListener("change", toggleTheme);

        // Haptic Feedback Switch
        document
          .getElementById("hapticFeedbackSwitch")
          ?.addEventListener("change", async (e) => {
            State.settings.haptic_enabled = e.target.checked;
            await DB.put("settings", {
              key: "haptic_enabled",
              value: e.target.checked,
            });
            if (e.target.checked) triggerHaptic("success");
            showToast(
              e.target.checked
                ? "Đã bật rung phản hồi"
                : "Đã tắt rung phản hồi",
            );
          });

        document
          .getElementById("hideBalanceDefaultSwitch")
          ?.addEventListener("change", (e) => {
            DB.put("settings", {
              key: "hide_balance",
              value: e.target.checked,
            });
          });

        // Transaction Search Input
        document
          .getElementById("txSearchInput")
          ?.addEventListener("input", (e) => {
            State.txSearch = e.target.value.trim();
            renderTransactionsScreen();
          });

        // Financial Calendar Month Navigation
        document
          .getElementById("calPrevMonthBtn")
          ?.addEventListener("click", () => {
            State.financialCalendarDate.setMonth(
              State.financialCalendarDate.getMonth() - 1,
            );
            renderFinancialCalendar();
          });

        document
          .getElementById("calNextMonthBtn")
          ?.addEventListener("click", () => {
            State.financialCalendarDate.setMonth(
              State.financialCalendarDate.getMonth() + 1,
            );
            renderFinancialCalendar();
          });

        // ==========================================
        // FULL-SCREEN 4-STEP WIZARD CONTROLS
        // ==========================================
        const navBackBtn = document.getElementById("wizardNavBackBtn");
        if (navBackBtn) {
          navBackBtn.addEventListener("click", () => {
            if (State.wizardStep > 1) goToWizardStep(State.wizardStep - 1);
            else closeTransactionWizard();
          });
        }

        const closeBtn = document.getElementById("wizardCloseBtn");
        if (closeBtn)
          closeBtn.addEventListener("click", closeTransactionWizard);

        // Bước 1: Hóa đơn & Chứng từ (Live Fullscreen Camera Scanner & Controls)
        document
          .getElementById("cameraCloseBtn")
          ?.addEventListener("click", closeTransactionWizard);
        document
          .getElementById("previewCloseBtn")
          ?.addEventListener("click", closeTransactionWizard);
        document
          .getElementById("cameraShutterBtn")
          ?.addEventListener("click", takeLiveCameraSnapshot);
        document
          .getElementById("cameraFlipBtn")
          ?.addEventListener("click", flipCameraFacingMode);
        document
          .getElementById("retryCameraBtn")
          ?.addEventListener("click", startLiveCamera);
        document
          .getElementById("fallbackCaptureBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            document.getElementById("cameraFileInput").click();
          });
        document
          .getElementById("switchLocalhostBtn")
          ?.addEventListener("click", () => {
            window.location.href = window.location.href.replace(
              "127.0.0.1",
              "localhost",
            );
          });
        document
          .getElementById("fallbackGalleryBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            document.getElementById("galleryFileInput").click();
          });
        document
          .getElementById("fallbackSkipBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            goToWizardStep(2);
          });
        document
          .getElementById("step1GalleryBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            document.getElementById("galleryFileInput").click();
          });
        document
          .getElementById("retakeReceiptBtn")
          ?.addEventListener("click", resetReceiptPreview);
        document
          .getElementById("changeReceiptBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            document.getElementById("galleryFileInput").click();
          });
        document
          .getElementById("removeReceiptBtn")
          ?.addEventListener("click", resetReceiptPreview);
        document
          .getElementById("step1SkipBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            goToWizardStep(2);
          });
        document
          .getElementById("step1NextBtn")
          ?.addEventListener("click", () => {
            stopLiveCamera();
            goToWizardStep(2);
          });

        // Bước 2: Chọn Loại giao dịch (Tự động chuyển thẳng sang Bước 3 khi chạm)
        let step2AutoAdvanceTimer = null;
        function handleStep2Select(type) {
          State.wizardType = type;
          updateWizardTypeCards();
          if (navigator.vibrate) navigator.vibrate(25);
          clearTimeout(step2AutoAdvanceTimer);
          step2AutoAdvanceTimer = setTimeout(() => {
            goToWizardStep(3);
          }, 220);
        }

        document
          .getElementById("step2CardExpense")
          ?.addEventListener("click", () => handleStep2Select("expense"));
        document
          .getElementById("step2CardIncome")
          ?.addEventListener("click", () => handleStep2Select("income"));
        document
          .getElementById("step2BackBtn")
          ?.addEventListener("click", () => goToWizardStep(1));

        // Bước 3: Nhập thông tin
        const wizBodyElem = document.getElementById("wizardMainBody");
        if (wizBodyElem) {
          wizBodyElem.addEventListener(
            "scroll",
            () => {
              if (wizBodyElem.scrollLeft !== 0) {
                wizBodyElem.scrollLeft = 0;
              }
            },
            { passive: true },
          );
        }

        [
          "wizardWalletSelect",
          "wizardDateInput",
          "wizardLocationInput",
          "wizardNoteInput",
        ].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener(
              "focus",
              () => {
                if (wizBodyElem) wizBodyElem.scrollLeft = 0;
              },
              { passive: true },
            );
          }
        });

        document
          .getElementById("step3EditReceiptBtn")
          ?.addEventListener("click", () => goToWizardStep(1));
        document
          .getElementById("step3BackBtn")
          ?.addEventListener("click", () => goToWizardStep(2));
        document
          .getElementById("step3NextBtn")
          ?.addEventListener("click", () => {
            const amt = parseInt(State.wizardAmountRaw, 10) || 0;
            if (amt <= 0) {
              showToast("Vui lòng nhập số tiền lớn hơn 0!", true);
              return;
            }
            if (!State.wizardCategoryId) {
              showToast("Vui lòng chọn một danh mục!", true);
              return;
            }
            goToWizardStep(4);
          });

        const clearAmtChip = document.getElementById("chipClearAmount");
        if (clearAmtChip) {
          clearAmtChip.addEventListener("click", () => {
            State.wizardAmountRaw = "0";
            updateWizardAmountDisplay();
          });
        }

        // Location Detection Controls (Tên đường + Tên phường)
        const detectLocBtn = document.getElementById("detectLocationBtn");
        if (detectLocBtn)
          detectLocBtn.addEventListener("click", detectCurrentLocation);

        const clearLocBtn = document.getElementById("clearLocationBtn");
        if (clearLocBtn) {
          clearLocBtn.addEventListener("click", () => {
            const locInput = document.getElementById("wizardLocationInput");
            if (locInput) locInput.value = "";
            clearLocBtn.style.display = "none";
            State.wizardLocation = null;
            const locStatus = document.getElementById("locationStatusText");
            if (locStatus)
              locStatus.innerHTML =
                '<span>Nhấn "Định vị GPS" để tự động nhận diện tên đường & phường</span>';
          });
        }

        const locInputElem = document.getElementById("wizardLocationInput");
        if (locInputElem) {
          locInputElem.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            if (clearLocBtn) clearLocBtn.style.display = val ? "block" : "none";
            if (!State.wizardLocation) {
              State.wizardLocation = { address: val, lat: null, lng: null };
            } else {
              State.wizardLocation.address = val;
            }
          });
        }

        // Camera & Gallery File Pickers
        const camInput = document.getElementById("cameraFileInput");
        if (camInput)
          camInput.addEventListener("change", (e) =>
            handleReceiptImageSelected(e.target.files[0]),
          );

        const galInput = document.getElementById("galleryFileInput");
        if (galInput)
          galInput.addEventListener("change", (e) =>
            handleReceiptImageSelected(e.target.files[0]),
          );

        // Bước 4: Xác nhận
        document
          .getElementById("step4BackBtn")
          ?.addEventListener("click", () => goToWizardStep(3));

        // Numpad Keypad Handler
        document.querySelectorAll(".numpad-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            triggerHaptic("light");
            const val = btn.dataset.val;
            if (val === "backspace") {
              State.wizardAmountRaw = State.wizardAmountRaw.slice(0, -1);
              if (!State.wizardAmountRaw) State.wizardAmountRaw = "0";
            } else if (val === "000") {
              if (
                State.wizardAmountRaw !== "0" &&
                State.wizardAmountRaw.length < 10
              ) {
                State.wizardAmountRaw += "000";
              }
            } else {
              if (State.wizardAmountRaw === "0") State.wizardAmountRaw = val;
              else if (State.wizardAmountRaw.length < 11)
                State.wizardAmountRaw += val;
            }
            updateWizardAmountDisplay();
          });
        });

        // Quick Amount Chips
        document.querySelectorAll(".chip-btn[data-add]").forEach((btn) => {
          btn.addEventListener("click", () => {
            triggerHaptic("light");
            const add = parseInt(btn.dataset.add, 10) || 0;
            const cur = parseInt(State.wizardAmountRaw, 10) || 0;
            State.wizardAmountRaw = String(cur + add);
            updateWizardAmountDisplay();
          });
        });

        // Transfer Modal Buttons
        document
          .getElementById("cancelTransferBtn")
          .addEventListener("click", () =>
            document.getElementById("transferModal").classList.remove("active"),
          );
        document
          .getElementById("saveTransferBtn")
          .addEventListener("click", executeWalletTransfer);

        // Category Budget Modal & Screen Navigation
        document
          .getElementById("settingCategoryBudgetsRow")
          ?.addEventListener("click", () => switchActiveScreen("budgets"));
        document
          .getElementById("closeCatBudgetsModalBtn")
          ?.addEventListener("click", () =>
            document
              .getElementById("categoryBudgetsModal")
              .classList.remove("active"),
          );

        // Budget Screen Listeners
        document
          .querySelectorAll("#budgetScreenFilterTabs .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#budgetScreenFilterTabs .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              State.budgetFilter = btn.dataset.bfilter || "all";
              renderBudgetsScreen();
            });
          });

        document
          .getElementById("budgetScreenSearchInput")
          ?.addEventListener("input", (e) => {
            State.budgetSearch = e.target.value.trim();
            renderBudgetsScreen();
          });

        // Recurring Screen & Form Controls
        document
          .getElementById("settingRecurringRow")
          ?.addEventListener("click", () => switchActiveScreen("recurring"));
        document
          .getElementById("closeRecurringFormBtn")
          ?.addEventListener("click", closeRecurringFormModal);
        document
          .getElementById("cancelRecurringFormBtn")
          ?.addEventListener("click", closeRecurringFormModal);
        document
          .getElementById("saveRecurringFormBtn")
          ?.addEventListener("click", saveRecurringFromForm);
        document
          .getElementById("recurringFormModal")
          ?.addEventListener("click", (e) => {
            if (e.target.id === "recurringFormModal") closeRecurringFormModal();
          });

        // Type tabs in recurring form (Thu nhập vs Chi tiêu)
        document
          .querySelectorAll("#recurringFormTypeTabs .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#recurringFormTypeTabs .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              const type = btn.dataset.rftype || "income";
              const catSelect = document.getElementById(
                "recurringCategorySelect",
              );
              if (catSelect) {
                catSelect.innerHTML = "";
                const cats = State.categories.filter((c) => c.type === type);
                cats.forEach((c) => {
                  const opt = document.createElement("option");
                  opt.value = c.id;
                  opt.textContent = c.name;
                  catSelect.appendChild(opt);
                });
              }
            });
          });

        // Recurring Amount Input (dấu phẩy phân tách hàng nghìn)
        document
          .getElementById("recurringAmountInput")
          ?.addEventListener("input", (e) => {
            e.target.value = e.target.value
              .replace(/[^0-9]/g, "")
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          });

        // Recurring Screen Filter Tabs (Tất cả, Thu, Chi)
        document
          .querySelectorAll("#recurringScreenFilterTabs .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#recurringScreenFilterTabs .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              State.recurringFilter = btn.dataset.rfilter || "all";
              renderRecurringScreen();
            });
          });

        // Recurring Screen Search Input
        document
          .getElementById("recurringScreenSearchInput")
          ?.addEventListener("input", (e) => {
            State.recurringSearch = e.target.value.trim();
            renderRecurringScreen();
          });

        // Global Outside Pointerdown Dismiss for Swiped Rows
        document.addEventListener("pointerdown", (e) => {
          if (
            typeof currentlyOpenRecurringSwipeWrapper !== "undefined" &&
            currentlyOpenRecurringSwipeWrapper &&
            !currentlyOpenRecurringSwipeWrapper.contains(e.target)
          ) {
            closeCurrentRecurringSwipe();
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
        });

        // Wallet Modal & Form Controls
        document
          .getElementById("settingWalletRow")
          ?.addEventListener("click", openWalletManagerModal);
        document
          .getElementById("closeWalletModalBtn")
          ?.addEventListener("click", () =>
            document
              .getElementById("walletManageModal")
              .classList.remove("active"),
          );
        document
          .getElementById("openAddWalletFromManagerBtn")
          ?.addEventListener("click", () => {
            document
              .getElementById("walletManageModal")
              .classList.remove("active");
            openAddWalletModal();
          });

        document
          .getElementById("closeWalletFormBtn")
          ?.addEventListener("click", () =>
            document
              .getElementById("walletFormModal")
              .classList.remove("active"),
          );
        const walletFormOverlay = document.getElementById("walletFormModal");
        if (walletFormOverlay) {
          walletFormOverlay.addEventListener("click", (e) => {
            if (e.target === walletFormOverlay)
              walletFormOverlay.classList.remove("active");
          });
        }

        // Live Thousand Separator Formatting for Wallet Initial Balance Input
        const walletInitBalInput = document.getElementById(
          "walletFormInitialBalance",
        );
        if (walletInitBalInput) {
          walletInitBalInput.addEventListener("input", (e) => {
            const val = parseVNDInput(e.target.value);
            e.target.value = val === 0 ? "" : formatNumberOnly(val);
          });
          walletInitBalInput.addEventListener("blur", (e) => {
            const val = parseVNDInput(e.target.value);
            e.target.value = formatNumberOnly(val);
          });
        }

        // Category Manager Modal & Screen Navigation
        document
          .getElementById("settingManageCategoriesRow")
          ?.addEventListener("click", () => switchActiveScreen("categories"));
        document
          .getElementById("closeCategoryModalBtn")
          ?.addEventListener("click", () =>
            document
              .getElementById("categoryManagerModal")
              .classList.remove("active"),
          );

        // Category Screen Listeners
        document
          .querySelectorAll("#catScreenTypeTabs .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#catScreenTypeTabs .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              State.categoryScreenType = btn.dataset.cstype || "expense";
              renderCategoriesScreen();
            });
          });

        document
          .getElementById("catScreenSearchInput")
          ?.addEventListener("input", (e) => {
            State.categorySearch = e.target.value.trim();
            renderCategoriesScreen();
          });

        document
          .querySelectorAll("#categoryTabFilter .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#categoryTabFilter .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              renderCategoryManagerList();
            });
          });

        // Create Category Modal Buttons
        document
          .getElementById("openCreateCategoryModalBtn")
          ?.addEventListener("click", openCreateCategoryModal);
        document
          .getElementById("wizardAddCatBtn")
          ?.addEventListener("click", openCreateCategoryModal);
        document
          .getElementById("closeCreateCategoryBtn")
          ?.addEventListener("click", () =>
            document
              .getElementById("createCategoryModal")
              .classList.remove("active"),
          );
        document
          .getElementById("saveCatBtn")
          ?.addEventListener("click", saveNewCategory);

        // Initial Balance Modal Buttons
        document
          .getElementById("settingInitialBalanceRow")
          ?.addEventListener("click", () => {
            document.getElementById("initialBalanceInput").value =
              formatNumberOnly(State.settings.initial_balance || 0);
            document.getElementById("initialBalanceDateInput").value =
              State.settings.initial_balance_date || getTodayString();
            document
              .getElementById("initialBalanceModal")
              .classList.add("active");
          });
        document
          .getElementById("cancelInitialBalanceBtn")
          ?.addEventListener("click", () =>
            document
              .getElementById("initialBalanceModal")
              .classList.remove("active"),
          );
        document
          .getElementById("saveInitialBalanceBtn")
          ?.addEventListener("click", async () => {
            const val = parseVNDInput(
              document.getElementById("initialBalanceInput").value,
            );
            const dateVal =
              document.getElementById("initialBalanceDateInput").value ||
              getTodayString();
            await DB.put("settings", { key: "initial_balance", value: val });
            await DB.put("settings", {
              key: "initial_balance_date",
              value: dateVal,
            });
            State.settings.initial_balance = val;
            State.settings.initial_balance_date = dateVal;
            document
              .getElementById("initialBalanceModal")
              .classList.remove("active");
            showToast("Đã lưu số dư ban đầu!");
            renderAllScreens();
          });

        // Budget Modal Buttons
        document
          .getElementById("settingBudgetRow")
          ?.addEventListener("click", () => {
            document.getElementById("budgetInput").value = formatNumberOnly(
              State.settings.monthly_budget || 15000000,
            );
            document.getElementById("budgetModal").classList.add("active");
          });
        document
          .getElementById("cancelBudgetBtn")
          ?.addEventListener("click", () =>
            document.getElementById("budgetModal").classList.remove("active"),
          );
        document
          .getElementById("saveBudgetBtn")
          ?.addEventListener("click", async () => {
            const val = parseVNDInput(
              document.getElementById("budgetInput").value,
            );
            await DB.put("settings", { key: "monthly_budget", value: val });
            State.settings.monthly_budget = val;
            document.getElementById("budgetModal").classList.remove("active");
            showToast("Đã lưu hạn mức ngân sách tháng!");
            renderAllScreens();
          });

        // Backup, Restore & CSV Buttons
        document
          .getElementById("backupDataBtn")
          ?.addEventListener("click", backupAllDataJSON);
        document
          .getElementById("restoreDataBtn")
          ?.addEventListener("click", () =>
            document.getElementById("restoreFileInput").click(),
          );
        document
          .getElementById("restoreFileInput")
          ?.addEventListener("change", (e) =>
            restoreFromJSONFile(e.target.files[0]),
          );
        document
          .getElementById("exportCsvBtn")
          ?.addEventListener("click", exportToCSV);

        // Danger Zone Reset
        document
          .getElementById("resetAllDataBtn")
          ?.addEventListener("click", resetAllData);

        // Close Tx Detail Bottom Sheet
        document
          .getElementById("closeTxDetailBtn")
          ?.addEventListener("click", () =>
            document.getElementById("txDetailModal").classList.remove("active"),
          );

        // ==========================================
        // SPENDING MAP & CIRCULAR FAB EVENT LISTENERS
        // ==========================================
        // Circular FAB 1: Điểm nóng & Bộ lọc (Mở Bottom Sheet)
        const hotspotsSheet = document.getElementById("mapHotspotsSheetModal");
        document
          .getElementById("mapFabHotspotsBtn")
          ?.addEventListener("click", () => {
            if (hotspotsSheet) hotspotsSheet.classList.add("active");
          });

        document
          .getElementById("closeMapHotspotsSheetBtn")
          ?.addEventListener("click", () => {
            if (hotspotsSheet) hotspotsSheet.classList.remove("active");
          });

        hotspotsSheet?.addEventListener("click", (e) => {
          if (e.target === hotspotsSheet) {
            hotspotsSheet.classList.remove("active");
          }
        });

        // Circular FAB 2: Thu phóng toàn bộ điểm
        document
          .getElementById("mapFabFitBoundsBtn")
          ?.addEventListener("click", () => {
            State.mapSelectedTxId = null;
            renderSpendingMapScreen();
            showToast("Đã mở rộng bao quát toàn bộ điểm");
          });

        // Circular FAB 3: Vòng quét bán kính Gần tôi (Xoay vòng: Tắt -> 1km -> 3km -> 5km -> 10km -> Tắt)
        const radiusSteps = [0, 1, 3, 5, 10];
        const radiusBadge = document.getElementById("mapFabRadiusBadge");
        document
          .getElementById("mapFabRadiusBtn")
          ?.addEventListener("click", () => {
            let cur = Number(State.mapRadius) || 0;
            let idx = radiusSteps.indexOf(cur);
            if (idx === -1) idx = 0;
            let next = radiusSteps[(idx + 1) % radiusSteps.length];
            State.mapRadius = next;

            if (radiusBadge) {
              radiusBadge.textContent = next === 0 ? "Tắt" : `${next}km`;
            }

            if (next > 0) {
              if (!State.userGpsCoords) {
                locateUserOnMap();
              } else {
                updateMapRadiusCircle();
                renderSpendingMapScreen();
                showToast(`Bán kính quét: ${next} km`);
              }
            } else {
              updateMapRadiusCircle();
              renderSpendingMapScreen();
              showToast("Đã tắt quét bán kính");
            }
          });

        // Circular FAB 4: Định vị GPS của tôi
        document
          .getElementById("mapFabGpsBtn")
          ?.addEventListener("click", locateUserOnMap);

        // Circular FAB 5: Đổi giao diện Google Maps (Số <-> Vệ tinh <-> Địa hình)
        document
          .getElementById("mapFabGoogleLayerBtn")
          ?.addEventListener("click", switchGoogleMapLayer);

        // Map Period Tabs inside Sheet
        document
          .querySelectorAll("#mapPeriodTabs .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#mapPeriodTabs .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              State.mapPeriod = btn.dataset.mperiod;
              renderSpendingMapScreen();
            });
          });

        // Map Type Filter Tabs inside Sheet
        document
          .querySelectorAll("#mapTypeFilter .pill-tab-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              document
                .querySelectorAll("#mapTypeFilter .pill-tab-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              State.mapType = btn.dataset.mtype;
              renderSpendingMapScreen();
            });
          });

        // Map Search Input
        const mapSearch = document.getElementById("mapSearchInput");
        const mapClearSearch = document.getElementById("mapClearSearchBtn");
        if (mapSearch) {
          mapSearch.addEventListener("input", (e) => {
            State.mapSearch = e.target.value.trim();
            if (mapClearSearch)
              mapClearSearch.style.display = State.mapSearch ? "block" : "none";
            renderSpendingMapScreen();
          });
        }

        if (mapClearSearch) {
          mapClearSearch.addEventListener("click", () => {
            if (mapSearch) mapSearch.value = "";
            State.mapSearch = "";
            mapClearSearch.style.display = "none";
            renderSpendingMapScreen();
          });
        }

        // Map Auto Assign Coords Button
        document
          .getElementById("mapAutoAssignCoordsBtn")
          ?.addEventListener("click", autoAssignSampleCoordinates);

        // Header current date display
        const now = new Date();
        const weekdays = [
          "Chủ Nhật",
          "Thứ Hai",
          "Thứ Ba",
          "Thứ Tư",
          "Thứ Năm",
          "Thứ Sáu",
          "Thứ Bảy",
        ];
        const dateStr = `${weekdays[now.getDay()]}, ${now.getDate()} thg ${now.getMonth() + 1}`;
        const headerDate = document.getElementById("headerCurrentDate");
        if (headerDate) headerDate.textContent = dateStr;
        const sidebarDate = document.getElementById("sidebarHeaderCurrentDate");
        if (sidebarDate) sidebarDate.textContent = dateStr;
      }
