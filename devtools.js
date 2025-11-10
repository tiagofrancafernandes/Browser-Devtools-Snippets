(function () {
  const api = (self.browser || self.chrome);
  api.devtools.panels.create(
    "Snippets",
    "icons/icon-48.png",
    "panel.html",
    function(panel) {
      console.log("Snippets panel created");
    }
  );
})();