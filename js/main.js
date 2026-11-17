/*
Template Name: rawstuf-auto-parts-website-template
File Name: main.js
Author Name: ThemeVault
Author URI: https://www.themevault.net/
Version: 2.0

Dependency-free. Bootstrap's own bundle drives the navbar, tabs, carousel,
accordion and scrollspy; everything below replaces what jQuery and its plugins
used to do.
*/
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Back to top — fades in past 100px, returns to the top */
    var toTop = document.getElementById("back-to-top");
    if (toTop) {
        var toggleToTop = function () { toTop.classList.toggle("is-visible", window.scrollY > 100); };
        toggleToTop();
        window.addEventListener("scroll", toggleToTop, { passive: true });
        toTop.addEventListener("click", function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        });
    }

    /* BS3 marked the active tab on the <li>; BS5 marks the <a>. Templates key CSS on li.active (flowerspetal, wrap-d-style) — keep both in step */
    /* BS3's tab plugin worked from any trigger; BS5's needs a .nav / .list-group / [role=tablist] ancestor or it silently does nothing
       (homeapart: eight grid columns switch the portfolio panes). Give such triggers their nearest .row as the tablist. */
    document.querySelectorAll('[data-bs-toggle="tab"], [data-bs-toggle="pill"]').forEach(function (t) {
        if (t.closest('.nav, .list-group, [role="tablist"]')) return;
        var host = t.closest(".row") || t.parentElement.parentElement; if (host && !host.getAttribute("role")) host.setAttribute("role", "tablist");
    });
    /* BS5's scrollspy marks the <a>.active and colours it at (0,3,0) — above a template's ".navbar-default .navbar-nav > li > a" (0,2,2), so
       the spied item went grey (homeapart's "About" on the tablet). BS3 marked the <li>; do the same and take the class off the <a>. */
    document.addEventListener("activate.bs.scrollspy", function (e) {
        var a = e.relatedTarget; if (!a || !a.closest) return;
        var ul = a.closest(".navbar-nav, .nav, ul"); if (ul) ul.querySelectorAll("li.active").forEach(function (li) { li.classList.remove("active"); });
        var li = a.closest("li"); if (li) li.classList.add("active");
        a.classList.remove("active");
    });
    document.addEventListener("shown.bs.tab", function (e) { var a = e.target, ul = a.closest('.nav, [role="tablist"]'); if (!ul) return; ul.querySelectorAll("li").forEach(function (li) { li.classList.remove("active"); }); ul.querySelectorAll("[data-bs-toggle]").forEach(function (t) { if (t !== a) t.classList.remove("active"); }); var li = a.closest("li"); if (li) li.classList.add("active"); });
    /* BS3 marked an open dropdown's parent with .open; BS5 uses .show. Templates
       key CSS on .open (wrap-d-style slides its cart panel in on it) — mirror it. */
    document.addEventListener("shown.bs.dropdown", function (e) { var p = e.target.closest(".dropdown, .btn-group, .dropup") || e.target.parentElement; if (p) p.classList.add("open"); });
    document.addEventListener("hidden.bs.dropdown", function (e) { var p = e.target.closest(".dropdown, .btn-group, .dropup") || e.target.parentElement; if (p) p.classList.remove("open"); });

    /* Tapping a link in the collapsed menu closes it. The dropdown-toggle
       exclusion matters: without it, adding a submenu later makes the whole
       menu retract the moment it is tapped. */
    var collapse = document.querySelector(".navbar-collapse");
    if (collapse) {
        collapse.addEventListener("click", function (e) {
            /* any destination: a .dropdown-item or a bare submenu <a href> too, never an href-less submenu opener */
            var link = e.target.closest("a[href]");
            if (!link || link.classList.contains("dropdown-toggle") || link.getAttribute("href") === "#") return;
            if (!collapse.classList.contains("show")) return;
            var inst = window.bootstrap && bootstrap.Collapse.getInstance(collapse);
            if (inst) inst.hide();
        });
    }
    /* ------------------------------------------------------------------
       Carousels — replaces Owl Carousel (and jQuery with it). Shared block
       from web/scripts/upgrade-qa2/lib/js/carousel.js.

       Config travels on data-owl, lifted from v1's inline $.owlCarousel()
       call, e.g. data-owl='{"items":1,"dots":true,"loop":true,"autoplay":4000}':
         items / responsive   how many show at each MIN width ({"0":1,"768":2})
         nav, dots            arrows (navHtml for custom markup) / pager
         loop                 wrap around — with CLONES, as Owl does
         speed                transition in ms (Owl's 250 default)
         autoplay             interval in ms, or falsy for none
       The plugin's STYLESHEET (owl.carousel.css / owl.theme.default.css) is
       kept verbatim because it IS the slider's design — Owl built the
       stage/item DOM at runtime; this builds the same DOM.
       ------------------------------------------------------------------ */
    document.querySelectorAll("[data-owl]").forEach(function (root) {
        var cfg;
        try { cfg = JSON.parse(root.getAttribute("data-owl")); } catch (e) { return; }
        var slides = Array.prototype.filter.call(root.children, function (c) { return c.nodeType === 1; });
        if (!slides.length) return;
        var speed = reduceMotion ? 0 : (cfg.speed || 250);
        var loop = !!cfg.loop && slides.length > 1;

        var stage = document.createElement("div");
        stage.className = "owl-stage";
        var outer = document.createElement("div");
        outer.className = "owl-stage-outer";
        outer.appendChild(stage);

        var wrap = function (el, cloned) {
            /* a template that hand-wrote <div class="owl-item"> around each slide (wrap-d-style's thumbnails) is not wrapped twice */
            if (el.classList && el.classList.contains("owl-item")) { if (cloned) { el.classList.add("cloned"); el.setAttribute("aria-hidden", "true"); } return el; }
            var item = document.createElement("div");
            item.className = "owl-item" + (cloned ? " cloned" : "");
            if (cloned) item.setAttribute("aria-hidden", "true");
            item.appendChild(el);
            return item;
        };
        if (loop) slides.forEach(function (el) { stage.appendChild(wrap(el.cloneNode(true), true)); });
        slides.forEach(function (el) { stage.appendChild(wrap(el, false)); });
        if (loop) slides.forEach(function (el) { stage.appendChild(wrap(el.cloneNode(true), true)); });

        root.textContent = "";
        root.appendChild(outer);
        root.classList.add("owl-loaded", "owl-drag");

        var items = Array.prototype.slice.call(stage.children);
        var count = slides.length;
        var index = loop ? count : 0;
        var timer = null, animating = false;

        var nav = document.createElement("div"), navBtn = {};
        nav.className = "owl-nav" + (cfg.nav ? "" : " disabled");
        /* Owl 2 rendered the arrows as <div class="owl-prev"> (a template's CSS
           keys on `.owl-nav > div`, wrap-d-style on `div.owl2-prev`) and let
           navClass / navText rename and fill them. Same here: a <div
           role=button> when the template's CSS wants a div, its own class
           names, its own text — a11y kept with tabindex + Enter/Space. */
        ["prev", "next"].forEach(function (dir, i) {
            var b = document.createElement(cfg.navTag || "div");
            if (b.tagName === "BUTTON") b.type = "button"; else { b.setAttribute("role", "button"); b.tabIndex = 0; }
            b.className = (cfg.navClass && cfg.navClass[i]) || "owl-" + dir;
            b.setAttribute("aria-label", dir === "prev" ? "Previous slide" : "Next slide");
            var text = cfg.navText && cfg.navText[i];
            b.innerHTML = (cfg.navHtml && cfg.navHtml[dir]) || (typeof text === "string" ? text : '<i class="fas fa-angle-' + (dir === "prev" ? "left" : "right") + '" aria-hidden="true"></i>');
            var fire = function () { go(dir === "next" ? 1 : -1); restartAutoplay(); };
            b.addEventListener("click", function () { fire(); if (b.tagName !== "BUTTON") b.blur(); }); /* a focusable div keeps a template's :focus (hover) look after a mouse click — v1's divs were not focusable */
            b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } });
            nav.appendChild(b); navBtn[dir] = b;
        });
        root.appendChild(nav);

        var dots = document.createElement("div");
        dots.className = (cfg.dotsClass || "owl-dots") + (cfg.dots ? "" : " disabled");
        if (cfg.dots) root.appendChild(dots); /* Owl built no pager at dots:false; a custom dotsClass would otherwise miss owl.theme's .owl-dots.disabled and show two stray dashes (wrap-d-style) */

        var perView = function () {
            var w = window.innerWidth, n = cfg.items || 1;
            Object.keys(cfg.responsive || {})
                .map(Number).sort(function (a, b) { return a - b; })
                .forEach(function (bp) { if (w >= bp) n = cfg.responsive[bp]; });
            return Math.max(1, Math.min(n, count));
        };
        var itemWidth = function () {
            var n = perView(), gap = cfg.margin || 0;
            return (root.clientWidth - gap * (n - 1)) / n;
        };
        var step = function () { return loop ? 1 : perView(); };
        var lastIndex = function () { return loop ? items.length - 1 : Math.max(0, count - perView()); };

        var setTransform = function (withTransition) {
            var gap = cfg.margin || 0;
            stage.style.transition = withTransition && speed ? "transform " + speed + "ms ease" : "none";
            stage.style.transform = "translateX(" + (-index * (itemWidth() + gap)) + "px)";
            var real = loop ? ((index - count) % count + count) % count : index;
            Array.prototype.forEach.call(dots.children, function (d, i) {
                d.classList.toggle("active", i === Math.floor(real / step()));
            });
            items.forEach(function (it, i) { it.classList.toggle("active", i >= index && i < index + perView()); });
            /* Owl marked the arrow that can go no further .disabled (owl.carousel.css fades it); a template's own CSS keys on it too */
            if (!loop) { if (navBtn.prev) navBtn.prev.classList.toggle("disabled", index <= 0); if (navBtn.next) navBtn.next.classList.toggle("disabled", index >= lastIndex()); }
        };

        var guard = null;
        var go = function (d) {
            if (animating) return;
            var target = index + d * step();
            if (!loop) target = Math.max(0, Math.min(lastIndex(), target));
            if (target === index) return;
            index = target;
            animating = speed > 0;
            setTransform(true);
            if (!animating) { settleLoop(); return; }
            clearTimeout(guard);
            guard = setTimeout(settleLoop, speed + 100);
        };
        var settleLoop = function () {
            clearTimeout(guard);
            animating = false;
            if (!loop) return;
            if (index >= 2 * count) { index -= count; setTransform(false); }
            else if (index < count) { index += count; setTransform(false); }
        };
        stage.addEventListener("transitionend", function (e) { if (e.target === stage) settleLoop(); });

        var layout = function () {
            if (!root.clientWidth) return;
            var width = itemWidth(), gap = cfg.margin || 0;
            items.forEach(function (it) {
                it.style.width = width + "px";
                it.style.marginRight = gap + "px";
            });
            stage.style.width = (width + gap) * items.length + "px";
            if (!loop && index > lastIndex()) index = lastIndex();
            nav.classList.toggle("disabled", !cfg.nav || count <= perView());
            dots.textContent = "";
            var pages = Math.max(1, Math.ceil(count / step()));
            for (var i = 0; i < pages; i++) {
                (function (i) {
                    var d = document.createElement("button");
                    d.type = "button";
                    d.className = cfg.dotClass || "owl-dot";
                    d.setAttribute("aria-label", "Go to slide " + (i + 1));
                    d.appendChild(document.createElement("span"));
                    d.addEventListener("click", function () { index = (loop ? count : 0) + i * step(); setTransform(true); restartAutoplay(); });
                    dots.appendChild(d);
                })(i);
            }
            setTransform(false);
        };

        var restartAutoplay = function () {
            if (!cfg.autoplay || reduceMotion) return;
            clearInterval(timer);
            timer = setInterval(function () { go(1); }, cfg.autoplay);
        };
        root.addEventListener("mouseenter", function () { clearInterval(timer); });
        root.addEventListener("mouseleave", restartAutoplay);
        restartAutoplay();

        var startX = null;
        var onDown = function (x) { startX = x; };
        var onUp = function (x) {
            if (startX === null) return;
            var dx = x - startX;
            startX = null;
            if (Math.abs(dx) < 40) return;
            go(dx < 0 ? 1 : -1);
            restartAutoplay();
        };
        root.addEventListener("touchstart", function (e) { onDown(e.touches[0].clientX); }, { passive: true });
        root.addEventListener("touchend", function (e) { onUp(e.changedTouches[0].clientX); }, { passive: true });

        layout();
        if ("ResizeObserver" in window) {
            var lastW = root.clientWidth;
            new ResizeObserver(function () {
                if (root.clientWidth === lastW) return;
                lastW = root.clientWidth;
                layout();
            }).observe(root);
        } else {
            var t;
            window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(layout, 150); }, { passive: true });
        }
    });

    /* A static template posts nowhere, so rather than pretend, validate and
       say so plainly. */
    var form = document.querySelector("form.tv-contact-form"); /* form. — a template's own wrapper <div class="tv-contact-form"> (cunsultix contact.html) is not a form */
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
            var note = form.querySelector(".tv-form-note");
            if (note) { note.hidden = false; note.focus(); }
            form.reset(); form.classList.remove("was-validated");
        });
    }
})();

