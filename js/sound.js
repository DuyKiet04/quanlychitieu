      /* ==========================================================================
       WEB AUDIO API SOUND ENGINE & HAPTIC FEEDBACK (100% OFFLINE SYNTHESIZER)
       ========================================================================== */

      function triggerHaptic(type = "light") {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            if (type === "light") navigator.vibrate(12);
            else if (type === "medium") navigator.vibrate(22);
            else if (type === "success") navigator.vibrate([15, 40, 20]);
            else if (type === "warning") navigator.vibrate([30, 50, 30]);
            else if (type === "error") navigator.vibrate([40, 70, 40]);
          } catch (e) {
            // Non-blocking for browsers that require explicit gesture or ignore vibrate
          }
        }
      }

      const SoundEngine = {
        ctx: null,
        init() {
          if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
          }
        },
        play(type) {
          // Trigger matching tactile haptics on mobile
          if (type === "click") triggerHaptic("light");
          else if (type === "notify") triggerHaptic("medium");
          else if (type === "success") triggerHaptic("success");
          else if (type === "delete") triggerHaptic("warning");

          if (!State.settings || State.settings.sound_enabled === false) return;
          if (type === "click" && State.settings.sound_click === false) return;
          if (type === "notify" && State.settings.sound_notify === false)
            return;
          if (type === "success" && State.settings.sound_success === false)
            return;
          if (type === "delete" && State.settings.sound_delete === false)
            return;

          try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === "suspended") this.ctx.resume();

            const volPercent =
              State.settings && State.settings.sound_volume !== undefined
                ? State.settings.sound_volume
                : 80;
            const masterGain = (volPercent / 100) * 0.16;
            const now = this.ctx.currentTime;

            if (type === "click") {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(850, now);
              osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
              gain.gain.setValueAtTime(masterGain, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
              osc.connect(gain);
              gain.connect(this.ctx.destination);
              osc.start(now);
              osc.stop(now + 0.04);
            } else if (type === "notify") {
              [587.33, 783.99].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                gain.gain.setValueAtTime(masterGain * 0.85, now + idx * 0.07);
                gain.gain.exponentialRampToValueAtTime(
                  0.001,
                  now + idx * 0.07 + 0.18,
                );
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.2);
              });
            } else if (type === "success") {
              [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                gain.gain.setValueAtTime(masterGain * 0.9, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(
                  0.001,
                  now + idx * 0.06 + 0.32,
                );
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.35);
              });
            } else if (type === "delete") {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(340, now);
              osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
              gain.gain.setValueAtTime(masterGain * 0.8, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
              osc.connect(gain);
              gain.connect(this.ctx.destination);
              osc.start(now);
              osc.stop(now + 0.13);
            }
          } catch (e) {
            console.warn("SoundEngine:", e);
          }
        },
      };

      function toggleSoundMaster(enabled) {
        if (!State.settings) State.settings = {};
        State.settings.sound_enabled = Boolean(enabled);
        const sub = document.getElementById("soundSubControls");
        if (sub) sub.style.display = enabled ? "flex" : "none";
        if (typeof saveSettingsToDB === "function") saveSettingsToDB();
        if (enabled) SoundEngine.play("click");
      }

      function onSoundVolumeChange(vol) {
        if (!State.settings) State.settings = {};
        State.settings.sound_volume = Number(vol) || 80;
        const lbl = document.getElementById("soundVolumeLabel");
        if (lbl) lbl.textContent = (Number(vol) || 80) + "%";
        if (typeof saveSettingsToDB === "function") saveSettingsToDB();
        SoundEngine.play("click");
      }

      function saveSoundToggles() {
        if (!State.settings) State.settings = {};
        const chkClick = document.getElementById("soundClickToggle");
        const chkNotify = document.getElementById("soundNotifyToggle");
        const chkSuccess = document.getElementById("soundSuccessToggle");
        const chkDelete = document.getElementById("soundDeleteToggle");
        if (chkClick) State.settings.sound_click = chkClick.checked;
        if (chkNotify) State.settings.sound_notify = chkNotify.checked;
        if (chkSuccess) State.settings.sound_success = chkSuccess.checked;
        if (chkDelete) State.settings.sound_delete = chkDelete.checked;
        if (typeof saveSettingsToDB === "function") saveSettingsToDB();
        SoundEngine.play("click");
      }
