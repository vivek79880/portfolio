(() => {
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // shared/loader-contract.ts
  var LOADER_MODE_ATTRIBUTE = "data-dg-loader-mode";
  var NON_SRI_LOADER_MODE = "non-sri";
  function notifyEssentialOnly(win = window) {
    if (typeof win.DG_CONSENT_UPDATE === "function") {
      try {
        win.DG_CONSENT_UPDATE({ essentialOnly: true });
      } catch (e) {
        console.error("[DataGrail] DG_CONSENT_UPDATE callback error:", e);
      }
    }
  }
  function fireSriFailureEvent(data, win = window) {
    if (!Array.isArray(win.dgSriEvent)) win.dgSriEvent = [];
    for (const handler of win.dgSriEvent) {
      if (!handler || typeof handler !== "object") {
        continue;
      }
      if (handler.event === "sri_failure" && typeof handler.callback === "function") {
        try {
          handler.callback(data);
        } catch (e) {
          console.error("[DataGrail] SRI failure callback error:", e);
        }
      }
    }
  }
  var SCRIPT_LOAD_FAILED_MESSAGE = "Script failed to load (possible integrity mismatch or network error)";

  // shared/preview-location-validation.ts
  var PREVIEW_COOKIE_NAME = "dg_preview_location";
  var PREVIEW_VERSION_COOKIE_NAME = "dg_preview";
  var PREVIEW_COOKIE_MAX_AGE = 3600;
  var LOCATION_CODE_PATTERN = /^[A-Z]{2}(-[A-Z]{2})?$/;
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isValidLocationCode(code) {
    return code === "default" || LOCATION_CODE_PATTERN.test(code);
  }
  function isValidUUID(value) {
    return UUID_PATTERN.test(value);
  }

  // loader/loader-core.ts
  var MAX_ATTEMPTS = 5;
  var MAX_BACKOFF = 2e4;
  var FETCH_TIMEOUT_MS = 1e4;
  function injectScript(url, sri, fire, preserveOrder = false) {
    const script = document.createElement("script");
    script.src = url;
    script.async = !preserveOrder;
    if (sri) {
      script.integrity = sri;
      script.crossOrigin = "anonymous";
    }
    script.onerror = function() {
      fire({
        type: "script_load_failed",
        url,
        error: SCRIPT_LOAD_FAILED_MESSAGE,
        timestamp: Date.now()
      });
    };
    document.head.appendChild(script);
    return script;
  }
  function injectAllScripts(scripts, fire) {
    const orderedScripts = [...scripts];
    const stubIndex = orderedScripts.findIndex((s) => s.name === "tcf-stub");
    const cmpIndex = orderedScripts.findIndex((s) => s.name === "tcf-cmp");
    if (stubIndex !== -1 && cmpIndex !== -1 && stubIndex > cmpIndex) {
      [orderedScripts[stubIndex], orderedScripts[cmpIndex]] = [
        orderedScripts[cmpIndex],
        orderedScripts[stubIndex]
      ];
    }
    for (const entry of orderedScripts) {
      const preserveOrder = entry.name === "tcf-stub" || entry.name === "tcf-cmp";
      injectScript(entry.URL, entry.SRI, fire, preserveOrder);
    }
  }
  function resolveLocationKey(country, region, availableLocations) {
    if (["US", "CA"].includes(country) && region) {
      const key = `${country}-${region}`;
      if (availableLocations.includes(key)) return key;
    }
    if (country && availableLocations.includes(country)) return country;
    return "default";
  }
  function fetchConfigWithTimeout(url, timeoutMs) {
    const controller = typeof AbortController === "function" ? new AbortController() : void 0;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Config fetch timed out after ${timeoutMs}ms`));
        if (controller) controller.abort();
      }, timeoutMs);
      fetch(url, controller ? { signal: controller.signal } : void 0).then((response) => __async(null, null, function* () {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return {
          country: response.headers.get("x-dg-country") || "",
          region: response.headers.get("x-dg-region") || "",
          config: yield response.json()
        };
      })).then(
        (loaded) => {
          clearTimeout(timer);
          resolve(loaded);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
  function fetchConfigWithRetry(_0) {
    return __async(this, arguments, function* (url, maxAttempts = MAX_ATTEMPTS, maxBackoff = MAX_BACKOFF, timeoutMs = FETCH_TIMEOUT_MS) {
      let attempt = 0;
      while (attempt < maxAttempts) {
        try {
          return yield fetchConfigWithTimeout(url, timeoutMs);
        } catch (error) {
          attempt++;
          if (attempt >= maxAttempts) throw error;
          const backoff = Math.min(Math.pow(2, attempt) * 1e3, maxBackoff);
          yield new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
      throw new Error("Retry loop exited unexpectedly");
    });
  }
  function getPreviewLocation() {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${PREVIEW_COOKIE_NAME}=([^;]*)`));
      if (!match) return "";
      const value = decodeURIComponent(match[1]);
      return isValidLocationCode(value) ? value : "";
    } catch (e) {
      return "";
    }
  }
  function initPreviewCookie() {
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get(PREVIEW_COOKIE_NAME);
      if (value === null) return;
      if (value === "" || value === "clear") {
        document.cookie = `${PREVIEW_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      } else if (isValidLocationCode(value)) {
        document.cookie = `${PREVIEW_COOKIE_NAME}=${encodeURIComponent(
          value
        )}; path=/; max-age=${PREVIEW_COOKIE_MAX_AGE}; SameSite=Lax`;
      }
    } catch (e) {
    }
  }
  function getPreviewVersion() {
    try {
      const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${PREVIEW_VERSION_COOKIE_NAME}=([^;]*)`)
      );
      if (!match) return "";
      const value = decodeURIComponent(match[1]);
      return isValidUUID(value) ? value : "";
    } catch (e) {
      return "";
    }
  }
  function initPreviewVersionCookie() {
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get(PREVIEW_VERSION_COOKIE_NAME);
      if (value === null) return;
      if (value === "" || value === "clear") {
        document.cookie = `${PREVIEW_VERSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      } else if (isValidUUID(value)) {
        document.cookie = `${PREVIEW_VERSION_COOKIE_NAME}=${encodeURIComponent(
          value
        )}; path=/; max-age=${PREVIEW_COOKIE_MAX_AGE}; SameSite=Lax`;
      }
    } catch (e) {
    }
  }
  function appendPreviewParam(url, previewLocation) {
    if (!previewLocation) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${PREVIEW_COOKIE_NAME}=${encodeURIComponent(previewLocation)}`;
  }
  function runLoader(config2) {
    var _a, _b;
    window.DG_EMBEDDED = true;
    initPreviewCookie();
    initPreviewVersionCookie();
    const previewLocation = getPreviewLocation();
    const previewVersion = getPreviewVersion();
    const fire = (data) => {
      fireSriFailureEvent(data);
      notifyEssentialOnly();
    };
    if (config2.scripts && config2.scripts.length > 0) {
      if (previewVersion) {
        console.warn(
          "[DataGrail] Preview mode (dg_preview) only affects config, not consent.js. Ignoring preview version for script URL."
        );
      }
      const versionSegment = config2.consentContainerVersion;
      for (const entry of config2.scripts) {
        const url = appendPreviewParam(
          `https://${config2.privacyDomain}/consent/${config2.customerId}/${versionSegment}/${entry.name}.js`,
          previewLocation
        );
        injectScript(url, void 0, fire).setAttribute(LOADER_MODE_ATTRIBUTE, NON_SRI_LOADER_MODE);
      }
    } else {
      if (previewVersion) {
        console.warn(
          "[DataGrail] Preview mode (dg_preview) is not supported with SRI. Ignoring preview."
        );
      }
      const maxAttempts = (_a = config2.maxAttempts) != null ? _a : MAX_ATTEMPTS;
      const maxBackoff = (_b = config2.maxBackoffMs) != null ? _b : MAX_BACKOFF;
      const configUrl = appendPreviewParam(
        `https://${config2.privacyDomain}/${config2.customerId}/${config2.containerId}/loader-config.json`,
        previewLocation
      );
      fetchConfigWithRetry(configUrl, maxAttempts, maxBackoff).then(({ config: fetchedConfig, country, region }) => {
        var _a2, _b2;
        const locationKey = resolveLocationKey(
          country,
          region,
          Object.keys(fetchedConfig.locations || {})
        );
        const locationScripts = ((_a2 = fetchedConfig.locations) == null ? void 0 : _a2[locationKey]) || [];
        const globalScripts = fetchedConfig.scripts || [];
        const allScripts = [...locationScripts, ...globalScripts];
        for (const entry of allScripts) {
          if (!((_b2 = entry.SRI) == null ? void 0 : _b2.trim())) {
            fire({
              type: "script_load_failed",
              url: entry.URL,
              error: "Script missing SRI hash in SRI mode — refusing to inject",
              timestamp: Date.now()
            });
            return;
          }
        }
        if (allScripts.length > 0) {
          injectAllScripts(allScripts, fire);
        } else {
          console.warn("[DataGrail] SRI config returned no scripts — possible misconfiguration");
        }
      }).catch((error) => {
        console.error("[DataGrail] Failed to load consent configuration:", error);
        fire({
          type: "config_fetch_failed",
          url: configUrl,
          error: error.message,
          timestamp: Date.now(),
          retryAttempts: maxAttempts
        });
      });
    }
    if (config2.scripts && config2.scripts.length > 0) {
      const platforms = ["webflow", "shopify", "wordpress"];
      for (const platform of platforms) {
        if (config2[platform]) {
          const url = `https://${config2.privacyDomain}/${config2.customerId}/${platform}.js`;
          injectScript(url, void 0, fire);
        }
      }
    }
  }

  // loader/consent-loader.ts
  var config = {"customerId":"b8f6c3bf-2519-4023-963a-974547789e46","containerId":"0e8c168d-18e3-47b6-a619-4a07878f1cc9","consentContainerVersion":"a3ca0d3e-d8bd-4184-9f7d-660f46486a3b","privacyDomain":"api.consentjs.datagrail.io","analyticsEndpoint":null,"plugins":{},"gppUsnat":false,"publishTcf":true,"consentProjectId":"57584387889890036","tcfProjectScoped":true,"webflow":true,"shopify":false,"wordpress":false,"scripts":[{"name":"consent","URL":"https://api.consentjs.datagrail.io/b8f6c3bf-2519-4023-963a-974547789e46/a3ca0d3e-d8bd-4184-9f7d-660f46486a3b/default/consent.js"}]};
  runLoader(config);
})();
