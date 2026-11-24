// Conditional logging based on testMode
function conditionalLog() {
  if (window.DG_BANNER_API && window.DG_BANNER_API.config && window.DG_BANNER_API.config().testMode) {
    console.log.apply(console, arguments);
  }
}

function wf_receive_prefs(preferences, attempt) {
  attempt = attempt || 1;
  if (typeof wf === 'undefined') {
    if (attempt >= 10) {
      console.warn("Webflow not available after 10 attempts; giving up");
      return;
    }
    var delay = 300 * Math.pow(2, attempt - 1);
    setTimeout(function () {
      wf_receive_prefs(preferences, attempt + 1);
    }, delay);
    return;
  }

  if (!window.DG_BANNER_API || typeof window.DG_BANNER_API.categoryEnabled !== 'function') {
    console.warn("DG_BANNER_API not found.");
    return;
  }

  wf.ready(function () {
    conditionalLog("Webflow is ready; syncing preferences");
    if (window.DG_BANNER_API.categoryEnabled('performance') === true) {
      conditionalLog("performance category is enabled; activating Webflow analytics");
      wf.allowUserTracking({ reload: false, activate: true });
    } else {
      conditionalLog("performance category is disabled; removing Webflow analytics");
      wf.denyUserTracking({ reload: false });
    }
  });
}

window.dgEvent = window.dgEvent || [];

window.dgEvent.push({
  event: "preference_callback",
  params: wf_receive_prefs
});
window.dgEvent.push({
  event: "initial_preference_callback",
  params: wf_receive_prefs
});
