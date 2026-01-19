/**
 * LeadScores Behavioral Tracking Script
 * Captures click IDs, UTM parameters, and user engagement for ML lead scoring
 *
 * Usage: Add to your website before </body>:
 * <script src="https://www.leadsscore.com/tracker.js" data-org="YOUR_ORG_ID"></script>
 */

(function() {
  'use strict';

  // Configuration
  const TRACKER_VERSION = '1.0.0';
  const API_BASE = 'https://www.leadsscore.com/api/track';
  const STORAGE_KEY = 'ls_tracking';
  const SESSION_KEY = 'ls_session';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Get organization ID from script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-org]');
  const ORG_ID = scriptTag?.getAttribute('data-org');

  if (!ORG_ID) {
    console.warn('LeadScores: Missing data-org attribute');
    return;
  }

  // Utility functions
  const utils = {
    // Get URL parameter
    getParam(name) {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    },

    // Get cookie value
    getCookie(name) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    },

    // Set cookie
    setCookie(name, value, days = 365) {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    },

    // Generate unique ID
    generateId() {
      return 'ls_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },

    // Get device type
    getDeviceType() {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
      return 'desktop';
    },

    // Get browser name
    getBrowser() {
      const ua = navigator.userAgent;
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
      if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
      if (ua.includes('Trident')) return 'IE';
      if (ua.includes('Edge')) return 'Edge';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Safari')) return 'Safari';
      return 'Unknown';
    },

    // Get OS
    getOS() {
      const ua = navigator.userAgent;
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
      return 'Unknown';
    },

    // Debounce function
    debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }
  };

  // Tracking data storage
  const storage = {
    get() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    },

    set(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('LeadScores: Storage unavailable');
      }
    },

    getSession() {
      try {
        const data = sessionStorage.getItem(SESSION_KEY);
        if (!data) return null;
        const session = JSON.parse(data);
        // Check if session expired
        if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
          sessionStorage.removeItem(SESSION_KEY);
          return null;
        }
        return session;
      } catch (e) {
        return null;
      }
    },

    setSession(data) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          ...data,
          lastActivity: Date.now()
        }));
      } catch (e) {
        console.warn('LeadScores: Session storage unavailable');
      }
    }
  };

  // Capture click IDs and UTM parameters
  function captureTrackingParams() {
    const params = {
      // Click IDs - capture from URL
      fbclid: utils.getParam('fbclid'),
      gclid: utils.getParam('gclid'),
      ttclid: utils.getParam('ttclid'),
      msclkid: utils.getParam('msclkid'),
      li_fat_id: utils.getParam('li_fat_id'),

      // Platform cookies
      fbp: utils.getCookie('_fbp'),
      fbc: utils.getCookie('_fbc'),
      ttp: utils.getCookie('_ttp'),
      ga_client_id: utils.getCookie('_ga')?.split('.').slice(-2).join('.'),

      // UTM parameters
      utm_source: utils.getParam('utm_source'),
      utm_medium: utils.getParam('utm_medium'),
      utm_campaign: utils.getParam('utm_campaign'),
      utm_content: utils.getParam('utm_content'),
      utm_term: utils.getParam('utm_term'),

      // Context
      landing_page: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      device_type: utils.getDeviceType(),
      browser: utils.getBrowser(),
      os: utils.getOS(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Store any non-null values
    const existing = storage.get() || {};
    const merged = { ...existing };

    Object.keys(params).forEach(key => {
      if (params[key] && !merged[key]) {
        merged[key] = params[key];
      }
    });

    // First touch attribution - keep original values
    if (!merged.first_touch_at) {
      merged.first_touch_at = new Date().toISOString();
    }
    merged.last_touch_at = new Date().toISOString();

    // Generate or retrieve visitor ID
    if (!merged.visitor_id) {
      merged.visitor_id = utils.generateId();
    }

    storage.set(merged);

    // Also set cookies for cross-subdomain tracking
    if (params.fbclid) utils.setCookie('ls_fbclid', params.fbclid);
    if (params.gclid) utils.setCookie('ls_gclid', params.gclid);
    if (params.ttclid) utils.setCookie('ls_ttclid', params.ttclid);

    return merged;
  }

  // Session tracking
  function getOrCreateSession() {
    let session = storage.getSession();

    if (!session) {
      session = {
        id: utils.generateId(),
        start: new Date().toISOString(),
        pageViews: 0,
        events: []
      };
    }

    session.pageViews++;
    storage.setSession(session);

    return session;
  }

  // Send tracking data to server
  async function sendEvent(eventType, eventData = {}) {
    const trackingData = storage.get() || {};
    const session = storage.getSession();

    const payload = {
      organization_id: ORG_ID,
      visitor_id: trackingData.visitor_id,
      session_id: session?.id,
      event_type: eventType,
      event_data: eventData,

      // Include all tracking params for lead correlation
      tracking: {
        fbclid: trackingData.fbclid || utils.getCookie('ls_fbclid'),
        gclid: trackingData.gclid || utils.getCookie('ls_gclid'),
        ttclid: trackingData.ttclid || utils.getCookie('ls_ttclid'),
        msclkid: trackingData.msclkid,
        fbp: trackingData.fbp || utils.getCookie('_fbp'),
        fbc: trackingData.fbc || utils.getCookie('_fbc'),
        ttp: trackingData.ttp || utils.getCookie('_ttp'),
        ga_client_id: trackingData.ga_client_id,
        utm_source: trackingData.utm_source,
        utm_medium: trackingData.utm_medium,
        utm_campaign: trackingData.utm_campaign,
        utm_content: trackingData.utm_content,
        utm_term: trackingData.utm_term
      },

      // Page context
      page: {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer
      },

      // Device context
      device: {
        type: utils.getDeviceType(),
        browser: utils.getBrowser(),
        os: utils.getOS(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },

      timestamp: new Date().toISOString()
    };

    // Use sendBeacon for reliability, fall back to fetch
    const data = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/event`, data);
    } else {
      fetch(`${API_BASE}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(() => {});
    }
  }

  // Page engagement tracking
  function trackEngagement() {
    let startTime = Date.now();
    let maxScroll = 0;
    let isVisible = true;
    let totalVisibleTime = 0;
    let lastVisibilityChange = Date.now();

    // Track scroll depth
    const trackScroll = utils.debounce(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        // Send milestone events
        if (maxScroll >= 25 && maxScroll < 50) {
          sendEvent('scroll_depth', { depth: 25 });
        } else if (maxScroll >= 50 && maxScroll < 75) {
          sendEvent('scroll_depth', { depth: 50 });
        } else if (maxScroll >= 75 && maxScroll < 90) {
          sendEvent('scroll_depth', { depth: 75 });
        } else if (maxScroll >= 90) {
          sendEvent('scroll_depth', { depth: 90 });
        }
      }
    }, 100);

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (isVisible) {
          totalVisibleTime += Date.now() - lastVisibilityChange;
        }
        isVisible = false;
      } else {
        isVisible = true;
        lastVisibilityChange = Date.now();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      if (isVisible) {
        totalVisibleTime += Date.now() - lastVisibilityChange;
      }

      const timeOnPage = Math.round(totalVisibleTime / 1000);

      sendEvent('page_exit', {
        time_on_page: timeOnPage,
        scroll_depth: maxScroll,
        total_time: Math.round((Date.now() - startTime) / 1000)
      });
    });

    window.addEventListener('scroll', trackScroll, { passive: true });
  }

  // Track link clicks
  function trackClicks() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button, [data-ls-track]');
      if (!target) return;

      const trackData = {
        element: target.tagName.toLowerCase(),
        text: target.innerText?.substring(0, 100),
        href: target.href,
        id: target.id,
        classes: target.className
      };

      // Check for high-intent elements
      const href = target.href || '';
      const text = (target.innerText || '').toLowerCase();

      if (href.includes('/pricing') || text.includes('pricing')) {
        sendEvent('pricing_click', trackData);
      } else if (href.includes('/demo') || text.includes('demo') || text.includes('book') || text.includes('schedule')) {
        sendEvent('demo_click', trackData);
      } else if (text.includes('sign up') || text.includes('signup') || text.includes('get started') || text.includes('start free')) {
        sendEvent('signup_click', trackData);
      } else if (text.includes('contact') || text.includes('talk to')) {
        sendEvent('contact_click', trackData);
      } else if (target.hasAttribute('data-ls-track')) {
        sendEvent('cta_click', {
          ...trackData,
          custom_event: target.getAttribute('data-ls-track')
        });
      }
    });
  }

  // Track form interactions
  function trackForms() {
    // Track form focus (form start)
    document.addEventListener('focusin', (e) => {
      const form = e.target.closest('form');
      if (!form || form.hasAttribute('data-ls-tracked')) return;

      form.setAttribute('data-ls-tracked', 'true');
      sendEvent('form_start', {
        form_id: form.id,
        form_action: form.action,
        form_name: form.getAttribute('name')
      });
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formData = {};

      // Capture non-sensitive form data
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const name = input.name || input.id;
        const type = input.type;

        // Skip sensitive fields
        if (['password', 'credit-card', 'ssn'].includes(type)) return;
        if (['password', 'card', 'cvv', 'ssn', 'secret'].some(s => name.toLowerCase().includes(s))) return;

        // Track field completion, not values (for privacy)
        formData[name] = {
          filled: !!input.value,
          type: type
        };
      });

      sendEvent('form_submit', {
        form_id: form.id,
        form_action: form.action,
        form_name: form.getAttribute('name'),
        fields: formData
      });
    });
  }

  // Detect high-intent page views
  function trackPageIntent() {
    const path = window.location.pathname.toLowerCase();
    const title = document.title.toLowerCase();

    if (path.includes('/pricing') || title.includes('pricing')) {
      sendEvent('pricing_view', {});
    } else if (path.includes('/demo') || title.includes('demo')) {
      sendEvent('demo_view', {});
    } else if (path.includes('/case-stud') || title.includes('case stud')) {
      sendEvent('case_study_view', {});
    } else if (path.includes('/feature') || title.includes('feature')) {
      sendEvent('feature_view', {});
    } else if (path.includes('/blog') || title.includes('blog')) {
      sendEvent('blog_view', {});
    } else if (path.includes('/contact') || title.includes('contact')) {
      sendEvent('contact_view', {});
    }
  }

  // Public API
  window.LeadScores = {
    // Get tracking data (for form submission)
    getTrackingData() {
      return storage.get();
    },

    // Get visitor ID
    getVisitorId() {
      const data = storage.get();
      return data?.visitor_id;
    },

    // Manual event tracking
    track(eventType, eventData = {}) {
      sendEvent(eventType, eventData);
    },

    // Identify a lead (call when you have email)
    identify(email, additionalData = {}) {
      const trackingData = storage.get() || {};
      trackingData.email = email;
      trackingData.identified_at = new Date().toISOString();
      storage.set(trackingData);

      sendEvent('identify', {
        email,
        ...additionalData,
        tracking_data: trackingData
      });
    },

    // Track conversion event
    conversion(eventName, value = null, data = {}) {
      sendEvent('conversion', {
        event_name: eventName,
        value,
        currency: data.currency || 'USD',
        ...data
      });
    }
  };

  // Initialize tracking
  function init() {
    captureTrackingParams();
    getOrCreateSession();

    // Send page view
    sendEvent('page_view', {});

    // Track page intent
    trackPageIntent();

    // Set up engagement tracking
    trackEngagement();
    trackClicks();
    trackForms();

    console.log('LeadScores: Tracking initialized', { org: ORG_ID, version: TRACKER_VERSION });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
