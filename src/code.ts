
/// <reference types="@figma/plugin-typings" />

import pako from 'pako';

import IconifyIcon from './assets/iconify.png'


interface PluginSize {
  width: number;
  height: number;
}

interface PluginInfo {
  id: string;
  pluginName: string;
  pluginDescription?: string;
  pluginUrl: string;
  pluginIcon: string;
  categories: string[];
  isDefault?: boolean;
  hidden?: boolean; 
}

interface StoredData {
  plugins: PluginInfo[];
  lastUpdated: number;
}

interface AirtableRecord {
  id: string;
  fields: {
    'plugin-name': string;
    'plugin-desc'?: string;
    'plugin-link': string;
    'plugin-icon': string;
    'plugin-id': string; // Figma 플러그인 ID를 저장하는 새 필드
  };
}

interface CompressedData {
  part: number;
  data: Uint8Array;
}

interface IndexedPlugin {
  id: string;
  pluginName: string;
  pluginDescription: string;
  pluginUrl: string;
  pluginIcon: string;
  categories: string[];
  searchTerms: string;
}

// 하드코딩된 기본 플러그인 데이터
const defaultCategories = ["Icon", "Productivity", "Collaboration", "Developer Tools", "Content"];

const defaultPlugins: PluginInfo[] = [
  // Design 카테고리
  {
    id: "735098390272716381",
    pluginName: "Iconify",
    pluginDescription: "테스트테스트ㅋㅋ",
    pluginUrl: "https://www.figma.com/community/plugin/735098390272716381/iconify",
    pluginIcon: IconifyIcon,
    categories: ["Icon"]
  },
  {
    id: "735098390272716381",
    pluginName: "Iconify",
    pluginDescription: "테스트",
    pluginUrl: "https://www.figma.com/community/plugin/735098390272716381/Iconify",
    pluginIcon: "./assets/iconify.png",
    categories: ["Icon"]
  },
  {
    id: "843461159747178978",
    pluginName: "Figma Tokens",
    pluginDescription: "Manage and use design tokens in Figma",
    pluginUrl: "https://www.figma.com/community/plugin/843461159747178978/Figma-Tokens",
    pluginIcon: "./assets/iconify.png",
    categories: ["Icon"]
  }
];
console.log('Default plugins:', defaultPlugins);

// Airtable API 관련 상수
const accessToken = "patGgL1ObwK1rvVRH.bde07c08dc54fd2fd72bca8aced68fd2882e81924e5565a4641dea170b4933af";
const baseId = "appoQJ18zMmkhzu10";
const dataTable = "tblex31xbt0ajXx1F";
const url = `https://api.airtable.com/v0/${baseId}/${dataTable}`;

let pluginIndex: IndexedPlugin[] = [];
const searchCache = new Map<string, PluginInfo[]>();
let dbPlugins: PluginInfo[] = []; // DB의 플러그인 목록을 저장할 변수

// 초기 크기 설정
async function initializeSize() {
  const savedSize = await figma.clientStorage.getAsync('pluginSize') as PluginSize;
  if (savedSize) {
    figma.ui.resize(savedSize.width, savedSize.height);
  } else {
    figma.ui.resize(500, 600);
  }
}

// 데이터 압축
function compressData(data: any): CompressedData[] {
  if (!data) {
    console.log('No data to compress');
    return [];
  }
  const jsonString = JSON.stringify(data);
  if (jsonString.length === 0) {
    console.log('Empty data to compress');
    return [];
  }
  const compressed = pako.deflate(jsonString);
  const chunkSize = 950 * 1024; // ~950KB chunks
  const chunks: CompressedData[] = [];

  for (let i = 0; i < compressed.length; i += chunkSize) {
    chunks.push({
      part: chunks.length,
      data: compressed.slice(i, i + chunkSize)
    });
  }

  return chunks;
}

// 데이터 압축 해제
function decompressData(chunks: CompressedData[]): any {
  try {
    if (!chunks || chunks.length === 0) {
      console.log('No chunks to decompress');
      return null;
    }

    chunks.sort((a, b) => a.part - b.part);
    const fullData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.data.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      fullData.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    console.log('Full data length:', fullData.length);

    if (fullData.length === 0) {
      console.log('Empty data to decompress');
      return null;
    }

    let decompressed;
    try {
      decompressed = pako.inflate(fullData, { to: 'string' });
    } catch (inflateError) {
      console.error('Error inflating data:', inflateError);
      return null;
    }

    if (typeof decompressed !== 'string') {
      console.error('Decompressed data is not a string:', decompressed);
      return null;
    }

    const trimmedData = decompressed.trim();
    if (trimmedData === '') {
      console.log('Decompressed data is empty');
      return null;
    }
    
    return JSON.parse(trimmedData);
  } catch (error) {
    console.error('Error decompressing data:', error);
    return null;
  }
}

