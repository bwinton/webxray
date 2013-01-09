"use strict";

var tabs = require('tabs');
var data = require('self').data;
var readURI = require('sdk/net/url').readURI;
var group = require('sdk/core/promise').promised(Array);

var items = {
};

var remix_panel = require("panel").Panel({
  width: 214,
  height: 122,
  contentURL: data.url("remix.html"),
});

var gogglesConfig = JSON.parse(data.load("config.json"));
var files = gogglesConfig.compiledFileParts.slice(1, -1);


remix_panel.port.on("save", function () {
  remix_panel.hide();

  // We're removing intro/outro files with slice().
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
      contentScriptFile: urls,
      contentScript: "window.save = function(item) { self.port.emit('save', item); };"
    });
    worker.port.on("save", function(item){
      var count = Object.keys(items).length;
      items['item' + (count+1)] = item;
    });
  });
});

remix_panel.port.on("remix", function () {
  remix_panel.hide();

  var urls = files.map(data.url).filter(function(e) {
    return e.indexOf('jquery') !== -1;
  });
  var promises = urls.map(function(e) {
    return readURI(e).then(function success(value) {
    }, function failure(reason) {
      console.log("Could not read " + e + ".");
      urls.splice(urls.indexOf(e), 1);
    });
  });
  group(promises).then(function () {
    var worker = tabs.activeTab.attach({
      contentScriptFile: urls,
      contentScript: "" +
        "self.port.on('redirect', function(pparameters) {\n" +
        "  var purl = 'http://robothaus.org:8080/render';\n" +
        "  pparameters = (typeof pparameters == 'undefined') ? {} : pparameters;\n" +
        "  var in_new_tab = false;\n" +
        "\n" +
        "  var form = document.createElement('form');\n" +
        "  jQuery(form).attr('id', 'reg-form').attr('name', 'reg-form').attr('action', purl).attr('method', 'post').attr('enctype', 'multipart/form-data');\n" +
        "  if (in_new_tab)\n" +
        "    jQuery(form).attr('target', '_blank');\n" +
        "  jQuery.each(pparameters, function(key) {\n" +
        "    jQuery('<input type=\\'text\\'/>')\n" +
        "      .attr({'name': key, 'value': this})\n" +
        "      .appendTo(jQuery(form));\n" +
        "  });\n" +
        "  document.body.appendChild(form);\n" +
        "  form.submit();\n" +
        "  document.body.removeChild(form);\n" +
        "\n" +
        "  return false;\n" +
        "});\n"
    });
    worker.port.emit("redirect", items);
  });
});

remix_panel.port.on("clear", function () {
  remix_panel.hide();
  items = {};
});

require("widget").Widget({
  id: "goggles-icon",
  label: "Activate Goggles",
  contentURL: data.url("favicon.ico"),
  panel: remix_panel
});
