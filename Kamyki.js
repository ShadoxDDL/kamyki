(async () => {
  "use strict";

  if (window.__kamieniePodpisyLoading || window.__kamieniePodpisyRegistered) return;
  window.__kamieniePodpisyLoading = true;

  const deadline = Date.now() + 120000;
  let G;
  while (Date.now() < deadline) {
    const candidate = window.Gargonem;
    if (
      candidate?.Addons?.New?.registerID &&
      candidate?.Addons?.New?.register &&
      candidate?.Addons?.New?.registerStartupAndShutdown &&
      candidate?.UI?.Components &&
      candidate?.UI?.React
    ) {
      G = candidate;
      break;
    }
    await new Promise(resolve => window.setTimeout(resolve, 250));
  }
  if (!G) throw new Error("Nie znaleziono API dodatków Gargonem.");

  const Addons = G.Addons;
  const UI = G.UI.Components;
  const React = G.UI.React;
  const managerStorage = Addons.managerStorage;
  const ADDON_ID = Addons.New.registerID("kamieniePodpisySI");

  const storage = new Addons.Storage("kamienie-podpisy-si", {
    enabled: true,
    fontSize: 10,
    legacyMigrated: false
  }, true);

  if (!storage.get("legacyMigrated")) {
    const oldSize = Number(localStorage.getItem("codex_stones_font_size"));
    if (Number.isFinite(oldSize)) storage.set("fontSize", Math.min(24, Math.max(6, oldSize)));
    storage.set("legacyMigrated", true);
  }

  const CONFIG = {
    "177": "AGAR", "189": "ORLA", "229": "KAMB", "580": "MUSH", "6064": "MONIA",
    "632": "KOT", "727": "WLAD", "972": "MYSZ", "1142": "P5", "1150": "GOP",
    "1159": "P5", "1322": "ADA", "1462": "PANC", "1481": "MOCNY", "1526": "HENR",
    "1527": "HELG", "1746": "KIC", "1901": "CIUT", "1912": "FURB", "2021": "ŹRÓDŁ",
    "2024": "MAGUA", "2063": "BREH", "2308": "SZCZĘT", "2353": "ART", "2354": "ZOR",
    "2355": "TH", "2356": "FUR", "2532": "ZORG", "2646": "VARI", "2729": "FOV",
    "2766": "MARLO", "3035": "CHOP", "3039": "SET", "3149": "GOB", "3312": "BB",
    "3327": "TER", "3339": "PUST", "3340": "VERA", "3341": "CHAG", "3361": "LAMBO",
    "3409": "JACK", "3437": "KOZ", "3466": "OHYD", "3530": "W.STO", "3597": "DENDR",
    "3627": "SILV", "3628": "SILV", "3765": "ZYF", "3883": "REGU", "4046": "SOPEL",
    "4056": "SYBA", "4057": "SYBA", "4066": "HYDRA", "4157": "TYRT", "4161": "WAŻKA",
    "4185": "KRZOK", "4196": "LULEK", "4206": "ARACH", "4266": "REUZ", "4268": "DRAKO",
    "4998": "KAMB", "5293": "TOLL.S", "5395": "OWAD", "5657": "TOLY", "5660": "TOLY",
    "5662": "TOLY", "5672": "CIUT", "5684": "P9", "5685": "P9", "5694": "YAOT",
    "5708": "TEZA", "5709": "TEZA", "5851": "SHEBA", "5856": "BUREK", "5862": "SK",
    "5872": "DWK", "5938": "PRZED", "5939": "M.KOM", "5940": "SADO", "5941": "TS",
    "5942": "SSK", "5943": "STŚ", "5944": "LOCHY", "5945": "BERGA", "5946": "KORYT",
    "6053": "TORKA", "6055": "DRIADY", "6476": "PRZYZ", "6477": "ŁOWKA", "6537": "JOTUN",
    "6623": "GRAB", "6627": "LISZ", "6632": "TOLL.A", "6633": "TOL.U", "6772": "NADZ",
    "6781": "FIGL", "6938": "JERT", "6944": "M.RYC", "6945": "M.ŁOW", "6946": "M.MAG",
    "6949": "RENE", "6956": "GRUB", "7060": "ARCY", "7066": "CZACH", "7069": "OZIR",
    "7345": "K.ŚNI", "7353": "UMI", "7441": "FOD", "7466": "WOR", "7474": "GONS",
    "7477": "ZONS", "7689": "CERAS", "7693": "OGR", "7695": "SAT", "7701": "MYSZ",
    "7827": "ARYT", "7843": "M.MAD", "7848": "MAGU", "7849": "MAGUA", "7859": "ALD",
    "7864": "MARLO", "8181": "FANG", "8187": "WABI", "8532": "MAZ", "8541": "WYSŁ",
    "8554": "FOV", "8556": "LUN"
  };

  let runtimeActive = false;
  let scanTimer = null;
  let styleElement = null;
  let originalParseInput = null;
  let parseInputWrapper = null;

  function fontSize() {
    const value = Number(storage.get("fontSize"));
    const clamped = Math.min(24, Math.max(6, Number.isFinite(value) ? value : 10));
    if (value !== clamped) storage.set("fontSize", clamped);
    return clamped;
  }

  function createTextOverlay(text) {
    const div = document.createElement("div");
    div.textContent = text;
    div.className = "codex-stones-item-overlay";
    return div;
  }

  function appendItemOverlay(id, text) {
    const element = document.querySelector(`#item${String(id)}`);
    if (!element) return;
    const current = element.querySelector(".codex-stones-item-overlay");
    if (current) current.textContent = text;
    else element.appendChild(createTextOverlay(text));
  }

  function removeItemOverlay(id) {
    document.querySelector(`#item${String(id)}`)
      ?.querySelector(".codex-stones-item-overlay")
      ?.remove();
  }

  function removeAllOverlays() {
    document.querySelectorAll(".codex-stones-item-overlay").forEach(element => element.remove());
  }

  function parseStats(stats) {
    if (!stats) return {};
    const result = {};
    String(stats).split(";").forEach(entry => {
      const [key, value] = entry.split("=");
      if (key) result[key] = value ?? "true";
    });
    return result;
  }

  function itemLooksLikeTeleport(item) {
    const text = [item.name, item.tip, item.stat].filter(Boolean).join(" ").toLowerCase();
    return /teleport|kamie[nń]|kamyk|zw[oó]j/.test(text);
  }

  function getItemStats(item) {
    const parsed = parseStats(item.stat);
    if (itemLooksLikeTeleport(item) && item._cachedStats && typeof item._cachedStats === "object") {
      return { ...parsed, ...item._cachedStats };
    }
    return parsed;
  }

  function getItemTeleport(item) {
    const stats = getItemStats(item);
    return [stats.custom_teleport, stats.teleport]
      .find(value => value && String(value).toLowerCase() !== "true") || "";
  }

  function teleportMapId(teleport) {
    return String(teleport).match(/\d+/)?.[0] || "";
  }

  function processItems(items) {
    if (!runtimeActive || !storage.get("enabled")) return;
    for (const id in items) {
      const teleport = getItemTeleport(items[id]);
      const label = CONFIG[teleport] || CONFIG[teleportMapId(teleport)];
      if (label) appendItemOverlay(id, label);
      else removeItemOverlay(id);
    }
  }

  function installParseInputHook() {
    if (parseInputWrapper || typeof window.parseInput !== "function") return;
    originalParseInput = window.parseInput;
    parseInputWrapper = function(data) {
      const result = originalParseInput.apply(this, arguments);
      if (runtimeActive && storage.get("enabled") && data?.item) processItems(data.item);
      return result;
    };
    window.parseInput = parseInputWrapper;
  }

  function installStyle() {
    if (styleElement || !document.head) return;
    styleElement = document.createElement("style");
    styleElement.id = "codex-stones-overlay-style";
    styleElement.textContent = `
      .codex-stones-item-overlay {
        position: absolute;
        left: 50%;
        bottom: 1px;
        transform: translateX(-50%);
        font-size: var(--codex-stones-font-size, 10px);
        color: #fff;
        pointer-events: none;
        white-space: nowrap;
        z-index: 5;
        text-shadow: 1px 1px 0 #000, -1px -1px 0 #000,
          1px -1px 0 #000, -1px 1px 0 #000,
          0 1px 0 #000, 0 -1px 0 #000,
          1px 0 0 #000, -1px 0 0 #000;
      }
    `;
    document.head.appendChild(styleElement);
  }

  function scan() {
    if (!runtimeActive) return;
    installStyle();
    installParseInputHook();
    document.documentElement.style.setProperty("--codex-stones-font-size", `${fontSize()}px`);
    if (!storage.get("enabled")) {
      removeAllOverlays();
      return;
    }
    const items = window.g?.item;
    if (items) processItems(items);
  }

  class StonesWindow extends React.Component {
    constructor(props) {
      super(props);
      this.mappedKeys = ["enabled", "fontSize"];
      this.globalMappedKeys = ["kamieniePodpisySIWindowEnabled"];
      this.state = {};
      storage.bind(this, this.mappedKeys);
      managerStorage.bind(this, this.globalMappedKeys);
      this.commitFontSize = this.commitFontSize.bind(this);
    }

    commitFontSize(event) {
      const value = Number(event.currentTarget.value);
      if (!Number.isFinite(value)) return;
      const clamped = Math.min(24, Math.max(6, Math.round(value)));
      storage.set("fontSize", clamped);
      event.currentTarget.value = String(clamped);
    }

    componentDidUpdate() {
      document.documentElement.style.setProperty("--codex-stones-font-size", `${fontSize()}px`);
      if (!storage.get("enabled")) removeAllOverlays();
    }

    componentWillUnmount() {
      storage.unbind(this, this.mappedKeys);
      managerStorage.unbind(this, this.globalMappedKeys);
    }

    render() {
      return React.createElement(UI.NamedWindow, {
        name: "kamienie-podpisy-si",
        title: "Kamyki z podpisami SI",
        visible: this.state.kamieniePodpisySIWindowEnabled ?? true,
        onClose: () => managerStorage.toggle("kamieniePodpisySIWindowEnabled")
      },
        React.createElement(UI.WithLabelReverse, { label: "Włącz podpisy" },
          React.createElement(UI.CheckboxPersistent, { storage, bind: "enabled" })
        ),
        React.createElement(UI.WithLabel, { label: "Rozmiar czcionki" },
          React.createElement("input", {
            type: "number",
            inputMode: "numeric",
            defaultValue: fontSize(),
            min: 6,
            max: 24,
            step: 1,
            style: { width: 55, textAlign: "center" },
            onInput: event => {
              event.stopPropagation();
              const value = Number(event.currentTarget.value);
              if (Number.isInteger(value) && value >= 6 && value <= 24) {
                storage.set("fontSize", value);
              }
            },
            onKeyDown: event => {
              event.stopPropagation();
              if (event.key === "Enter") {
                this.commitFontSize(event);
                event.currentTarget.blur();
              }
            },
            onKeyUp: event => event.stopPropagation(),
            onBlur: this.commitFontSize
          })
        ),
        React.createElement("div", {
          style: { marginTop: 5, textAlign: "center", opacity: 0.8 }
        }, "Dozwolony zakres: 6–24 px")
      );
    }
  }

  function startup() {
    runtimeActive = true;
    scan();
    scanTimer = window.setInterval(scan, 500);
  }

  function shutdown() {
    runtimeActive = false;
    window.clearInterval(scanTimer);
    scanTimer = null;
    removeAllOverlays();
    document.documentElement.style.removeProperty("--codex-stones-font-size");
    styleElement?.remove();
    styleElement = null;
    if (parseInputWrapper && window.parseInput === parseInputWrapper) window.parseInput = originalParseInput;
    originalParseInput = null;
    parseInputWrapper = null;
  }

  Addons.New.register({
    id: ADDON_ID,
    name: "Kamyki z podpisami SI",
    descriptionBrief: "Wyświetla krótkie podpisy na kamieniach teleportacyjnych.",
    descriptionFull: "Dodaje stale widoczne podpisy teleportów i pozwala ustawić rozmiar czcionki.",
    enabledByDefault: true,
    window: StonesWindow
  });
  Addons.New.registerStartupAndShutdown(ADDON_ID, startup, shutdown);
  window.__kamieniePodpisyRegistered = true;
  window.__kamieniePodpisyLoading = false;
})().catch(error => {
  window.__kamieniePodpisyLoading = false;
  console.error("[Kamyki z podpisami SI]", error);
});
