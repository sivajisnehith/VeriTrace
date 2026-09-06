(function () {
  // ---- mobile nav toggle -------------------------------------------------
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // ---- CTA buttons: navigate to investigation workspace ------------------
  document.querySelectorAll('[data-cta="start"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.getAttribute("href") === "#") {
        e.preventDefault();
        el.classList.add("btn-pulse");
        window.setTimeout(() => {
          el.classList.remove("btn-pulse");
          window.location.href = "investigate/index.html";
        }, 180);
      }
    });
  });

  // ---- WebGL capability check (belt-and-braces alongside scene.js) -------
  function hasWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  if (!hasWebGL()) {
    const visual = document.getElementById("hero-visual");
    if (visual) visual.classList.add("no-webgl");
  }
})();
