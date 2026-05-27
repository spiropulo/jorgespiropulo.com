(function () {
  function normalizePath() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var p = path.split("/").pop() || "";
    if (!p) return "index.html";
    return p.toLowerCase();
  }

  function highlightCurrentNav() {
    var path = normalizePath();
    var links = document.querySelectorAll(".site-nav .nav-link[href]");
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href === "#") return;
      var file = href.split("/").pop().toLowerCase();
      if (file === path) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlightCurrentNav);
  } else {
    highlightCurrentNav();
  }
})();
