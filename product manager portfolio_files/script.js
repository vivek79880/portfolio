
    (function() {
      if (document.getElementById('lt-br-fp-lib')) {
        return;
      }

      window.__lt_br_fp_version_requested = 'stable';
      var script = document.createElement('script');
      script.src = 'https://assets.production.linktr.ee/client-brfp/br-fp-script.js';
      script.async = true;
      script.id = 'lt-br-fp-lib';

      script.onload = function() {
        if (typeof window.__lt_br_fp !== 'undefined' && typeof window.__lt_br_fp.generate === 'function') {
          window.__lt_br_fp.generate({
            networkProfile: {
              asNumber: '10029',
              country: 'IN',
              city: 'delhi',
              region: 'DL',
              acceptEncoding: 'gzip, deflate, br, zstd',
              acceptLanguage: 'en-US,en;q=0.9,hi;q=0.8',
              ja4: 't13d1517h2_8daaf6152771_cb7bf5808d99'
            }
          })
        }
      };

      document.head.appendChild(script);
    })();
  