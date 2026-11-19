      /* ==========================================================================
       15. APP BOOTSTRAP
       ========================================================================== */
      window.addEventListener("DOMContentLoaded", async () => {
        initSplashScreen();
        initSwipeToApply();
        initEventListeners();
        await seedDefaultData();
        await loadAllDataFromIndexedDB();
        initServiceWorker();
      });

      /* ==========================================================================
       16. SERVICE WORKER & 100% OFFLINE PWA CONTROLLER
       ========================================================================== */
      let deferredPwaInstallPrompt = null;
      let swRegistration = null;

      async function initServiceWorker() {
        if (!("serviceWorker" in navigator)) {
          const badge = document.getElementById("pwaOfflineStatusBadge");
          if (badge)
            badge.textContent = "Trình duyệt không hỗ trợ Service Worker";
          return;
        }

        try {
          // Register sw.js (primary) or workers.js (fallback)
          swRegistration = await navigator.serviceWorker.register("./sw.js", {
            scope: "./",
          });
          console.log(
            "[FinMaster SW] Service Worker đăng ký thành công! Scope:",
            swRegistration.scope,
          );

          // Update status badge in Settings
          const badge = document.getElementById("pwaOfflineStatusBadge");
          if (badge) {
            badge.textContent = "✓ Service Worker: Sẵn sàng dùng 100% Offline";
          }

          // Listen for updates
          swRegistration.onupdatefound = () => {
            const installingWorker = swRegistration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  showToast(
                    "Đã có bản cập nhật offline mới! Đang đồng bộ...",
                    false,
                  );
                }
              };
            }
          };
        } catch (err) {
          console.warn("[FinMaster SW] Thử lại với workers.js:", err);
          try {
            swRegistration = await navigator.serviceWorker.register(
              "./workers.js",
              { scope: "./" },
            );
            console.log("[FinMaster SW] workers.js đã đăng ký thành công!");
          } catch (e2) {
            console.error("[FinMaster SW] Lỗi khi đăng ký Service Worker:", e2);
          }
        }

        // Check online / offline status
        window.addEventListener("online", () => {
          showToast("Đã kết nối mạng trở lại");
          const badge = document.getElementById("pwaOfflineStatusBadge");
          if (badge)
            badge.textContent = "✓ Trực tuyến · Service Worker sẵn sàng";
        });

        window.addEventListener("offline", () => {
          showToast("Đang hoạt động ngoại tuyến (Offline)");
          const badge = document.getElementById("pwaOfflineStatusBadge");
          if (badge)
            badge.textContent =
              "⚡ Đang ngoại tuyến · Dữ liệu lưu cục bộ an toàn";
        });

        // PWA Install Prompt Capture (BeforeInstallPrompt)
        window.addEventListener("beforeinstallprompt", (e) => {
          e.preventDefault();
          deferredPwaInstallPrompt = e;
          const installBtn = document.getElementById("pwaManualInstallBtn");
          if (installBtn) {
            installBtn.style.display = "inline-flex";
            installBtn.onclick = async () => {
              if (!deferredPwaInstallPrompt) return;
              deferredPwaInstallPrompt.prompt();
              const { outcome } = await deferredPwaInstallPrompt.userChoice;
              if (outcome === "accepted") {
                showToast("Đang cài đặt FinMaster lên màn hình chính!");
              }
              deferredPwaInstallPrompt = null;
              installBtn.style.display = "none";
            };
          }
        });

        // Manual Cache Update Check Button
        document
          .getElementById("checkSwUpdateBtn")
          ?.addEventListener("click", async () => {
            if (swRegistration) {
              showToast("Đang kiểm tra bản cập nhật offline...");
              try {
                await swRegistration.update();
                showToast(
                  "Bộ nhớ đệm Service Worker đã được đồng bộ mới nhất!",
                );
              } catch {
                showToast("Đang dùng phiên bản ngoại tuyến hiện tại!");
              }
            } else {
              showToast("Đang kích hoạt Service Worker...");
              initServiceWorker();
            }
          });
      }