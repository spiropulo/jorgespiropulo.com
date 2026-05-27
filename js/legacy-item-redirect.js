(function () {
  "use strict";

  function decode(s) {
    try {
      return decodeURIComponent(s.replace(/\+/g, " "));
    } catch (e) {
      return s;
    }
  }

  function slugify(s) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  function humanizeFilename(path) {
    if (!path) return "artwork";
    var base = path.replace(/^.*\//, "").replace(/\.[^.]+$/i, "").replace(/_\d+$/, "");
    return slugify(
      base
        .replace(/\./g, " ")
        .replace(/_/g, " ")
        .trim() || "artwork"
    );
  }

  var params = window.location.search.substr(1).split("&").filter(Boolean);
  var sources = [];
  var name = "";

  params.forEach(function (item) {
    var parts = item.split("=");
    var key = parts[0];
    var val = parts.length > 1 ? parts.slice(1).join("=") : "";
    if (!key) return;
    if (key.indexOf("src") === 0) sources.push(decode(val));
    if (key === "name1") name = decode(val).replace(/_/g, " ");
  });

  var primary = sources[0] || "";
  var titleSlug = name ? slugify(name) : "";
  var fileSlug = humanizeFilename(primary);
  var prefix = primary ? slugify(primary.replace(/^img\//, "").split("/").slice(0, -1).join("-")) : "";
  var slug = prefix ? prefix + "-" + (titleSlug || fileSlug) : titleSlug || fileSlug;

  if (!slug) {
    return;
  }

  fetch("works-index.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (index) {
      var target = index[primary] || index[slug] || index[titleSlug];
      if (target) {
        window.location.replace(target);
        return;
      }
      window.location.replace("works/" + slug + ".html");
    })
    .catch(function () {
      window.location.replace("works/" + slug + ".html");
    });
})();
