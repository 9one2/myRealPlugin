/// <reference types="@figma/plugin-typings" />
import htmlContent from './ui.html';

interface PluginSize {
  width: number;
  height: number;
}

interface PluginInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

// 초기 크기 설정
async function initializeSize() {
  const savedSize = await figma.clientStorage.getAsync('pluginSize') as PluginSize;
  if (savedSize) {
    figma.ui.resize(savedSize.width, savedSize.height);
  } else {
    figma.ui.resize(400, 600);
  }
}

// 플러그인 초기화
figma.showUI(htmlContent);
initializeSize();

figma.ui.onmessage = async (msg: { type: string; url?: string; category?: string; description?: string; pluginId?: string; message?: string; width?: number; height?: number; }) => {
  console.log('Received message:', msg); // 디버그 로그

  if (msg.type === 'resize') {
    const width = Math.max(300, Math.round(msg.width || 0));
    const height = Math.max(300, Math.round(msg.height || 0));
    
    console.log('Resizing to:', width, height); // 디버그 로그
    
    figma.ui.resize(width, height);
    await figma.clientStorage.setAsync('pluginSize', { width, height });
  } else if (msg.type === 'add-plugin') {
    try {
      if (!msg.url || !msg.category || !msg.description) {
        throw new Error('URL, category, and description are required');
      }

      const pluginInfo = extractPluginInfo(msg.url, msg.category, msg.description);
      if (!pluginInfo) {
        throw new Error('Failed to extract plugin information');
      }

      const storedPlugins: PluginInfo[] = await figma.clientStorage.getAsync('storedPlugins') || [];
      storedPlugins.push(pluginInfo);
      await figma.clientStorage.setAsync('storedPlugins', storedPlugins);

      figma.notify('Plugin added successfully', { timeout: 2000 });
      figma.ui.postMessage({ type: 'plugin-added', plugin: pluginInfo });
    } catch (error) {
      console.error('Error adding plugin:', error);
      figma.notify('Error adding plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
    }
  } else if (msg.type === 'get-plugins') {
    try {
      const storedPlugins: PluginInfo[] = await figma.clientStorage.getAsync('storedPlugins') || [];
      figma.ui.postMessage({ type: 'plugins-list', plugins: storedPlugins });
    } catch (error) {
      console.error('Error fetching plugins:', error);
      figma.notify('Error fetching plugins: ' + (error instanceof Error ? error.message : 'Failed to fetch plugins'), { error: true });
    }
  } else if (msg.type === 'open-plugin-page') {
    if (msg.pluginId) {
      figma.ui.postMessage({ 
        type: 'open-url', 
        url: `https://www.figma.com/community/plugin/${msg.pluginId}`
      });
    }
  } else if (msg.type === 'delete-plugin') {
    try {
      const storedPlugins: PluginInfo[] = await figma.clientStorage.getAsync('storedPlugins') || [];
      const updatedPlugins = storedPlugins.filter(plugin => plugin.id !== msg.pluginId);
      await figma.clientStorage.setAsync('storedPlugins', updatedPlugins);
      figma.notify('Plugin deleted successfully', { timeout: 2000 });
      figma.ui.postMessage({ type: 'plugins-list', plugins: updatedPlugins });
    } catch (error) {
      console.error('Error deleting plugin:', error);
      figma.notify('Error deleting plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
    }
  } else if (msg.type === 'notify') {
    figma.notify(msg.message || '', { timeout: 2000 });
  }
};

function extractPluginInfo(url: string, category: string, description: string): PluginInfo | null {
  const match = url.match(/\/plugin\/(\d+)\/([^/?]+)/);
  if (!match) return null;

  const [, id, name] = match;
  return {
    id,
    name: decodeURIComponent(name.replace(/-/g, ' ')),
    icon: `https://www.figma.com/community/plugin/${id}/icon`,
    description,
    category
  };
}