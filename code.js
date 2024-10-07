/// <reference types="@figma/plugin-typings" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import pako from 'pako';
import IconifyIcon from './assets/iconify.png';
import MaterialIcon from './assets/material.png';
import FeatherIcon from './assets/feather.png';
import PixabayIcon from './assets/pixbay.png';
import PexelIcon from './assets/pexel.png';
import UnsplashIcon from './assets/unsplash.jpeg';
import AutoflowIcon from './assets/autoflow.png';
import removebgIcon from './assets/removeBG.png';
import loremIcon from './assets/loremInpsum.png';
import mockupIcon from './assets/mockup.png';
import artboardIcon from './assets/artboard.png';
import clayIcon from './assets/clayMockup.png';
// 하드코딩된 기본 플러그인 데이터
const defaultCategories = ["Icon", "Image", "Utility", "Mockup"];
const defaultPlugins = [
    // 기본 플러그인 목록
    {
        id: "735098390272716381",
        pluginName: "Iconify",
        pluginDescription: "Iconify brings a huge selection of icons to Figma.",
        pluginUrl: "https://www.figma.com/community/plugin/735098390272716381/iconify",
        pluginIcon: IconifyIcon,
        categories: ["Icon"]
    },
    {
        id: "843461159747178978",
        pluginName: "Feather Icon",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/843461159747178978/Figma-Tokens",
        pluginIcon: FeatherIcon,
        categories: ["Icon"]
    },
    {
        id: "740272380439725040",
        pluginName: "Material Design Icon",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/740272380439725040/material-design-icons",
        pluginIcon: MaterialIcon,
        categories: ["Icon"]
    },
    {
        id: "738454987945972471",
        pluginName: "Unsplash",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/738454987945972471/unsplash",
        pluginIcon: UnsplashIcon,
        categories: ["Image"]
    },
    {
        id: "1204029601871812061",
        pluginName: "Pixabay",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/1204029601871812061/pixabay",
        pluginIcon: PixabayIcon,
        categories: ["Image"]
    },
    {
        id: "829802086526281657",
        pluginName: "Pexel",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/829802086526281657/pexels",
        pluginIcon: PexelIcon,
        categories: ["Image"]
    },
    {
        id: "733902567457592893",
        pluginName: "Autoflow",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/733902567457592893/autoflow",
        pluginIcon: AutoflowIcon,
        categories: ["Utility"]
    },
    {
        id: "738992712906748191",
        pluginName: "Remove BG",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/738992712906748191/remove-bg",
        pluginIcon: removebgIcon,
        categories: ["Utility"]
    },
    {
        id: "736000994034548392",
        pluginName: "Lorem ipsum",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/736000994034548392/lorem-ipsum",
        pluginIcon: loremIcon,
        categories: ["Utility"]
    },
    {
        id: "817043359134136295",
        pluginName: "Mockup Plugin",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/817043359134136295/mockup-plugin-devices-mockups-print-mockups-ai-mockups",
        pluginIcon: mockupIcon,
        categories: ["Mockup"]
    },
    {
        id: "750673765607708804",
        pluginName: "Artboard Mockup",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/750673765607708804/artboard-mockups",
        pluginIcon: artboardIcon,
        categories: ["Mockup"]
    },
    {
        id: "819335598581469537",
        pluginName: "Clay Mockup",
        pluginDescription: "MRP Recommand Plugins",
        pluginUrl: "https://www.figma.com/community/plugin/819335598581469537/clay-mockups-3d",
        pluginIcon: clayIcon,
        categories: ["Mockup"]
    },
];
console.log('Default plugins:', defaultPlugins);
// Airtable API 관련 상수
const accessToken = "YOUR_AIRTABLE_ACCESS_TOKEN"; // 실제 토큰은 코드에 포함하지 마세요.
const baseId = "appoQJ18zMmkhzu10";
const dataTable = "tblex31xbt0ajXx1F";
const url = `https://api.airtable.com/v0/${baseId}/${dataTable}`;
// LRU 캐시 클래스 구현
class LRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }
    get(key) {
        if (!this.cache.has(key))
            return undefined;
        const value = this.cache.get(key);
        // 최근에 사용된 항목을 맨 앞으로 이동
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    set(key, value) {
        // 이미 존재하는 키는 삭제하고 다시 삽입하여 순서를 갱신
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            // 캐시가 가득 찬 경우, 가장 오래된 항목 제거
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, value);
    }
}
let airtablePlugins = []; // Airtable에서 가져온 플러그인 목록
const MAX_CACHE_SIZE = 100; // 캐시의 최대 크기를 설정합니다.
const searchCache = new LRUCache(MAX_CACHE_SIZE);
let myPluginList = []; // 사용자의 My Plugin List
// 데이터 압축
function compressData(data) {
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
    const chunks = [];
    for (let i = 0; i < compressed.length; i += chunkSize) {
        chunks.push({
            part: chunks.length,
            data: compressed.slice(i, i + chunkSize)
        });
    }
    return chunks;
}
// 데이터 압축 해제
function decompressData(chunks) {
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
        }
        catch (inflateError) {
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
    }
    catch (error) {
        console.error('Error decompressing data:', error);
        return null;
    }
}
// My Plugin List 동기화
function syncMyPluginList() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Syncing My Plugin List...');
        let clientData = null;
        let fileData = null;
        try {
            const compressedClientData = yield figma.clientStorage.getAsync('compressedData');
            if (compressedClientData && Array.isArray(compressedClientData) && compressedClientData.length > 0) {
                clientData = decompressData(compressedClientData);
            }
            else {
                console.log('No valid client data found');
            }
            console.log('Client data:', clientData);
        }
        catch (error) {
            console.log('Error fetching client data:', error);
        }
        try {
            const pluginData = figma.root.getPluginData('compressedData');
            if (pluginData && pluginData !== 'undefined' && pluginData !== '') {
                try {
                    const compressedFileData = JSON.parse(pluginData);
                    if (Array.isArray(compressedFileData) && compressedFileData.length > 0) {
                        fileData = decompressData(compressedFileData);
                    }
                    else {
                        console.log('Parsed plugin data is empty or not an array:', compressedFileData);
                    }
                }
                catch (parseError) {
                    console.error('Error parsing plugin data:', parseError);
                }
            }
            else {
                console.log('No valid plugin data found');
            }
            console.log('File data:', fileData);
        }
        catch (error) {
            console.log('Error parsing file data:', error);
        }
        let updatedData;
        if (!clientData && !fileData) {
            console.log('No existing data found, initializing with empty plugin list');
            updatedData = {
                plugins: [], // 빈 배열로 초기화
                lastUpdated: Date.now()
            };
        }
        else if (!clientData) {
            updatedData = fileData || { plugins: [], lastUpdated: Date.now() };
        }
        else if (!fileData) {
            updatedData = clientData;
        }
        else {
            updatedData = clientData.lastUpdated > fileData.lastUpdated ? clientData : fileData;
        }
        console.log('Using data:', updatedData);
        // 압축하여 양쪽에 데이터 저장
        const compressedData = compressData(updatedData);
        if (compressedData.length > 0) {
            yield figma.clientStorage.setAsync('compressedData', compressedData);
            figma.root.setPluginData('compressedData', JSON.stringify(compressedData));
        }
        else {
            console.log('No data to save');
        }
        console.log('Synced My Plugin List:', updatedData);
        myPluginList = updatedData.plugins.filter(function (plugin) { return !plugin.hidden; }); // hidden이 true인 플러그인 제외
        return myPluginList;
    });
}
// 데이터 저장
function saveMyPluginList(plugins) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Saving My Plugin List:', plugins);
        const updatedData = {
            plugins: plugins,
            lastUpdated: Date.now()
        };
        const compressedData = compressData(updatedData);
        yield figma.clientStorage.setAsync('compressedData', compressedData);
        figma.root.setPluginData('compressedData', JSON.stringify(compressedData));
        console.log('My Plugin List saved successfully');
    });
}
// Airtable에서 모든 데이터 가져오기
function fetchAllDataFromAirtable() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Fetching all data from Airtable...');
        let allRecords = [];
        let offset;
        do {
            const requestUrl = `${url}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
            const response = yield fetch(requestUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = yield response.json();
            allRecords = allRecords.concat(data.records);
            offset = data.offset;
        } while (offset);
        airtablePlugins = allRecords.map(record => ({
            id: record.fields['plugin-id'],
            pluginName: record.fields['plugin-name'],
            pluginDescription: record.fields['plugin-desc'] || '',
            pluginUrl: record.fields['plugin-link'],
            pluginIcon: record.fields['plugin-icon'],
            categories: []
        }));
        console.log('Fetched Airtable plugins:', airtablePlugins.length);
    });
}
// 검색 함수 (Airtable 데이터 사용)
function searchPlugins(query) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Searching for query:', query);
        // 캐시에서 검색
        const cachedResults = searchCache.get(query);
        if (cachedResults) {
            console.log('Found in cache');
            return cachedResults;
        }
        // Airtable 데이터에서 검색
        const lowercaseQuery = query.toLowerCase();
        const results = airtablePlugins.filter(plugin => `${plugin.pluginName} ${plugin.pluginDescription}`.toLowerCase().includes(lowercaseQuery)).slice(0, 10);
        console.log('Search results:', results);
        searchCache.set(query, results);
        return results;
    });
}
// 플러그인 정보 추출 (URL에서)
function extractPluginInfo(url, category, description, customName) {
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
        if (match)
            break;
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
    const pluginInfo = {
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
function initializePlugin() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Initializing plugin...');
        // 저장된 크기를 불러오기
        const savedSize = yield figma.clientStorage.getAsync('pluginSize');
        const initialWidth = savedSize ? savedSize.width : 500;
        const initialHeight = savedSize ? savedSize.height : 600;
        // UI 표시 (resizable 옵션 추가)
        figma.showUI(__html__, { width: initialWidth, height: initialHeight, resizable: true });
        console.log('UI shown');
        // My Plugin List 동기화
        try {
            yield syncMyPluginList();
            console.log('My Plugin List synced');
        }
        catch (error) {
            console.error('Error syncing My Plugin List:', error);
        }
        // Airtable에서 모든 플러그인 데이터 가져오기
        try {
            yield fetchAllDataFromAirtable();
            console.log('Airtable plugins fetched');
        }
        catch (error) {
            console.error('Error fetching Airtable plugins:', error);
        }
    });
}
// 메인 실행 코드
initializePlugin().then(() => {
    console.log('Plugin initialization complete');
}).catch((error) => {
    console.error('Error during plugin initialization:', error);
});
// figma.ui.onmessage 핸들러
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Received message:', msg);
    if (msg.type === 'resize') {
        const minWidth = 500; // 최소 너비 설정
        const minHeight = 600; // 최소 높이 설정
        const width = Math.max(minWidth, Math.round(msg.width || 0));
        const height = Math.max(minHeight, Math.round(msg.height || 0));
        console.log('Resizing to:', width, height);
        figma.ui.resize(width, height);
        yield figma.clientStorage.setAsync('pluginSize', { width: width, height: height });
    }
    else if (msg.type === 'add-plugin') {
        // 기존 코드 유지
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
            const existingPluginIndex = myPluginList.findIndex(function (p) { return p.id === pluginInfo.id; });
            if (existingPluginIndex !== -1) {
                console.log('Updating existing plugin:', myPluginList[existingPluginIndex]);
                if (!myPluginList[existingPluginIndex].categories) {
                    myPluginList[existingPluginIndex].categories = [];
                }
                if (myPluginList[existingPluginIndex].categories.indexOf(msg.category) === -1) {
                    myPluginList[existingPluginIndex].categories.push(msg.category);
                }
                // Update name and description
                myPluginList[existingPluginIndex].pluginName = msg.name;
                myPluginList[existingPluginIndex].pluginDescription = msg.description || '';
            }
            else {
                console.log('Adding new plugin');
                const newPlugin = {
                    id: pluginInfo.id,
                    pluginName: msg.name,
                    pluginDescription: msg.description || '',
                    pluginUrl: msg.url,
                    pluginIcon: pluginInfo.pluginIcon,
                    categories: [msg.category]
                };
                myPluginList.push(newPlugin);
            }
            yield saveMyPluginList(myPluginList);
            figma.notify('Plugin added successfully', { timeout: 2000 });
            figma.ui.postMessage({ type: 'plugin-added', plugin: pluginInfo });
        }
        catch (error) {
            console.error('Error adding plugin:', error);
            figma.notify('Error adding plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
        }
    }
    else if (msg.type === 'get-plugins') {
        try {
            yield syncMyPluginList();
            console.log('Retrieved My Plugin List:', myPluginList);
            const flattenedPlugins = myPluginList.reduce(function (acc, plugin) {
                if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
                    plugin.categories.forEach(function (category) {
                        acc.push(Object.assign({}, plugin, { category: category }));
                    });
                }
                else {
                    console.warn('Invalid plugin data:', plugin);
                }
                return acc;
            }, []);
            figma.ui.postMessage({ type: 'plugins-list', plugins: flattenedPlugins });
        }
        catch (error) {
            console.error('Error fetching plugins:', error);
            figma.notify('Error fetching plugins: ' + (error instanceof Error ? error.message : 'Failed to fetch plugins'), { error: true });
        }
    }
    else if (msg.type === 'open-plugin-page') {
        if (msg.url) {
            console.log('Opening plugin URL:', msg.url);
            figma.notify('Opening plugin page...');
            figma.openExternal(msg.url);
        }
        else {
            console.error('No URL provided for opening plugin page');
            figma.notify('Error: No URL provided', { error: true });
        }
    }
    else if (msg.type === 'delete-plugin') {
        try {
            if (!msg.pluginId || !msg.category) {
                throw new Error('Plugin ID and category are required for deletion');
            }
            console.log('Before deletion:', myPluginList);
            myPluginList = myPluginList.map(plugin => {
                if (plugin.id === msg.pluginId) {
                    plugin.categories = plugin.categories.filter(cat => cat !== msg.category);
                    // 카테고리가 모두 삭제되면 플러그인을 제거
                    if (plugin.categories.length === 0) {
                        return null;
                    }
                }
                return plugin;
            }).filter(plugin => plugin !== null);
            console.log('After deletion:', myPluginList);
            yield saveMyPluginList(myPluginList);
            figma.notify('Plugin deleted successfully', { timeout: 2000 });
            const flattenedPlugins = myPluginList.reduce(function (acc, plugin) {
                if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
                    plugin.categories.forEach(function (category) {
                        acc.push(Object.assign({}, plugin, { category: category }));
                    });
                }
                else {
                    console.warn('Invalid plugin data:', plugin);
                }
                return acc;
            }, []);
            figma.ui.postMessage({ type: 'plugins-list', plugins: flattenedPlugins });
        }
        catch (error) {
            console.error('Error deleting plugin:', error);
            figma.notify('Error deleting plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
        }
    }
    else if (msg.type === 'notify') {
        figma.notify(msg.message || '', { timeout: 2000 });
    }
    else if (msg.type === 'search-plugins') {
        try {
            console.log('Received search request:', msg.query);
            if (!msg.query) {
                throw new Error('Search query is required');
            }
            const searchResults = yield searchPlugins(msg.query);
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
        }
        catch (error) {
            console.error('Error searching plugins:', error);
            figma.notify('Error searching plugins: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
            figma.ui.postMessage({ type: 'search-error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
        }
    }
    else if (msg.type === 'add-plugin-from-search') {
        try {
            if (!msg.plugin) {
                throw new Error('Plugin data is required');
            }
            // 모달을 표시하여 카테고리 선택 (UI 측에서 처리)
            figma.ui.postMessage({ type: 'show-category-modal', plugin: msg.plugin });
        }
        catch (error) {
            console.error('Error adding plugin from search:', error);
            figma.notify('Error adding plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
        }
    }
    else if (msg.type === 'confirm-add-plugin') {
        try {
            const plugin = msg.plugin;
            if (!plugin || !msg.category) {
                throw new Error('Plugin data and category are required');
            }
            const existingPluginIndex = myPluginList.findIndex(function (p) { return p.id === plugin.id; });
            if (existingPluginIndex !== -1) {
                console.log('Updating existing plugin:', myPluginList[existingPluginIndex]);
                if (!myPluginList[existingPluginIndex].categories) {
                    myPluginList[existingPluginIndex].categories = [];
                }
                if (myPluginList[existingPluginIndex].categories.indexOf(msg.category) === -1) {
                    myPluginList[existingPluginIndex].categories.push(msg.category);
                }
            }
            else {
                console.log('Adding new plugin');
                const newPlugin = {
                    id: plugin.id,
                    pluginName: plugin.pluginName,
                    pluginDescription: plugin.pluginDescription || '',
                    pluginUrl: plugin.pluginUrl,
                    pluginIcon: plugin.pluginIcon,
                    categories: [msg.category]
                };
                myPluginList.push(newPlugin);
            }
            yield saveMyPluginList(myPluginList);
            figma.notify('Plugin added successfully', { timeout: 2000 });
            figma.ui.postMessage({ type: 'plugin-added', plugin: plugin });
        }
        catch (error) {
            console.error('Error confirming plugin addition:', error);
            figma.notify('Error adding plugin: ' + (error instanceof Error ? error.message : 'An unknown error occurred'), { error: true });
        }
    }
    else if (msg.type === 'get-default-plugins') {
        console.log('Received get-default-plugins request');
        figma.ui.postMessage({ type: 'default-plugins', plugins: defaultPlugins });
    }
});
//# sourceMappingURL=code.js.map