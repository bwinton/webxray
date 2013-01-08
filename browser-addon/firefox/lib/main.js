var tabs = require('tabs');
var data = require('self').data;
var readURI = require('sdk/net/url').readURI;
var group = require('sdk/core/promise').promised(Array);

require("widget").Widget({
  id: "goggles-icon",
  label: "Activate Goggles",
  contentURL: data.url("favicon.ico"),
  onClick: function() {
    var gogglesConfig = JSON.parse(data.load("config.json"));
    // We're removing intro/outro files with slice().
    var files = gogglesConfig.compiledFileParts.slice(1, -1);
    var urls = files.map(data.url);
    var promises = urls.map(function(e) {
      return readURI(e).then(function success(value) {
      }, function failure(reason) {
        console.log("Could not read " + e + ".");
        urls.splice(urls.indexOf(e), 1);
      });
    });
    group(promises).then(function () {
      var worker = tabs.activeTab.attach({
        contentScriptFile: urls
      });
    });
  }
});
