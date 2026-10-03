(function () {
  const buttons = [...document.querySelectorAll("[data-shot]")];
  const dialog = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const count = document.getElementById("lightbox-count");
  const nav = document.querySelector(".tour-nav");
  let index = 0;
  let lastFocus = null;

  function textFor(button) {
    if (button.dataset.caption) return button.dataset.caption;
    const figureCaption = button.closest("figure")?.querySelector("figcaption");
    return figureCaption ? figureCaption.textContent.trim() : "";
  }

  function show(next) {
    index = (next + buttons.length) % buttons.length;
    const button = buttons[index];
    const source = button.querySelector("img");
    img.src = source.currentSrc || source.src;
    img.alt = source.alt;
    caption.textContent = textFor(button);
    count.textContent = index + 1 + " of " + buttons.length;
    if (!dialog.open) {
      lastFocus = document.activeElement;
      dialog.showModal();
    }
  }

  buttons.forEach((button, i) => {
    button.addEventListener("click", () => show(i));
  });

  document.getElementById("lightbox-prev").addEventListener("click", () => show(index - 1));
  document.getElementById("lightbox-next").addEventListener("click", () => show(index + 1));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    img.removeAttribute("src");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    }
  });

  const links = [...document.querySelectorAll(".tour-nav a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || !nav) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = "#" + visible.target.id;
      links.forEach((link) => {
        if (link.getAttribute("href") === id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      const current = nav.querySelector("[aria-current='true']");
      if (!current) return;
      const left = current.offsetLeft - nav.clientWidth / 2 + current.offsetWidth / 2;
      nav.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] }
  );

  sections.forEach((section) => observer.observe(section));
})();
