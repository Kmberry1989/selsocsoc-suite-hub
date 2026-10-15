(function () {
  "use strict";

  var NPC_MANIFEST_URL =
    "https://raw.githubusercontent.com/Kmberry1989/selsocsoc/main/assets/npc/manifest.json";
  var INSTALLED_KEY = "suiteHubInstalledV1";

  var registryEntries = [];
  var deferredHubPrompt = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function openUrl(url) {
    window.open(url, "_blank", "noopener");
  }

  function loadInstalledSet() {
    try {
      var raw = localStorage.getItem(INSTALLED_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
  }

  function saveInstalledSet(set) {
    try { localStorage.setItem(INSTALLED_KEY, JSON.stringify(Array.from(set))); }
    catch (e) {}
  }

  function installHint() {
    var ua = navigator.userAgent || "";
    var isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    if (isSafari) return "In the app tab: File → Add to Dock… (or Share → Add to Dock).";
    if (/edg/i.test(ua)) return "In the app tab: ⋯ menu → Apps → Install this site as an app.";
    return "In the app tab: ⋮ menu → Install app (or the install icon in the address bar).";
  }

  function isHubInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  // Best-effort cross-check against the browser's installed-app list.
  function refreshInstalledFromBrowser(installedSet) {
    if (!("getInstalledRelatedApps" in navigator)) return Promise.resolve();
    return navigator.getInstalledRelatedApps().then(function (apps) {
      (apps || []).forEach(function (app) {
        if (app && app.url) {
          registryEntries.forEach(function (entry) {
            if (entry.url && app.url.indexOf(entry.url) === 0) installedSet.add(entry.id);
          });
        }
      });
      saveInstalledSet(installedSet);
    }).catch(function () {});
  }

  function renderLauncher(entries, installedSet) {
    var grid = document.getElementById("launcher-grid");
    grid.innerHTML = "";
    entries.forEach(function (entry) {
      var card = el("div", "card", null);
      card.setAttribute("role", "listitem");
      card.appendChild(el("div", "emoji", entry.icon || "🧩"));
      card.appendChild(el("div", "name", entry.name));
      card.appendChild(el("div", "purpose", entry.purpose || ""));
      var installed = installedSet.has(entry.id);
      var actions = el("div", "card-actions", null);

      if (entry.url) {
        var openBtn = el("button", null, "Open");
        openBtn.setAttribute("aria-label", "Open " + entry.name);
        openBtn.addEventListener("click", function () { openUrl(entry.url); });
        actions.appendChild(openBtn);

        if (installed) {
          actions.appendChild(el("span", "installed-badge", "Installed ✓"));
        } else {
          var installBtn = el("button", "secondary", "Install");
          installBtn.setAttribute("aria-label", "Install " + entry.name);
          installBtn.addEventListener("click", function () {
            openUrl(entry.url);
            showToast(entry.name + ": " + installHint());
          });
          actions.appendChild(installBtn);
        }
      } else {
        card.classList.add("pending");
        var pendingBtn = el("button", null, "Deploying…");
        pendingBtn.disabled = true;
        pendingBtn.setAttribute("aria-label", entry.name + " is deploying");
        actions.appendChild(pendingBtn);
      }
      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  var toastTimer = null;
  function showToast(message) {
    var hint = document.getElementById("install-hint");
    var flow = document.getElementById("install-flow");
    // Reuse the install hint line when the flow is hidden.
    if (flow.classList.contains("hidden")) {
      hint.textContent = message;
      flow.classList.remove("hidden");
      document.getElementById("install-progress").textContent = "";
      document.getElementById("install-current").textContent = "";
      ["install-open-btn", "install-done-btn", "install-skip-btn"].forEach(function (id) {
        document.getElementById(id).classList.add("hidden");
      });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { flow.classList.add("hidden"); }, 12000);
    } else {
      hint.textContent = message;
    }
  }

  // ---- Guided "install everything" flow ----
  var flowState = null;

  function installableEntries() {
    return registryEntries.filter(function (e) { return !!e.url; });
  }

  function startInstallAll() {
    var list = installableEntries();
    var installedSet = loadInstalledSet();
    var queue = list.filter(function (e) { return !installedSet.has(e.id); });
    if (!queue.length) {
      showToast("Everything with a live URL is already installed ✓");
      return;
    }
    flowState = { queue: queue, index: 0, installedSet: installedSet };
    document.getElementById("install-flow").classList.remove("hidden");
    ["install-open-btn", "install-done-btn", "install-skip-btn"].forEach(function (id) {
      document.getElementById(id).classList.remove("hidden");
    });
    renderFlowStep();
  }

  function renderFlowStep() {
    if (!flowState || flowState.index >= flowState.queue.length) {
      endInstallAll(true);
      return;
    }
    var entry = flowState.queue[flowState.index];
    var done = flowState.installedSet.size;
    var total = installableEntries().length;
    document.getElementById("install-progress").textContent =
      "Installing " + (flowState.index + 1) + " of " + flowState.queue.length +
      "  •  " + done + " of " + total + " installed";
    document.getElementById("install-current").textContent = entry.icon + "  " + entry.name;
    document.getElementById("install-hint").textContent = installHint();
    document.getElementById("install-open-btn").onclick = function () { openUrl(entry.url); };
    document.getElementById("install-done-btn").onclick = function () {
      flowState.installedSet.add(entry.id);
      saveInstalledSet(flowState.installedSet);
      flowState.index++;
      renderLauncher(registryEntries, flowState.installedSet);
      renderFlowStep();
    };
    document.getElementById("install-skip-btn").onclick = function () {
      flowState.index++;
      renderFlowStep();
    };
  }

  function endInstallAll(finished) {
    flowState = null;
    if (finished) {
      document.getElementById("install-progress").textContent = "Done ✓";
      document.getElementById("install-current").textContent = "";
      document.getElementById("install-hint").textContent =
        "New editor URLs appear here automatically when deployments land — re-run any time.";
      ["install-open-btn", "install-done-btn", "install-skip-btn"].forEach(function (id) {
        document.getElementById(id).classList.add("hidden");
      });
    } else {
      document.getElementById("install-flow").classList.add("hidden");
    }
  }

  function wireInstaller() {
    document.getElementById("install-all-btn").addEventListener("click", startInstallAll);
    document.getElementById("install-cancel-btn").addEventListener("click", function () {
      endInstallAll(false);
    });

    var hubBtn = document.getElementById("install-hub-btn");
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredHubPrompt = e;
      if (!isHubInstalled()) hubBtn.classList.remove("hidden");
    });
    if (isHubInstalled()) {
      hubBtn.classList.add("hidden");
    } else if (deferredHubPrompt) {
      hubBtn.classList.remove("hidden");
    }
    // Safari/iOS never fires beforeinstallprompt — show the manual hint affordance.
    var ua = navigator.userAgent || "";
    var isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
    if (isSafari && !isHubInstalled()) {
      hubBtn.textContent = "Install Hub: File → Add to Dock…";
      hubBtn.classList.remove("hidden");
      hubBtn.addEventListener("click", function () {
        showToast("File → Add to Dock… (or Share → Add to Dock) to install the Hub.");
      });
    } else {
      hubBtn.addEventListener("click", function () {
        if (!deferredHubPrompt) return;
        deferredHubPrompt.prompt();
        deferredHubPrompt.userChoice.then(function () { deferredHubPrompt = null; });
      });
    }
    window.addEventListener("appinstalled", function () {
      hubBtn.classList.add("hidden");
    });
  }

  function renderShelf(manifest, statusEl) {
    var shelf = document.getElementById("asset-shelf");
    shelf.innerHTML = "";
    var base = (manifest && manifest.assetBase) || "";
    var chars = (manifest && manifest.characters) || [];
    chars.forEach(function (npc) {
      var tile = el("div", "npc", null);
      tile.setAttribute("role", "listitem");
      if (npc.faceUrl) {
        var img = el("img", null, null);
        img.src = base + npc.faceUrl;
        img.alt = npc.name + " face";
        img.loading = "lazy";
        img.onerror = function () { img.remove(); tile.prepend(fallback()); };
        tile.appendChild(img);
      } else {
        tile.appendChild(fallback());
      }
      tile.appendChild(el("div", "npc-name", npc.name));
      tile.appendChild(el("div", "npc-role", npc.role || ""));
      shelf.appendChild(tile);

      function fallback() {
        var initial = (npc.name || "?").trim().charAt(0).toUpperCase();
        return el("div", "face-fallback", initial);
      }
    });
    if (!chars.length) {
      statusEl.textContent = "No NPC assets listed yet.";
    } else {
      statusEl.textContent = chars.length + " NPCs shared across editors.";
    }
  }

  function loadRegistry() {
    return fetch("./registry.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("registry " + res.status);
        return res.json();
      })
      .then(function (data) {
        registryEntries = data.entries || [];
        var installedSet = loadInstalledSet();
        renderLauncher(registryEntries, installedSet);
        return refreshInstalledFromBrowser(installedSet).then(function () {
          renderLauncher(registryEntries, installedSet);
        });
      })
      .catch(function () {
        var grid = document.getElementById("launcher-grid");
        grid.innerHTML = "";
        grid.appendChild(el("p", "status", "Could not load the editor registry."));
      });
  }

  function loadNpcShelf() {
    var statusEl = document.getElementById("shelf-status");
    statusEl.textContent = "Syncing shared assets…";
    fetch(NPC_MANIFEST_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("npc manifest " + res.status);
        return res.json();
      })
      .then(function (manifest) { renderShelf(manifest, statusEl); })
      .catch(function () {
        document.getElementById("asset-shelf").innerHTML = "";
        statusEl.textContent = "Shared assets still syncing…";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireInstaller();
    loadRegistry();
    loadNpcShelf();
  });
})();
