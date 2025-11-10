(function () {
  const api = (self.browser || self.chrome);
  api.devtools.panels.create(
    "Snippets",
    "", // no icon
    "panel.html",
    function(panel) {
      console.log("Snippets panel created");
    }
  );
})();
