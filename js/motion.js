/**
 * FinMaster Motion Design & Bottom Sheet Physics Engine
 * Handles:
 * - Fluid Drag to Dismiss with touch tracking, velocity detection, and elastic rubber-band resistance
 * - Smooth backdrop blur & proportional opacity dimming
 * - Spring bounce-back and slide-down dismissal physics
 * - Universal backdrop click dismiss with physics
 * - Form UX micro-interactions (shake animation, focus handling)
 */

(function () {
  'use strict';

  // Haptic feedback helper
  function triggerHaptic(duration) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(duration || 8);
      }
    } catch (_) {}
  }

  /**
   * Universal Modal Dismiss with Spring/Ease Physics
   * @param {HTMLElement} overlay - The .modal-overlay element
   * @param {HTMLElement} [sheet] - The .bottom-sheet element (if bottom sheet)
   * @param {number} [velocity=0] - Touch velocity for dynamic animation timing
   */
  function dismissModalWithPhysics(overlay, sheet, velocity = 0) {
    if (!overlay) return;
    if (!sheet) {
      sheet = overlay.querySelector('.bottom-sheet');
    }

    triggerHaptic(6);

    if (sheet) {
      // Calculate dynamic duration based on velocity (min 180ms, max 300ms)
      const duration = Math.max(180, Math.min(300, 260 - velocity * 40));
      sheet.classList.add('dismissing');
      sheet.style.transition = `transform ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`;
      sheet.style.transform = 'translateY(105%)';

      overlay.style.transition = `opacity ${duration}ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`;
      overlay.style.opacity = '0';

      const onTransitionEnd = () => {
        sheet.removeEventListener('transitionend', onTransitionEnd);
        overlay.classList.remove('active');
        sheet.classList.remove('dismissing', 'is-dragging', 'snapping-back');
        sheet.style.transform = '';
        sheet.style.transition = '';
        overlay.style.opacity = '';
        overlay.style.transition = '';
        overlay.dispatchEvent(new CustomEvent('finmaster:modal-dismissed', { bubbles: true }));
      };

      sheet.addEventListener('transitionend', onTransitionEnd, { once: true });
      // Fallback timeout in case transitionend does not fire
      setTimeout(onTransitionEnd, duration + 60);
    } else {
      // Center modal dialog
      const card = overlay.querySelector('.editorial-card') || overlay.firstElementChild;
      if (card) {
        card.style.transition = 'transform 0.22s var(--ease-out-expo), opacity 0.2s ease';
        card.style.transform = 'scale(0.92) translateY(12px)';
        card.style.opacity = '0';
      }
      overlay.style.transition = 'opacity 0.22s ease';
      overlay.style.opacity = '0';

      setTimeout(() => {
        overlay.classList.remove('active');
        if (card) {
          card.style.transform = '';
          card.style.opacity = '';
          card.style.transition = '';
        }
        overlay.style.opacity = '';
        overlay.style.transition = '';
        overlay.dispatchEvent(new CustomEvent('finmaster:modal-dismissed', { bubbles: true }));
      }, 230);
    }
  }

  /**
   * Snap Back Modal when Drag threshold isn't met
   * @param {HTMLElement} overlay
   * @param {HTMLElement} sheet
   */
  function snapBackModal(overlay, sheet) {
    if (!sheet) return;
    sheet.classList.add('snapping-back');
    sheet.style.transition = 'transform 0.36s cubic-bezier(0.175, 0.885, 0.32, 1.25)';
    sheet.style.transform = 'translateY(0)';

    if (overlay) {
      overlay.style.transition = 'opacity 0.26s ease';
      overlay.style.opacity = '1';
    }

    setTimeout(() => {
      sheet.classList.remove('snapping-back', 'is-dragging');
      sheet.style.transform = '';
      sheet.style.transition = '';
      if (overlay) {
        overlay.style.opacity = '';
        overlay.style.transition = '';
      }
    }, 380);
  }

  /**
   * Close any modal by ID or element reference with smooth physics
   */
  window.closeModalSmooth = function (modalOrId) {
    const el = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (!el) return;
    dismissModalWithPhysics(el);
  };

  /**
   * Shake invalid input with ergonomic feedback
   */
  window.shakeFormInput = function (inputEl, errorMsg) {
    if (!inputEl) return;
    inputEl.classList.remove('is-invalid');
    // Force reflow
    void inputEl.offsetWidth;
    inputEl.classList.add('is-invalid');
    triggerHaptic(15);
    inputEl.focus();

    if (errorMsg) {
      let msgEl = inputEl.parentNode.querySelector('.form-error-msg');
      if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.className = 'form-error-msg';
        inputEl.parentNode.appendChild(msgEl);
      }
      msgEl.innerHTML = `<i data-lucide="alert-circle" style="width:13px;height:13px"></i> <span>${errorMsg}</span>`;
      if (window.lucide?.createIcons) window.lucide.createIcons();
    }

    setTimeout(() => {
      inputEl.classList.remove('is-invalid');
    }, 1200);
  };

  /**
   * Attach Touch Drag to Dismiss Engine to a Bottom Sheet
   * @param {HTMLElement} sheet
   */
  function attachDragToDismiss(sheet) {
    if (!sheet || sheet._hasDragDismiss) return;
    sheet._hasDragDismiss = true;

    const overlay = sheet.closest('.modal-overlay');
    const handleBar = sheet.querySelector('.sheet-handle-bar') || sheet.querySelector('.sheet-header');
    const sheetBody = sheet.querySelector('.sheet-body');

    let startY = 0;
    let currentY = 0;
    let lastY = 0;
    let startTime = 0;
    let lastTime = 0;
    let velocityY = 0;
    let isDragging = false;
    let canDrag = false;

    // Check if target should NOT initiate vertical sheet dragging (e.g. horizontal sliders)
    function shouldIgnoreTarget(target) {
      if (!target) return false;
      return !!target.closest(
        '.swipe-container, input[type="range"], .pill-tabs-bar, .segmented-control, .scroll-x'
      );
    }

    sheet.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1) return;
        const target = e.target;
        if (shouldIgnoreTarget(target)) return;

        const touch = e.touches[0];
        startY = touch.clientY;
        currentY = startY;
        lastY = startY;
        startTime = Date.now();
        lastTime = startTime;
        velocityY = 0;
        isDragging = false;

        // If touching handle or header, always enable drag
        if (handleBar && (handleBar === target || handleBar.contains(target))) {
          canDrag = true;
          return;
        }

        // If inside sheet-body, only drag if scrolled to the very top
        if (sheetBody && sheetBody.contains(target)) {
          if (sheetBody.scrollTop <= 2) {
            canDrag = true;
          } else {
            canDrag = false;
          }
          return;
        }

        // Anywhere else inside the sheet (e.g. footer)
        canDrag = true;
      },
      { passive: true }
    );

    sheet.addEventListener(
      'touchmove',
      function (e) {
        if (!canDrag || e.touches.length !== 1) return;

        const touch = e.touches[0];
        currentY = touch.clientY;
        const deltaY = currentY - startY;

        // Velocity tracking
        const now = Date.now();
        const dt = now - lastTime;
        if (dt > 10) {
          velocityY = (currentY - lastY) / dt;
          lastY = currentY;
          lastTime = now;
        }

        // If user scrolls up when inside body, let native scroll take over
        if (sheetBody && sheet.contains(e.target) && deltaY < 0 && sheetBody.scrollTop > 0) {
          canDrag = false;
          return;
        }

        // Dragging downwards threshold (initiates active gesture)
        if (deltaY > 6 && !isDragging) {
          isDragging = true;
          sheet.classList.add('is-dragging');
        }

        if (isDragging) {
          // If dragging downwards: 1:1 finger tracking
          if (deltaY > 0) {
            sheet.style.transform = `translateY(${deltaY}px)`;
            if (overlay) {
              const sheetHeight = sheet.offsetHeight || 500;
              const progress = Math.min(Math.max(deltaY / (sheetHeight * 0.75), 0), 0.85);
              overlay.style.opacity = (1 - progress).toString();
            }
          } else {
            // Dragging upwards: rubber-band elastic resistance
            const resisted = deltaY * 0.2;
            sheet.style.transform = `translateY(${resisted}px)`;
          }

          if (e.cancelable) {
            e.preventDefault();
          }
        }
      },
      { passive: false }
    );

    function onTouchEnd() {
      if (!isDragging) {
        canDrag = false;
        return;
      }

      sheet.classList.remove('is-dragging');
      const deltaY = currentY - startY;
      const isFastFlick = velocityY > 0.45 && deltaY > 35;
      const isOverThreshold = deltaY > 115;

      if (isFastFlick || isOverThreshold) {
        dismissModalWithPhysics(overlay, sheet, velocityY);
      } else {
        snapBackModal(overlay, sheet);
      }

      canDrag = false;
      isDragging = false;
    }

    sheet.addEventListener('touchend', onTouchEnd, { passive: true });
    sheet.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  /**
   * Universal Backdrop Click Dismissal
   */
  function setupBackdropClicks() {
    document.addEventListener('click', function (e) {
      const target = e.target;
      if (!target || !target.classList) return;

      // If clicked directly on the modal-overlay backdrop
      if (target.classList.contains('modal-overlay') && target.classList.contains('active')) {
        // Prevent accidental dismiss if user is selecting text
        const selection = window.getSelection ? window.getSelection().toString() : '';
        if (selection.length > 0) return;

        const sheet = target.querySelector('.bottom-sheet');
        if (sheet) {
          dismissModalWithPhysics(target, sheet, 0);
        } else {
          dismissModalWithPhysics(target, null, 0);
        }
      }
    });
  }

  /**
   * Initialize all sheets present in DOM and observe future sheets
   */
  function initMotionEngine() {
    // Attach to existing sheets
    const sheets = document.querySelectorAll('.bottom-sheet');
    sheets.forEach(attachDragToDismiss);

    setupBackdropClicks();

    // Observe dynamically added or modified sheets
    if (typeof MutationObserver !== 'undefined' && document.body) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.classList?.contains('bottom-sheet')) {
                attachDragToDismiss(node);
              } else {
                const nestedSheets = node.querySelectorAll?.('.bottom-sheet');
                if (nestedSheets) nestedSheets.forEach(attachDragToDismiss);
              }
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotionEngine);
  } else {
    initMotionEngine();
  }

  // Export engine methods globally
  window.FinMasterMotion = {
    dismiss: dismissModalWithPhysics,
    snapBack: snapBackModal,
    shake: window.shakeFormInput,
    closeModal: window.closeModalSmooth,
    attach: attachDragToDismiss,
  };
})();
