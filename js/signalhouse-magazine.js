(function () {
  var root = document.querySelector("[data-sh-magazine]");
  if (!root) return;

  var track = root.querySelector(".sh-track");
  var pages = root.querySelectorAll(".sh-page");
  var prevBtn = document.getElementById("sh-prev");
  var nextBtn = document.getElementById("sh-next");
  var counter = document.getElementById("sh-counter");
  var total = pages.length;
  var index = 0;
  var touchStartX = 0;
  var touchStartY = 0;

  function render() {
    track.style.transform = "translateX(-" + index * 100 + "%)";
    if (counter) counter.textContent = index + 1 + " / " + total;
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === total - 1;
  }

  function go(delta) {
    var next = index + delta;
    if (next < 0 || next >= total) return;
    index = next;
    render();
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  root.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    },
    { passive: true }
  );

  root.addEventListener(
    "touchend",
    function (e) {
      var dx = e.changedTouches[0].screenX - touchStartX;
      var dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) go(1);
      else go(-1);
    },
    { passive: true }
  );

  render();
})();