// 데이터 동기화 (수정됨)
async function syncData(): Promise<PluginInfo[]> {
  console.log('Syncing data...');
  let clientData: StoredData | null = null;
  let fileData: StoredData | null = null;

  try {
    const compressedClientData = await figma.clientStorage.getAsync('compressedData');
    if (compressedClientData && Array.isArray(compressedClientData) && compressedClientData.length > 0) {
      clientData = decompressData(compressedClientData) as StoredData;
    } else {
      console.log('No valid client data found');
    }
    console.log('Client data:', clientData);
  } catch (error) {
    console.log('Error fetching client data:', error);
  }

  try {
    const pluginData = figma.root.getPluginData('compressedData');
    if (pluginData && pluginData !== 'undefined' && pluginData !== '') {
      try {
        const compressedFileData = JSON.parse(pluginData);
        if (Array.isArray(compressedFileData) && compressedFileData.length > 0) {
          fileData = decompressData(compressedFileData) as StoredData;
        } else {
          console.log('Parsed plugin data is empty or not an array:', compressedFileData);
        }
      } catch (parseError) {
        console.error('Error parsing plugin data:', parseError);
      }
    } else {
      console.log('No valid plugin data found');
    }
    console.log('File data:', fileData);
  } catch (error) {
    console.log('Error parsing file data:', error);
  }

  let updatedData: StoredData;
  
  if (!clientData && !fileData) {
    console.log('No existing data found, initializing with default plugins');
    updatedData = { 
      plugins: defaultPlugins.map((p) => Object.assign({}, p, { hidden: false })), 
      lastUpdated: Date.now() 
    };
  } else if (!clientData) {
    updatedData = fileData || { plugins: [], lastUpdated: Date.now() };
  } else if (!fileData) {
    updatedData = clientData;
  } else {
    updatedData = clientData.lastUpdated > fileData.lastUpdated ? clientData : fileData;
  }

  // 기본 플러그인과 사용자 플러그인 병합
  updatedData.plugins = mergeWithDefaultPlugins(updatedData.plugins);

  console.log('Using data:', updatedData);

  // 압축하여 양쪽에 데이터 저장
  const compressedData = compressData(updatedData);
  if (compressedData.length > 0) {
    await figma.clientStorage.setAsync('compressedData', compressedData);
    figma.root.setPluginData('compressedData', JSON.stringify(compressedData));
  } else {
    console.log('No data to save');
  }
  
  console.log('Synced data:', updatedData);

  return updatedData.plugins.filter(function(plugin) { return !plugin.hidden; });  // hidden이 true인 플러그인 제외
}

// 기본 플러그인과 사용자 플러그인 병합
function mergeWithDefaultPlugins(userPlugins: PluginInfo[]): PluginInfo[] {
  const mergedPlugins = userPlugins.slice(); // 배열 복사
  defaultPlugins.forEach(function(defaultPlugin) {
    if (!mergedPlugins.some(function(plugin) { return plugin.id === defaultPlugin.id; })) {
      mergedPlugins.push(Object.assign({}, defaultPlugin, { isDefault: true, hidden: false }));
    }
  });
  return mergedPlugins;
}

