"use strict";

// src/ui.html
var ui_default = `<html>
<head>
  <style>
    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

    body { 
      font-family: 'Pretendard'; 
      margin: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
    .content-wrapper {
      padding: 20px;
      height: calc(100% - 40px); 
      overflow-y: auto;
      scrollbar-width: none;
    }
    input, textarea { width: 100%; margin-bottom: 10px; }

    #pluginList { 
      margin-top: 20px; 
      flex-grow: 1;
      overflow-y: auto;
      min-width: 400px;
    }
    .plugin-item { 
      border: 2px solid #f0f3f7;
      padding: 16px 8px 16px 16px; 
      margin-bottom: 12px; 
      display: flex; 
      align-items: flex-start;
      cursor: pointer;
      border-radius: 12px;
      flex-wrap: wrap;
    }
    .plugin-item:hover {
      background-color: #f0f3f7;
    }
    .plugin-item img { width: 40px; height: 40px; margin-right: 12px; display: flex; border-radius: 999px; margin-top: 4px;}
    .plugin-info { 
      display: flex;
      flex-direction: column;
      flex-grow: 1; 
      min-width: 200px;
      gap: 16px;
    }

    .plugin-actions { 
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 40px;
    }

    .pluginUrl {padding: 12px;}

    .myTitle {
      background-color: #f8e8e2; 
      padding: 16px 12px; 
      border-radius: 8px; 
      text-align: center;
      font-weight: 500;
      color: coral;
    }
    .inputUrl, .inputcategory, .inputDesc {
      padding: 12px; 
      border-radius: 8px; 
      border: 1.5px solid #ddd;
      font-family: "Pretendard";
    }

    .inputs {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btnAdd {
      padding: 12px;
      border: none; 
      background-color: coral; 
      color: #fff; 
      font-weight: 600; 
      font-size: 14px; 
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btnAdd:hover {
      background-color: #df521f;
      transition: ease-out 0.3s;
    }

    #tabs {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
    }
    .tab {
      padding: 10px;
      cursor: pointer;
      border-bottom: 2px solid #ddd;
      width: 50%;
      text-align: center;
    }
    .active-tab {
      font-weight: bold;
      border-bottom: 2px solid coral;
      color: coral;
    }
    .content {
      display: none;
    }
    .content.active {
      display: block;
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
      background-color: coral;
      color: white;
    }
    .delete-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .delete-button:hover {
      background-color: #d0d3df;
      border-radius: 6px;
    }
    #resizer {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 20px;
      height: 20px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 50%, #ccc 50%);
    }
    #categoryChips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 10px;
    }
    .category-chip {
      background-color: #E5E5E5;
      border-radius: 16px;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    .category-chip.selected {
      background-color: coral;
      color: white;
    }
    #toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      display: none;
    }
    .autocomplete-wrapper {
      position: relative;
    }
    .autocomplete-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 0 0 8px 8px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
    }
    .autocomplete-item {
      padding: 8px 12px;
      cursor: pointer;
    }
    .autocomplete-item:hover {
      background-color: #f0f3f7;
    }
  </style>
  <script src="https://unpkg.com/feather-icons"></script>
</head>
<body>
  <div class="content-wrapper">
    <div id="tabs">
      <div class="tab active-tab" data-tab="add-plugin">Add Plugin</div>
      <div class="tab" data-tab="plugin-list">My Plugin List</div>
    </div>
    <div id="add-plugin" class="content active">
      <wrap class="inputs">
        <input class="inputUrl" id="pluginUrl" type="text" placeholder="Enter plugin URL">
        <div class="autocomplete-wrapper">
          <input class="inputCategory" id="pluginCategory" type="text" placeholder="Enter or select category">
          <div class="autocomplete-dropdown" id="categoryDropdown" style="display: none;"></div>
        </div>
        <textarea class="inputDesc" id="pluginDescription" placeholder="Enter plugin description" rows="3"></textarea>
        <button class="btnAdd" id="addPlugin">Save this plugin <span style="font-size: 20px; margin-top: 4px; gap: 4px;">\u{1F60E}</span></button>
      </wrap>
    </div>
    <div id="plugin-list" class="content">
      <div id="category-chips"></div>
      <div id="pluginList"></div>
    </div>
  </div>

  <div id="resizer"></div>
  <div id="toast"></div>
  <script>
    let existingCategories = new Set();

    function switchTab(tabName) {
      console.log('Switching to tab:', tabName);
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active-tab', tab.dataset.tab === tabName);
      });
      document.querySelectorAll('.content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
      });
      if (tabName === 'plugin-list') {
        console.log('Requesting plugins list');
        parent.postMessage({ pluginMessage: { type: 'get-plugins' } }, '*');
      }
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        console.log('Tab clicked:', tab.dataset.tab);
        switchTab(tab.dataset.tab);
      });
    });

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    }

    function updateCategoryDropdown() {
      const dropdown = document.getElementById('categoryDropdown');
      dropdown.innerHTML = '';
      existingCategories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = category;
        item.onclick = () => selectCategory(category);
        dropdown.appendChild(item);
      });
    }

    function selectCategory(category) {
      document.getElementById('pluginCategory').value = category;
      document.getElementById('categoryDropdown').style.display = 'none';
    }

    document.getElementById('pluginCategory').addEventListener('input', function() {
      const inputValue = this.value.trim().toLowerCase();
      const dropdown = document.getElementById('categoryDropdown');
      dropdown.innerHTML = '';

      const filteredCategories = Array.from(existingCategories).filter(category => 
        category.toLowerCase().includes(inputValue)
      );

      if (inputValue && !filteredCategories.includes(inputValue)) {
        const newItem = document.createElement('div');
        newItem.className = 'autocomplete-item';
        newItem.textContent = \`Add "\${inputValue}"\`;
        newItem.onclick = () => selectCategory(inputValue);
        dropdown.appendChild(newItem);
      }

      filteredCategories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = category;
        item.onclick = () => selectCategory(category);
        dropdown.appendChild(item);
      });

      dropdown.style.display = filteredCategories.length || inputValue ? 'block' : 'none';
    });

    document.getElementById('pluginCategory').addEventListener('focus', function() {
      updateCategoryDropdown();
      document.getElementById('categoryDropdown').style.display = 'block';
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.autocomplete-wrapper')) {
        document.getElementById('categoryDropdown').style.display = 'none';
      }
    });

    document.getElementById('addPlugin').onclick = () => {
      console.log('Add plugin button clicked');
      const url = document.getElementById('pluginUrl').value.trim();
      const category = document.getElementById('pluginCategory').value.trim();
      const description = document.getElementById('pluginDescription').value.trim();

      if (!url || !category || !description) {
        showToast('Please enter URL, category, and description');
        return;
      }

      if (existingCategories.has(category)) {
        showToast('Using existing category: ' + category);
      } else {
        existingCategories.add(category);
        showToast('New category added: ' + category);
      }

      parent.postMessage({ pluginMessage: { type: 'add-plugin', url, category, description } }, '*');

      // Clear input fields after adding
      document.getElementById('pluginUrl').value = '';
      document.getElementById('pluginCategory').value = '';
      document.getElementById('pluginDescription').value = '';
    };

    function openPluginPage(pluginId) {
      console.log('Opening plugin page:', pluginId);
      const url = \`https://www.figma.com/community/plugin/\${pluginId}\`;
      window.open(url, '_blank');
    }

    function deletePlugin(event, pluginId, category) {
      event.stopPropagation();
      if (confirm('Are you sure you want to delete this plugin from the category?')) {
        console.log('Deleting plugin:', pluginId, 'from category:', category);
        parent.postMessage({ pluginMessage: { type: 'delete-plugin', pluginId, category } }, '*');
      }
    }

    function createChips(categories) {
      console.log('Creating category chips:', categories);
      const chipsContainer = document.getElementById('category-chips');
      chipsContainer.innerHTML = '<div class="chip active" data-category="all">All</div>';
      categories.forEach(category => {
        chipsContainer.innerHTML += \`<div class="chip" data-category="\${category}">\${category}</div>\`;
      });

      chipsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
          console.log('Category chip clicked:', e.target.dataset.category);
          document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
          e.target.classList.add('active');
          filterPlugins(e.target.dataset.category);
        }
      });
    }

    function filterPlugins(category) {
      console.log('Filtering plugins by category:', category);
      const plugins = document.querySelectorAll('.plugin-item');
      plugins.forEach(plugin => {
        if (category === 'all' || plugin.dataset.category === category) {
          plugin.style.display = 'flex';
        } else {
          plugin.style.display = 'none';
        }
      });
    }

    function renderPluginList(plugins) {
      console.log('Rendering plugin list:', plugins);
      const pluginList = document.getElementById('pluginList');
      pluginList.innerHTML = '';
      const categories = new Set();

      plugins.forEach(plugin => {
        categories.add(plugin.category);
        existingCategories.add(plugin.category);
        const item = document.createElement('div');
        item.className = 'plugin-item';
        item.dataset.category = plugin.category;
        item.innerHTML = \`
          <img src="\${plugin.icon}" alt="\${plugin.name}" onerror="this.src='https://via.placeholder.com/32'">
          <div class="plugin-info">
            <div style="display:flex; flex-direction:column; gap: 4px;">
              <h4 style="margin:0;font-size: 20px; color: #3a3d51; font-weight: 300;">\${plugin.name}</h4>
              <p style="margin:0; font-size:13px; color: #96a1aa;" >\${plugin.description || 'No description available'}</p>
            </div>
            <small style="color: coral; background-color: #ff7f5021; width: fit-content; padding: 2px 4px; border-radius: 2px;">\${plugin.category}</small>
          </div>
          <div class="plugin-actions">
            <button class="delete-button" onclick="deletePlugin(event, '\${plugin.id}', '\${plugin.category}')" title="Delete plugin">
              <i data-feather="trash-2" stroke="#96a1aa" stroke-width="1.5"></i>
            </button>
          </div>
        \`;
        item.onclick = (e) => {
          if (!e.target.closest('.delete-button')) {
            openPluginPage(plugin.id);
          }
        };
        pluginList.appendChild(item);
      });

      createChips(Array.from(categories));
      updateCategoryChips();
      feather.replace();
    }

    // \uB9AC\uC0AC\uC774\uC800 \uB85C\uC9C1
    const resizer = document.getElementById('resizer');
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizer.addEventListener('mousedown', initResize, false);

    function initResize(e) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = window.innerWidth;
        startHeight = window.innerHeight;

        document.addEventListener('mousemove', resize, false);
        document.addEventListener('mouseup', stopResize, false);
    }

    function resize(e) {
        if (!isResizing) return;

        const newWidth = Math.max(300, startWidth + (e.clientX - startX));
        const newHeight = Math.max(300, startHeight + (e.clientY - startY));

        parent.postMessage({ pluginMessage: { type: 'resize', width: newWidth, height: newHeight } }, '*');
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize, false);
        document.removeEventListener('mouseup', stopResize, false);
    }

    // \uBA54\uC2DC\uC9C0 \uC218\uC2E0 \uB9AC\uC2A4\uB108
    window.onmessage = (event) => {
        if (event.data.pluginMessage) {
            console.log('Received message from plugin:', event.data.pluginMessage);
            if (event.data.pluginMessage.type === 'plugins-list') {
                renderPluginList(event.data.pluginMessage.plugins);
            }
        }
    };

    // \uCD08\uAE30 \uD50C\uB7EC\uADF8\uC778 \uBAA9\uB85D \uB85C\uB4DC
    function loadPlugins() {
        console.log('Requesting initial plugins list');
        parent.postMessage({ pluginMessage: { type: 'get-plugins' } }, '*');
    }

    const categoryInput = document.getElementById('pluginCategory');
    const categoryChips = document.getElementById('categoryChips');

    let categories = Array.from(existingCategories);

    function createFilterOptions(options, { ignoreCase = true } = {}) {
      return (candidateOptions, { inputValue }) => {
        if (inputValue === '') {
          return candidateOptions;
        }
        return candidateOptions.filter(option => 
          ignoreCase
            ? option.toLowerCase().includes(inputValue.toLowerCase())
            : option.includes(inputValue)
        );
      };
    }

    const filter = createFilterOptions();

    function selectOption(option) {
      if (typeof option === 'string') {
        categoryInput.value = option;
      } else if (option && option.inputValue) {
        categoryInput.value = option.inputValue;
        categories.push(option.inputValue);
      }
      categoryInput.focus();
    }

    categoryInput.addEventListener('input', (e) => {
      const inputValue = e.target.value;
      const filteredOptions = filter(categories, { inputValue });

      // new category 
      if (inputValue !== '' && !categories.includes(inputValue)) {
        filteredOptions.push({ inputValue, title: \`Add "\${inputValue}"\` });
      }

      const suggestions = renderSuggestions(filteredOptions);

      if (filteredOptions.length > 0) {
        categoryInput.parentNode.appendChild(suggestions);
      }
    });

    // \uCD08\uAE30 \uB85C\uB4DC \uAC12
    loadPlugins();

    // Feather Icons \uCD08\uAE30\uD654 \uBC0F \uB3D9\uC801 \uC694\uC18C\uC5D0 \uB300\uD55C \uC801\uC6A9
    function initFeatherIcons() {
      feather.replace();
      
      // \uB3D9\uC801\uC73C\uB85C \uC0DD\uC131\uB41C \uC694\uC18C\uC5D0 \uB300\uD574 Feather \uC544\uC774\uCF58 \uC801\uC6A9
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            feather.replace();
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // \uD398\uC774\uC9C0 \uB85C\uB4DC \uC644\uB8CC \uC2DC Feather \uC544\uC774\uCF58 \uCD08\uAE30\uD654
    document.addEventListener('DOMContentLoaded', initFeatherIcons);
  </script>

</body>
</html>`;

