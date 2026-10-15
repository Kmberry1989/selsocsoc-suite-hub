(function () {
  "use strict";

  var NPC_MANIFEST_URL =
    "https://raw.githubusercontent.com/Kmberry1989/selsocsoc/main/assets/npc/manifest.json";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function openUrl(url) {
    window.open(url, "_blank", "noopener");
  }

  function renderLauncher(entries) {
    var grid = document.getElementById("launcher-grid");
    grid.innerHTML = "";
    entries.forEach(function (entry) {
      var card = el("div", "card", null);
      card.setAttribute("role", "listitem");
      card.appendChild(el("div", "emoji", entry.icon || "🧩"));
      card.appendChild(el("div", "name", entry.name));
      card.appendChild(el("div", "purpose", entry.purpose || ""));
      var btn = el("button", null, null);
      if (entry.url) {
        btn.textContent = "Open";
        btn.setAttribute("aria-label", "Open " + entry.name);
        btn.addEventListener("click", function () { openUrl(entry.url); });
      } else {
        card.classList.add("pending");
        btn.textContent = "Deploying…";
        btn.disabled = true;
        btn.setAttribute("aria-label", entry.name + " is deploying");
      }
      card.appendChild(btn);
      grid.appendChild(card);
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
        renderLauncher(data.entries || []);
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
    loadRegistry();
    loadNpcShelf();
  });
})();
