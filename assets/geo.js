<!-- snippets/geo-redirect.liquid -->
<script>
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> start geo');

  // ====== Configuration ======
  const AUTO_REDIRECT_KEY   = 'alardAutoRedirect';   // if 'false', disables auto redirect
  const GEO_CACHE_KEY       = 'alardGeoRedirect';    // cached geo info
  const STORE_SELECT_KEY    = 'alardSelectedStore';  // user manual selection
  const REDIRECT_DONE_KEY   = 'geoRedirectDone';     // session redirect flag
  const DISABLE_PARAM       = 'no_geo_redirect';     // URL param to disable auto-redirect

  // Determine if auto-redirect is enabled (default true)
  let autoRedirect = true;
  const storedFlag = localStorage.getItem(AUTO_REDIRECT_KEY);
  if (storedFlag === 'false') {
    autoRedirect = false;
  }

  // Available store options
  const STORES = [
    { name: "Al'ard USA",       url: 'https://www.alardproducts.com' },
    { name: "Al'ard KSA",       url: 'https://www.alardsaudi.com' },
    { name: "Al'ard Palestine", url: 'https://alardproducts.ps' },
    { name: "Al'ard Europe",    url: 'https://www.alardproducts.eu' },
    { name: "Al'ard Hong Kong", url: 'https://alardproducts.hk' }
  ];

  // Helper to get path + query
  const getPathAndQuery = () => window.location.pathname + window.location.search;

  // Parse URL params
  const urlParams   = new URLSearchParams(window.location.search);
  const disableAuto = urlParams.has(DISABLE_PARAM);

  // If user manually picked a store, honor that before anything
  const selectedStore = localStorage.getItem(STORE_SELECT_KEY);
  if (selectedStore && !window.Shopify.designMode) {
    const origin = window.location.origin;
    if (origin !== selectedStore) {
      sessionStorage.setItem(REDIRECT_DONE_KEY, '1');
      window.location.href = selectedStore + getPathAndQuery();
    }
  }

  // Auto geolocation redirect only if enabled, not disabled by URL, and not yet done
  if (
    autoRedirect &&
    !disableAuto &&
    !sessionStorage.getItem(REDIRECT_DONE_KEY) &&
    !window.Shopify.designMode
  ) {
    // Map country/continent to target URL
    const resolveTarget = (country, continent) => {
      const countryMap = {
        US: 'https://www.alardproducts.com', CA: 'https://www.alardproducts.com',
        SA: 'https://www.alardsaudi.com', AE: 'https://www.alardsaudi.com',
        QA: 'https://www.alardsaudi.com', BH: 'https://www.alardsaudi.com',
        PS: 'https://alardproducts.ps', IL: 'https://alardproducts.ps', JO: 'https://alardproducts.ps',
        DE: 'https://www.alardproducts.eu', FR: 'https://www.alardproducts.eu',
        ES: 'https://www.alardproducts.eu', IT: 'https://www.alardproducts.eu',
        HK: 'https://alardproducts.hk', CN: 'https://alardproducts.hk'
      };
      const continentMap = {
        NA: 'https://www.alardproducts.com', EU: 'https://www.alardproducts.eu',
        AS: 'https://alardproducts.hk', AF: 'https://www.alardproducts.eu',
        SA: 'https://www.alardproducts.com', OC: 'https://www.alardproducts.com',
        AN: 'https://www.alardproducts.eu'
      };
      return countryMap[country] || continentMap[continent] || 'https://www.alardproducts.com';
    };

    // Attempt to use cached geo data
    const saved = localStorage.getItem(GEO_CACHE_KEY);
    if (saved) {
      try {
        const { country, continent, target } = JSON.parse(saved);
        sessionStorage.setItem(REDIRECT_DONE_KEY, '1');
        window.location.href = target + getPathAndQuery();
        return;
      } catch {
        localStorage.removeItem(GEO_CACHE_KEY);
      }
    }

    // Fetch fresh geo data
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const country   = data.country;
        const continent = data.continent_code;
        const target    = resolveTarget(country, continent);
        // Cache for next visits
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ country, continent, target }));
        // Redirect
        sessionStorage.setItem(REDIRECT_DONE_KEY, '1');
        window.location.href = target + getPathAndQuery();
      })
      .catch(e => console.warn('Geo redirect error:', e));
  }

  // ====== UI: Manual store selector ======
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.header__icons');
    if (!container) return;

    // Create selector button
    const btn = document.createElement('button');
    btn.className = 'geo-selector-btn header__icon link focus-inset';
    btn.setAttribute('aria-label', 'Choose your store');
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
                 + '<path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.5817 15.4183 3 11 3C6.5817 3 3 6.5817 3 11C3 15.4183 6.5817 19 11 19Z" stroke="currentColor" stroke-width="2"/>'
                 + '<path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    container.appendChild(btn);

    // Build modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'geo-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;'
                          + 'background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000;';
    overlay.innerHTML = `
      <div style="background:#fff;padding:1.5rem;border-radius:8px;max-width:90%;width:300px;text-align:center;">
        <h2 style="margin-bottom:1rem;">Select your store</h2>
        ${STORES.map(s => `<button class="geo-store-option" data-url="${s.url}" `
                         + `style="display:block;width:100%;margin:0.25rem 0;padding:0.5rem;">${s.name}</button>`).join('')}
        <button id="geo-close-btn" style="margin-top:1rem;padding:0.5rem 1rem;">Cancel</button>
      </div>`;
    document.body.appendChild(overlay);

    // Show modal
    btn.addEventListener('click', () => overlay.style.display = 'flex');

    // Handle modal clicks
    overlay.addEventListener('click', e => {
      if (e.target.id === 'geo-close-btn' || e.target === overlay) {
        overlay.style.display = 'none';
      }
      if (e.target.classList.contains('geo-store-option')) {
        const url = e.target.getAttribute('data-url');
        localStorage.setItem(STORE_SELECT_KEY, url);
        sessionStorage.setItem(REDIRECT_DONE_KEY, '1');
        window.location.href = url + getPathAndQuery();
      }
    });
  });
</script>
