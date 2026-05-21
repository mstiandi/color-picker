// segmentation.js — MediaPipe Selfie Segmentation wrapper
(function() {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747';
  var TIMEOUT_MS = 8000;
  var segInstance = null;
  var loadPromise = null;

  function withTimeout(promise, ms) {
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() { reject(new Error('Timeout after ' + ms + 'ms')); }, ms);
      promise.then(function(v) { clearTimeout(timer); resolve(v); })
             .catch(function(e) { clearTimeout(timer); reject(e); });
    });
  }

  async function ensureLoaded() {
    if (segInstance) return segInstance;
    if (loadPromise) return loadPromise;

    loadPromise = (async function() {
      if (!window.SelfieSegmentation) {
        await withTimeout(new Promise(function(resolve, reject) {
          var s = document.createElement('script');
          s.src = CDN + '/selfie_segmentation.js';
          s.onload = resolve;
          s.onerror = function() { reject(new Error('MediaPipe CDN load failed')); };
          document.head.appendChild(s);
        }), TIMEOUT_MS);
      }

      segInstance = new SelfieSegmentation({ locateFile: function(f) { return CDN + '/' + f; } });
      segInstance.setOptions({ modelSelection: 0, selfieMode: false });
      await withTimeout(segInstance.initialize(), TIMEOUT_MS);
      return segInstance;
    })();

    return loadPromise;
  }

  window.segmentImage = async function(imgEl) {
    var seg = await ensureLoaded();

    return withTimeout(new Promise(function(resolve, reject) {
      seg.onResults(function(results) {
        try {
          var w = 240;
          var h = Math.round(imgEl.naturalHeight / imgEl.naturalWidth * 240);
          if (h < 1 || !results.segmentationMask) {
            resolve({ mask: null, personRatio: 0 });
            return;
          }

          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(results.segmentationMask, 0, 0, w, h);
          var maskData = ctx.getImageData(0, 0, w, h);

          var personPx = 0;
          var total = maskData.data.length / 4;
          for (var i = 0; i < maskData.data.length; i += 4) {
            if (maskData.data[i] > 128) personPx++;
          }

          resolve({ mask: maskData, personRatio: personPx / total });
        } catch (e) {
          reject(e);
        }
      });

      seg.send({ image: imgEl });
    }), TIMEOUT_MS);
  };
})();