// Airtable에서 모든 데이터 가져오기
async function fetchAllDataFromAirtable(): Promise<StoredData> {
  console.log('Fetching all data from Airtable...');
  let allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const requestUrl = `${url}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
    const response = await fetch(requestUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    allRecords = allRecords.concat(data.records);
    offset = data.offset;
  } while (offset);

  const plugins: PluginInfo[] = allRecords.map(record => ({
    id: record.fields['plugin-id'], // Airtable의 'plugin-id' 필드 사용
    pluginName: record.fields['plugin-name'],
    pluginDescription: record.fields['plugin-desc'],
    pluginUrl: record.fields['plugin-link'],
    pluginIcon: record.fields['plugin-icon'],
    categories: []
  }));

  return {
    plugins,
    lastUpdated: Date.now()
  };
}

// 데이터 저장
async function saveData(plugins: PluginInfo[]) {
  console.log('Saving data:', plugins);
  const updatedData: StoredData = {
    plugins: plugins,
    lastUpdated: Date.now()
  };

  const compressedData = compressData(updatedData);
  await figma.clientStorage.setAsync('compressedData', compressedData);
  figma.root.setPluginData('compressedData', JSON.stringify(compressedData));
  console.log('Data saved successfully');
}

// 플러그인 인덱스 초기화 (수정됨)
async function initializePluginIndex() {
  const storedData = await syncData();
  pluginIndex = storedData.map(plugin => ({
    id: plugin.id,
    pluginName: plugin.pluginName,
    pluginDescription: plugin.pluginDescription || '',
    pluginUrl: plugin.pluginUrl,
    pluginIcon: plugin.pluginIcon,
    categories: plugin.categories,
    searchTerms: `${plugin.pluginName} ${plugin.pluginDescription || ''} ${plugin.categories.join(' ')}`.toLowerCase()
  }));
}

// 로컬 데이터에서 플러그인 검색
async function searchPluginsLocally(query: string): Promise<PluginInfo[]> {
  console.log('Searching locally for:', query);
  const lowercaseQuery = query.toLowerCase();
  return pluginIndex.filter(plugin => 
    plugin.searchTerms.includes(lowercaseQuery)
  ).slice(0, 10).map(plugin => ({
    id: plugin.id,
    pluginName: plugin.pluginName,
    pluginDescription: plugin.pluginDescription,
    pluginUrl: plugin.pluginUrl,
    pluginIcon: plugin.pluginIcon,
    categories: plugin.categories
  }));
}

// Airtable에서 플러그인 검색 (백업 옵션)
async function searchPluginsInAirtable(query: string): Promise<AirtableRecord[]> {
  console.log('Searching Airtable for:', query);

  try {
    const formulaQuery = encodeURIComponent(`OR(SEARCH("${query.toLowerCase()}", LOWER({plugin-name})) != "", SEARCH("${query.toLowerCase()}", LOWER({plugin-desc})) != "")`);
    const requestUrl = `${url}?filterByFormula=${formulaQuery}&maxRecords=10`; // 최대 10개의 결과만 요청
    console.log('Request URL:', requestUrl);

    const response = await fetch(requestUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Airtable response:', data);

    return data.records;
  } catch (error) {
    console.error('Error searching Airtable:', error);
    throw error;
  }
}

async function getCachedOrFetchResults(query: string): Promise<PluginInfo[]> {
  console.log('Searching for query:', query);
  if (searchCache.has(query)) {
    console.log('Found in cache');
    return searchCache.get(query)!;
  }

  const results = await searchPluginsLocally(query);
  console.log('Local search results:', results);
  if (results.length > 0) {
    searchCache.set(query, results);
    return results;
  }

  console.log('No local results, searching Airtable');
  const airtableResults = await searchPluginsInAirtable(query);
  console.log('Airtable raw results:', airtableResults);
  
  // Airtable 결과를 PluginInfo 형식으로 변환
  const convertedResults = airtableResults.map(record => {
    console.log('Converting Airtable record:', record);
    return {
      id: record.fields['plugin-id'], // Airtable의 'plugin-id' 필드 사용
      pluginName: record.fields['plugin-name'] || 'Unknown Plugin',
      pluginDescription: record.fields['plugin-desc'] || '',
      pluginUrl: record.fields['plugin-link'] || '',
      pluginIcon: record.fields['plugin-icon'] || '',
      categories: []
    };
  });
  
  console.log('Converted Airtable results:', convertedResults);
  searchCache.set(query, convertedResults);
  return convertedResults;
}

// 플러그인 정보 추출 (URL에서)
function extractPluginInfo(url: string, category: string, description?: string, customName?: string): Omit<PluginInfo, 'categories'> | null {

  console.log('Extracting plugin info from URL:', url);
  
  // URL 정규화
  const normalizedUrl = url.trim().toLowerCase();
  console.log('Normalized URL:', normalizedUrl);

  // 다양한 URL 형식을 처리할 수 있는 정규 표현식
  const patterns = [
    /\/plugin\/(\d+)(?:\/([^/?]+))?/,
    /\/plugin\/(\d+)/
  ];

  let match = null;
  for (const pattern of patterns) {
    match = normalizedUrl.match(pattern);
    if (match) break;
  }

  if (!match) {
    console.error('Failed to match URL pattern');
    return null;
  }

  console.log('URL match:', match);

  const [, id, nameFromUrl] = match;
  let pluginName = customName || (nameFromUrl ? decodeURIComponent(nameFromUrl.replace(/-/g, ' ')) : '');

  // 이름이 URL에서 추출되지 않고 사용자 지정 이름도 없는 경우 처리
  if (!pluginName) {
    console.log('Name not found in URL and no custom name provided, using "Unknown Plugin"');
    pluginName = 'Unknown Plugin';
  }

  console.log('Extracted plugin info:', { id, pluginName, description });

  if (!id) {
    console.error('Failed to extract plugin ID');
    return null;
  }

  const pluginInfo: Omit<PluginInfo, 'categories'> = {
    id: id,
    pluginName: pluginName,
    pluginUrl: url,
    pluginIcon: `https://www.figma.com/community/plugin/${id}/icon`, // Airtable 플러그인용 외부 URL
  };

  if (description) {
    pluginInfo.pluginDescription = description;
  }

  return pluginInfo;
}


