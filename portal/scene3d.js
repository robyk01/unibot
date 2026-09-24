/**
 * UNILAB Landing Page Engine
 * Ultra-fluid, physics-lerp scroll-driven interactive hero experience.
 * Features:
 * - Full-bleed cover coordinate synchronization (zero hotspot drift on any screen size)
 * - Damped linear interpolation (lerp) loop running at 60/120/144 FPS
 * - Zero blur recompilation jitter (compositor-only GPU opacity transitions)
 * - Whole-pixel transform snapping for crystal-sharp text rendering
 * - Locked scale(1.0) title reveal (emerges out of pitch blackness like a horror movie)
 * - Aerospace HUD Leader-Line Tooltip Architecture:
 *     * Cards docked in empty negative space on left and right flanks (zero overlap)
 *     * High-precision SVG caliper/leader lines connecting cards to pinpoint robot reticles
 *     * Synchronized tandem hover states across cards, leader lines, and robot pins
 * - Minimalist floating glass pill dock
 * - Tightened 3-scroll track (zero dead scrolling)
 */

(function () {
  let isInitialized = false;

  const PIN_LANDMARKS = {
    pinVisor: { u: 0.465, v: 0.469, isLeft: true },     // Active Multi-Spectral Optic
    pinNeck: { u: 0.458, v: 0.729, isLeft: true },      // Dual-Axis Cervical Drive
    pinCranial: { u: 0.520, v: 0.310, isLeft: false },  // Real-Time MuJoCo Engine
    pinShoulder: { u: 0.621, v: 0.781, isLeft: false }, // Damped Least Squares (DLS)
  };

  const PAIRINGS = [
    { cardId: "cardPerception", pinId: "pinVisor", isLeft: true },
    { cardId: "cardActuation", pinId: "pinNeck", isLeft: true },
    { cardId: "cardPhysics", pinId: "pinCranial", isLeft: false },
    { cardId: "cardKinematics", pinId: "pinShoulder", isLeft: false },
  ];

  function initHeroScene() {
    const scrollContainer = document.getElementById("overviewView");
    const heroStickyStage = document.getElementById("heroStickyStage");
    const heroBrand = document.getElementById("heroBrandCenter");
    const heroBlur = document.getElementById("heroBlurLayer");
    const heroTooltips = document.getElementById("heroTooltipsOverlay");
    const heroLeaderLinesSvg = document.getElementById("heroLeaderLinesSvg");
    const heroDarknessCurtain = document.getElementById("heroDarknessCurtain");
    const heroDock = document.getElementById("heroBottomDock");
    const heroBgImg = document.getElementById("heroBgImg");
    const scrollIndicator = document.getElementById("heroScrollIndicator");
    const btnEnterLab = document.getElementById("btnHeroEnterLab");

    if (!scrollContainer || !heroBrand || !heroBlur) return;

    // Mathematically synchronize robot pins and SVG caliper leader lines with rendered robot image
    function updateTooltipsLayout() {
      if (!heroStickyStage) return;
      const containerW = heroStickyStage.clientWidth;
      const containerH = heroStickyStage.clientHeight;
      if (!containerW || !containerH) return;

      const imgAspect = 1376 / 768; // 16:9 cinematic widescreen (1.7917)
      const containerAspect = containerW / containerH;

      let renderedW, renderedH, offsetLeft, offsetTop;

      if (containerAspect > imgAspect) {
        // Container is wider than 16:9 -> width matches, height overflows
        renderedW = containerW;
        renderedH = containerW / imgAspect;
        offsetLeft = 0;
        offsetTop = (containerH - renderedH) * 0.50;
      } else {
        // Container is taller than 16:9 -> height matches, width overflows
        renderedH = containerH;
        renderedW = containerH * imgAspect;
        offsetTop = 0;
        offsetLeft = (containerW - renderedW) * 0.50;
      }

      // 1. Position each pinpoint reticle on its exact landmark
      for (const [pinId, landmark] of Object.entries(PIN_LANDMARKS)) {
        const pinEl = document.getElementById(pinId);
        if (pinEl) {
          const pinX = Math.round(offsetLeft + landmark.u * renderedW);
          const pinY = Math.round(offsetTop + landmark.v * renderedH);
          pinEl.style.left = `${pinX}px`;
          pinEl.style.top = `${pinY}px`;
        }
      }

      // 2. Draw SVG Leader Lines from Flank Cards to Robot Pins
      if (heroLeaderLinesSvg) {
        const stageRect = heroStickyStage.getBoundingClientRect();
        let svgPathsHtml = "";

        PAIRINGS.forEach(({ cardId, pinId, isLeft }) => {
          const cardEl = document.getElementById(cardId);
          const pinEl = document.getElementById(pinId);
          if (!cardEl || !pinEl) return;

          const cardRect = cardEl.getBoundingClientRect();
          const pinRect = pinEl.getBoundingClientRect();

          // Card anchor on the inner edge facing the robot
          const cardAnchorX = isLeft
            ? Math.round(cardRect.right - stageRect.left)
            : Math.round(cardRect.left - stageRect.left);
          const cardAnchorY = Math.round(cardRect.top - stageRect.top + cardRect.height * 0.5);

          // Pin target center
          const pinX = Math.round(pinRect.left - stageRect.left + pinRect.width * 0.5);
          const pinY = Math.round(pinRect.top - stageRect.top + pinRect.height * 0.5);

          // Technical elbow shoulder (horizontal offset before diagonal dogleg)
          const elbowDist = isLeft
            ? Math.min(48, Math.max(26, (pinX - cardAnchorX) * 0.35))
            : -Math.min(48, Math.max(26, (cardAnchorX - pinX) * 0.35));
          const elbowX = Math.round(cardAnchorX + elbowDist);

          const d = `M ${cardAnchorX} ${cardAnchorY} L ${elbowX} ${cardAnchorY} L ${pinX} ${pinY}`;
          const isActive = cardEl.classList.contains("active") || pinEl.classList.contains("active");
          const activeClass = isActive ? " active" : "";

          svgPathsHtml += `
            <g id="group_${cardId}">
              <path id="line_${cardId}" d="${d}" class="leader-line-path${activeClass}" />
              <circle cx="${cardAnchorX}" cy="${cardAnchorY}" r="3" class="leader-line-anchor${activeClass}" />
              <circle cx="${elbowX}" cy="${cardAnchorY}" r="2" class="leader-line-joint${activeClass}" />
            </g>
          `;
        });

        heroLeaderLinesSvg.setAttribute("viewBox", `0 0 ${containerW} ${containerH}`);
        heroLeaderLinesSvg.innerHTML = svgPathsHtml;
      }
    }

    // Attach tandem hover highlighting across cards, lines, and pins
    PAIRINGS.forEach(({ cardId, pinId }) => {
      const cardEl = document.getElementById(cardId);
      const pinEl = document.getElementById(pinId);

      function setActive(active) {
        const lineEl = document.getElementById(`line_${cardId}`);
        const anchorEl = document.querySelector(`#group_${cardId} .leader-line-anchor`);
        const jointEl = document.querySelector(`#group_${cardId} .leader-line-joint`);

        if (active) {
          cardEl?.classList.add("active");
          pinEl?.classList.add("active");
          lineEl?.classList.add("active");
          anchorEl?.classList.add("active");
          jointEl?.classList.add("active");
        } else {
          cardEl?.classList.remove("active");
          pinEl?.classList.remove("active");
          lineEl?.classList.remove("active");
          anchorEl?.classList.remove("active");
          jointEl?.classList.remove("active");
        }
      }

      cardEl?.addEventListener("mouseenter", () => setActive(true));
      cardEl?.addEventListener("mouseleave", () => setActive(false));
      pinEl?.addEventListener("mouseenter", () => setActive(true));
      pinEl?.addEventListener("mouseleave", () => setActive(false));
    });

    window.removeEventListener("resize", updateTooltipsLayout);
    window.addEventListener("resize", updateTooltipsLayout);
    window.addEventListener("orientationchange", updateTooltipsLayout);

    if (heroBgImg && !heroBgImg.complete) {
      heroBgImg.addEventListener("load", updateTooltipsLayout);
    }
    // Initial layout calculation
    requestAnimationFrame(updateTooltipsLayout);

    // C2-Continuous SmootherStep Physics Controller (Perlin's Smootherstep)
    // Zero velocity & zero jerk at endpoints: identical, silky-smooth motion both
    // scrolling down (top to bottom) and scrolling back up (bottom to top).
    let targetProgress = 0.0;
    let currentProgress = 0.0;
    let animStartProgress = 0.0;
    let animStartTime = 0;
    let animDuration = 700; // ms
    let isAnimating = false;
    let rafId = null;

    function smootherstep(t) {
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    function applyState(p) {
      // 1. UNILAB Brand Title: Smooth upward slide & fade across 0% -> 75%
      // Completely motionless letter geometry; symmetric fade in/out
      const pTitle = Math.min(1.0, Math.max(0.0, p / 0.75));
      const titleEase = pTitle * pTitle * (3.0 - 2.0 * pTitle);
      const titleTranslateY = Math.round(-titleEase * 120);
      const titleOpacity = Math.max(0.0, 1.0 - titleEase);

      heroBrand.style.transform = `translate3d(-50%, calc(-50% + ${titleTranslateY}px), 0)`;
      heroBrand.style.opacity = titleOpacity.toFixed(3);
      heroBrand.style.pointerEvents = titleOpacity < 0.05 ? "none" : "auto";

      // Disengage intro animations when scrolling starts
      if (p > 0.01) {
        if (heroStickyStage.classList.contains("hero-intro")) {
          heroStickyStage.classList.remove("hero-intro");
        }
        if (heroDarknessCurtain) {
          heroDarknessCurtain.style.opacity = "0";
          heroDarknessCurtain.style.visibility = "hidden";
        }
      }

      // 2. Dynamic Blur Layer: Dissolves softly across 0% -> 70%
      const pBlur = Math.min(1.0, Math.max(0.0, p / 0.70));
      const blurEase = pBlur * pBlur * (3.0 - 2.0 * pBlur);
      const blurOpacity = Math.max(0.0, 1.0 - blurEase);

      heroBlur.style.opacity = blurOpacity.toFixed(3);
      heroBlur.style.visibility = blurOpacity < 0.01 ? "hidden" : "visible";

      // 3. Floating Flank Cards & Caliper Lines: Cross-fades gracefully across 20% -> 90%
      const pCards = Math.min(1.0, Math.max(0.0, (p - 0.20) / 0.70));
      const cardsEase = pCards * pCards * (3.0 - 2.0 * pCards);

      if (heroTooltips) {
        heroTooltips.style.opacity = cardsEase.toFixed(3);
        heroTooltips.style.pointerEvents = cardsEase > 0.35 ? "auto" : "none";
      }
      if (heroLeaderLinesSvg) {
        heroLeaderLinesSvg.style.opacity = cardsEase.toFixed(3);
      }

      // 4. Minimalist Floating Pill Dock: Emerges concurrently across 25% -> 95%
      // Slides upward into place on scroll down; glides back down on scroll up
      const pDock = Math.min(1.0, Math.max(0.0, (p - 0.25) / 0.70));
      const dockEase = pDock * pDock * (3.0 - 2.0 * pDock);
      const dockTranslateY = Math.round((1.0 - dockEase) * 45);

      if (heroDock) {
        heroDock.style.opacity = dockEase.toFixed(3);
        heroDock.style.transform = `translate3d(-50%, ${dockTranslateY}px, 0)`;
        heroDock.style.pointerEvents = dockEase > 0.35 ? "auto" : "none";
      }
    }

    function animateTo(target) {
      if (Math.abs(target - targetProgress) < 0.001 && isAnimating) {
        return; // Already smoothly traveling towards target
      }
      targetProgress = target;
      animStartProgress = currentProgress;
      const distance = Math.abs(targetProgress - animStartProgress);
      if (distance < 0.002) {
        currentProgress = targetProgress;
        applyState(currentProgress);
        isAnimating = false;
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        return;
      }

      animDuration = Math.max(350, Math.round(distance * 700));
      animStartTime = performance.now();

      if (!isAnimating) {
        isAnimating = true;
        rafId = window.requestAnimationFrame(animationStep);
      }
    }

    function animationStep(now) {
      if (!isAnimating) return;
      const elapsed = now - animStartTime;
      const rawT = Math.min(1.0, elapsed / animDuration);
      const easeT = smootherstep(rawT);

      currentProgress = animStartProgress + (targetProgress - animStartProgress) * easeT;
      applyState(currentProgress);

      if (rawT < 1.0) {
        rafId = window.requestAnimationFrame(animationStep);
      } else {
        currentProgress = targetProgress;
        applyState(currentProgress);
        isAnimating = false;
        rafId = null;
      }
    }

    // Direct wheel interaction: 1 scroll down reveals everything; 1 scroll up returns to intro
    // Completely smooth in both directions with zero native displacement
    function onWheel(e) {
      if (!scrollContainer.classList.contains("active")) return;
      if (Math.abs(e.deltaY) < 6) return;

      if (e.deltaY > 0) {
        animateTo(1.0);
      } else {
        animateTo(0.0);
      }
    }

    scrollContainer.removeEventListener("wheel", onWheel);
    scrollContainer.addEventListener("wheel", onWheel, { passive: true });
    window.removeEventListener("wheel", onWheel);
    window.addEventListener("wheel", onWheel, { passive: true });

    // Touch support (swipe up to reveal, swipe down to return)
    let touchStartY = 0;
    function onTouchStart(e) {
      if (!scrollContainer.classList.contains("active")) return;
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    }
    function onTouchMove(e) {
      if (!scrollContainer.classList.contains("active")) return;
      if (!e.touches || !e.touches[0]) return;
      const diffY = touchStartY - e.touches[0].clientY;
      if (Math.abs(diffY) > 25) {
        animateTo(diffY > 0 ? 1.0 : 0.0);
      }
    }
    scrollContainer.removeEventListener("touchstart", onTouchStart);
    scrollContainer.removeEventListener("touchmove", onTouchMove);
    scrollContainer.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollContainer.addEventListener("touchmove", onTouchMove, { passive: true });
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Click on indicator to smoothly glide to the revealed state
    if (scrollIndicator) {
      scrollIndicator.onclick = () => {
        animateTo(1.0);
      };
    }

    // Button: Enter current lab
    if (btnEnterLab) {
      btnEnterLab.onclick = () => {
        if (typeof showLessonsView === "function") {
          showLessonsView();
        }
      };
    }

    // Calculate initial target and jump current directly
    const initialHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    if (initialHeight > 0) {
      targetProgress = Math.min(1.0, Math.max(0.0, scrollContainer.scrollTop / initialHeight));
      currentProgress = targetProgress;
    } else {
      targetProgress = 0.0;
      currentProgress = 0.0;
    }
    applyState(currentProgress);
    isInitialized = true;
  }

  // Backwards compatibility for app.js
  window.initScene3D = function () {
    initHeroScene();
  };

  // Auto-init on load if overview is active
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initHeroScene();
    });
  } else {
    setTimeout(initHeroScene, 50);
  }

})();
