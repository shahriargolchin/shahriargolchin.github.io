// Sidebar nav: highlight the section currently in view
(function () {
  var ids = ["about", "publications", "blog-posts", "service"];
  var links = document.querySelectorAll(".sidebar-nav a.navlink");
  if (!links.length) return;

  function setActive(current) {
    links.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
  }

  function updateActive() {
    var offset = window.innerHeight * 0.3;
    var current = ids[0];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= offset) current = id;
    });
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) current = ids[ids.length - 1];
    setActive(current);
  }

  // While a clicked link's smooth scroll is in flight, keep that link
  // highlighted instead of tracking scroll position.
  var locked = false;
  var lockTimer = null;
  links.forEach(function (link) {
    link.addEventListener("click", function () {
      locked = true;
      setActive(link.getAttribute("href").slice(1));
    });
  });

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (locked) {
      clearTimeout(lockTimer);
      lockTimer = setTimeout(function () { locked = false; }, 200);
      return;
    }
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        updateActive();
        ticking = false;
      });
    }
  }, { passive: true });
  updateActive();
})();

// Expandable abstracts
(function () {
  document.querySelectorAll(".abstract-toggle").forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      var abstract = toggle.closest(".paper").querySelector(".abstract");
      var open = toggle.classList.toggle("open");
      abstract.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open);
    });
  });
})();

// Link hover previews: a small card with the target site's thumbnail and domain
(function () {
  if (window.matchMedia("(hover: none)").matches) return;
  var links = document.querySelectorAll(".col-md-8 a[href^='http']");
  if (!links.length) return;

  var card = document.createElement("div");
  card.id = "link-preview";
  card.innerHTML =
    '<div class="preview-imgwrap"><img class="preview-shot" alt="">' +
    '<div class="preview-loading">Generating preview…</div></div>' +
    '<div class="preview-meta"><img class="preview-favicon" alt=""><span class="preview-domain"></span></div>';
  document.body.appendChild(card);

  var imgwrap = card.querySelector(".preview-imgwrap");
  var shot = card.querySelector(".preview-shot");
  var favicon = card.querySelector(".preview-favicon");
  var domain = card.querySelector(".preview-domain");
  var CARD_W = 260;
  var CARD_H = 190;
  var showTimer = null;
  var retryTimer = null;
  var retries = 0;

  function shotUrl(url) {
    return "https://s0.wp.com/mshots/v1/" + encodeURIComponent(url) + "?w=520";
  }

  // mShots serves a small placeholder (or errors) until its server has
  // rendered the page, so keep the loading state and poll until the real
  // thumbnail (full requested width) arrives
  function scheduleRetry() {
    if (retries >= 6 || !card.classList.contains("visible")) return;
    retries++;
    var src = shot.src.split("&r=")[0];
    retryTimer = setTimeout(function () {
      if (card.classList.contains("visible")) shot.src = src + "&r=" + Date.now();
    }, 2000);
  }

  shot.addEventListener("load", function () {
    if (shot.naturalWidth >= 500) {
      imgwrap.classList.add("loaded");
    } else {
      scheduleRetry();
    }
  });

  shot.addEventListener("error", scheduleRetry);

  favicon.addEventListener("error", function () {
    favicon.style.display = "none";
  });

  // Pre-warm mShots so thumbnails are already rendered server-side by the
  // time a link is first hovered; requests are staggered to be gentle
  window.addEventListener("load", function () {
    setTimeout(function () {
      var urls = [];
      links.forEach(function (link) {
        if (urls.indexOf(link.href) === -1) urls.push(link.href);
      });
      var i = 0;
      (function next() {
        if (i >= urls.length) return;
        new Image().src = shotUrl(urls[i]);
        i++;
        setTimeout(next, 250);
      })();
    }, 1500);
  });

  function position(link) {
    var r = link.getBoundingClientRect();
    var left = Math.min(Math.max(8, r.left), window.innerWidth - CARD_W - 8);
    var top = r.bottom + 10;
    if (top + CARD_H > window.innerHeight - 8) top = r.top - CARD_H - 10;
    card.style.left = left + "px";
    card.style.top = top + "px";
  }

  links.forEach(function (link) {
    link.addEventListener("mouseenter", function () {
      clearTimeout(showTimer);
      showTimer = setTimeout(function () {
        var host;
        try {
          host = new URL(link.href).hostname.replace(/^www\./, "");
        } catch (e) {
          return;
        }
        domain.textContent = host;
        favicon.style.display = "block";
        favicon.src = "https://www.google.com/s2/favicons?domain=" + host + "&sz=32";
        imgwrap.classList.remove("loaded");
        retries = 0;
        position(link);
        card.classList.add("visible");
        shot.src = shotUrl(link.href);
        if (shot.complete && shot.naturalWidth >= 500) imgwrap.classList.add("loaded");
      }, 200);
    });
    link.addEventListener("mouseleave", function () {
      clearTimeout(showTimer);
      clearTimeout(retryTimer);
      card.classList.remove("visible");
    });
  });
})();