// 플러그인 초기화 함수
async function initializePlugin() {
  console.log('Initializing plugin...');
  
  // UI 표시
  figma.showUI(__html__, { width: 500, height: 600 });
  console.log('UI shown');

  // 데이터 동기화
  try {
    await syncData();
    console.log('Data synced');
  } catch (error) {
    console.error('Error syncing data:', error);
  }

  // 플러그인 인덱스 초기화
  await initializePluginIndex();
  console.log('Plugin index initialized');

  // Airtable에서 모든 플러그인 데이터 가져오기
  await fetchAndStoreAllPlugins();
  console.log('All plugins fetched and stored');

  // UI 크기 초기화
  await initializeSize();
  console.log('UI size initialized');
}



// 메인 실행 코드
initializePlugin().then(() => {
  console.log('Plugin initialization complete');
}).catch((error) => {
  console.error('Error during plugin initialization:', error);
});



figma.ui.onmessage = async (msg: { type: string; url?: string; name?: string; category?: string; description?: string; pluginId?: string; message?: string; width?: number; height?: number; query?: string; }) => {
  console.log('Received message:', msg);

  if (msg.type === 'resize') {
    const width = Math.max(400, Math.round(msg.width || 0));
    const height = Math.max(400, Math.round(msg.height || 0));

    console.log('Resizing to:', width, height);

    figma.ui.resize(width, height);
    await figma.clientStorage.setAsync('pluginSize', { width: width, height: height });
  } else if (msg.type === 'add-plugin') {
    try {
      if (!msg.url || !msg.category || !msg.name) {
        throw new Error('URL, name, and category are required');
      }
  
      console.log('Attempting to extract plugin info from URL:', msg.url);
      const pluginInfo = extractPluginInfo(msg.url, msg.category, msg.description, msg.name);
      if (!pluginInfo) {
        throw new Error('Failed to extract plugin information');
      }
      console.log('Successfully extracted plugin info:', pluginInfo);
  
      const storedPlugins = await syncData();
      const existingPluginIndex = storedPlugins.findIndex(function(p) { return p.id === pluginInfo.id; });
      
      if (existingPluginIndex !== -1) {
        console.log('Updating existing plugin:', storedPlugins[existingPluginIndex]);
        if (!storedPlugins[existingPluginIndex].categories) {
          storedPlugins[existingPluginIndex].categories = [];
        }
        if (storedPlugins[existingPluginIndex].categories.indexOf(msg.category) === -1) {
          storedPlugins[existingPluginIndex].categories.push(msg.category);
        }
        // Update name and description
        storedPlugins[existingPluginIndex].pluginName = msg.name;
        storedPlugins[existingPluginIndex].pluginDescription = msg.description || '';
      } else {
        console.log('Adding new plugin');
        const newPlugin: PluginInfo = {
          id: pluginInfo.id,
          pluginName: msg.name,
          pluginDescription: msg.description || '',
          pluginUrl: msg.url,
          pluginIcon: pluginInfo.pluginIcon,
          categories: [msg.category]
        };
        storedPlugins.push(newPlugin);
      }
  
      await saveData(storedPlugins);
  
      figma.notify('Plugin added successfully', { timeout: 2000 });
      figma.ui.postMessage({ type: 'plugin-added', plugin: pluginInfo });
    } catch (error) {
      console.error('Error adding plugin:', error);
      figma.notify('Error adding plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
    }
  } else if (msg.type === 'get-plugins') {
    try {
      const storedPlugins = await syncData();
      console.log('Retrieved plugins:', storedPlugins);
      const flattenedPlugins = storedPlugins.reduce(function(acc, plugin) {
        if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
          plugin.categories.forEach(function(category) {
            acc.push(Object.assign({}, plugin, { category: category }));
          });
        } else {
          console.warn('Invalid plugin data:', plugin);
        }
        return acc;
      }, [] as Array<PluginInfo & {category: string}>);
      figma.ui.postMessage({ type: 'plugins-list', plugins: flattenedPlugins });
    } catch (error) {
      console.error('Error fetching plugins:', error);
      figma.notify('Error fetching plugins: ' + (error instanceof Error ? error.message : 'Failed to fetch plugins'), { error: true });
    }
  } 
  else if (msg.type === 'open-plugin-page') {
    if (msg.url) {
      console.log('Opening plugin URL:', msg.url); // 디버깅 로그 추가
      figma.notify('Opening plugin page...');
      figma.openExternal(msg.url);
    } else {
      console.error('No URL provided for opening plugin page');
      figma.notify('Error: No URL provided', { error: true });
    }
  }
  
  
  else if (msg.type === 'delete-plugin') {
    try {
      if (!msg.pluginId || !msg.category) {
        throw new Error('Plugin ID and category are required for deletion');
      }

      let storedPlugins = await syncData();
      console.log('Before deletion:', storedPlugins);

      storedPlugins = storedPlugins.map(plugin => {
        if (plugin.id === msg.pluginId) {
          if (plugin.isDefault) {
            // 기본 플러그인은 삭제하지 않고 숨김 처리
            plugin.hidden = true;
          } else {
            plugin.categories = plugin.categories.filter(cat => cat !== msg.category);
          }
        }
        return plugin;
      }).filter(plugin => !plugin.isDefault || (plugin.isDefault && !plugin.hidden));

      console.log('After deletion:', storedPlugins);

      await saveData(storedPlugins);
      figma.notify('Plugin deleted successfully', { timeout: 2000 });

      const flattenedPlugins = storedPlugins.reduce(function(acc, plugin) {
        if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
          plugin.categories.forEach(function(category) {
            acc.push(Object.assign({}, plugin, { category: category }));
          });
        } else {
          console.warn('Invalid plugin data:', plugin);
        }
        return acc;
      }, [] as Array<PluginInfo & {category: string}>);
      figma.ui.postMessage({ type: 'plugins-list', plugins: flattenedPlugins });
    } catch (error) {
      console.error('Error deleting plugin:', error);
      figma.notify('Error deleting plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
    }
  } else if (msg.type === 'notify') {
    figma.notify(msg.message || '', { timeout: 2000 });
  } else if (msg.type === 'search-plugins') {
    try {
      console.log('Received search request:', msg.query);
      if (!msg.query) {
        throw new Error('Search query is required');
      }
  
      const searchResults = await getCachedOrFetchResults(msg.query);
      console.log('Search results to be sent to UI:', searchResults);
      
      figma.ui.postMessage({ 
        type: 'search-results', 
        results: searchResults.map(plugin => ({
          pluginName: plugin.pluginName,
          pluginDescription: plugin.pluginDescription,
          pluginIcon: plugin.pluginIcon,
          id: plugin.id,
          pluginUrl: plugin.pluginUrl,
          categories: plugin.categories
        }))
      });
    } catch (error) {
      console.error('Error searching plugins:', error);
      figma.notify('Error searching plugins: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
      figma.ui.postMessage({ type: 'search-error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
  }
};

// 플러그인 시작 시 초기 데이터 동기화
syncData().then(() => {
  console.log('Initial data sync complete');
}).catch((error) => {
  console.error('Error during initial data sync:', error);
});

// Airtable에서 모든 데이터 가져와서 저장하는 함수
async function fetchAndStoreAllPlugins() {
  try {
    const data = await fetchAllDataFromAirtable();
    dbPlugins = data.plugins;
    console.log('All plugins fetched and stored:', dbPlugins.length);
  } catch (error) {
    console.error('Error fetching all plugins:', error);
  }
}

// 플러그인 시작 시 모든 플러그인 데이터 가져오기
fetchAndStoreAllPlugins();