      /* ==========================================================================
       11. FULL-SCREEN 4-STEP TRANSACTION WIZARD CONTROLLER & LIVE CAMERA SCANNER
       ========================================================================== */
      let cameraMediaStream = null;
      let cameraFacingMode = "environment"; // 'environment' (sau) hoặc 'user' (trước)
      let isCameraStarting = false;
      let cameraSessionToken = 0; // Token chống race condition và rò rỉ camera nền

      async function startLiveCamera() {
        const currentToken = ++cameraSessionToken;
        const video = document.getElementById("cameraVideo");
        const fallbackBox = document.getElementById("cameraFallbackBox");
        const laser = document.getElementById("cameraScanLaser");
        const statusText = document.getElementById("cameraStatusText");

        // Nếu không còn ở bước 1 hoặc form đã đóng thì không khởi động camera
        const wizardOverlay = document.getElementById("txWizardOverlay");
        if (
          State.wizardStep !== 1 ||
          !wizardOverlay?.classList.contains("active")
        ) {
          stopLiveCamera();
          return;
        }

        // Nếu camera đang chạy mượt mà đúng luồng rồi thì không cần xin lại quyền
        if (
          cameraMediaStream &&
          cameraMediaStream.active &&
          video &&
          video.srcObject === cameraMediaStream
        ) {
          if (fallbackBox) fallbackBox.style.display = "none";
          if (laser) laser.style.display = "block";
          if (statusText) statusText.textContent = "Camera trực tiếp";
          return;
        }

        // Dừng luồng cũ trước khi tạo luồng mới
        if (cameraMediaStream) {
          try {
            cameraMediaStream.getTracks().forEach((t) => t.stop());
          } catch (e) {}
          cameraMediaStream = null;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (fallbackBox) fallbackBox.style.display = "flex";
          if (laser) laser.style.display = "none";
          if (statusText) statusText.textContent = "Camera không hỗ trợ";
          const msg = document.getElementById("cameraFallbackMsg");
          if (msg)
            msg.textContent =
              "Thiết bị hoặc trình duyệt không hỗ trợ mở camera trực tiếp. Bạn hãy chọn ảnh từ thư viện.";
          return;
        }

        isCameraStarting = true;
        if (fallbackBox) fallbackBox.style.display = "none";
        if (laser) laser.style.display = "block";
        if (statusText) statusText.textContent = "Đang mở camera...";

        try {
          const constraints = {
            video: {
              facingMode: { ideal: cameraFacingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          };

          let stream = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (errConstraints) {
            // Dự phòng: Nếu webcam máy tính không hỗ trợ facingMode hoặc độ phân giải cao
            console.warn(
              "Detailed camera constraints failed, falling back to simple video: true",
              errConstraints,
            );
            if (
              errConstraints.name === "NotAllowedError" ||
              errConstraints.name === "PermissionDeniedError"
            ) {
              throw errConstraints;
            }
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }

          // KIỂM TRA QUAN TRỌNG: Nếu người dùng đã bấm "Bỏ qua", chụp ảnh hoặc chuyển sang Bước 2 trong khi camera đang load
          if (
            currentToken !== cameraSessionToken ||
            State.wizardStep !== 1 ||
            !wizardOverlay?.classList.contains("active")
          ) {
            // Ngay lập tức tắt toàn bộ luồng camera phần cứng để không bao giờ chạy ngầm!
            stream.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch (e) {}
            });
            isCameraStarting = false;
            return;
          }

          cameraMediaStream = stream;

          if (video) {
            video.muted = true;
            video.playsInline = true;
            video.setAttribute("playsinline", "true");
            video.setAttribute("muted", "true");
            video.srcObject = stream;

            // Chờ video sẵn sàng metadata trước khi play để tránh lỗi AbortError
            await new Promise((resolve) => {
              if (video.readyState >= 1) {
                resolve();
              } else {
                video.onloadedmetadata = () => resolve();
                setTimeout(resolve, 800);
              }
            });

            // Kiểm tra lại trạng thái trước khi phát
            if (currentToken !== cameraSessionToken || State.wizardStep !== 1) {
              stopLiveCamera();
              return;
            }

            try {
              await video.play();
            } catch (playErr) {
              if (playErr.name === "AbortError") {
                // Bị gián đoạn bởi điều hướng mới, không phải lỗi quyền
                isCameraStarting = false;
                return;
              }
              console.warn("Live camera play warning:", playErr);
            }

            if (statusText) statusText.textContent = "Camera trực tiếp";
            if (fallbackBox) fallbackBox.style.display = "none";
          }
        } catch (err) {
          // Nếu phiên camera đã bị hủy do user chuyển bước thì bỏ qua không báo lỗi
          if (currentToken !== cameraSessionToken || State.wizardStep !== 1) {
            isCameraStarting = false;
            return;
          }

          console.warn("Live camera stream error:", err);
          if (err.name === "AbortError") {
            // Lỗi do tải mới ngắt quãng, không hiển thị hộp báo lỗi
            isCameraStarting = false;
            return;
          }

          if (fallbackBox) {
            fallbackBox.style.display = "flex";
            const msg = document.getElementById("cameraFallbackMsg");
            const localhostBtn = document.getElementById("switchLocalhostBtn");
            if (localhostBtn) {
              localhostBtn.style.display =
                window.location.hostname === "127.0.0.1" ? "flex" : "none";
            }
            if (msg) {
              if (
                err.name === "NotAllowedError" ||
                err.name === "PermissionDeniedError"
              ) {
                msg.innerHTML =
                  'Quyền Camera đang bị <b>chặn trên trình duyệt</b>.<br>1. Nhấn biểu tượng ⚙️ hoặc 🔒 ở đầu thanh địa chỉ URL.<br>2. Bật <b>Cho phép (Allow)</b> Camera.<br><i>Hoặc bấm "Chụp ảnh trực tiếp" bên dưới để dùng máy ảnh máy tính/điện thoại!</i>';
              } else if (
                err.name === "NotFoundError" ||
                err.name === "DevicesNotFoundError"
              ) {
                msg.textContent =
                  "Không tìm thấy thiết bị camera trên máy. Bạn có thể chụp ảnh hoặc chọn ảnh từ thư viện.";
              } else if (
                err.name === "NotReadableError" ||
                err.name === "TrackStartError"
              ) {
                msg.textContent =
                  "Camera đang bị ứng dụng khác sử dụng (Zoom, Teams...). Vui lòng tắt app đó hoặc chụp ảnh trực tiếp.";
              } else {
                msg.textContent =
                  'Không thể mở luồng camera. Bạn có thể bấm "Chụp ảnh trực tiếp" hoặc chọn ảnh từ thư viện.';
              }
            }
          }
          if (laser) laser.style.display = "none";
          if (statusText) statusText.textContent = "Chưa mở được camera";
        } finally {
          isCameraStarting = false;
        }
      }

      function stopLiveCamera() {
        cameraSessionToken++;
        isCameraStarting = false;

        if (cameraMediaStream) {
          try {
            cameraMediaStream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (e) {}
            });
          } catch (e) {
            console.warn("Error stopping camera tracks:", e);
          }
          cameraMediaStream = null;
        }

        const video = document.getElementById("cameraVideo");
        if (video) {
          try {
            video.pause();
          } catch (e) {}
          video.srcObject = null;
        }

        const laser = document.getElementById("cameraScanLaser");
        if (laser) laser.style.display = "none";
      }

      async function flipCameraFacingMode() {
        cameraFacingMode =
          cameraFacingMode === "environment" ? "user" : "environment";
        stopLiveCamera();
        await startLiveCamera();
      }

      async function takeLiveCameraSnapshot() {
        const video = document.getElementById("cameraVideo");
        if (!video || !video.videoWidth || !video.videoHeight) {
          stopLiveCamera();
          const cam = document.getElementById("cameraFileInput");
          if (cam) cam.click();
          return;
        }

        try {
          if (navigator.vibrate) navigator.vibrate(30);
          const flashEl = document.getElementById("cameraShutterFlash");
          if (flashEl) {
            flashEl.style.opacity = "0.9";
            setTimeout(() => {
              flashEl.style.opacity = "0";
            }, 180);
          }

          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // KHÓA VÀ TẮT NGAY CAMERA PHẦN CỨNG sau khi đã chụp xong khung hình!
          stopLiveCamera();

          const exportBlobOrFallback = () => {
            return new Promise((resolve) => {
              if (canvas.toBlob) {
                canvas.toBlob(
                  (b) => {
                    if (b) resolve(b);
                    else {
                      try {
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
                        fetch(dataUrl)
                          .then((r) => r.blob())
                          .then(resolve)
                          .catch(() => resolve(null));
                      } catch (e) {
                        resolve(null);
                      }
                    }
                  },
                  "image/jpeg",
                  0.92,
                );
              } else {
                try {
                  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
                  fetch(dataUrl)
                    .then((r) => r.blob())
                    .then(resolve)
                    .catch(() => resolve(null));
                } catch (e) {
                  resolve(null);
                }
              }
            });
          };

          const blob = await exportBlobOrFallback();
          if (blob) {
            await handleReceiptImageSelected(blob);
          } else {
            goToWizardStep(2);
          }
        } catch (err) {
          console.error("Snapshot capture error:", err);
          stopLiveCamera();
          goToWizardStep(2);
        }
      }

      function openTransactionWizard(
        existingTxId = null,
        autoLaunchCamera = true,
        defaults = {},
      ) {
        State.editingTxId = existingTxId;
        State.wizardAmountRaw = "0";
        State.wizardReceiptBlob = null;
        State.wizardReceiptDataUrl = null;
        State.wizardLocation = null;
        State.wizardStep = 0; // Đặt về 0 để tránh resetReceiptPreview gọi đúp startLiveCamera

        const overlay = document.getElementById("txWizardOverlay");
        overlay.classList.add("active");

        populateWalletOptions();

        const locInput = document.getElementById("wizardLocationInput");
        const locStatus = document.getElementById("locationStatusText");
        const clearLocBtn = document.getElementById("clearLocationBtn");

        if (existingTxId) {
          // CHẾ ĐỘ CHỈNH SỬA GIAO DỊCH
          const tx = State.transactions.find((t) => t.id === existingTxId);
          if (tx) {
            State.wizardType = tx.type;
            State.wizardAmountRaw = String(tx.amount || 0);
            State.wizardCategoryId = tx.categoryId;
            State.wizardReceiptDataUrl = tx.receipt || null;

            document.getElementById("wizardDateInput").value = tx.date;
            document.getElementById("wizardWalletSelect").value =
              tx.walletId || "w_cash";
            document.getElementById("wizardNoteInput").value = tx.note || "";
            document.getElementById("wizardIsWorkToggle").checked =
              tx.isWork || false;

            // Vị trí
            if (tx.location) {
              if (typeof tx.location === "object") {
                State.wizardLocation = { ...tx.location };
                if (locInput) locInput.value = tx.location.address || "";
              } else {
                State.wizardLocation = {
                  address: String(tx.location),
                  lat: null,
                  lng: null,
                };
                if (locInput) locInput.value = String(tx.location);
              }
              if (clearLocBtn) clearLocBtn.style.display = "block";
              if (locStatus)
                locStatus.innerHTML =
                  '<span style="color: var(--income); font-weight: 600;">✓ Vị trí đã lưu cho giao dịch này</span>';
            } else {
              if (locInput) locInput.value = "";
              if (clearLocBtn) clearLocBtn.style.display = "none";
              if (locStatus)
                locStatus.innerHTML =
                  '<span>Nhấn "Định vị GPS" để tự động nhận diện tên đường & phường</span>';
            }

            // Ảnh hóa đơn
            if (tx.receipt) {
              const prevFull = document.getElementById("receiptPreviewFull");
              const previewBox = document.getElementById("receiptPreviewBox");
              const liveSection = document.getElementById("cameraLiveSection");
              if (liveSection) liveSection.style.display = "none";
              if (prevFull) {
                prevFull.src = tx.receipt;
                prevFull.style.display = "block";
              }
              if (previewBox) previewBox.style.display = "flex";
            } else {
              resetReceiptPreview();
            }

            updateWizardTypeCards();
            updateWizardAmountDisplay();
            renderWizardCategoryGrid();

            // Chuyển thẳng đến bước 3 để xem và sửa thông tin
            goToWizardStep(3);
          }
        } else {
          // CHẾ ĐỘ TẠO MỚI GIAO DỊCH (ĐỒNG BỘ THEO MÀN HÌNH ĐANG ĐỨNG)
          State.wizardType = defaults.type || "expense";
          State.wizardCategoryId =
            defaults.categoryId ||
            State.categories.find((c) => c.type === State.wizardType)?.id ||
            null;
          document.getElementById("wizardDateInput").value =
            defaults.date || getTodayString();
          document.getElementById("wizardNoteInput").value =
            defaults.note || "";
          document.getElementById("wizardIsWorkToggle").checked =
            defaults.isWork !== undefined
              ? defaults.isWork
              : State.activeTab === "work";
          if (defaults.walletId) {
            const wSel = document.getElementById("wizardWalletSelect");
            if (wSel) wSel.value = defaults.walletId;
          }
          if (locInput) locInput.value = "";
          if (clearLocBtn) clearLocBtn.style.display = "none";
          if (locStatus)
            locStatus.innerHTML =
              '<span>Nhấn "Định vị GPS" để tự động nhận diện tên đường & phường</span>';
          resetReceiptPreview();

          updateWizardTypeCards();
          updateWizardAmountDisplay();
          renderWizardCategoryGrid();

          // Kích hoạt định vị GPS ngầm để chuẩn bị sẵn địa chỉ
          detectCurrentLocation();

          // Bắt đầu từ Bước 1: Yêu cầu mở Camera Scanner trực tiếp
          goToWizardStep(1);
        }

        resetSwipeSlider();
        lucide.createIcons();
      }

      function closeTransactionWizard() {
        stopLiveCamera();
        document.getElementById("txWizardOverlay").classList.remove("active");
        resetSwipeSlider();
      }

      function goToWizardStep(stepNum) {
        State.wizardStep = stepNum;

        // Update Header Title Badge & Progress Dots
        const titleBadge = document.getElementById("wizardStepTitleBadge");
        const dots = [
          document.getElementById("dotStep1"),
          document.getElementById("dotStep2"),
          document.getElementById("dotStep3"),
          document.getElementById("dotStep4"),
        ];

        dots.forEach((dot, idx) => {
          if (dot) {
            dot.className =
              "wizard-step-dot" + (idx + 1 <= stepNum ? " active" : "");
          }
        });

        const standardHeader = document.getElementById("standardWizardHeader");
        const wizardBody = document.getElementById("wizardMainBody");

        if (wizardBody) {
          wizardBody.scrollLeft = 0;
          wizardBody.scrollTop = 0;
        }

        // Bước 1 toàn màn hình camera (ẩn standard header, xóa padding)
        if (stepNum === 1) {
          if (standardHeader) standardHeader.style.display = "none";
          if (wizardBody) wizardBody.className = "wizard-body step1-body";
          if (!State.wizardReceiptDataUrl) {
            startLiveCamera();
          }
        } else {
          stopLiveCamera();
          if (standardHeader) standardHeader.style.display = "flex";
          if (wizardBody) wizardBody.className = "wizard-body";
        }

        if (stepNum === 2) {
          if (titleBadge) titleBadge.textContent = "BƯỚC 2 / 4 · PHÂN LOẠI";
          updateWizardTypeCards();
        } else if (stepNum === 3) {
          if (titleBadge) titleBadge.textContent = "BƯỚC 3 / 4 · CHI TIẾT";
          updateWizardTypeCards();
          updateWizardAmountDisplay();
          renderWizardCategoryGrid();
          const step3Status = document.getElementById("step3ReceiptStatusText");
          if (step3Status) {
            step3Status.textContent = State.wizardReceiptDataUrl
              ? "Đã đính kèm ảnh"
              : "Chưa có ảnh";
          }
        } else if (stepNum === 4) {
          if (titleBadge) titleBadge.textContent = "BƯỚC 4 / 4 · XÁC NHẬN";
          populateWizardReviewCard();
          resetSwipeSlider();
        }

        // Smooth step view transition using Anime.js
        const views = [
          document.getElementById("wizardStep1"),
          document.getElementById("wizardStep2"),
          document.getElementById("wizardStep3"),
          document.getElementById("wizardStep4"),
        ];

        views.forEach((v, idx) => {
          if (!v) return;
          if (idx + 1 === stepNum) {
            v.classList.add("active");
            v.style.display = "flex";
            v.scrollLeft = 0;
            if (wizardBody) wizardBody.scrollLeft = 0;
            if (window.anime) {
              anime({
                targets: v,
                opacity: [0, 1],
                translateY: [8, 0],
                duration: 220,
                easing: "easeOutQuad",
              });
            }
          } else {
            v.classList.remove("active");
            v.style.display = "none";
          }
        });

        lucide.createIcons();
      }

      /* ĐỊNH VỊ VỊ TRÍ GIAO DỊCH: TỰ ĐỘNG NHẬN DIỆN TÊN ĐƯỜNG + TÊN PHƯỜNG */
      window.reverseGeocodeVietnamese = reverseGeocodeVietnamese;
      async function reverseGeocodeVietnamese(lat, lng) {
        // 1. Dùng OpenStreetMap Nominatim tiếng Việt
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;
          const res = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};

            // Tên đường (road / pedestrian / street)
            let road =
              addr.road ||
              addr.pedestrian ||
              addr.street ||
              addr.highway ||
              addr.path ||
              addr.footway ||
              "";

            // Tên phường / Xã / Thị trấn (suburb / quarter / neighbourhood)
            let ward =
              addr.suburb ||
              addr.quarter ||
              addr.neighbourhood ||
              addr.village ||
              addr.hamlet ||
              addr.town ||
              "";

            // Quận / Huyện
            let district =
              addr.city_district || addr.district || addr.county || "";

            // Tỉnh / Thành phố
            let city = addr.city || addr.province || addr.state || "";

            // Chuẩn hóa tiền tố tên đường tiếng Việt
            if (road) {
              road = road.trim();
              const lowerRoad = road.toLowerCase();
              if (
                !lowerRoad.startsWith("đường") &&
                !lowerRoad.startsWith("phố") &&
                !lowerRoad.startsWith("hẻm") &&
                !lowerRoad.startsWith("ngõ") &&
                !lowerRoad.startsWith("đại lộ") &&
                !lowerRoad.startsWith("ql")
              ) {
                road = "Đường " + road;
              }
            }

            // Chuẩn hóa tiền tố tên phường tiếng Việt
            if (ward) {
              ward = ward.trim();
              const lowerWard = ward.toLowerCase();
              if (
                !lowerWard.startsWith("phường") &&
                !lowerWard.startsWith("xã") &&
                !lowerWard.startsWith("thị trấn")
              ) {
                ward = "Phường " + ward;
              }
            }

            let formatted = "";
            if (road && ward) {
              formatted = `${road}, ${ward}`;
            } else if (road && district) {
              formatted = `${road}, ${district}`;
            } else if (ward && district) {
              formatted = `${ward}, ${district}`;
            } else if (road) {
              formatted = road;
            } else if (ward) {
              formatted = ward;
            } else if (data.display_name) {
              const parts = data.display_name.split(",").map((p) => p.trim());
              formatted = parts.slice(0, 2).join(", ");
            } else {
              formatted = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }

            return { address: formatted, road, ward, district, city };
          }
        } catch (err) {
          console.warn(
            "Nominatim reverse geocode failed, trying fallback:",
            err,
          );
        }

        // 2. Dự phòng: BigDataCloud Reverse Geocoding Client API
        try {
          const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
          const bdcRes = await fetch(bdcUrl);
          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            const locality = bdcData.locality || "";
            const city = bdcData.city || bdcData.principalSubdivision || "";
            let ward = locality;
            if (
              ward &&
              !ward.toLowerCase().startsWith("phường") &&
              !ward.toLowerCase().startsWith("xã")
            ) {
              ward = "Phường " + ward;
            }
            const formatted = ward
              ? city
                ? `${ward}, ${city}`
                : ward
              : `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            return { address: formatted, road: "", ward, district: city, city };
          }
        } catch (err2) {
          console.warn("BigDataCloud reverse geocode failed:", err2);
        }

        return {
          address: `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          road: "",
          ward: "",
          district: "",
          city: "",
        };
      }

      async function detectCurrentLocation() {
        const btn = document.getElementById("detectLocationBtn");
        const locInput = document.getElementById("wizardLocationInput");
        const locStatus = document.getElementById("locationStatusText");
        const clearBtn = document.getElementById("clearLocationBtn");

        if (!navigator.geolocation) {
          showToast("Trình duyệt không hỗ trợ định vị GPS!", true);
          if (locStatus)
            locStatus.innerHTML =
              '<span style="color: var(--expense);">Trình duyệt không hỗ trợ Geolocation.</span>';
          return;
        }

        if (btn) {
          btn.disabled = true;
          btn.innerHTML =
            '<i data-lucide="loader-2" class="spin" style="width: 10px; height: 10px;"></i> Dò...';
        }
        if (locStatus) {
          locStatus.innerHTML =
            '<span style="color: var(--mint); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="crosshair" style="width: 12px; height: 12px;"></i> Đang kết nối vệ tinh GPS...</span>';
        }
        lucide.createIcons();

        const geoOptions = {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 10000,
        };

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            if (locStatus) {
              locStatus.innerHTML =
                '<span style="color: var(--mint); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> Đang nhận diện tên đường & phường...</span>';
              lucide.createIcons();
            }

            try {
              const locResult = await reverseGeocodeVietnamese(lat, lng);
              State.wizardLocation = {
                address: locResult.address,
                road: locResult.road,
                ward: locResult.ward,
                district: locResult.district,
                city: locResult.city,
                lat: lat,
                lng: lng,
              };

              if (locInput) locInput.value = locResult.address;
              if (clearBtn) clearBtn.style.display = "block";
              if (locStatus) {
                locStatus.innerHTML = `<span style="color: var(--income); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> Đã định vị: ${locResult.address}</span>`;
              }

              showToast(`Đã định vị: ${locResult.address}`);
            } catch (err) {
              console.error("Geocoding error:", err);
              const fallbackAddr = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
              State.wizardLocation = { address: fallbackAddr, lat, lng };
              if (locInput) locInput.value = fallbackAddr;
              if (clearBtn) clearBtn.style.display = "block";
              if (locStatus) {
                locStatus.innerHTML = `<span style="color: var(--text-secondary);">Đã lấy tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)}). Bạn có thể nhập thêm tên đường & phường.</span>`;
              }
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.innerHTML =
                  '<i data-lucide="crosshair" style="width: 10px; height: 10px;"></i> GPS';
              }
              lucide.createIcons();
            }
          },
          (error) => {
            console.warn("Geolocation error:", error);
            if (btn) {
              btn.disabled = false;
              btn.innerHTML =
                '<i data-lucide="crosshair" style="width: 10px; height: 10px;"></i> GPS';
            }

            let errMsg = "Không thể lấy vị trí GPS!";
            if (error.code === 1)
              errMsg = "Vui lòng cấp quyền truy cập vị trí cho trình duyệt!";
            else if (error.code === 2)
              errMsg = "Không xác định được vị trí GPS hiện tại!";
            else if (error.code === 3)
              errMsg = "Quá thời gian kết nối GPS, vui lòng thử lại!";

            showToast(errMsg, true);
            if (locStatus) {
              locStatus.innerHTML = `<span style="color: var(--expense);">${errMsg} Bạn có thể nhập tay địa chỉ bên trên.</span>`;
            }
            lucide.createIcons();
          },
          geoOptions,
        );
      }

      function resetReceiptPreview() {
        State.wizardReceiptBlob = null;
        State.wizardReceiptDataUrl = null;
        const prevFull = document.getElementById("receiptPreviewFull");
        if (prevFull) {
          prevFull.src = "";
          prevFull.style.display = "none";
        }
        const previewBox = document.getElementById("receiptPreviewBox");
        if (previewBox) previewBox.style.display = "none";
        const liveSection = document.getElementById("cameraLiveSection");
        if (liveSection) liveSection.style.display = "block";
        const cam = document.getElementById("cameraFileInput");
        if (cam) cam.value = "";
        const gal = document.getElementById("galleryFileInput");
        if (gal) gal.value = "";
        const step3Status = document.getElementById("step3ReceiptStatusText");
        if (step3Status) step3Status.textContent = "Chưa có ảnh hóa đơn";

        if (State.wizardStep === 1) {
          startLiveCamera();
        }
      }

      let step1AutoAdvanceTimer = null;
      async function handleReceiptImageSelected(file) {
        if (!file) return;
        showToast("Đang tối ưu hóa hóa đơn...");
        stopLiveCamera();

        try {
          const compressed = await compressImageFile(file);
          State.wizardReceiptBlob = compressed.blob;
          State.wizardReceiptDataUrl = compressed.dataUrl;

          const prevFull = document.getElementById("receiptPreviewFull");
          const previewBox = document.getElementById("receiptPreviewBox");
          const liveSection = document.getElementById("cameraLiveSection");
          const sizeBadge = document.getElementById("receiptSizeBadge");

          if (liveSection) liveSection.style.display = "none";
          if (prevFull) {
            prevFull.src = compressed.dataUrl;
            prevFull.style.display = "block";
          }
          if (previewBox) previewBox.style.display = "flex";
          if (sizeBadge)
            sizeBadge.textContent = `${(compressed.sizeBytes / 1024).toFixed(0)} KB (Đạt chuẩn <200KB)`;

          const step3Status = document.getElementById("step3ReceiptStatusText");
          if (step3Status)
            step3Status.textContent = `Đã đính kèm ảnh (${(compressed.sizeBytes / 1024).toFixed(0)} KB)`;

          showToast(
            `Đã lưu ảnh (${(compressed.sizeBytes / 1024).toFixed(0)} KB) · Đang chuyển bước 2...`,
          );
          lucide.createIcons();

          // Tự động chuyển sang Bước 2 ngay sau khi chụp ảnh hoặc chọn ảnh thành công
          clearTimeout(step1AutoAdvanceTimer);
          step1AutoAdvanceTimer = setTimeout(() => {
            goToWizardStep(2);
          }, 320);
        } catch (err) {
          console.error("Compression error:", err);
          showToast("Không thể xử lý ảnh, chuyển sang bước 2...", true);
          clearTimeout(step1AutoAdvanceTimer);
          step1AutoAdvanceTimer = setTimeout(() => {
            goToWizardStep(2);
          }, 400);
        }
      }

      function updateWizardTypeCards() {
        const expCard = document.getElementById("step2CardExpense");
        const incCard = document.getElementById("step2CardIncome");
        const catTypeLabel = document.getElementById("wizardCatTypeLabel");
        const catTypeBadge = document.getElementById("wizardCatTypeBadge");
        const amtDisplay = document.getElementById("wizardAmountDisplay");

        if (State.wizardType === "expense") {
          if (expCard) expCard.classList.add("active");
          if (incCard) incCard.classList.remove("active");
          if (catTypeLabel) catTypeLabel.textContent = "Chi tiêu";
          if (catTypeBadge) {
            catTypeBadge.textContent = "Chi tiêu";
            catTypeBadge.style.background = "var(--expense-bg)";
            catTypeBadge.style.color = "var(--expense)";
          }
          if (amtDisplay) amtDisplay.style.color = "var(--text-primary)";
        } else {
          if (expCard) expCard.classList.remove("active");
          if (incCard) incCard.classList.add("active");
          if (catTypeLabel) catTypeLabel.textContent = "Thu nhập";
          if (catTypeBadge) {
            catTypeBadge.textContent = "Thu nhập";
            catTypeBadge.style.background = "var(--income-bg)";
            catTypeBadge.style.color = "var(--income)";
          }
          if (amtDisplay) amtDisplay.style.color = "var(--income)";
        }

        renderWizardCategoryGrid();
      }

      function updateWizardTypeToggle() {
        updateWizardTypeCards();
      }

      function updateWizardAmountDisplay() {
        const display = document.getElementById("wizardAmountDisplay");
        const val = parseInt(State.wizardAmountRaw, 10) || 0;
        if (display) display.textContent = formatNumberOnly(val);
      }

      function renderWizardCategoryGrid() {
        const grid = document.getElementById("wizardCategoryGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const cats = State.categories.filter(
          (c) => c.type === State.wizardType,
        );
        if (!cats.some((c) => c.id === State.wizardCategoryId)) {
          State.wizardCategoryId = cats[0]?.id || null;
        }

        if (cats.length === 0) {
          grid.innerHTML =
            '<div style="grid-column: 1/-1; text-align: center; font-size: 0.78rem; color: var(--text-secondary); padding: 14px 0;">Chưa có danh mục nào cho loại này.</div>';
          return;
        }

        cats.forEach((cat) => {
          const isSelected = cat.id === State.wizardCategoryId;
          const item = document.createElement("div");
          item.style.padding = "8px 4px";
          item.style.borderRadius = "var(--radius-sm)";
          item.style.display = "flex";
          item.style.flexDirection = "column";
          item.style.alignItems = "center";
          item.style.justifyContent = "center";
          item.style.cursor = "pointer";
          item.style.background = isSelected
            ? "var(--primary-light)"
            : "var(--bg-card)";
          item.style.border = isSelected
            ? "2px solid var(--primary)"
            : "1px solid var(--border-card)";
          item.style.boxShadow = isSelected ? "var(--shadow-sm)" : "none";
          item.style.transition = "all 0.15s var(--ease-spring)";
          item.style.minWidth = "0";
          item.style.boxSizing = "border-box";
          item.style.overflow = "hidden";

          item.onclick = () => {
            State.wizardCategoryId = cat.id;
            renderWizardCategoryGrid();
          };

          item.innerHTML = `
          <div style="width: 32px; height: 32px; border-radius: 9px; background: ${cat.color}25; color: ${cat.color}; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
            <i data-lucide="${cat.icon || "tag"}" style="width: 16px; height: 16px;"></i>
          </div>
          <span style="font-size: 0.68rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${cat.name}</span>
        `;
          grid.appendChild(item);
        });

        lucide.createIcons();
      }

      function populateWizardReviewCard() {
        const amt = parseInt(State.wizardAmountRaw, 10) || 0;
        const isInc = State.wizardType === "income";
        const cat = State.categories.find(
          (c) => c.id === State.wizardCategoryId,
        ) || { name: "Khác", icon: "tag", color: "#CBD5E1" };
        const dateVal =
          document.getElementById("wizardDateInput").value || getTodayString();
        const wallet = State.wallets.find(
          (w) => w.id === document.getElementById("wizardWalletSelect").value,
        ) || { name: "Tiền mặt" };
        const noteVal = document.getElementById("wizardNoteInput").value.trim();
        const isWork = document.getElementById("wizardIsWorkToggle").checked;
        const locVal = document
          .getElementById("wizardLocationInput")
          ?.value.trim();

        const amtEl = document.getElementById("reviewAmountText");
        if (amtEl) {
          amtEl.textContent = (isInc ? "+" : "-") + formatVND(amt);
          amtEl.style.color = isInc ? "var(--income)" : "var(--expense)";
        }

        const typeEl = document.getElementById("reviewTypeText");
        if (typeEl) {
          typeEl.textContent = isInc ? "Thu nhập" : "Chi tiêu";
          typeEl.style.color = isInc ? "var(--income)" : "var(--expense)";
          typeEl.style.background = isInc
            ? "var(--income-bg)"
            : "var(--expense-bg)";
        }

        const catNameEl = document.getElementById("reviewCategoryName");
        if (catNameEl) catNameEl.textContent = cat.name;

        const catIconBox = document.getElementById("reviewCategoryIconBox");
        if (catIconBox) {
          catIconBox.style.background = (cat.color || "#34D399") + "25";
          catIconBox.style.color = cat.color || "#34D399";
          catIconBox.innerHTML = `<i data-lucide="${cat.icon || "tag"}" style="width: 26px; height: 26px;"></i>`;
        }

        const walletEl = document.getElementById("reviewWalletText");
        if (walletEl) walletEl.textContent = wallet.name;

        const dateEl = document.getElementById("reviewDateText");
        if (dateEl) dateEl.textContent = formatDateWithWeekday(dateVal);

        const workEl = document.getElementById("reviewWorkText");
        if (workEl) workEl.textContent = isWork ? "Có (Work Finance)" : "Không";

        const noteEl = document.getElementById("reviewNoteText");
        if (noteEl) noteEl.textContent = noteVal || "Không có ghi chú";

        const locRow = document.getElementById("reviewLocationRow");
        const locText = document.getElementById("reviewLocationText");
        if (locRow && locText) {
          if (locVal) {
            locRow.style.display = "flex";
            locText.textContent = locVal;
          } else {
            locRow.style.display = "none";
          }
        }

        const receiptRow = document.getElementById("reviewReceiptRow");
        const receiptImg = document.getElementById("reviewReceiptImg");
        if (receiptRow && receiptImg) {
          if (State.wizardReceiptDataUrl) {
            receiptRow.style.display = "flex";
            receiptImg.src = State.wizardReceiptDataUrl;
          } else {
            receiptRow.style.display = "none";
            receiptImg.src = "";
          }
        }

        lucide.createIcons();
      }

      /* ==========================================================================
       12. FIXED SWIPE TO APPLY COMPONENT (PRECISE 95% THRESHOLD + ATOMIC COMMIT)
       ========================================================================== */
      const swipeContainer = document.getElementById("swipeToSave");
      const swipeThumb = document.getElementById("swipeThumb");
      const swipeTrackFill = document.getElementById("swipeTrackFill");
      const swipeText = document.getElementById("swipeText");
      const swipeThumbIcon = document.getElementById("swipeThumbIcon");

      let isDragging = false;
      let startX = 0;
      let currentX = 0;
      let maxDrag = 0;
      let isSubmitting = false;

      function resetSwipeSlider() {
        currentX = 0;
        isDragging = false;
        swipeThumb.classList.add("springing");
        swipeTrackFill.classList.add("springing");
        swipeThumb.style.transform = "translateX(0px)";
        swipeTrackFill.style.width = "0px";
        swipeText.textContent = "Trượt để lưu giao dịch";
        swipeThumbIcon.setAttribute("data-lucide", "arrow-right");
        lucide.createIcons();

        setTimeout(() => {
          swipeThumb.classList.remove("springing");
          swipeTrackFill.classList.remove("springing");
        }, 350);
      }

      function initSwipeToApply() {
        const onPointerDown = (e) => {
          if (isSubmitting) return;
          isDragging = true;
          startX = e.clientX;
          currentX = 0;
          maxDrag = swipeContainer.clientWidth - swipeThumb.clientWidth - 10;
          try {
            swipeThumb.setPointerCapture(e.pointerId);
          } catch {}
          swipeThumb.classList.remove("springing");
          swipeTrackFill.classList.remove("springing");
        };

        const onPointerMove = (e) => {
          if (!isDragging || isSubmitting) return;
          const deltaX = e.clientX - startX;
          currentX = Math.max(0, Math.min(deltaX, maxDrag));

          swipeThumb.style.transform = `translateX(${currentX}px)`;
          swipeTrackFill.style.width = `${currentX + 50}px`;

          const progress = maxDrag > 0 ? currentX / maxDrag : 0;
          if (progress >= 0.85) swipeText.textContent = "Thả để xác nhận...";
          else swipeText.textContent = "Trượt để lưu giao dịch";
        };

        const onPointerUp = async (e) => {
          if (!isDragging || isSubmitting) return;
          isDragging = false;
          try {
            swipeThumb.releasePointerCapture(e.pointerId);
          } catch {}

          const progress = maxDrag > 0 ? currentX / maxDrag : 0;

          // PRECISE 95% THRESHOLD REQUIREMENT
          if (progress >= 0.95) {
            isSubmitting = true;
            swipeThumb.style.transform = `translateX(${maxDrag}px)`;
            swipeTrackFill.style.width = "100%";

            await executeSaveTransaction();
            isSubmitting = false;
          } else {
            resetSwipeSlider();
          }
        };

        swipeThumb.addEventListener("pointerdown", onPointerDown);
        swipeThumb.addEventListener("pointermove", onPointerMove);
        swipeThumb.addEventListener("pointerup", onPointerUp);
        swipeThumb.addEventListener("pointercancel", () => {
          isDragging = false;
          resetSwipeSlider();
        });
      }

      async function executeSaveTransaction() {
        const amt = parseInt(State.wizardAmountRaw, 10) || 0;
        const dateVal = document.getElementById("wizardDateInput").value;
        const noteVal = document.getElementById("wizardNoteInput").value.trim();
        const isWork = document.getElementById("wizardIsWorkToggle").checked;
        const walletId =
          document.getElementById("wizardWalletSelect").value || "w_cash";
        const locInputVal = document
          .getElementById("wizardLocationInput")
          ?.value.trim();

        if (!amt || amt <= 0) {
          showToast("Số tiền giao dịch phải lớn hơn 0!", true);
          resetSwipeSlider();
          return;
        }

        if (!State.wizardCategoryId) {
          showToast("Vui lòng chọn danh mục!", true);
          resetSwipeSlider();
          return;
        }

        if (!dateVal) {
          showToast("Vui lòng chọn ngày giao dịch!", true);
          resetSwipeSlider();
          return;
        }

        let locData = null;
        if (locInputVal) {
          locData = {
            address: locInputVal,
            lat: State.wizardLocation?.lat || null,
            lng: State.wizardLocation?.lng || null,
          };
        }

        const txRecord = {
          id:
            State.editingTxId ||
            "tx_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          amount: amt,
          type: State.wizardType,
          categoryId: State.wizardCategoryId,
          walletId: walletId,
          date: dateVal,
          note: noteVal,
          isWork: isWork,
          location: locData,
          receipt: State.wizardReceiptDataUrl || null,
          updatedAt: Date.now(),
          createdAt: State.editingTxId
            ? State.transactions.find((t) => t.id === State.editingTxId)
                ?.createdAt || Date.now()
            : Date.now(),
        };

        try {
          // COMMIT TO INDEXEDDB FIRST!
          await DB.put("transactions", txRecord);

          // ONLY RUN SUCCESS ANIMATIONS & CONFETTI AFTER INDEXEDDB SUCCESS!
          swipeThumbIcon.setAttribute("data-lucide", "check");
          lucide.createIcons();

          if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
          launchConfetti();
          if (typeof SoundEngine !== "undefined") SoundEngine.play("success");
          const catObj = State.categories.find(
            (c) => c.id === txRecord.categoryId,
          );
          triggerMoneyFlyAnimation(txRecord.type, catObj);

          // Update in-memory state
          if (State.editingTxId) {
            const idx = State.transactions.findIndex(
              (t) => t.id === State.editingTxId,
            );
            if (idx !== -1) State.transactions[idx] = txRecord;
            showToast("Đã cập nhật giao dịch thành công!");
          } else {
            State.transactions.unshift(txRecord);
            showToast("Đã lưu giao dịch thành công!");
          }

          setTimeout(() => {
            closeTransactionWizard();
            renderAllScreens();
          }, 750);
        } catch (err) {
          console.error("Save failed:", err);
          showToast("Lỗi khi ghi dữ liệu vào IndexedDB!", true);
          resetSwipeSlider();
        }
      }

      /* Transaction Detail Bottom Sheet */
      function openTxDetailModal(tx) {
        const modal = document.getElementById("txDetailModal");
        const body = document.getElementById("txDetailBody");
        const cat = State.categories.find((c) => c.id === tx.categoryId) || {
          name: "Khác",
          color: "#BFE8D5",
        };
        const wallet = State.wallets.find((w) => w.id === tx.walletId) || {
          name: "Tiền mặt",
        };
        const isInc = tx.type === "income";
        const isTransfer = tx.type === "transfer";

        body.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 2.2rem; font-weight: 800; color: ${isTransfer ? "#6D28D9" : isInc ? "var(--income)" : "var(--expense)"};">
            ${isInc ? "+" : isTransfer ? "" : "-"}${formatVND(tx.amount)}
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary); margin-top: 4px;">
            ${isTransfer ? "Chuyển tiền nội bộ" : cat.name}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Ngày giao dịch</span>
            <span style="font-weight: 700;">${formatDateWithWeekday(tx.date)}</span>
          </div>
          ${
            tx.location && tx.location.address
              ? `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <i data-lucide="map-pin" style="width: 14px; height: 14px; color: var(--mint);"></i> Vị trí
              </span>
              <div style="text-align: right; max-width: 65%;">
                <span style="font-weight: 700; color: var(--text-primary); display: block;">${tx.location.address}</span>
                ${
                  tx.location.lat && tx.location.lng
                    ? `
                  <a href="https://www.google.com/maps?q=${tx.location.lat},${tx.location.lng}" target="_blank" rel="noopener noreferrer" style="font-size: 0.74rem; font-weight: 700; color: var(--mint); text-decoration: underline; display: inline-flex; align-items: center; gap: 3px; margin-top: 2px;">
                    <i data-lucide="external-link" style="width: 11px; height: 11px;"></i> Mở Google Maps
                  </a>
                `
                    : ""
                }
              </div>
            </div>
          `
              : ""
          }
          ${
            !isTransfer
              ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Ví tài khoản</span>
              <span style="font-weight: 700;">${wallet.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Thuộc công việc</span>
              <span style="font-weight: 700;">${tx.isWork ? "Có (Work Finance)" : "Không"}</span>
            </div>
          `
              : `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Từ ví</span>
              <span style="font-weight: 700;">${State.wallets.find((w) => w.id === tx.fromWalletId)?.name || "Ví nguồn"}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Đến ví</span>
              <span style="font-weight: 700;">${State.wallets.find((w) => w.id === tx.toWalletId)?.name || "Ví nhận"}</span>
            </div>
          `
          }
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Ghi chú</span>
            <span style="font-weight: 700; text-align: right; max-width: 60%;">${tx.note || "Không có ghi chú"}</span>
          </div>
          ${
            tx.receipt
              ? `
            <div style="margin-top: 10px;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">Ảnh hóa đơn đính kèm:</span>
              <img src="${tx.receipt}" style="width: 100%; max-height: 260px; object-fit: contain; border-radius: var(--radius-md); border: 1px solid var(--border-card);" alt="Hóa đơn">
            </div>
          `
              : ""
          }
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="copyTxInfoBtn" type="button" style="width: 44px; height: 44px; border-radius: var(--radius-full); background: var(--bg-card-subtle); border: 1px solid var(--border-card); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" title="Sao chép thông tin">
            <i data-lucide="copy" style="width: 17px; height: 17px;"></i>
          </button>
          ${
            !isTransfer
              ? `
            <button id="editTxBtn" style="flex: 1; height: 44px; border-radius: var(--radius-full); background: var(--primary); color: #fff; border: none; font-weight: 700; cursor: pointer; font-size: 0.82rem;">
              Chỉnh sửa
            </button>
          `
              : ""
          }
          <button id="deleteTxBtn" style="flex: 1; height: 44px; border-radius: var(--radius-full); background: var(--expense-bg); color: var(--expense); border: none; font-weight: 700; cursor: pointer; font-size: 0.82rem;">
            Xóa giao dịch
          </button>
        </div>
      `;

        modal.classList.add("active");
        lucide.createIcons();

        document
          .getElementById("copyTxInfoBtn")
          ?.addEventListener("click", () => {
            const copyText = `${isTransfer ? "Chuyển tiền" : cat.name}: ${isInc ? "+" : "-"}${formatVND(tx.amount)} (${formatDateDisplay(tx.date)}) - Ví: ${wallet.name}${tx.note ? " - " + tx.note : ""}`;
            navigator.clipboard
              .writeText(copyText)
              .then(() => {
                triggerHaptic("success");
                showToast("Đã sao chép thông tin giao dịch!");
              })
              .catch(() => {
                showToast("Không thể sao chép!", true);
              });
          });

        const editBtn = document.getElementById("editTxBtn");
        if (editBtn) {
          editBtn.onclick = () => {
            modal.classList.remove("active");
            openTransactionWizard(tx.id, false);
          };
        }

        const delBtn = document.getElementById("deleteTxBtn");
        if (delBtn) delBtn.onclick = () => {
          showConfirmDialog(
            "Xóa giao dịch",
            "Bạn có chắc chắn muốn xóa vĩnh viễn giao dịch này không?",
            async () => {
              await DB.delete("transactions", tx.id);
              State.transactions = State.transactions.filter(
                (t) => t.id !== tx.id,
              );
              modal.classList.remove("active");
              showToast("Đã xóa giao dịch!");
              renderAllScreens();
            },
          );
        };
      }
