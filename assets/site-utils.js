(function (global) {
  const reducedMotion = global.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
        })[character],
    );
  }

  function createTerminal(element, prompt, lineClass) {
    function line(html) {
      const row = document.createElement("div");
      row.className = lineClass;
      row.innerHTML = html;
      element.appendChild(row);
      return row;
    }

    async function typeCommand(text) {
      const row = line(`${prompt}<span class="cmd"></span>`);
      const command = row.querySelector(".cmd");
      for (const character of text) {
        command.textContent += character;
        await wait(38 + Math.random() * 45);
      }
    }

    function finalPrompt(cursorClass) {
      line(`${prompt}<span class="${cursorClass}"></span>`);
    }

    return { line, typeCommand, finalPrompt };
  }

  function trackTerminalDimensions(element, target) {
    function update() {
      const probe = document.createElement("span");
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:pre;font-family:var(--mono);font-size:16.5px;";
      probe.textContent = "0".repeat(40);
      element.appendChild(probe);
      const characterWidth = probe.getBoundingClientRect().width / 40;
      probe.remove();

      const columns = Math.max(
        20,
        Math.round((element.clientWidth - 56) / characterWidth),
      );
      const rows = Math.max(
        8,
        Math.round((element.clientHeight - 52) / (16.5 * 1.6)),
      );
      target.textContent = `${columns}×${rows}`;
    }

    update();
    global.addEventListener("resize", update);
  }

  global.SiteUtils = {
    createTerminal,
    escapeHtml,
    reducedMotion,
    trackTerminalDimensions,
    wait,
  };
})(window);
