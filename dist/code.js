"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/ui.html
  var ui_default;
  var init_ui = __esm({
    "src/ui.html"() {
      ui_default = `<html>
<head>
  <style>
    body {
      font: 12px sans-serif;
      text-align: center;
      margin: 20px;
    }
    #myTitle {
      font-size: 24px;
      margin-bottom: 20px;
    }
    #tabs {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
    }
    .tab {
      padding: 10px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .active-tab {
      font-weight: bold;
      border-bottom: 2px solid #18A0FB;
    }
    #content > div {
      display: none;
    }
    #content > div.active {
      display: block;
    }
    input, textarea {
      width: 100%;
      margin-bottom: 10px;
    }
    button {
      background-color: #18A0FB;
      color: white;
      border: none;
      padding: 8px 16px;
      cursor: pointer;
    }
    .chip {
      display: inline-block;
      padding: 5px 10px;
      margin: 5px;
      background-color: #E5E5E5;
      border-radius: 16px;
      cursor: pointer;
    }
    .chip.active {
      background-color: #18A0FB;
      color: white;
    }
    .plugin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      text-align: left;
      border: 1px solid #E5E5E5;
      padding: 10px;
      border-radius: 5px;
    }
    .plugin-info {
      flex-grow: 1;
    }
    .plugin-actions {
      display: flex;
    }
    .plugin-actions button {
      margin-left: 5px;
      padding: 5px 10px;
    }
  </style>
</head>
<body>
  <h1 id="myTitle">My Real Plugin \u{1F60E}</h1>
  <div id="tabs">
    <div class="tab active-tab" data-tab="add">Add Plugin</div>
    <div class="tab" data-tab="list">Plugin List</div>
  </div>
  <div id="content">
    <div id="add-plugin" class="active">
      <h2>Save this plugin</h2>
      <input id="plugin-url" placeholder="Plugin URL">
      <input id="plugin-category" placeholder="Category">
      <textarea id="plugin-description" placeholder="Description"></textarea>
      <button id="add-plugin-btn">Add Plugin</button>
    </div>
    <div id="plugin-list">
      <h2>Saved Plugins</h2>
      <div id="category-chips"></div>
      <div id="plugins-container"></div>
    </div>
  </div>
  <script>
    document.getElementById('add-plugin-btn').onclick = () => {
      const url = document.getElementById('plugin-url').value;
      const category = document.getElementById('plugin-category').value;
      const description = document.getElementById('plugin-description').value;
      parent.postMessage({ pluginMessage: { type: 'add-plugin', url, category, description } }, '*');
    };

    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('#content > div');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active-tab'));
        tab.classList.add('active-tab');
        contents.forEach(content => {
          content.classList.remove('active');
          if (content.id === tab.dataset.tab + '-plugin') {
            content.classList.add('active');
          }
        });
        if (tab.dataset.tab === 'list') {
          parent.postMessage({ pluginMessage: { type: 'get-plugins' } }, '*');
        }
      });
    });

    function createChips(categories) {
      const chipsContainer = document.getElementById('category-chips');
      chipsContainer.innerHTML = '<div class="chip active" data-category="all">All</div>';
      categories.forEach(category => {
        chipsContainer.innerHTML += '<div class="chip" data-category="' + category + '">' + category + '</div>';
      });

      chipsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
          document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
          e.target.classList.add('active');
          filterPlugins(e.target.dataset.category);
        }
      });
    }

    function filterPlugins(category) {
      const plugins = document.querySelectorAll('.plugin-item');
      plugins.forEach(plugin => {
        if (category === 'all' || plugin.dataset.category === category) {
          plugin.style.display = 'flex';
        } else {
          plugin.style.display = 'none';
        }
      });
    }

    function displayPlugins(plugins) {
      const container = document.getElementById('plugins-container');
      container.innerHTML = '';
      const categories = new Set();

      plugins.forEach(plugin => {
        categories.add(plugin.category);
        const pluginElement = document.createElement('div');
        pluginElement.className = 'plugin-item';
        pluginElement.dataset.category = plugin.category;
        pluginElement.innerHTML = 
          '<div class="plugin-info">' +
            '<strong>' + plugin.name + '</strong> (' + plugin.category + ')<br>' +
            plugin.description +
          '</div>' +
          '<div class="plugin-actions">' +
            '<button onclick="copyLink(\\'' + plugin.id + '\\')">Copy Link</button>' +
            '<button onclick="deletePlugin(\\'' + plugin.id + '\\')">Delete</button>' +
          '</div>';
        container.appendChild(pluginElement);
      });

      createChips(Array.from(categories));
    }

    function copyLink(pluginId) {
      const url = 'https://www.figma.com/community/plugin/' + pluginId;
      navigator.clipboard.writeText(url).then(() => {
        parent.postMessage({ pluginMessage: { type: 'notify', message: 'Link copied to clipboard!' } }, '*');
      });
    }

    function deletePlugin(pluginId) {
      parent.postMessage({ pluginMessage: { type: 'delete-plugin', pluginId } }, '*');
    }

    onmessage = (event) => {
      const message = event.data.pluginMessage;
      if (message.type === 'plugins-list') {
        displayPlugins(message.plugins);
      } else if (message.type === 'plugin-added') {
        document.getElementById('plugin-url').value = '';
        document.getElementById('plugin-category').value = '';
        document.getElementById('plugin-description').value = '';
      }
    };
  <\/script>
</body>
</html>`;
    }
  });

  // src/code.ts
  var require_code = __commonJS({
    "src/code.ts"(exports) {
      init_ui();
      figma.showUI(ui_default, { width: 400, height: 550 });
      figma.ui.onmessage = (msg) => __async(exports, null, function* () {
        if (msg.type === "add-plugin") {
          try {
            if (!msg.url || !msg.category || !msg.description) {
              throw new Error("URL, category, and description are required");
            }
            const pluginInfo = extractPluginInfo(msg.url, msg.category, msg.description);
            if (!pluginInfo) {
              throw new Error("Failed to extract plugin information");
            }
            const storedPlugins = (yield figma.clientStorage.getAsync("storedPlugins")) || [];
            storedPlugins.push(pluginInfo);
            yield figma.clientStorage.setAsync("storedPlugins", storedPlugins);
            figma.notify("Plugin added successfully", { timeout: 2e3 });
            figma.ui.postMessage({ type: "plugin-added", plugin: pluginInfo });
          } catch (error) {
            console.error("Error adding plugin:", error);
            figma.notify("Error adding plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"), { error: true });
          }
        } else if (msg.type === "get-plugins") {
          try {
            const storedPlugins = (yield figma.clientStorage.getAsync("storedPlugins")) || [];
            figma.ui.postMessage({ type: "plugins-list", plugins: storedPlugins });
          } catch (error) {
            console.error("Error fetching plugins:", error);
            figma.notify("Error fetching plugins: " + (error instanceof Error ? error.message : "Failed to fetch plugins"), { error: true });
          }
        } else if (msg.type === "delete-plugin") {
          try {
            const storedPlugins = (yield figma.clientStorage.getAsync("storedPlugins")) || [];
            const updatedPlugins = storedPlugins.filter((plugin) => plugin.id !== msg.pluginId);
            yield figma.clientStorage.setAsync("storedPlugins", updatedPlugins);
            figma.notify("Plugin deleted successfully", { timeout: 2e3 });
            figma.ui.postMessage({ type: "plugins-list", plugins: updatedPlugins });
          } catch (error) {
            console.error("Error deleting plugin:", error);
            figma.notify("Error deleting plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"), { error: true });
          }
        } else if (msg.type === "notify") {
          figma.notify(msg.message || "");
        }
      });
      function extractPluginInfo(url, category, description) {
        const match = url.match(/\/plugin\/(\d+)\/([^/?]+)/);
        if (!match)
          return null;
        const [, id, name] = match;
        return {
          id,
          name: decodeURIComponent(name.replace(/-/g, " ")),
          icon: `https://www.figma.com/community/plugin/${id}/icon`,
          description,
          category
        };
      }
    }
  });
  require_code();
})();
