(function() {
  'use strict';

  // Find all LeadScores script tags
  var scripts = document.querySelectorAll('script[data-org]');

  scripts.forEach(function(script) {
    var orgId = script.getAttribute('data-org');
    var mode = script.getAttribute('data-mode') || 'modal'; // modal, inline, or popup
    var buttonText = script.getAttribute('data-button-text') || 'Get Started';
    var buttonColor = script.getAttribute('data-button-color') || '#2563eb';
    var containerId = script.getAttribute('data-container');

    if (!orgId) {
      console.error('LeadScores: data-org attribute is required');
      return;
    }

    var baseUrl = script.src.replace('/embed.js', '');
    var formUrl = baseUrl + '/form/' + orgId;

    // Create styles
    var styles = document.createElement('style');
    styles.textContent = [
      '.leadqual-modal-overlay {',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  right: 0;',
      '  bottom: 0;',
      '  background: rgba(0, 0, 0, 0.5);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  z-index: 999999;',
      '  opacity: 0;',
      '  visibility: hidden;',
      '  transition: opacity 0.3s, visibility 0.3s;',
      '}',
      '.leadqual-modal-overlay.active {',
      '  opacity: 1;',
      '  visibility: visible;',
      '}',
      '.leadqual-modal {',
      '  background: white;',
      '  border-radius: 12px;',
      '  width: 90%;',
      '  max-width: 700px;',
      '  max-height: 90vh;',
      '  overflow: hidden;',
      '  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);',
      '  transform: scale(0.95);',
      '  transition: transform 0.3s;',
      '}',
      '.leadqual-modal-overlay.active .leadqual-modal {',
      '  transform: scale(1);',
      '}',
      '.leadqual-modal-header {',
      '  display: flex;',
      '  justify-content: flex-end;',
      '  padding: 12px 16px;',
      '  border-bottom: 1px solid #e5e7eb;',
      '}',
      '.leadqual-close-btn {',
      '  background: none;',
      '  border: none;',
      '  font-size: 24px;',
      '  cursor: pointer;',
      '  color: #6b7280;',
      '  padding: 4px 8px;',
      '  line-height: 1;',
      '}',
      '.leadqual-close-btn:hover {',
      '  color: #111827;',
      '}',
      '.leadqual-iframe {',
      '  width: 100%;',
      '  height: 600px;',
      '  border: none;',
      '}',
      '.leadqual-inline-container {',
      '  width: 100%;',
      '  border-radius: 8px;',
      '  overflow: hidden;',
      '  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
      '}',
      '.leadqual-inline-container iframe {',
      '  width: 100%;',
      '  min-height: 700px;',
      '  border: none;',
      '}',
      '.leadqual-trigger-btn {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 12px 24px;',
      '  font-size: 16px;',
      '  font-weight: 500;',
      '  color: white;',
      '  border: none;',
      '  border-radius: 8px;',
      '  cursor: pointer;',
      '  transition: opacity 0.2s, transform 0.2s;',
      '}',
      '.leadqual-trigger-btn:hover {',
      '  opacity: 0.9;',
      '  transform: translateY(-1px);',
      '}',
      '.leadqual-trigger-btn:active {',
      '  transform: translateY(0);',
      '}'
    ].join('\n');
    document.head.appendChild(styles);

    if (mode === 'inline') {
      // Inline mode - embed form directly in a container
      var container = containerId ? document.getElementById(containerId) : null;
      if (!container) {
        // Create container after script tag
        container = document.createElement('div');
        container.className = 'leadqual-inline-container';
        script.parentNode.insertBefore(container, script.nextSibling);
      }

      var iframe = document.createElement('iframe');
      iframe.src = formUrl + '?embed=true';
      iframe.title = 'Lead Capture Form';
      container.appendChild(iframe);

    } else if (mode === 'popup') {
      // Popup mode - open form in new window
      var button = document.createElement('button');
      button.className = 'leadqual-trigger-btn';
      button.style.backgroundColor = buttonColor;
      button.textContent = buttonText;
      button.onclick = function() {
        var width = 600;
        var height = 700;
        var left = (screen.width - width) / 2;
        var top = (screen.height - height) / 2;
        window.open(
          formUrl + '?embed=true',
          'LeadScores Form',
          'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes'
        );
      };
      script.parentNode.insertBefore(button, script.nextSibling);

    } else {
      // Modal mode (default) - show form in modal overlay
      // Create modal elements
      var overlay = document.createElement('div');
      overlay.className = 'leadqual-modal-overlay';
      overlay.innerHTML = [
        '<div class="leadqual-modal">',
        '  <div class="leadqual-modal-header">',
        '    <button class="leadqual-close-btn" aria-label="Close">&times;</button>',
        '  </div>',
        '  <iframe class="leadqual-iframe" src="" title="Lead Capture Form"></iframe>',
        '</div>'
      ].join('');
      document.body.appendChild(overlay);

      var iframe = overlay.querySelector('iframe');
      var closeBtn = overlay.querySelector('.leadqual-close-btn');
      var modal = overlay.querySelector('.leadqual-modal');

      // Close modal handlers
      var closeModal = function() {
        overlay.classList.remove('active');
        iframe.src = '';
      };

      closeBtn.onclick = closeModal;
      overlay.onclick = function(e) {
        if (e.target === overlay) closeModal();
      };
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
      });

      // Listen for close message from iframe
      window.addEventListener('message', function(e) {
        if (e.data === 'leadqual:close') closeModal();
        if (e.data === 'leadqual:submitted') {
          // Optionally close after submission or show thank you
          setTimeout(closeModal, 3000);
        }
      });

      // Create trigger button
      var button = document.createElement('button');
      button.className = 'leadqual-trigger-btn';
      button.style.backgroundColor = buttonColor;
      button.textContent = buttonText;
      button.onclick = function() {
        iframe.src = formUrl + '?embed=true';
        overlay.classList.add('active');
      };
      script.parentNode.insertBefore(button, script.nextSibling);
    }
  });

  // Expose API for programmatic control
  window.LeadScores = {
    open: function(orgId) {
      var overlay = document.querySelector('.leadqual-modal-overlay');
      if (overlay) {
        var iframe = overlay.querySelector('iframe');
        var baseUrl = document.querySelector('script[data-org]').src.replace('/embed.js', '');
        iframe.src = baseUrl + '/form/' + orgId + '?embed=true';
        overlay.classList.add('active');
      }
    },
    close: function() {
      var overlay = document.querySelector('.leadqual-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.querySelector('iframe').src = '';
      }
    }
  };
})();