/* Footer year */
(function () { var y = document.getElementById("tv-year"); if (y) y.textContent = String(new Date().getFullYear()); })();

/* No transitions on first paint, and no :hover-driven menus until the visitor moves: a browser can paint the new page with the cursor
   already resting on a nav item, so a hover-opened mega menu or cart panel shows for a moment and then animates shut
   (wrap-d-style, owner note 16). tv-preload drops transitions; tv-nohover keeps hover menus closed until the first real input. */
(function () {
    var body = document.body; body.classList.add("tv-nohover");
    var go = function () { requestAnimationFrame(function () { body.classList.remove("tv-preload"); }); };
    if (document.readyState === "complete") go(); else window.addEventListener("load", go);
    var release = function () { body.classList.remove("tv-nohover"); ["mousemove", "touchstart", "keydown", "wheel"].forEach(function (t) { window.removeEventListener(t, release); }); };
    ["mousemove", "touchstart", "keydown", "wheel"].forEach(function (t) { window.addEventListener(t, release, { passive: true }); });
})();

/* RS-DESIGN START */
/* Rawstuf 2.0 — Fitment Counter behaviours. Every block is data-attribute driven and tolerates its section being absent.
   Vehicles come from js/vehicles.js (window.RS_VEHICLES: make -> model -> [first year, last year]).
   The saved car ("My garage") lives in localStorage under rs-garage; product cards check it against their data-fits list. */
