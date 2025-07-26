// Additional client-side security measures
(function() {
  'use strict';
  
  // Detect common coding extensions
  const suspiciousExtensions = [
    'bfnaelmomeimhlpmgjnjophhpkkoljpa', // Honey
    'cjpalhdlnbpafiamejdnhcphjbkeiagm', // uBlock Origin
    'gighmmpiobklfepjocnamgkkbiglidom', // AdBlock
    'hdokiejnpimakedhajhdlcegeplioahd', // LastPass
    'fhbjgbiflinjbdggehcddcbncdddomop', // Postman
    'hgmloofddffdnphfgcellkdfbfbjeloo'  // TablePlus
  ];
  
  // Check for extension APIs
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    suspiciousExtensions.forEach(extensionId => {
      chrome.runtime.sendMessage(extensionId, {ping: true}, (response) => {
        if (response) {
          alert('Coding extensions detected. Please disable all extensions.');
          window.location.href = '/';
        }
      });
    });
  }
  
  // Monitor for suspicious DOM modifications
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const classes = node.className || '';
            if (classes.includes('extension-') || 
                classes.includes('chrome-extension-') ||
                node.tagName === 'IFRAME' && node.src.includes('extension://')) {
              alert('Extension interference detected');
              window.location.href = '/';
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
