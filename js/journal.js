      /* ==========================================================================
       FINANCIAL JOURNAL CONTROLLER (#screen-journal)
       ========================================================================== */
      let selectedJournalStars = 5;
      let selectedJournalMoodKey = "confident";
      let tempJournalPhotoData = null;

      function handleJournalPhotoChange(file) {
        if (!file) return;
        showToast("Đang tối ưu ảnh nhật ký...");
        compressImageFile(file)
          .then((res) => {
            tempJournalPhotoData = res.dataUrl;
            const previewBox = document.getElementById(
              "journalPhotoPreviewBox",
            );
            const previewImg = document.getElementById(
              "journalPhotoPreviewImg",
            );
            const sizeText = document.getElementById("journalPhotoSizeText");
            const hiddenInput = document.getElementById("journalEntryPhoto");
            if (previewImg) previewImg.src = res.dataUrl;
            if (sizeText)
              sizeText.textContent = `${(res.sizeBytes / 1024).toFixed(0)} KB (Chuẩn tối ưu)`;
            if (hiddenInput) hiddenInput.value = res.dataUrl;
            if (previewBox) previewBox.style.display = "flex";
            showToast(
              `Đã đính kèm ảnh (${(res.sizeBytes / 1024).toFixed(0)} KB)`,
            );
            lucide.createIcons();
          })
          .catch((err) => {
            console.error("Journal photo error:", err);
            showToast("Không thể xử lý ảnh!", true);
          });
      }
      window.handleJournalPhotoChange = handleJournalPhotoChange;

      function removeJournalPhoto() {
        tempJournalPhotoData = null;
        const previewBox = document.getElementById("journalPhotoPreviewBox");
        const previewImg = document.getElementById("journalPhotoPreviewImg");
        const hiddenInput = document.getElementById("journalEntryPhoto");
        const cam = document.getElementById("journalCameraInput");
        const gal = document.getElementById("journalGalleryInput");
        if (previewBox) previewBox.style.display = "none";
        if (previewImg) previewImg.src = "";
        if (hiddenInput) hiddenInput.value = "";
        if (cam) cam.value = "";
        if (gal) gal.value = "";
      }
      window.removeJournalPhoto = removeJournalPhoto;

      function renderJournalScreen() {
        const container = document.getElementById("journalEntriesContainer");
        if (!container) return;

        const journals = State.journals || [];
        const totalCount = journals.length;

        // Calculate stats
        let avgRating = 5;
        const moodCounts = {};
        if (totalCount > 0) {
          const sumRating = journals.reduce(
            (s, j) => s + (Number(j.disciplineRating) || 5),
            0,
          );
          avgRating = (sumRating / totalCount).toFixed(1);

          journals.forEach((j) => {
            const m = j.mood || "confident";
            moodCounts[m] = (moodCounts[m] || 0) + 1;
          });
        }

        // Dominant mood
        let dominantMood = "confident";
        let maxMoodCount = 0;
        Object.entries(moodCounts).forEach(([m, count]) => {
          if (count > maxMoodCount) {
            maxMoodCount = count;
            dominantMood = m;
          }
        });

        const moodLabels = {
          confident: "🌟 Tự tin",
          happy: "😊 Hài lòng",
          thinking: "🤔 Đắn đo",
          overspent: "⚠️ Hơi quá tay",
          regret: "😰 Tiếc nuối",
        };

        const countEl = document.getElementById("journalTotalEntriesCount");
        const starEl = document.getElementById("journalAvgRatingScore");

        if (countEl) countEl.textContent = `${totalCount} bài viết`;
        if (starEl) starEl.textContent = `★ ${avgRating} / 5`;

        // Filter by mood
        const filter = State.journalMoodFilter || "all";
        let filtered = [...journals];
        if (filter !== "all") {
          filtered = filtered.filter((j) => j.mood === filter);
        }

        filtered.sort(
          (a, b) =>
            (b.date || "").localeCompare(a.date || "") ||
            (b.createdAt || 0) - (a.createdAt || 0),
        );

        container.innerHTML = "";
        if (filtered.length === 0) {
          container.innerHTML = `
          <div class="editorial-card" style="text-align: center; padding: 32px 16px; color: var(--text-secondary);">
            <i data-lucide="book-open" style="width: 32px; height: 32px; margin: 0 auto 10px; opacity: 0.5; color: #9333EA;"></i>
            <div style="font-size: 0.88rem; font-weight: 700;">Chưa có nhật ký tài chính nào</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px; max-width: 280px; margin-left: auto; margin-right: auto;">
              Ghi lại cảm xúc chi tiêu và bài học tài chính mỗi ngày để nâng cao tính kỷ luật.
            </div>
            <div style="font-size: 0.72rem; color: #9333EA; margin-top: 10px; font-weight: 700;">
              Chạm vào dấu + ở thanh điều hướng dưới đáy để tạo bài viết đầu tiên
            </div>
          </div>
        `;
          lucide.createIcons();
          return;
        }

        filtered.forEach((entry) => {
          const card = document.createElement("div");
          card.className = "journal-card";
          card.style.background = "var(--bg-card)";
          card.style.borderRadius = "var(--radius-lg)";
          card.style.padding = "14px 16px";
          card.style.border = "1px solid var(--border-card)";
          card.style.boxShadow = "var(--shadow-sm)";
          card.style.marginBottom = "12px";

          const starsStr =
            "★".repeat(entry.disciplineRating || 5) +
            "☆".repeat(Math.max(0, 5 - (entry.disciplineRating || 5)));
          const tagsArr = Array.isArray(entry.tags)
            ? entry.tags
            : entry.tags
              ? String(entry.tags)
                  .split(",")
                  .map((t) => t.trim())
              : [];

          card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tx-badge" style="background: rgba(147, 51, 234, 0.12); color: #9333EA; font-weight: 800; font-size: 0.72rem;">
                ${moodLabels[entry.mood] || "🌟 Tự tin"}
              </span>
              <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 600;">
                ${formatDateWithWeekday(entry.date)}
              </span>
            </div>
            <div style="color: #F59E0B; font-size: 0.85rem; font-weight: 800; letter-spacing: 1px;">
              ${starsStr}
            </div>
          </div>

          <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">
            ${entry.subject || "Ghi chép chi tiêu"}
          </div>

          <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px; white-space: pre-wrap;">
            ${entry.content || "Không có nội dung phản tư chi tiết."}
          </div>

          ${
            entry.photo
              ? `
            <div style="margin: 10px 0; border-radius: 12px; overflow: hidden; max-height: 220px; border: 1px solid var(--border-card);">
              <img src="${entry.photo}" style="width: 100%; max-height: 220px; object-fit: cover; display: block;" alt="Ảnh nhật ký">
            </div>
          `
              : ""
          }

          ${
            tagsArr.length > 0
              ? `
            <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px;">
              ${tagsArr.map((t) => `<span style="font-size: 0.68rem; font-weight: 700; background: var(--bg-card-subtle); color: var(--text-secondary); padding: 2px 8px; border-radius: 99px; border: 1px solid var(--border-subtle);">${t.startsWith("#") ? t : "#" + t}</span>`).join("")}
            </div>
          `
              : ""
          }

          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 4px;">
            <button type="button" class="btn-icon-subtle" onclick="openNewJournalModal('${entry.id}')" title="Sửa" style="color: var(--primary); width: 30px; height: 30px;">
              <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
            </button>
            <button type="button" class="btn-icon-subtle" onclick="deleteJournalEntry('${entry.id}')" title="Xóa" style="color: var(--expense); width: 30px; height: 30px;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        `;

          container.appendChild(card);
        });

        lucide.createIcons();
      }
      window.renderJournalScreen = renderJournalScreen;

      function openNewJournalModal(editId = null) {
        const modal = document.getElementById("journalEntryModal");
        if (!modal) return;

        const idInput = document.getElementById("journalEntryId");
        const dateInput = document.getElementById("journalEntryDate");
        const subjectInput = document.getElementById("journalEntrySubject");
        const contentInput = document.getElementById("journalEntryContent");
        const tagsInput = document.getElementById("journalEntryTags");
        const modalTitle = document.getElementById("journalModalTitle");
        const previewBox = document.getElementById("journalPhotoPreviewBox");
        const previewImg = document.getElementById("journalPhotoPreviewImg");
        const hiddenInput = document.getElementById("journalEntryPhoto");

        if (editId) {
          const entry = State.journals.find((j) => j.id === editId);
          if (entry) {
            if (idInput) idInput.value = entry.id;
            if (dateInput) dateInput.value = entry.date || getTodayString();
            if (subjectInput) subjectInput.value = entry.subject || "";
            if (contentInput) contentInput.value = entry.content || "";
            if (tagsInput)
              tagsInput.value = Array.isArray(entry.tags)
                ? entry.tags.join(", ")
                : entry.tags || "";
            selectJournalMood(entry.mood || "confident");
            setJournalStars(entry.disciplineRating || 5);
            if (modalTitle) modalTitle.textContent = "Chỉnh sửa nhật ký";
            if (entry.photo) {
              tempJournalPhotoData = entry.photo;
              if (previewImg) previewImg.src = entry.photo;
              if (hiddenInput) hiddenInput.value = entry.photo;
              if (previewBox) previewBox.style.display = "flex";
            } else {
              removeJournalPhoto();
            }
          }
        } else {
          if (idInput) idInput.value = "";
          if (dateInput) dateInput.value = getTodayString();
          if (subjectInput) subjectInput.value = "";
          if (contentInput) contentInput.value = "";
          if (tagsInput) tagsInput.value = "";
          selectJournalMood("confident");
          setJournalStars(5);
          if (modalTitle) modalTitle.textContent = "Viết nhật ký chi tiêu";
          removeJournalPhoto();
        }

        modal.classList.add("active");
        lucide.createIcons();
      }
      window.openNewJournalModal = openNewJournalModal;

      function closeJournalModal() {
        const modal = document.getElementById("journalEntryModal");
        if (modal) modal.classList.remove("active");
        removeJournalPhoto();
      }
      window.closeJournalModal = closeJournalModal;

      function selectJournalMood(mood) {
        selectedJournalMoodKey = mood;
        const moodInput = document.getElementById("journalEntryMood");
        if (moodInput) moodInput.value = mood;

        document
          .querySelectorAll("#journalModalMoodSelector .mood-chip-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.jmood === mood);
          });
      }
      window.selectJournalMood = selectJournalMood;

      function setJournalStars(stars) {
        selectedJournalStars = Number(stars) || 5;
        const ratingInput = document.getElementById("journalEntryRating");
        if (ratingInput) ratingInput.value = selectedJournalStars;

        const starSpans = document.querySelectorAll(
          "#journalStarSelector span",
        );
        starSpans.forEach((span, idx) => {
          span.textContent = idx < selectedJournalStars ? "★" : "☆";
        });

        const label = document.getElementById("journalStarsLabel");
        const starTexts = {
          1: "1/5 - Kém kiểm soát",
          2: "2/5 - Hơi lơ là",
          3: "3/5 - Trung bình",
          4: "4/5 - Kỷ luật tốt",
          5: "5/5 - Xuất sắc",
        };
        if (label)
          label.textContent =
            starTexts[selectedJournalStars] || `${selectedJournalStars}/5`;
      }
      window.setJournalStars = setJournalStars;

      function filterJournalByMood(mood) {
        State.journalMoodFilter = mood;
        document
          .querySelectorAll("#journalQuickMoodChips .mood-chip-btn")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.mood === mood);
          });
        renderJournalScreen();
      }
      window.filterJournalByMood = filterJournalByMood;

      async function saveJournalEntry() {
        const editId = document.getElementById("journalEntryId")?.value.trim();
        const dateVal =
          document.getElementById("journalEntryDate")?.value ||
          getTodayString();
        const subject = document
          .getElementById("journalEntrySubject")
          ?.value.trim();
        const content = document
          .getElementById("journalEntryContent")
          ?.value.trim();
        const tagsRaw = document
          .getElementById("journalEntryTags")
          ?.value.trim();
        const mood = selectedJournalMoodKey || "confident";
        const rating = selectedJournalStars || 5;

        if (!subject) {
          showToast("Vui lòng nhập tiêu đề nhật ký!", true);
          return;
        }

        const tags = tagsRaw
          ? tagsRaw
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [];

        if (editId) {
          const idx = State.journals.findIndex((j) => j.id === editId);
          if (idx !== -1) {
            State.journals[idx].date = dateVal;
            State.journals[idx].subject = subject;
            State.journals[idx].content = content;
            State.journals[idx].tags = tags;
            State.journals[idx].mood = mood;
            State.journals[idx].disciplineRating = rating;
            State.journals[idx].photo = tempJournalPhotoData || null;
            State.journals[idx].updatedAt = Date.now();
            await DB.put("journals", State.journals[idx]);
            showToast("Đã cập nhật nhật ký tài chính!");
          }
        } else {
          const newEntry = {
            id: "jrn_" + Date.now(),
            date: dateVal,
            subject: subject,
            content: content,
            tags: tags,
            mood: mood,
            disciplineRating: rating,
            photo: tempJournalPhotoData || null,
            createdAt: Date.now(),
          };
          await DB.put("journals", newEntry);
          State.journals.unshift(newEntry);
          showToast("Đã lưu nhật ký tài chính!");
        }

        if (typeof SoundEngine !== "undefined") SoundEngine.play("success");
        closeJournalModal();
        renderJournalScreen();
      }
      window.saveJournalEntry = saveJournalEntry;

      async function deleteJournalEntry(id) {
        const entry = State.journals.find((j) => j.id === id);
        if (!entry) return;

        showConfirmDialog(
          "Xóa nhật ký",
          `Bạn có chắc chắn muốn xóa bài nhật ký "${entry.subject || "này"}" không?`,
          async () => {
            await DB.delete("journals", id);
            State.journals = State.journals.filter((j) => j.id !== id);
            if (typeof SoundEngine !== "undefined") SoundEngine.play("delete");
            showToast("Đã xóa nhật ký tài chính!");
            renderJournalScreen();
          },
        );
      }
      window.deleteJournalEntry = deleteJournalEntry;