(function () {
    var KEY = "rs-garage";
    var CARS = window.RS_VEHICLES || {};
    var read = function () { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
    var save = function (car) { try { localStorage.setItem(KEY, JSON.stringify(car)); } catch (e) {} paint(car); };
    var label = function (car) { return car.year + " " + car.make + " " + car.model; };
    var makesFor = function (y) { return Object.keys(CARS).filter(function (mk) { return modelsFor(y, mk).length; }).sort(); };
    var modelsFor = function (y, mk) { var m = CARS[mk] || {}; return Object.keys(m).filter(function (md) { return y >= m[md][0] && y <= m[md][1]; }).sort(); };

    /* data-fits="all" (universal) or "Make/Model/2014-2019; Make/Model/2016-2021" */
    function fits(list, car) {
        if (list === "all") return true;
        return list.split(";").some(function (f) {
            var p = f.trim().split("/"); if (p.length < 3) return false;
            var yr = p[2].split("-"), y = +car.year;
            return p[0] === car.make && p[1] === car.model && y >= +yr[0] && y <= +(yr[1] || yr[0]);
        });
    }

    /* header chip + fit lines on product cards */
    function paint(car) {
        document.querySelectorAll("[data-garage-name]").forEach(function (el) { el.textContent = car ? label(car) : "Add your car"; });
        document.querySelectorAll("[data-garage-chip]").forEach(function (el) { el.classList.toggle("is-set", !!car); });
        document.querySelectorAll("[data-fits]").forEach(function (card) {
            var line = card.querySelector("[data-fit]"), txt = card.querySelector("[data-fit-text]");
            if (!line || !txt) return;
            var list = card.getAttribute("data-fits"), all = list === "all";
            var ok = all || (car && fits(list, car));
            line.classList.toggle("is-ok", !!ok);
            line.classList.toggle("is-no", !!car && !ok);
            txt.textContent = all ? "Universal, fits any car" : !car ? "Add your car to check fit" : ok ? "Fits your " + car.year + " " + car.model : "Not listed for your " + car.year + " " + car.model;
        });
    }

    /* Demo only: ?plate=off shows the finder with license plate search switched off (the data-plate setting) */
    var q = /[?&]plate=(on|off)\b/.exec(location.search);
    if (q) document.querySelectorAll("[data-plate]").forEach(function (s) { s.setAttribute("data-plate", q[1]); });

    /* year / make / model finder */
    var fillYmm = function (form, car) {
        var year = form.querySelector('[data-ymm="year"]'), make = form.querySelector('[data-ymm="make"]'), model = form.querySelector('[data-ymm="model"]');
        year.value = car.year; year.dispatchEvent(new Event("change"));
        make.value = car.make; make.dispatchEvent(new Event("change"));
        model.value = car.model;
    };
    document.querySelectorAll("[data-ymm-form]").forEach(function (form) {
        var year = form.querySelector('[data-ymm="year"]'), make = form.querySelector('[data-ymm="make"]'), model = form.querySelector('[data-ymm="model"]');
        if (!year || !make || !model) return;
        var opt = function (sel, list, first) { sel.innerHTML = '<option value="">' + first + "</option>" + list.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join(""); };
        var lo = Infinity, hi = 0;
        Object.keys(CARS).forEach(function (mk) { Object.keys(CARS[mk]).forEach(function (md) { lo = Math.min(lo, CARS[mk][md][0]); hi = Math.max(hi, CARS[mk][md][1]); }); });
        var years = []; for (var y = hi; y >= lo; y--) years.push(String(y));
        opt(year, years, "Year");
        year.addEventListener("change", function () { opt(make, year.value ? makesFor(+year.value) : [], "Make"); make.disabled = !year.value; opt(model, [], "Model"); model.disabled = true; });
        make.addEventListener("change", function () { opt(model, make.value ? modelsFor(+year.value, make.value) : [], "Model"); model.disabled = !make.value; });
        var car = read();
        if (car && CARS[car.make]) fillYmm(form, car);
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
            form.classList.remove("was-validated");
            save({ year: year.value, make: make.value, model: model.value });
            var btn = form.querySelector('[type="submit"]');
            if (btn) { btn.classList.add("is-done"); setTimeout(function () { btn.classList.remove("is-done"); }, 1800); }
        });
    });

    /* license plate search (optional, data-plate="on"). A live store sends the plate to the service named in
       data-plate-provider and gets back { year, make, model }; the "demo" provider matches any plate to a sample car. */
    var demoLookup = function (reg) {
        var n = 0; for (var i = 0; i < reg.length; i++) n += reg.charCodeAt(i) * (i + 1);
        var mks = Object.keys(CARS); if (!mks.length) return null;
        var mk = mks[n % mks.length], mds = Object.keys(CARS[mk]), md = mds[n % mds.length], r = CARS[mk][md];
        return { year: String(r[0] + (n % (r[1] - r[0] + 1))), make: mk, model: md };
    };
    document.querySelectorAll("[data-plate-form]").forEach(function (form) {
        var input = form.querySelector("input"), msg = form.querySelector("[data-plate-msg]");
        input.addEventListener("input", function () { input.value = input.value.toUpperCase(); });
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var reg = input.value.replace(/\s+/g, "");
            if (reg.length < 4) {
                form.classList.add("is-bad");
                if (msg) { msg.hidden = false; msg.textContent = "Enter the plate as it is shown on the car, for example 7ABC123."; }
                input.focus(); return;
            }
            form.classList.remove("is-bad");
            var car = demoLookup(reg); if (!car) return;
            save(car);
            if (msg) { msg.hidden = false; msg.innerHTML = 'Matched <strong></strong>. Saved to your garage. Not right? Pick your car below.'; msg.querySelector("strong").textContent = label(car); }
            document.querySelectorAll("[data-ymm-form]").forEach(function (f) { fillYmm(f, car); });
        });
    });

    paint(read());

    /* add to cart: bump the header count and confirm on the button */
    var count = document.querySelector("[data-cart-count]");
    document.querySelectorAll("[data-add-cart]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (count) count.textContent = String((parseInt(count.textContent, 10) || 0) + 1);
            var was = btn.textContent;
            btn.classList.add("is-done"); btn.textContent = "Added to cart";
            setTimeout(function () { btn.classList.remove("is-done"); btn.textContent = was; }, 1600);
        });
    });

    /* wish list toggle */
    var wish = document.querySelector("[data-wish-count]");
    document.querySelectorAll("[data-wish]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", "false");
        btn.addEventListener("click", function () {
            var on = btn.getAttribute("aria-pressed") !== "true";
            btn.setAttribute("aria-pressed", String(on));
            var i = btn.querySelector("i"); if (i) { i.classList.toggle("fas", on); i.classList.toggle("far", !on); }
            if (wish) wish.textContent = String(Math.max(0, (parseInt(wish.textContent, 10) || 0) + (on ? 1 : -1)));
        });
    });

    /* mini-cart remove */
    document.querySelectorAll(".rs-minicart__rm").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var row = btn.closest("li"); if (row) row.remove();
            if (count) count.textContent = "0";
            var sum = document.querySelector("[data-cart-sum]"); if (sum) sum.textContent = "$0.00";
        });
    });

    /* compare count in the shop sidebar */
    var cmp = document.querySelector("[data-compare-count]");
    document.querySelectorAll("[data-compare]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", "false");
        btn.addEventListener("click", function () {
            var on = btn.getAttribute("aria-pressed") !== "true";
            btn.setAttribute("aria-pressed", String(on));
            if (cmp) cmp.textContent = String(Math.max(0, (parseInt(cmp.textContent, 10) || 0) + (on ? 1 : -1)));
        });
    });

    /* product gallery (v1: clicking a .tv-current-img thumbnail puts its src on .tv-replace-img) */
    document.querySelectorAll("[data-gallery]").forEach(function (g) {
        var main = g.querySelector(".tv-replace-img");
        /* grow a photo to at most 2.4x its real size, so a small cut-out stays sharp instead of filling the frame pixelated */
        var fit = function () { if (main && main.naturalWidth) main.style.width = Math.round(main.naturalWidth * 2) + "px"; };
        if (main) { main.addEventListener("load", fit); if (main.complete) fit(); }
        g.querySelectorAll(".tv-current-img").forEach(function (thumb) {
            var btn = thumb.closest("button") || thumb;
            btn.addEventListener("click", function () {
                if (main) { main.setAttribute("src", thumb.getAttribute("src")); main.parentNode.classList.toggle("is-fill", thumb.classList.contains("rs-fill")); }
                g.querySelectorAll(".is-current").forEach(function (b) { b.classList.remove("is-current"); });
                btn.classList.add("is-current");
            });
        });
        g.querySelectorAll(".tv-current-img").forEach(function (t) { if (main && t.getAttribute("src") === main.getAttribute("src")) (t.closest("button") || t).classList.add("is-current"); });
    });

    /* quantity stepper (v1: #product-product #minus / #plus / #input-quantity, minimum 1 — the note replaces v1's alert) */
    var qty = document.querySelector("#product-product #input-quantity");
    if (qty) {
        var minimum = 1, qmsg = document.querySelector("[data-qty-msg]");
        var clamp = function (v) {
            if (isNaN(v) || v < minimum) { v = minimum; if (qmsg) { qmsg.hidden = false; clearTimeout(qmsg._t); qmsg._t = setTimeout(function () { qmsg.hidden = true; }, 2200); } }
            qty.value = String(v); qty.setAttribute("value", String(v)); /* attribute kept in step so a form post or a CMS re-render sees it */
        };
        qty.addEventListener("change", function () { clamp(parseInt(qty.value, 10)); });
        var minus = document.querySelector("#product-product #minus"), plus = document.querySelector("#product-product #plus");
        if (minus) minus.addEventListener("click", function () { clamp((parseInt(qty.value, 10) || minimum) - 1); });
        if (plus) plus.addEventListener("click", function () { clamp((parseInt(qty.value, 10) || 0) + 1); });
    }

    /* links that open a Bootstrap tab (product page: "0 reviews", "Write a review") */
    document.querySelectorAll("[data-open-tab]").forEach(function (a) {
        a.addEventListener("click", function () {
            var t = document.getElementById(a.getAttribute("data-open-tab"));
            if (t && window.bootstrap) window.bootstrap.Tab.getOrCreateInstance(t).show();
        });
    });

    /* shop toolbar sort + "only parts that fit" filter */
    document.querySelectorAll("[data-results]").forEach(function (box) {
        var cards = Array.prototype.slice.call(box.querySelectorAll("[data-key]"));
        var sel = document.querySelector("[data-sort]");
        if (sel) sel.addEventListener("change", function () {
            var v = sel.value.split("-"), k = v[0], dir = v[1] === "desc" ? -1 : 1;
            var list = cards.slice();
            if (k === "name" || k === "model") list.sort(function (a, b) { return dir * a.getAttribute("data-" + k).localeCompare(b.getAttribute("data-" + k)); });
            else if (k === "price") list.sort(function (a, b) { return dir * (parseFloat(a.getAttribute("data-price")) - parseFloat(b.getAttribute("data-price"))); });
            list.forEach(function (c) { box.appendChild(c); });
        });
        var only = document.querySelector("[data-fit-filter]");
        if (only) only.addEventListener("change", function () {
            var car = read();
            if (only.checked && !car) { only.checked = false; location.href = "index.html#finder"; return; }
            cards.forEach(function (c) { c.hidden = only.checked && !fits(c.getAttribute("data-fits"), car); });
        });
    });

    /* static forms: validate, show the success note, reset (a live site posts these and sends the matching email-*.html).
       data-match="<id>" on a field = must equal that field; data-next="<page>" = go there after a valid submit (checkout). */
    document.querySelectorAll("form[data-form]").forEach(function (form) {
        form.querySelectorAll("[data-match]").forEach(function (f) {
            var other = document.getElementById(f.getAttribute("data-match"));
            var check = function () { f.setCustomValidity(other && f.value !== other.value ? "The passwords don't match." : ""); };
            f.addEventListener("input", check); if (other) other.addEventListener("input", check);
        });
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.classList.add("was-validated"); var bad = form.querySelector(":invalid"); if (bad) bad.focus(); return; }
            form.classList.remove("was-validated");
            var ok = form.querySelector("[data-form-ok]");
            if (ok) { ok.hidden = false; ok.focus(); }
            var next = form.getAttribute("data-next");
            if (next) { setTimeout(function () { location.href = next; }, 900); return; }
            form.reset();
        });
    });

    /* login.html#forgotten opens the reset panel */
    if (location.hash === "#forgotten") { var fp = document.getElementById("forgotten"); if (fp && window.bootstrap) window.bootstrap.Collapse.getOrCreateInstance(fp).show(); }
})();
/* RS-DESIGN END */
