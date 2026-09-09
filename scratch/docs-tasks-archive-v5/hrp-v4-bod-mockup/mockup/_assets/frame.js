/* ==========================================================================
   HRP Mockup — frame helper (DEC-27)
   - Chèn labelbar: link về index.html + tên frame + thẻ 1440×900
   - Scale-to-fit artboard 1440×900 theo cửa sổ (AC-10: không che CTA/totals
     ở 1366×768 vì toàn bộ artboard luôn hiển thị)
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.querySelector('.frame-canvas');
  if (!canvas) return;

  var frameName = canvas.getAttribute('data-frame') || document.title || 'Frame';

  /* Labelbar */
  var bar = document.createElement('div');
  bar.className = 'frame-labelbar';

  var back = document.createElement('a');
  back.href = 'index.html';
  back.className = 'frm-back';
  back.textContent = '← Bản đồ frame';
  bar.appendChild(back);

  var name = document.createElement('span');
  name.className = 'frm-name';
  name.textContent = frameName;
  bar.appendChild(name);

  var tag = document.createElement('span');
  tag.className = 'frm-tag';
  tag.textContent = '1440×900 · tự scale theo cửa sổ';
  bar.appendChild(tag);

  document.body.insertBefore(bar, document.body.firstChild);

  /* Scale-to-fit */
  var wrap = canvas.parentElement;
  function fit() {
    var pad = 16;
    var lh = bar.offsetHeight + 10;
    var availW = Math.max(320, window.innerWidth - pad * 2);
    var availH = Math.max(240, window.innerHeight - pad * 2 - lh);
    var scale = Math.min(availW / 1440, availH / 900);
    scale = Math.min(1.5, scale); /* cho phép phóng to trên màn lớn, cap 1.5 */
    canvas.style.transform = 'scale(' + scale + ')';
    if (wrap) {
      wrap.style.width = Math.ceil(1440 * scale) + 'px';
      wrap.style.height = Math.ceil(900 * scale) + 'px';
    }
  }
  window.addEventListener('resize', fit);
  if (document.readyState === 'complete') fit();
  else window.addEventListener('load', fit);
})();
