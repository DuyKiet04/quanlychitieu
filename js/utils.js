      /* ==========================================================================
       4. HELPER UTILITIES
       ========================================================================== */
      function formatVND(amount) {
        const num = Number(amount) || 0;
        return num.toLocaleString("vi-VN") + " ₫";
      }

      function formatNumberOnly(amount) {
        const num = Number(amount) || 0;
        return num.toLocaleString("vi-VN");
      }

      function parseVNDInput(str) {
        if (!str) return 0;
        return parseInt(str.toString().replace(/[^\d]/g, ""), 10) || 0;
      }

      function getTodayString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }

      function formatDateDisplay(dateStr) {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      }

      function formatDateWithWeekday(dateStr) {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const weekdays = [
          "Chủ Nhật",
          "Thứ Hai",
          "Thứ Ba",
          "Thứ Tư",
          "Thứ Năm",
          "Thứ Sáu",
          "Thứ Bảy",
        ];
        const todayStr = getTodayString();
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;
        const dayName = weekdays[date.getDay()];
        return `${dayName}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}${isToday ? " (Hôm nay)" : isFuture ? " (Dự kiến)" : ""}`;
      }

      /* Haptic Feedback Engine */
      function triggerHaptic(type = "light") {
        if (State.settings && State.settings.haptic_enabled === false) return;
        if (!navigator.vibrate) return;
        try {
          if (type === "light") navigator.vibrate(12);
          else if (type === "medium") navigator.vibrate(25);
          else if (type === "success") navigator.vibrate([20, 30, 40]);
          else if (type === "warning") navigator.vibrate([40, 40]);
        } catch {}
      }
      window.triggerHaptic = triggerHaptic;

      /* Luxury Color Theme Controller */
      function setColorTheme(themeName, save = true) {
        const validThemes = [
          "emerald",
          "ocean",
          "amethyst",
          "sunset",
          "ruby",
          "nordic",
          "rose",
          "cyber",
        ];
        if (!validThemes.includes(themeName)) themeName = "emerald";
        document.documentElement.setAttribute("data-color-theme", themeName);
        if (save) {
          State.settings.color_theme = themeName;
          DB.put("settings", { key: "color_theme", value: themeName });
          triggerHaptic("medium");
          const themeNamesMap = {
            emerald: "Emerald Forest (Xanh ngọc)",
            ocean: "Midnight Ocean (Xanh biển)",
            amethyst: "Royal Amethyst (Tím hoàng gia)",
            sunset: "Sunset Bronze (Đồng sang trọng)",
            ruby: "Ruby Crimson (Đỏ Ruby sang trọng)",
            nordic: "Nordic Slate (Xám Bắc Âu tối giản)",
            rose: "Rose Gold (Vàng hồng quý phái)",
            cyber: "Cyber Night (Đêm Neon công nghệ)",
          };
          showToast(
            `Đã chuyển sang chủ đề ${themeNamesMap[themeName] || themeName}!`,
          );
        }
        document.querySelectorAll(".theme-preset-chip").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.colortheme === themeName);
        });
        if (overviewCashflowChartInstance) renderOverviewCashflowChart();
        lucide.createIcons();
      }
      window.setColorTheme = setColorTheme;

      /* Image Quality Control (Thấp <50KB, TB <100KB, Cao <200KB) */
      function onImageQualitySliderInput(val) {
        const mode = val === "1" ? "low" : val === "2" ? "medium" : "high";
        setImageQualitySetting(mode);
      }
      window.onImageQualitySliderInput = onImageQualitySliderInput;

      function setImageQualitySetting(mode) {
        const validModes = ["low", "medium", "high"];
        if (!validModes.includes(mode)) mode = "high";
        State.settings.image_quality = mode;
        DB.put("settings", { key: "image_quality", value: mode });

        const slider = document.getElementById("imageQualitySlider");
        if (slider)
          slider.value = mode === "low" ? "1" : mode === "medium" ? "2" : "3";

        const badge = document.getElementById("imageQualityBadge");
        const labels = {
          low: "Thấp (<50KB)",
          medium: "TB (<100KB)",
          high: "Cao (<200KB)",
        };
        if (badge) badge.textContent = labels[mode] || "Cao (<200KB)";
        showToast(`Đã lưu chất lượng ảnh: ${labels[mode]}`);
      }
      window.setImageQualitySetting = setImageQualitySetting;

      /* 2-Step Interactive iPhone Passcode Setup Controller */
      let passcodeSetupStage = 1; // 1: Enter new PIN, 2: Confirm PIN
      let passcodeSetupFirstPin = "";
      let passcodeSetupConfirmPin = "";

      function openPasscodeSettingsModal() {
        const modal = document.getElementById("passcodeSettingsModal");
        if (!modal) return;
        passcodeSetupStage = 1;
        passcodeSetupFirstPin = "";
        passcodeSetupConfirmPin = "";
        updatePasscodeSetupUI();
        modal.classList.add("active");
        lucide.createIcons();
      }
      window.openPasscodeSettingsModal = openPasscodeSettingsModal;

      function closePasscodeSettingsModal() {
        const modal = document.getElementById("passcodeSettingsModal");
        if (modal) modal.classList.remove("active");
        passcodeSetupStage = 1;
        passcodeSetupFirstPin = "";
        passcodeSetupConfirmPin = "";
        updatePinLockUI();
      }
      window.closePasscodeSettingsModal = closePasscodeSettingsModal;

      function updatePasscodeSetupUI() {
        const titleEl = document.getElementById("passcodeSetupTitle");
        const descEl = document.getElementById("passcodeSetupDesc");
        const errorMsg = document.getElementById("passcodeSetupErrorMsg");
        const dots = document.querySelectorAll(
          "#passcodeSetupDots .passcode-dot",
        );

        if (passcodeSetupStage === 1) {
          if (titleEl) titleEl.textContent = "Thiết lập mã PIN";
          if (descEl) descEl.textContent = "Nhập 4 chữ số mã PIN mới";
          if (errorMsg) errorMsg.textContent = "";
          dots.forEach((dot, idx) => {
            dot.classList.toggle("filled", idx < passcodeSetupFirstPin.length);
          });
        } else {
          if (titleEl) titleEl.textContent = "Xác nhận mã PIN";
          if (descEl) descEl.textContent = "Nhập lại 4 chữ số để xác nhận";
          if (errorMsg) errorMsg.textContent = "";
          dots.forEach((dot, idx) => {
            dot.classList.toggle(
              "filled",
              idx < passcodeSetupConfirmPin.length,
            );
          });
        }
      }

      async function onPasscodeSetupKey(key) {
        if (typeof SoundEngine !== "undefined") SoundEngine.play("click");
        if (typeof triggerHaptic === "function") triggerHaptic("light");

        const errorMsg = document.getElementById("passcodeSetupErrorMsg");
        if (errorMsg) errorMsg.textContent = "";

        if (key === "back") {
          if (passcodeSetupStage === 1) {
            if (passcodeSetupFirstPin.length > 0) {
              passcodeSetupFirstPin = passcodeSetupFirstPin.slice(0, -1);
              updatePasscodeSetupUI();
            }
          } else {
            if (passcodeSetupConfirmPin.length > 0) {
              passcodeSetupConfirmPin = passcodeSetupConfirmPin.slice(0, -1);
              updatePasscodeSetupUI();
            }
          }
          return;
        }

        if (passcodeSetupStage === 1) {
          if (passcodeSetupFirstPin.length < 4) {
            passcodeSetupFirstPin += key;
            updatePasscodeSetupUI();

            if (passcodeSetupFirstPin.length === 4) {
              setTimeout(() => {
                passcodeSetupStage = 2;
                passcodeSetupConfirmPin = "";
                updatePasscodeSetupUI();
              }, 180);
            }
          }
        } else {
          if (passcodeSetupConfirmPin.length < 4) {
            passcodeSetupConfirmPin += key;
            updatePasscodeSetupUI();

            if (passcodeSetupConfirmPin.length === 4) {
              setTimeout(async () => {
                if (passcodeSetupConfirmPin === passcodeSetupFirstPin) {
                  // PIN matched!
                  State.settings.passcode_pin = passcodeSetupFirstPin;
                  State.settings.passcode_enabled = true;
                  await DB.put("settings", {
                    key: "passcode_pin",
                    value: passcodeSetupFirstPin,
                  });
                  await DB.put("settings", {
                    key: "passcode_enabled",
                    value: true,
                  });

                  if (typeof SoundEngine !== "undefined")
                    SoundEngine.play("success");
                  if (typeof triggerHaptic === "function")
                    triggerHaptic("success");
                  showToast("Đã thiết lập mã PIN bảo mật thành công!");
                  updatePinLockUI();
                  closePasscodeSettingsModal();
                } else {
                  // PIN mismatch!
                  if (typeof SoundEngine !== "undefined")
                    SoundEngine.play("delete");
                  if (typeof triggerHaptic === "function")
                    triggerHaptic("warning");
                  const dotsContainer =
                    document.getElementById("passcodeSetupDots");
                  if (dotsContainer) {
                    dotsContainer.classList.add("shake-error");
                    setTimeout(
                      () => dotsContainer.classList.remove("shake-error"),
                      450,
                    );
                  }
                  if (errorMsg)
                    errorMsg.textContent =
                      "Mã PIN không khớp, vui lòng thử lại!";
                  setTimeout(() => {
                    passcodeSetupStage = 1;
                    passcodeSetupFirstPin = "";
                    passcodeSetupConfirmPin = "";
                    updatePasscodeSetupUI();
                  }, 500);
                }
              }, 180);
            }
          }
        }
      }
      window.onPasscodeSetupKey = onPasscodeSetupKey;

      async function togglePinLockSetting(enabled) {
        if (enabled) {
          if (!State.settings.passcode_pin) {
            openPasscodeSettingsModal();
          } else {
            State.settings.passcode_enabled = true;
            await DB.put("settings", { key: "passcode_enabled", value: true });
            updatePinLockUI();
            showToast("Đã kích hoạt bảo vệ mã PIN!");
          }
        } else {
          State.settings.passcode_enabled = false;
          await DB.put("settings", { key: "passcode_enabled", value: false });
          updatePinLockUI();
          showToast("Đã tắt mã PIN bảo mật!");
        }
      }
      window.togglePinLockSetting = togglePinLockSetting;

      function updatePinLockUI() {
        const sw = document.getElementById("pinLockToggleSwitch");
        const changeBtn = document.getElementById("changePinBtn");
        const statusText = document.getElementById("pinLockStatusText");
        const activeActions = document.getElementById("pinLockActiveActions");

        const isEnabled = !!(
          State.settings &&
          State.settings.passcode_enabled &&
          State.settings.passcode_pin
        );
        if (sw) sw.checked = isEnabled;
        if (changeBtn)
          changeBtn.style.display = isEnabled ? "inline-block" : "none";
        if (activeActions)
          activeActions.style.display = isEnabled ? "block" : "none";
        if (statusText)
          statusText.textContent = isEnabled
            ? "Đã bật mã PIN bảo vệ"
            : "Chưa bật mã PIN bảo vệ";
        if (typeof lucide !== "undefined") lucide.createIcons();
      }
      window.updatePinLockUI = updatePinLockUI;

      function lockAppNow() {
        if (typeof triggerHaptic === "function") triggerHaptic("medium");
        if (State.settings && State.settings.passcode_pin) {
          showPasscodeLockScreen();
        } else {
          openPasscodeSettingsModal();
        }
      }
      window.lockAppNow = lockAppNow;

      /* Flying Coins / Particles Animation for Transactions */
      function triggerMoneyFlyAnimation(type, categoryObj) {
        const count = 14;
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight * 0.68;

        let targetX = window.innerWidth / 2;
        let targetY = 65; // Header balance position
        if (type === "expense") {
          targetY = window.innerHeight * 0.82; // Downward into category
        }

        for (let i = 0; i < count; i++) {
          const coin = document.createElement("div");
          coin.className = "flying-coin-element";
          coin.textContent = type === "income" ? "🪙" : "💸";
          coin.style.left = `${startX + (Math.random() - 0.5) * 50}px`;
          coin.style.top = `${startY + (Math.random() - 0.5) * 35}px`;
          coin.style.opacity = "1";
          document.body.appendChild(coin);

          const angle = (Math.PI * 2 * i) / count;
          const scatterDist = 45 + Math.random() * 65;
          const midX = startX + Math.cos(angle) * scatterDist;
          const midY =
            startY +
            Math.sin(angle) * scatterDist -
            (type === "income" ? 35 : 0);

          if (window.anime) {
            anime({
              targets: coin,
              left: [
                { value: midX, duration: 240, easing: "easeOutQuad" },
                {
                  value: targetX + (Math.random() - 0.5) * 60,
                  duration: 560,
                  easing: "easeInCubic",
                },
              ],
              top: [
                { value: midY, duration: 240, easing: "easeOutQuad" },
                {
                  value: targetY + (Math.random() - 0.5) * 35,
                  duration: 560,
                  easing: "easeInCubic",
                },
              ],
              scale: [
                { value: 1.35, duration: 240 },
                { value: 0.25, duration: 560 },
              ],
              opacity: [
                { value: 1, duration: 600 },
                { value: 0, duration: 200 },
              ],
              rotate: { value: (Math.random() - 0.5) * 720, duration: 800 },
              complete: () => {
                coin.remove();
              },
            });
          } else {
            setTimeout(() => coin.remove(), 750);
          }
        }
      }
      window.triggerMoneyFlyAnimation = triggerMoneyFlyAnimation;

      /* 2-Second Initial Splash Screen Controller */
      function initSplashScreen() {
        const splash = document.getElementById("appSplashScreen");
        if (!splash) return;
        setTimeout(() => {
          splash.style.transition = "opacity 0.4s ease, transform 0.4s ease";
          splash.style.opacity = "0";
          splash.style.pointerEvents = "none";
          splash.style.transform = "scale(1.05)";
          setTimeout(() => {
            splash.style.display = "none";
            checkPasscodeOnLaunch();
          }, 420);
        }, 1900);
      }

      /* iPhone-Style Numeric Passcode Lock Controller */
      let currentEnteredPin = "";

      function checkPasscodeOnLaunch() {
        if (
          State.settings &&
          State.settings.passcode_enabled &&
          State.settings.passcode_pin
        ) {
          showPasscodeLockScreen();
        }
      }

      document.addEventListener("visibilitychange", () => {
        if (
          !document.hidden &&
          State.settings &&
          State.settings.passcode_enabled &&
          State.settings.passcode_pin
        ) {
          showPasscodeLockScreen();
        }
      });

      function showPasscodeLockScreen() {
        const overlay = document.getElementById("passcodeLockOverlay");
        if (!overlay) return;
        currentEnteredPin = "";
        updatePasscodeDotsDisplay();
        const errorMsg = document.getElementById("passcodeErrorMessage");
        if (errorMsg) errorMsg.textContent = "";
        overlay.classList.add("active");
      }

      function updatePasscodeDotsDisplay() {
        const dots = document.querySelectorAll("#passcodeDots .passcode-dot");
        dots.forEach((dot, idx) => {
          dot.classList.toggle("filled", idx < currentEnteredPin.length);
        });
      }

      function onPasscodeKeypadPress(key) {
        if (typeof SoundEngine !== "undefined") SoundEngine.play("click");
        if (typeof triggerHaptic === "function") triggerHaptic("light");

        const errorMsg = document.getElementById("passcodeErrorMessage");
        if (errorMsg) errorMsg.textContent = "";

        if (key === "back") {
          if (currentEnteredPin.length > 0) {
            currentEnteredPin = currentEnteredPin.slice(0, -1);
            updatePasscodeDotsDisplay();
          }
          return;
        }

        if (key === "cancel") {
          currentEnteredPin = "";
          updatePasscodeDotsDisplay();
          return;
        }

        if (currentEnteredPin.length < 4) {
          currentEnteredPin += key;
          updatePasscodeDotsDisplay();

          if (currentEnteredPin.length === 4) {
            setTimeout(verifyPasscodeAttempt, 120);
          }
        }
      }
      window.onPasscodeKeypadPress = onPasscodeKeypadPress;

      function verifyPasscodeAttempt() {
        const expectedPin = State.settings?.passcode_pin || "1234";
        const overlay = document.getElementById("passcodeLockOverlay");
        const dotsContainer = document.getElementById("passcodeDots");
        const errorMsg = document.getElementById("passcodeErrorMessage");

        if (currentEnteredPin === expectedPin) {
          if (typeof SoundEngine !== "undefined") SoundEngine.play("success");
          if (typeof triggerHaptic === "function") triggerHaptic("success");
          if (overlay) {
            overlay.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            overlay.style.opacity = "0";
            overlay.style.transform = "scale(0.96)";
            setTimeout(() => {
              overlay.classList.remove("active");
              overlay.style.opacity = "";
              overlay.style.transform = "";
            }, 320);
          }
          currentEnteredPin = "";
        } else {
          if (typeof SoundEngine !== "undefined") SoundEngine.play("delete");
          if (typeof triggerHaptic === "function") triggerHaptic("warning");
          if (dotsContainer) {
            dotsContainer.classList.add("shake-error");
            setTimeout(
              () => dotsContainer.classList.remove("shake-error"),
              450,
            );
          }
          if (errorMsg)
            errorMsg.textContent = "Mật khẩu không đúng, vui lòng thử lại";
          currentEnteredPin = "";
          setTimeout(updatePasscodeDotsDisplay, 300);
        }
      }

      /* Quick Note Preset Chips in Wizard Step 3 */
      window.setWizardQuickNote = (noteText) => {
        const input = document.getElementById("wizardNoteInput");
        if (!input) return;
        input.value = noteText;
        triggerHaptic("light");
        showToast(`Ghi chú: ${noteText}`);
      };

      /* Transactions Quick Filter Chips */
      window.setTxQuickChipFilter = (
        filterType,
        minAmt = null,
        maxAmt = null,
      ) => {
        triggerHaptic("light");
        if (!State.txFilterConfig) {
          State.txFilterConfig = {
            sort: "date_desc",
            type: "all",
            categoryId: "all",
            walletId: "all",
            period: "all",
            customStart: null,
            customEnd: null,
            minAmount: null,
            maxAmount: null,
            hasReceipt: false,
            hasLocation: false,
          };
        }
        if (filterType === "all") {
          State.txFilterConfig.type = "all";
          State.txFilterConfig.minAmount = null;
          State.txFilterConfig.maxAmount = null;
        } else if (
          filterType === "expense" ||
          filterType === "income" ||
          filterType === "work"
        ) {
          State.txFilterConfig.type = filterType;
          State.txFilterConfig.minAmount = null;
          State.txFilterConfig.maxAmount = null;
        } else if (filterType === "range") {
          State.txFilterConfig.minAmount = minAmt;
          State.txFilterConfig.maxAmount = maxAmt;
        }
        renderTransactionsScreen();
        document
          .querySelectorAll("#txQuickFilterChipsBar .tx-quick-chip")
          .forEach((c) => {
            const isMatch =
              c.dataset.qfilter === filterType &&
              (filterType !== "range" ||
                (c.dataset.qmin == minAmt && c.dataset.qmax == maxAmt));
            c.classList.toggle("active", isMatch);
          });
      };

      /* Daily Financial Spending Pulse (Hôm nay) */
      function renderTodaySpendingPulse() {
        const expenseEl = document.getElementById("overviewTodayExpense");
        const badgeEl = document.getElementById("overviewTodayStatusBadge");
        const countEl = document.getElementById("overviewTodayCount");
        if (!expenseEl || !badgeEl || !countEl) return;

        const todayStr = getTodayString();
        const todayExpenseTxs = State.transactions.filter(
          (t) => t.date === todayStr && t.type === "expense",
        );
        const todayExpense = todayExpenseTxs.reduce(
          (sum, t) => sum + (Number(t.amount) || 0),
          0,
        );
        const count = todayExpenseTxs.length;

        expenseEl.textContent =
          todayExpense > 0 ? "-" + formatVND(todayExpense) : "0 ₫";
        expenseEl.style.color =
          todayExpense > 0 ? "var(--expense)" : "var(--text-primary)";
        countEl.textContent = `${count} khoản chi`;

        // Monthly benchmark
        const thisMonthPrefix = todayStr.slice(0, 7);
        const monthExpenseTxs = State.transactions.filter(
          (t) => t.date.startsWith(thisMonthPrefix) && t.type === "expense",
        );
        const monthTotalExp = monthExpenseTxs.reduce(
          (sum, t) => sum + (Number(t.amount) || 0),
          0,
        );
        const dayNum = parseInt(todayStr.split("-")[2], 10) || 1;
        const avgDaily = dayNum > 0 ? Math.round(monthTotalExp / dayNum) : 0;

        if (todayExpense === 0) {
          badgeEl.textContent = "Chưa chi tiêu";
          badgeEl.style.background = "var(--income-bg)";
          badgeEl.style.color = "var(--income)";
        } else if (avgDaily > 0 && todayExpense <= avgDaily) {
          badgeEl.textContent = "Chi tiêu tốt (Dưới TB)";
          badgeEl.style.background = "var(--income-bg)";
          badgeEl.style.color = "var(--income)";
        } else if (avgDaily > 0 && todayExpense <= avgDaily * 1.3) {
          badgeEl.textContent = "Chi vừa phải";
          badgeEl.style.background = "var(--warning-bg)";
          badgeEl.style.color = "var(--warning)";
        } else {
          badgeEl.textContent = "Chi nhiều (Vượt TB)";
          badgeEl.style.background = "var(--expense-bg)";
          badgeEl.style.color = "var(--expense)";
        }
      }

      /* Anime.js Smooth Count-Up */
      function animateCountUp(element, endVal, prefix = "", suffix = " ₫") {
        if (!element) return;
        const numSpan = element.querySelector ? element.querySelector(".num") : null;
        const targetEl = numSpan || element;
        const startVal = parseVNDInput(targetEl.textContent) || 0;
        const targetVal = Number(endVal) || 0;
        if (startVal === targetVal || typeof anime === "undefined") {
          if (numSpan) {
            numSpan.textContent = formatNumberOnly(targetVal);
          } else {
            targetEl.textContent = prefix + formatNumberOnly(targetVal) + suffix;
          }
          return;
        }
        const obj = { val: startVal };
        anime({
          targets: obj,
          val: targetVal,
          round: 1,
          easing: "easeOutExpo",
          duration: 480,
          update: () => {
            if (numSpan) {
              numSpan.textContent = formatNumberOnly(obj.val);
            } else {
              targetEl.textContent = prefix + formatNumberOnly(obj.val) + suffix;
            }
          },
        });
      }

      function showToast(message, isError = false) {
        if (typeof SoundEngine !== "undefined" && SoundEngine.play) {
          SoundEngine.play("notify");
        }
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast-pill ${isError ? "error" : ""}`;
        toast.innerHTML = `
        <i data-lucide="${isError ? "alert-circle" : "check-circle"}" style="width: 17px; height: 17px; flex-shrink: 0;"></i>
        <span>${message}</span>
      `;
        container.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
          toast.classList.add("dismissing");
          setTimeout(() => toast.remove(), 350);
        }, 2600);
      }

      function showConfirmDialog(title, message, onConfirm) {
        const modal = document.getElementById("confirmDialogModal");
        document.getElementById("dialogTitle").textContent = title;
        document.getElementById("dialogMessage").textContent = message;
        modal.classList.add("active");

        const confirmBtn = document.getElementById("dialogConfirmBtn");
        const cancelBtn = document.getElementById("dialogCancelBtn");

        const cleanup = () => {
          modal.classList.remove("active");
          confirmBtn.onclick = null;
          cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
          cleanup();
          onConfirm();
        };
        cancelBtn.onclick = cleanup;
      }

      /* Kitbitz Vector Illustrations for Empty States */
      function getKitbitzEmptySvg(type = "tx") {
        if (type === "tx") {
          return `
          <div style="text-align: center; padding: 40px 20px;">
            <svg width="120" height="90" viewBox="0 0 120 90" fill="none" style="margin: 0 auto 12px; display: block;">
              <rect x="25" y="20" width="70" height="50" rx="14" fill="#E8F7F0" stroke="#2DA87B" stroke-width="2"/>
              <rect x="35" y="30" width="50" height="30" rx="8" fill="#FFFFFF" stroke="#2DA87B" stroke-width="1.5" stroke-dasharray="3 3"/>
              <circle cx="60" cy="45" r="7" fill="#2DA87B"/>
              <circle cx="85" cy="20" r="12" fill="#7FE0B8" opacity="0.6"/>
              <path d="M85 14L85 26M79 20L91 20" stroke="#0E3834" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Chưa có giao dịch nào</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); max-width: 260px; margin: 0 auto;">Nhấn nút + bên dưới để tạo khoản thu/chi đầu tiên của bạn.</div>
          </div>
        `;
        }
        return "";
      }

      /* Dynamic Blob Image Compression (Thấp <50KB, TB <100KB, Cao <200KB) */
      async function compressImageFile(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = async () => {
              const qualityMode =
                (State.settings && State.settings.image_quality) || "high";
              let maxDim =
                qualityMode === "low"
                  ? 700
                  : qualityMode === "medium"
                    ? 950
                    : 1200;
              let quality =
                qualityMode === "low"
                  ? 0.58
                  : qualityMode === "medium"
                    ? 0.68
                    : 0.75;
              let canvas = document.createElement("canvas");
              let ctx = canvas.getContext("2d");

              const scaleAndExportBlob = (targetDim, q) => {
                let w = img.width || 800;
                let h = img.height || 600;
                if (w > h) {
                  if (w > targetDim) {
                    h = Math.round((h * targetDim) / w);
                    w = targetDim;
                  }
                } else {
                  if (h > targetDim) {
                    w = Math.round((w * targetDim) / h);
                    h = targetDim;
                  }
                }
                canvas.width = Math.max(w, 1);
                canvas.height = Math.max(h, 1);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                return new Promise((res) => {
                  if (canvas.toBlob) {
                    canvas.toBlob(
                      (b) => {
                        if (b) res(b);
                        else {
                          try {
                            const dataUrl = canvas.toDataURL("image/jpeg", q);
                            fetch(dataUrl)
                              .then((r) => r.blob())
                              .then(res)
                              .catch(() =>
                                res(new Blob([], { type: "image/jpeg" })),
                              );
                          } catch (e) {
                            res(new Blob([], { type: "image/jpeg" }));
                          }
                        }
                      },
                      "image/jpeg",
                      q,
                    );
                  } else {
                    try {
                      const dataUrl = canvas.toDataURL("image/jpeg", q);
                      fetch(dataUrl)
                        .then((r) => r.blob())
                        .then(res)
                        .catch(() => res(new Blob([], { type: "image/jpeg" })));
                    } catch (e) {
                      res(new Blob([], { type: "image/jpeg" }));
                    }
                  }
                });
              };

              let blob = await scaleAndExportBlob(maxDim, quality);

              // Set MAX_BYTES strictly:
              // low: 50KB (51,200 bytes)
              // medium: 100KB (102,400 bytes)
              // high: 200KB (204,800 bytes)
              const MAX_BYTES =
                qualityMode === "low"
                  ? 50 * 1024
                  : qualityMode === "medium"
                    ? 100 * 1024
                    : 200 * 1024;
              const steps =
                qualityMode === "low"
                  ? [
                      { dim: 600, q: 0.5 },
                      { dim: 500, q: 0.42 },
                      { dim: 420, q: 0.35 },
                      { dim: 360, q: 0.28 },
                    ]
                  : qualityMode === "medium"
                    ? [
                        { dim: 850, q: 0.6 },
                        { dim: 700, q: 0.5 },
                        { dim: 550, q: 0.42 },
                        { dim: 450, q: 0.35 },
                      ]
                    : [
                        { dim: 1000, q: 0.68 },
                        { dim: 800, q: 0.6 },
                        { dim: 640, q: 0.5 },
                        { dim: 500, q: 0.4 },
                      ];

              let stepIdx = 0;
              while (blob.size > MAX_BYTES && stepIdx < steps.length) {
                const cfg = steps[stepIdx];
                blob = await scaleAndExportBlob(cfg.dim, cfg.q);
                stepIdx++;
              }

              // Convert to DataURL for IndexedDB storage
              const blobReader = new FileReader();
              blobReader.readAsDataURL(blob);
              blobReader.onloadend = () => {
                resolve({
                  dataUrl: blobReader.result,
                  blob: blob,
                  sizeBytes: blob.size,
                });
              };
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
      }

      /* Confetti Burst */
      function launchConfetti() {
        const canvas = document.getElementById("confettiCanvas");
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = [
          "#0E3834",
          "#2DA87B",
          "#7FE0B8",
          "#F16758",
          "#EBF3F1",
          "#FBBF24",
          "#60A5FA",
        ];

        for (let i = 0; i < 60; i++) {
          particles.push({
            x: canvas.width / 2,
            y: canvas.height * 0.7,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.85) * 16,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            opacity: 1,
          });
        }

        function animate() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          let active = false;

          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.38;
            p.rotation += p.rotationSpeed;
            p.opacity -= 0.015;

            if (p.opacity > 0) {
              active = true;
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate((p.rotation * Math.PI) / 180);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.opacity;
              ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
              ctx.restore();
            }
          });

          if (active) requestAnimationFrame(animate);
          else ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(animate);
      }

      /* ==========================================================================
       5. CORE DATA CALCULATIONS (ISOLATING ACTUAL VS FUTURE TRANSACTIONS)
       ========================================================================== */
      function calculateFinancialBalances() {
        const todayStr = getTodayString();
        const initBal = Number(State.settings.initial_balance) || 0;
        const initDate = State.settings.initial_balance_date || "2000-01-01";

        let actualIncome = 0;
        let actualExpense = 0;
        let futureIncome = 0;
        let futureExpense = 0;

        // Track wallet-specific balances
        const walletBalances = {};
        let totalWalletsInitial = 0;
        State.wallets.forEach((w) => {
          const wInit =
            w.initialBalance !== undefined && w.initialBalance !== null
              ? Number(w.initialBalance)
              : w.id === "w_cash"
                ? initBal
                : 0;
          walletBalances[w.id] = wInit;
          totalWalletsInitial += wInit;
        });

        State.transactions.forEach((tx) => {
          const amt = Number(tx.amount) || 0;
          const txDate = tx.date || todayStr;
          const isFuture = txDate > todayStr;

          // If transaction is internal transfer
          if (tx.type === "transfer") {
            if (!isFuture) {
              if (
                tx.fromWalletId &&
                walletBalances[tx.fromWalletId] !== undefined
              ) {
                walletBalances[tx.fromWalletId] -= amt;
              }
              if (
                tx.toWalletId &&
                walletBalances[tx.toWalletId] !== undefined
              ) {
                walletBalances[tx.toWalletId] += amt;
              }
            }
            return; // Transfers DO NOT affect global income or expense!
          }

          const wId = tx.walletId || "w_cash";

          if (tx.type === "income") {
            if (isFuture) {
              futureIncome += amt;
            } else {
              actualIncome += amt;
              if (walletBalances[wId] !== undefined) walletBalances[wId] += amt;
            }
          } else if (tx.type === "expense") {
            if (isFuture) {
              futureExpense += amt;
            } else {
              actualExpense += amt;
              if (walletBalances[wId] !== undefined) walletBalances[wId] -= amt;
            }
          }
        });

        const effectiveInit =
          totalWalletsInitial > 0 ? totalWalletsInitial : initBal;
        const currentAvailableBalance =
          effectiveInit + actualIncome - actualExpense;

        return {
          initialBalance: effectiveInit,
          currentAvailableBalance,
          actualIncome,
          actualExpense,
          futureIncome,
          futureExpense,
          walletBalances,
        };
      }

      /* Date Filtering Generator */
      function getDateRangeFilter(periodKey, customStart, customEnd) {
        const now = new Date();
        const todayStr = getTodayString();
        let startStr = todayStr;
        let endStr = todayStr;

        if (periodKey === "today") {
          startStr = todayStr;
          endStr = todayStr;
        } else if (periodKey === "7d") {
          const d = new Date();
          d.setDate(d.getDate() - 6);
          startStr = d.toISOString().split("T")[0];
          endStr = todayStr;
        } else if (periodKey === "30d") {
          const d = new Date();
          d.setDate(d.getDate() - 29);
          startStr = d.toISOString().split("T")[0];
          endStr = todayStr;
        } else if (periodKey === "6m") {
          const d = new Date();
          d.setMonth(d.getMonth() - 6);
          startStr = d.toISOString().split("T")[0];
          endStr = todayStr;
        } else if (periodKey === "12m") {
          const d = new Date();
          d.setFullYear(d.getFullYear() - 1);
          startStr = d.toISOString().split("T")[0];
          endStr = todayStr;
        } else if (periodKey === "this_month") {
          startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          const lastDay = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
          ).getDate();
          endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        } else if (periodKey === "last_month") {
          const prevMonthDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
          );
          const y = prevMonthDate.getFullYear();
          const m = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
          const lastDay = new Date(
            y,
            prevMonthDate.getMonth() + 1,
            0,
          ).getDate();
          startStr = `${y}-${m}-01`;
          endStr = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
        } else if (periodKey === "this_year") {
          startStr = `${now.getFullYear()}-01-01`;
          endStr = `${now.getFullYear()}-12-31`;
        } else if (periodKey === "all") {
          startStr = "2000-01-01";
          endStr = "2099-12-31";
        } else if (periodKey === "custom") {
          startStr = customStart || todayStr;
          endStr = customEnd || todayStr;
        }

        return { startStr, endStr };
      }


/* ==========================================================================
   SMART NATURAL LANGUAGE EXPENSE PARSER (GHI CHÉP THÔNG MINH 1 CHẠM & GHI CHÚ)
   ========================================================================== */

const KNOWN_CATEGORY_PREFIXES = [
  // Ăn uống
  "ăn sáng", "ăn trưa", "ăn tối", "ăn đêm", "ăn vặt", "cơm trưa", "cơm tối", "cơm tấm", "bữa sáng", "bữa trưa", "bữa tối",
  "ăn uống", "đồ ăn", "ăn", "cơm", "phở", "bún", "mì", "lẩu", "nướng",
  // Đồ uống
  "cà phê", "cafe", "trà sữa", "đồ uống", "nước uống", "nước ngọt", "nước ép", "sinh tố", "nước mía",
  // Xăng xe & Di chuyển
  "đổ xăng", "tiền xăng", "xăng xe", "xăng cộ", "gửi xe", "rửa xe", "sửa xe", "bảo dưỡng xe", "thay nhớt",
  "xe ôm", "vé xe", "vé tàu", "vé máy bay", "taxi", "grab", "be", "xăng", "xe", "di chuyển",
  // Mua sắm
  "mua sắm", "mua đồ", "siêu thị", "tạp hóa", "shopee", "lazada", "tiki", "mua", "sắm",
  // Hóa đơn & Nhà
  "tiền phòng", "tiền trọ", "tiền nhà", "tiền điện", "tiền nước", "tiền net", "tiền wifi", "hóa đơn", "tiền rác", "dịch vụ",
  // Sức khỏe & Thể thao
  "khám bệnh", "mua thuốc", "tiền thuốc", "nha khoa", "bác sĩ", "bệnh viện", "tập gym", "thể thao", "thuốc", "gym", "yoga", "cầu lông", "đá bóng", "bơi lội",
  // Học tập
  "học phí", "tiền học", "mua sách", "khóa học", "tài liệu", "học tập", "học", "sách",
  // Làm đẹp & Cá nhân
  "cắt tóc", "làm tóc", "gội đầu", "làm móng", "làm đẹp", "mỹ phẩm", "spa", "nail",
  // Thú cưng
  "thú cưng", "thú y", "tiền hạt", "mua pate", "chó mèo", "pet",
  // Công việc
  "tiếp khách", "công tác", "văn phòng phẩm", "in ấn",
  // Thu nhập
  "lương cứng", "tiền lương", "tiền thưởng", "hoa hồng", "làm thêm", "bán hàng", "thu nợ", "tiền về", "lương", "thưởng", "thu nhập", "lãi", "cổ tức",
  // Quà tặng
  "tiền mừng", "tiền cưới", "quà tặng", "quà biếu", "lì xì", "quà", "biếu", "tặng"
];

const COMMON_ITEM_TO_CATEGORY_MAP = {
  c_food: [
    "bánh mỳ", "bánh mì", "bún bò", "bún chả", "phở bò", "phở gà", "phở", "bún", "hủ tiếu", "hu tieu",
    "cơm tấm", "cơm sườn", "cơm gà", "cơm chiên", "cơm bình dân", "cơm văn phòng", "cơm trưa",
    "xôi", "bánh bao", "bánh cuốn", "cháo", "cháo lòng", "gà rán", "kfc", "jollibee", "lotteria",
    "lẩu", "đồ nướng", "bbq", "pizza", "burger", "mì cay", "ốc", "nem nướng", "bánh tráng",
    "trứng", "thịt", "rau", "cá", "hải sản", "trái cây", "hoa quả"
  ],
  c_coffee: [
    "trà sữa", "tra sua", "cà phê sữa", "cafe sữa", "đen đá", "bạc xỉu", "latte", "cappuccino",
    "matcha", "trà đào", "trà tắc", "trà dâu", "trà măng cụt", "nước mía", "sinh tố", "nước dừa",
    "nước ngọt", "coca", "pepsi", "bia", "rượu", "highlands", "starbucks", "phúc long", "koi thé", "mixue"
  ],
  c_transport: [
    "xăng", "đổ xăng", "gửi xe", "rửa xe", "bơm xe", "vá xe", "thay nhớt", "grab", "be", "gojek", "taxi", "mai linh", "vinataxi", "bus", "vé xe"
  ],
  c_shop: [
    "áo thun", "áo sơ mi", "áo khoác", "quần jean", "quần short", "giày", "dép", "balo", "túi xách", "mũ", "nón",
    "mỹ phẩm", "son", "kem chống nắng", "sữa rửa mặt", "dầu gội", "sữa tắm", "giấy vệ sinh", "nước giặt"
  ]
};

const CATEGORY_ALIASES = {
  c_coffee: ["cafe", "cà phê", "ca phe", "coffee"],
  c_food: ["ăn uống", "đồ ăn", "an uong"],
  c_transport: ["di chuyển & xăng", "di chuyển", "di chuyen", "xe cộ"],
  c_shop: ["mua sắm", "shopping", "mua sam"],
  c_bills: ["hóa đơn & tiện ích", "hóa đơn", "hoa don"],
  c_rent: ["tiền nhà", "tien nha", "tiền trọ", "tiền phòng"],
  c_health: ["y tế & sức khỏe", "sức khỏe", "suc khoe", "y tế"],
  c_salary: ["lương công ty", "tiền lương", "luong"],
  c_bonus: ["thưởng công việc", "tiền thưởng", "thuong"]
};

function segmentTextToCategoryAndNote(text, existingCategories = []) {
  const clean = text.replace(/[\s\-_,.:;]+/g, " ").trim();
  if (!clean) return { categoryName: "", note: "" };

  const lower = clean.toLowerCase();

  // 1. Match existing category names directly
  for (const c of existingCategories) {
    const cNameLower = c.name.toLowerCase();
    if (lower === cNameLower) {
      return { categoryName: c.name, note: clean, matchedCategory: c };
    }
    if (lower.startsWith(cNameLower + " ")) {
      const remaining = clean.substring(c.name.length).trim();
      return { categoryName: c.name, note: remaining || clean, matchedCategory: c };
    }
  }

  // 2. Check if starts with a known category prefix
  for (const prefix of KNOWN_CATEGORY_PREFIXES) {
    if (lower === prefix) {
      const capCat = clean.charAt(0).toUpperCase() + clean.slice(1);
      return { categoryName: capCat, note: capCat };
    }
    if (lower.startsWith(prefix + " ")) {
      const matchedPrefix = clean.substring(0, prefix.length).trim();
      const remaining = clean.substring(prefix.length).trim();
      const capCat = matchedPrefix.charAt(0).toUpperCase() + matchedPrefix.slice(1);
      return { categoryName: capCat, note: remaining };
    }
  }

  // 3. Check if whole text contains an item from COMMON_ITEM_TO_CATEGORY_MAP
  for (const [catId, items] of Object.entries(COMMON_ITEM_TO_CATEGORY_MAP)) {
    for (const item of items) {
      if (lower.includes(item)) {
        const catObj = existingCategories.find(c => c.id === catId);
        return {
          categoryName: catObj ? catObj.name : "Ăn uống",
          note: clean,
          matchedCategory: catObj || null
        };
      }
    }
  }

  // 4. Default: first 1-2 words might be candidate category, rest is note
  const words = clean.split(" ");
  if (words.length > 2) {
    const candidate = words.slice(0, 2).join(" ");
    const rest = words.slice(2).join(" ");
    return {
      categoryName: candidate.charAt(0).toUpperCase() + candidate.slice(1),
      note: rest || clean
    };
  }

  const cap = clean.charAt(0).toUpperCase() + clean.slice(1);
  return { categoryName: cap, note: cap };
}

function parseSmartExpenseText(inputStr, existingCategories = [], existingWallets = []) {
  if (!inputStr || typeof inputStr !== "string") return null;
  const raw = inputStr.trim();
  if (!raw) return null;

  const cats = existingCategories.length > 0 ? existingCategories : (State.categories || []);
  const wallets = existingWallets.length > 0 ? existingWallets : (State.wallets || []);

  let cleanText = " " + raw + " ";

  // 1. Detect Work
  const workRegex = /(?:^|\s+)(đi làm|di lam|công việc|cong viec|công ty|cong ty|cty|work|job)(?:\s+|$)/i;
  const isWork = workRegex.test(cleanText);
  if (isWork) cleanText = cleanText.replace(workRegex, " ");

  // 2. Detect Wallet
  let walletId = wallets.find(w => w.isDefault)?.id || wallets[0]?.id || "w_cash";
  const lowerForWallet = cleanText.toLowerCase();
  for (const w of wallets) {
    const wName = (w.name || "").toLowerCase();
    const wId = (w.id || "").toLowerCase();
    if (wId.includes("momo") || wName.includes("momo")) {
      if (lowerForWallet.includes("momo")) {
        walletId = w.id;
        cleanText = cleanText.replace(/(?:^|\s+)momo(?:\s+|$)/gi, " ");
        break;
      }
    }
    if (wName && lowerForWallet.includes(wName)) {
      walletId = w.id;
      cleanText = cleanText.replace(new RegExp("(?:^|\s+)" + wName + "(?:\s+|$)", "gi"), " ");
      break;
    }
  }
  cleanText = cleanText.replace(/(?:^|\s+)(?:ví|vi|ngân hàng|ngan hang|thẻ|the|vcb|mb|tech|vietcombank)(?:\s+|$)/gi, " ");

  // 3. Extract Amount & Split into beforeAmount & afterAmount
  let beforeAmount = "";
  let afterAmount = "";
  let amount = 0;

  const compoundMatch = cleanText.match(/(\d+)\s*(?:tr|triệu|m)\s*(\d+)(?:\s+|$)/i);
  if (compoundMatch) {
    const millions = parseInt(compoundMatch[1], 10) * 1000000;
    const hundreds = parseInt(compoundMatch[2].padEnd(6, "0").slice(0, 6), 10);
    amount = millions + hundreds;
    beforeAmount = cleanText.substring(0, compoundMatch.index).trim();
    afterAmount = cleanText.substring(compoundMatch.index + compoundMatch[0].length).trim();
  } else {
    const amountMatch = cleanText.match(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|m)?(?:\s+|$)/i);
    if (amountMatch) {
      let num = parseFloat(amountMatch[1].replace(/,/g, "."));
      const unit = (amountMatch[2] || "").toLowerCase();
      if (unit === "k" || unit === "nghìn" || unit === "ngàn") {
        num *= 1000;
      } else if (unit === "tr" || unit === "triệu" || unit === "m") {
        num *= 1000000;
      } else if (!unit && num < 1000) {
        num *= 1000;
      }
      amount = Math.round(num);
      beforeAmount = cleanText.substring(0, amountMatch.index).trim();
      afterAmount = cleanText.substring(amountMatch.index + amountMatch[0].length).trim();
    }
  }

  if (amount <= 0) return null;

  // 4. Detect Type
  let type = "expense";
  const incomeKeywords = ["lương", "luong", "thưởng", "thuong", "thu nợ", "nhận tiền", "tiền về", "thu nhập", "được cho", "lãi", "bán được"];
  const fullRemaining = (beforeAmount + " " + afterAmount).toLowerCase();
  for (const kw of incomeKeywords) {
    if (fullRemaining.includes(kw)) {
      type = "income";
      break;
    }
  }

  // 5. Intelligent Category & Note Segmentation
  let candidateCategoryName = "";
  let note = "";
  let matchedCategory = null;

  if (beforeAmount && afterAmount) {
    // e.g. "Ăn sáng 20k bánh mỳ chả cá quá ngon"
    // e.g. "Đổ xăng 50k cây xăng Petrolimex"
    const seg = segmentTextToCategoryAndNote(beforeAmount, cats);
    candidateCategoryName = seg.categoryName;
    note = afterAmount;
    if (seg.matchedCategory) matchedCategory = seg.matchedCategory;
  } else if (beforeAmount && !afterAmount) {
    // e.g. "Ăn sáng bánh mỳ 20k"
    // e.g. "Bánh mỳ chả cá 20k"
    const seg = segmentTextToCategoryAndNote(beforeAmount, cats);
    candidateCategoryName = seg.categoryName;
    note = seg.note;
    if (seg.matchedCategory) matchedCategory = seg.matchedCategory;
  } else if (!beforeAmount && afterAmount) {
    // e.g. "20k bánh mỳ chả cá quá ngon"
    const seg = segmentTextToCategoryAndNote(afterAmount, cats);
    candidateCategoryName = seg.categoryName;
    note = seg.note;
    if (seg.matchedCategory) matchedCategory = seg.matchedCategory;
  } else {
    candidateCategoryName = type === "income" ? "Thu nhập" : "Chi tiêu";
    note = candidateCategoryName;
  }

  if (note) {
    note = note.charAt(0).toUpperCase() + note.slice(1);
  }

  // Match existing category by direct name or alias
  if (!matchedCategory && candidateCategoryName) {
    const candLower = candidateCategoryName.toLowerCase().trim();
    for (const c of cats) {
      if (c.name.toLowerCase() === candLower) {
        matchedCategory = c;
        break;
      }
    }
    if (!matchedCategory) {
      for (const [catId, aliases] of Object.entries(CATEGORY_ALIASES)) {
        for (const a of aliases) {
          if (candLower === a) {
            const found = cats.find(c => c.id === catId);
            if (found) {
              matchedCategory = found;
              break;
            }
          }
        }
        if (matchedCategory) break;
      }
    }
  }

  // Check semantic suggestion if not matched
  let suggestedCategory = null;
  if (!matchedCategory) {
    const semanticMap = {
      c_transport: ["xăng", "đổ xăng", "grab", "be", "taxi", "gửi xe", "rửa xe", "nhớt", "bus", "vé xe", "đi lại"],
      c_coffee: ["cafe", "cà phê", "ca phe", "trà sữa", "tra sua", "highlands", "starbucks", "nước ép", "sinh tố"],
      c_food: ["ăn", "cơm", "phở", "bún", "mì", "trưa", "tối", "sáng", "bánh", "pizza", "lẩu", "đồ ăn", "gà rán"],
      c_shop: ["mua", "sắm", "shopee", "lazada", "tiki", "siêu thị", "quần", "áo", "giày", "dép", "mỹ phẩm"],
      c_bills: ["điện", "nước", "net", "wifi", "internet", "rác", "hóa đơn"],
      c_rent: ["tiền trọ", "tiền phòng", "tiền nhà", "thuê nhà", "phòng trọ"],
      c_health: ["thuốc", "khám", "bác sĩ", "bệnh viện", "y tế", "sức khỏe", "nha khoa"],
      c_edu: ["học phí", "sách", "khóa học", "học", "gia sư"],
      c_work_exp: ["tiếp khách", "công tác", "in ấn", "văn phòng phẩm"],
      c_salary: ["lương", "salary", "lương cứng"],
      c_bonus: ["thưởng", "bonus", "hoa hồng"],
      c_freelance: ["làm thêm", "freelance", "dự án ngoài"],
      c_invest: ["cổ tức", "lãi", "đầu tư", "chứng khoán"],
      c_gift: ["quà", "biếu", "lì xì", "mừng tuổi"]
    };
    const candLower = candidateCategoryName.toLowerCase();
    for (const [catId, kws] of Object.entries(semanticMap)) {
      for (const kw of kws) {
        if (candLower.includes(kw) || kw.includes(candLower)) {
          const found = cats.find(c => c.id === catId);
          if (found) {
            suggestedCategory = found;
            break;
          }
        }
      }
      if (suggestedCategory) break;
    }
  }

  const guessedAttributes = smartGuessCategoryAttributes(candidateCategoryName, type);

  return {
    amount,
    type,
    isWork,
    walletId,
    candidateCategoryName,
    note: note || candidateCategoryName,
    matchedCategory,
    suggestedCategory,
    guessedAttributes,
    rawInput: inputStr
  };
}

function smartGuessCategoryAttributes(name, type = "expense") {
  const lower = (name || "").toLowerCase().trim();
  const rules = [
    { kws: ["xăng", "đổ xăng", "dau", "dầu", "fuel", "gas"], icon: "fuel", color: "#F97316" },
    { kws: ["xe", "grab", "be", "taxi", "bus", "gửi xe", "rửa xe", "bảo dưỡng", "sửa xe", "nhớt", "vé xe"], icon: "car", color: "#3B82F6" },
    { kws: ["cafe", "cà phê", "trà sữa", "highlands", "starbucks", "nước ép", "sinh tố", "uống"], icon: "coffee", color: "#D97706" },
    { kws: ["cắt tóc", "barber", "tóc", "salon", "gội đầu", "móng", "nail", "spa", "làm đẹp"], icon: "scissors", color: "#EC4899" },
    { kws: ["sửa", "bảo trì", "thợ", "dụng cụ"], icon: "wrench", color: "#64748B" },
    { kws: ["gym", "thể thao", "fitness", "yoga", "chạy bộ", "bơi", "cầu lông", "đá bóng"], icon: "dumbbell", color: "#10B981" },
    { kws: ["mèo", "chó", "pet", "thú cưng", "thú y", "pate"], icon: "paw-print", color: "#F59E0B" },
    { kws: ["sách", "học", "khóa học", "tài liệu", "đọc"], icon: "book-open", color: "#0284C7" },
    { kws: ["ăn", "cơm", "phở", "bún", "mì", "bánh", "lẩu", "nướng", "đồ ăn", "pizza"], icon: "utensils", color: "#EF4444" },
    { kws: ["phim", "cinema", "vé", "rạp", "netflix"], icon: "film", color: "#8B5CF6" },
    { kws: ["game", "nạp", "steam"], icon: "gamepad-2", color: "#7C3AED" },
    { kws: ["du lịch", "khách sạn", "vé máy bay", "homestay"], icon: "plane", color: "#06B6D4" },
    { kws: ["quà", "biếu", "tặng", "sinh nhật"], icon: "gift", color: "#F43F5E" }
  ];

  for (const r of rules) {
    for (const kw of r.kws) {
      if (lower.includes(kw)) {
        return { icon: r.icon, color: r.color };
      }
    }
  }

  const fallbackColors = ["#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4", "#F97316", "#14B8A6"];
  const randomColor = fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
  return { icon: type === "income" ? "trending-up" : "tag", color: randomColor };
}

/* ==========================================================================
   FINANCIAL HEALTH SCORE ENGINE (CHỈ SỐ SỨC KHỎE TÀI CHÍNH 0 - 100)
   ========================================================================== */
function calculateFinancialHealth() {
  const txs = State.transactions || [];
  const now = new Date();
  const curMonthStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const monthTxs = txs.filter(t => t.date && t.date.startsWith(curMonthStr) && t.type !== "transfer");

  let inc = 0;
  let exp = 0;
  monthTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") inc += amt;
    else if (t.type === "expense") exp += amt;
  });

  // 1. Savings Rate Metric (40 pts max)
  let savingsRate = 0;
  let savingsScore = 0;
  if (inc > 0) {
    savingsRate = Math.max(0, Math.round(((inc - exp) / inc) * 100));
    if (savingsRate >= 35) savingsScore = 40;
    else if (savingsRate >= 20) savingsScore = 32;
    else if (savingsRate >= 10) savingsScore = 24;
    else if (savingsRate > 0) savingsScore = 16;
    else savingsScore = 5;
  } else {
    savingsRate = 0;
    savingsScore = exp > 0 ? 15 : 25;
  }

  // 2. Budget Discipline Metric (35 pts max)
  let budgetScore = 35;
  let budgetPercent = 0;
  const totalLimit = Number(State.settings && State.settings.monthly_budget) || State.monthlyBudgetLimit || 15000000;
  if (totalLimit > 0) {
    budgetPercent = Math.round((exp / totalLimit) * 100);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthPace = (dayOfMonth / daysInMonth) * 100;

    if (budgetPercent <= monthPace) budgetScore = 35;
    else if (budgetPercent <= monthPace + 15) budgetScore = 26;
    else if (budgetPercent <= 100) budgetScore = 18;
    else budgetScore = 8;
  }

  // 3. Activity & Consistency Metric (25 pts max)
  const activeDays = new Set(monthTxs.map(t => t.date)).size;
  const dayOfMonth = now.getDate();
  const consistencyRatio = dayOfMonth > 0 ? Math.min(1, activeDays / Math.min(dayOfMonth, 12)) : 1;
  const activityScore = Math.round(consistencyRatio * 25);

  const totalScore = Math.min(100, Math.max(10, savingsScore + budgetScore + activityScore));

  let status = "Vững Vàng";
  let badgeColor = "var(--primary)";
  let badgeBg = "var(--primary-light)";
  let advice = "Dòng tiền của bạn đang ổn định. Hãy duy trì thói quen ghi chép mỗi ngày!";

  if (inc === 0 && exp > 0) {
    status = budgetPercent >= 80 ? "Cảnh Báo" : "Chờ Thu Nhập";
    badgeColor = budgetPercent >= 80 ? "#EF4444" : "#F59E0B";
    badgeBg = budgetPercent >= 80 ? "rgba(239, 68, 68, 0.14)" : "rgba(245, 158, 11, 0.14)";
    advice = "Chưa ghi nhận thu nhập tháng này, đã chi " + formatVND(exp) + " (" + budgetPercent + "% hạn mức). Nhập lương hoặc thu nhập để cập nhật tỷ lệ tích lũy!";
  } else if (inc === 0 && exp === 0) {
    status = "Đầu Tháng";
    badgeColor = "var(--primary)";
    badgeBg = "var(--primary-light)";
    advice = "Chưa phát sinh giao dịch trong tháng. Hãy bắt đầu ghi chép chi tiêu đầu tiên!";
  } else if (totalScore >= 85) {
    status = "Xuất Sắc";
    badgeColor = "#10B981";
    badgeBg = "rgba(16, 185, 129, 0.14)";
    advice = "Tỷ lệ tích lũy " + savingsRate + "% vượt trội! Bạn đang tích lũy tài sản rất kỷ luật.";
  } else if (totalScore >= 70) {
    status = "Vững Vàng";
    badgeColor = "var(--mint)";
    badgeBg = "rgba(69, 184, 153, 0.14)";
    advice = "Duy trì nhịp độ chi tiêu cân đối. Đã có " + activeDays + " ngày phát sinh giao dịch được quản lý chặt chẽ.";
  } else if (totalScore >= 50) {
    status = "Cần Cân Đối";
    badgeColor = "#F59E0B";
    badgeBg = "rgba(245, 158, 11, 0.14)";
    advice = "Tốc độ chi tiêu đang chiếm gần hết thu nhập (" + (100 - savingsRate) + "%). Hãy giảm bớt các khoản mua sắm tùy hứng.";
  } else {
    status = "Cảnh Báo";
    badgeColor = "#EF4444";
    badgeBg = "rgba(239, 68, 68, 0.14)";
    advice = "Chi tiêu tháng này đang vượt quá thu nhập hoặc hạn mức ngân sách! Hãy xem lại các khoản chi lớn.";
  }

  return {
    score: totalScore,
    status,
    badgeColor,
    badgeBg,
    savingsRate,
    budgetPercent,
    advice,
    income: inc,
    expense: exp
  };
}