// src/code.ts
async function initializeSize() {
  const savedSize = await figma.clientStorage.getAsync("pluginSize");
  if (savedSize) {
    figma.ui.resize(savedSize.width, savedSize.height);
  } else {
    figma.ui.resize(400, 600);
  }
}
figma.showUI(ui_default);
initializeSize();
figma.ui.onmessage = async (msg) => {
  console.log("Received message:", msg);
  if (msg.type === "resize") {
    const width = Math.max(300, Math.round(msg.width || 0));
    const height = Math.max(300, Math.round(msg.height || 0));
    console.log("Resizing to:", width, height);
    figma.ui.resize(width, height);
    await figma.clientStorage.setAsync("pluginSize", { width, height });
  } else if (msg.type === "add-plugin") {
    try {
      if (!msg.url || !msg.category || !msg.description) {
        throw new Error("URL, category, and description are required");
      }
      const pluginInfo = extractPluginInfo(msg.url, msg.category, msg.description);
      if (!pluginInfo) {
        throw new Error("Failed to extract plugin information");
      }
      const storedPlugins = await figma.clientStorage.getAsync("storedPlugins") || [];
      storedPlugins.push(pluginInfo);
      await figma.clientStorage.setAsync("storedPlugins", storedPlugins);
      figma.notify("Plugin added successfully", { timeout: 2e3 });
      figma.ui.postMessage({ type: "plugin-added", plugin: pluginInfo });
    } catch (error) {
      console.error("Error adding plugin:", error);
      figma.notify("Error adding plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"), { error: true });
    }
  } else if (msg.type === "get-plugins") {
    try {
      const storedPlugins = await figma.clientStorage.getAsync("storedPlugins") || [];
      figma.ui.postMessage({ type: "plugins-list", plugins: storedPlugins });
    } catch (error) {
      console.error("Error fetching plugins:", error);
      figma.notify("Error fetching plugins: " + (error instanceof Error ? error.message : "Failed to fetch plugins"), { error: true });
    }
  } else if (msg.type === "open-plugin-page") {
    if (msg.pluginId) {
      figma.ui.postMessage({
        type: "open-url",
        url: `https://www.figma.com/community/plugin/${msg.pluginId}`
      });
    }
  } else if (msg.type === "delete-plugin") {
    try {
      const storedPlugins = await figma.clientStorage.getAsync("storedPlugins") || [];
      const updatedPlugins = storedPlugins.filter((plugin) => plugin.id !== msg.pluginId);
      await figma.clientStorage.setAsync("storedPlugins", updatedPlugins);
      figma.notify("Plugin deleted successfully", { timeout: 2e3 });
      figma.ui.postMessage({ type: "plugins-list", plugins: updatedPlugins });
    } catch (error) {
      console.error("Error deleting plugin:", error);
      figma.notify("Error deleting plugin: " + (error instanceof Error ? error.message : "An unknown error occurred"), { error: true });
    }
  } else if (msg.type === "notify") {
    figma.notify(msg.message || "", { timeout: 2e3 });
  }
};
function extractPluginInfo(url, category, description) {
  const match = url.match(/\/plugin\/(\d+)\/([^/?]+)/);
  if (!match) return null;
  const [, id, name] = match;
  return {
    id,
    name: decodeURIComponent(name.replace(/-/g, " ")),
    icon: `https://www.figma.com/community/plugin/${id}/icon`,
    description,
    category
  };
}
