/// <reference types="@figma/plugin-typings" />

import pako from "pako";

// 아이콘 파일들 임포트 (필요에 따라 실제 파일 경로로 수정)
import IconifyIcon from "./assets/iconify.png";
import MaterialIcon from "./assets/material.png";
import FeatherIcon from "./assets/feather.png";
import PixabayIcon from "./assets/pixbay.png";
import PexelIcon from "./assets/pexel.png";
import UnsplashIcon from "./assets/unsplash.jpeg";
import AutoflowIcon from "./assets/autoflow.png";
import removebgIcon from "./assets/removeBG.png";
import loremIcon from "./assets/loremInpsum.png";
import mockupIcon from "./assets/mockup.png";
import artboardIcon from "./assets/artboard.png";
import clayIcon from "./assets/clayMockup.png";

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
    "plugin-name": string;
    "plugin-desc"?: string;
    "plugin-link": string;
    "plugin-icon": string;
  };
}

interface CompressedData {
  part: number;
  data: Uint8Array;
}

// 하드코딩된 기본 플러그인 데이터
const defaultCategories = ["Icon", "Image", "Utility", "Mockup"];

const defaultPlugins: PluginInfo[] = [
  // 기본 플러그인 목록
  {
    id: "735098390272716381",
    pluginName: "Iconify",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/735098390272716381/iconify",
    pluginIcon: IconifyIcon,
    categories: ["Icon"],
  },
  {
    id: "843461159747178978",
    pluginName: "Feather Icon",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/843461159747178978/Figma-Tokens",
    pluginIcon: FeatherIcon,
    categories: ["Icon"],
  },
  {
    id: "740272380439725040",
    pluginName: "Material Design Icon",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/740272380439725040/material-design-icons",
    pluginIcon: MaterialIcon,
    categories: ["Icon"],
  },
  {
    id: "738454987945972471",
    pluginName: "Unsplash",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/738454987945972471/unsplash",
    pluginIcon: UnsplashIcon,
    categories: ["Image"],
  },
  {
    id: "1204029601871812061",
    pluginName: "Pixabay",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/1204029601871812061/pixabay",
    pluginIcon: PixabayIcon,
    categories: ["Image"],
  },
  {
    id: "829802086526281657",
    pluginName: "Pexel",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/829802086526281657/pexels",
    pluginIcon: PexelIcon,
    categories: ["Image"],
  },
  {
    id: "733902567457592893",
    pluginName: "Autoflow",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/733902567457592893/autoflow",
    pluginIcon: AutoflowIcon,
    categories: ["Utility"],
  },
  {
    id: "738992712906748191",
    pluginName: "Remove BG",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/738992712906748191/remove-bg",
    pluginIcon: removebgIcon,
    categories: ["Utility"],
  },
  {
    id: "736000994034548392",
    pluginName: "Lorem ipsum",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/736000994034548392/lorem-ipsum",
    pluginIcon: loremIcon,
    categories: ["Utility"],
  },
  {
    id: "817043359134136295",
    pluginName: "Mockup Plugin",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/817043359134136295/mockup-plugin-devices-mockups-print-mockups-ai-mockups",
    pluginIcon: mockupIcon,
    categories: ["Mockup"],
  },
  {
    id: "750673765607708804",
    pluginName: "Artboard Mockup",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/750673765607708804/artboard-mockups",
    pluginIcon: artboardIcon,
    categories: ["Mockup"],
  },
  {
    id: "819335598581469537",
    pluginName: "Clay Mockup",
    pluginDescription: "MRP Recommend Plugins",
    pluginUrl:
      "https://www.figma.com/community/plugin/819335598581469537/clay-mockups-3d",
    pluginIcon: clayIcon,
    categories: ["Mockup"],
  },
];
console.log("Default plugins:", defaultPlugins);

// Airtable API 관련 상수
const accessToken =
  "patGgL1ObwK1rvVRH.bde07c08dc54fd2fd72bca8aced68fd2882e81924e5565a4641dea170b4933af";
const baseId = "appoQJ18zMmkhzu10";
const dataTable = "tblex31xbt0ajXx1F";
const url = `https://api.airtable.com/v0/${baseId}/${dataTable}`;

// LRU 캐시 클래스 구현
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // 최근에 사용된 항목을 맨 앞으로 이동
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // 이미 존재하는 키는 삭제하고 다시 삽입하여 순서를 갱신
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 캐시가 가득 찬 경우, 가장 오래된 항목 제거
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        // undefined 체크 추가
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }
}

let airtablePlugins: PluginInfo[] = []; // Airtable에서 가져온 플러그인 목록
const MAX_CACHE_SIZE = 100; // 캐시의 최대 크기를 설정합니다.
const searchCache = new LRUCache<string, PluginInfo[]>(MAX_CACHE_SIZE);

let myPluginList: PluginInfo[] = []; // 사용자의 My Plugin List

let searchReady = false; // 검색 가능 여부 상태 변수

// 검색 기능 상태를 UI에 전달하는 함수
function updateSearchReadyState(state: boolean) {
  searchReady = state;
  figma.ui.postMessage({ type: "search-ready", ready: state });
}

// 데이터 압축
function compressData(data: any): CompressedData[] {
  if (!data) {
    console.log("No data to compress");
    return [];
  }
  const jsonString = JSON.stringify(data);
  if (jsonString.length === 0) {
    console.log("Empty data to compress");
    return [];
  }
  const compressed = pako.deflate(jsonString);
  const chunkSize = 950 * 1024; // ~950KB chunks
  const chunks: CompressedData[] = [];

  for (let i = 0; i < compressed.length; i += chunkSize) {
    chunks.push({
      part: chunks.length,
      data: compressed.slice(i, i + chunkSize),
    });
  }

  console.log(`Data compressed into ${chunks.length} chunks`);
  return chunks;
}

// 데이터 압축 해제
function decompressData(chunks: CompressedData[]): any {
  try {
    if (!chunks || chunks.length === 0) {
      console.log("No chunks to decompress");
      return null;
    }

    chunks.sort((a, b) => a.part - b.part);
    const totalLength = chunks.reduce(
      (acc, chunk) => acc + chunk.data.length,
      0
    );
    const fullData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      fullData.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    console.log("Full data length after concatenation:", fullData.length);

    if (fullData.length === 0) {
      console.log("Empty data to decompress");
      return null;
    }

    let decompressed: string;
    try {
      decompressed = pako.inflate(fullData, { to: "string" });
      console.log("Data decompressed successfully");
    } catch (inflateError) {
      console.error("Error inflating data:", inflateError);
      return null;
    }

    if (typeof decompressed !== "string") {
      console.error("Decompressed data is not a string:", decompressed);
      return null;
    }

    const trimmedData = decompressed.trim();
    if (trimmedData === "") {
      console.log("Decompressed data is empty");
      return null;
    }

    console.log("Parsed decompressed data:", trimmedData);
    return JSON.parse(trimmedData);
  } catch (error) {
    console.error("Error decompressing data:", error);
    return null;
  }
}

// 플러그인 링크에서 플러그인 ID 추출 함수
function extractPluginIdFromUrl(url: string): string | null {
  const regex = /\/plugin\/(\d+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// 에러 발생 시 재시도 로직
async function fetchWithRetry(
  url: string,
  options: any,
  retries: number = 3,
  backoff: number = 300
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed: ${error}`);
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, backoff * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}

// My Plugin List 동기화
async function syncMyPluginList(): Promise<PluginInfo[]> {
  console.log("Syncing My Plugin List...");
  let clientData: StoredData | null = null;
  let fileData: StoredData | null = null;

  // clientStorage에서 데이터 가져오기
  try {
    const compressedClientData = await figma.clientStorage.getAsync(
      "compressedData"
    );
    console.log("Fetched compressed client data:", compressedClientData);
    if (
      compressedClientData &&
      Array.isArray(compressedClientData) &&
      compressedClientData.length > 0
    ) {
      clientData = decompressData(compressedClientData) as StoredData;
      console.log("Client data loaded:", clientData);
    } else {
      console.log("No valid client data found");
    }
  } catch (error) {
    console.log("Error fetching client data:", error);
  }

  // pluginData에서 데이터 가져오기
  try {
    const pluginData = figma.root.getPluginData("compressedData");
    console.log("Fetched plugin data:", pluginData);
    if (pluginData && pluginData !== "undefined" && pluginData !== "") {
      try {
        const compressedFileData = JSON.parse(pluginData);
        console.log("Parsed compressed file data:", compressedFileData);
        if (
          Array.isArray(compressedFileData) &&
          compressedFileData.length > 0
        ) {
          fileData = decompressData(compressedFileData) as StoredData;
          console.log("File data loaded:", fileData);
        } else {
          console.log(
            "Parsed plugin data is empty or not an array:",
            compressedFileData
          );
        }
      } catch (parseError) {
        console.error("Error parsing plugin data:", parseError);
      }
    } else {
      console.log("No valid plugin data found");
    }
  } catch (error) {
    console.log("Error fetching plugin data:", error);
  }

  let updatedData: StoredData;

  if (!clientData && !fileData) {
    console.log("No existing data found, initializing with empty plugin list");
    updatedData = {
      plugins: [], // 빈 배열로 초기화
      lastUpdated: Date.now(),
    };
  } else if (!clientData) {
    updatedData = fileData || { plugins: [], lastUpdated: Date.now() };
  } else if (!fileData) {
    updatedData = clientData;
  } else {
    updatedData =
      clientData.lastUpdated > fileData.lastUpdated ? clientData : fileData;
  }

  console.log("Using data for My Plugin List:", updatedData);

  // Compress and save to both clientStorage and pluginData
  const compressedData = compressData(updatedData);
  if (compressedData.length > 0) {
    await figma.clientStorage.setAsync("compressedData", compressedData);
    figma.root.setPluginData("compressedData", JSON.stringify(compressedData));
    console.log("Compressed data saved successfully");
  } else {
    console.log("No data to save");
  }

  // Update myPluginList
  myPluginList = updatedData.plugins.filter((plugin) => !plugin.hidden);
  console.log("Final My Plugin List:", myPluginList);
  return myPluginList;
}

// 데이터 저장
async function saveMyPluginList(plugins: PluginInfo[]) {
  console.log("Saving My Plugin List:", plugins);
  const updatedData: StoredData = {
    plugins: plugins,
    lastUpdated: Date.now(),
  };

  const compressedData = compressData(updatedData);
  if (compressedData.length > 0) {
    await figma.clientStorage.setAsync("compressedData", compressedData);
    figma.root.setPluginData("compressedData", JSON.stringify(compressedData));
    console.log("My Plugin List saved successfully");
  } else {
    console.log("No data to save");
  }
}

// Airtable에서 모든 데이터 가져오기 (최적화된 버전)
async function fetchAllDataFromAirtable(
  maxRecords: number = 2000
): Promise<void> {
  console.log("Fetching all data from Airtable...");

  // 데이터 fetching 시작 시 UI에 로딩 상태 메시지 전송
  figma.ui.postMessage({ type: "fetch-start" });

  // 검색 기능 비활성화 상태로 업데이트
  updateSearchReadyState(false);

  let allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  let recordsFetched = 0;

  // 필요한 필드만 요청하여 데이터 양을 줄임
  const fields = ["plugin-name", "plugin-desc", "plugin-link", "plugin-icon"];
  const fieldsParam = fields
    .map((field) => `fields[]=${encodeURIComponent(field)}`)
    .join("&");

  try {
    do {
      // 첫 번째 요청에만 maxRecords를 포함
      const maxRecordsParam = !offset ? `&maxRecords=${maxRecords}` : "";
      const requestUrl = `${url}?pageSize=100${
        offset ? `&offset=${offset}` : ""
      }&${fieldsParam}${maxRecordsParam}`;
      console.log(`Fetching URL: ${requestUrl}`);

      const data = await fetchWithRetry(requestUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`Fetched ${data.records.length} records from Airtable`);
      allRecords = allRecords.concat(data.records);
      recordsFetched += data.records.length;

      // 업데이트된 offset 가져오기
      offset = data.offset;

      // 최대 레코드 수에 도달했는지 확인
      if (recordsFetched >= maxRecords) {
        console.log("Reached maximum record limit.");
        break;
      }

      // UI에 진행 상황 업데이트
      figma.ui.postMessage({
        type: "fetch-progress",
        fetched: recordsFetched,
        total: maxRecords,
      });
    } while (offset && recordsFetched < maxRecords);

    airtablePlugins = allRecords.map((record) => ({
      id: extractPluginIdFromUrl(record.fields["plugin-link"]) || record.id, // plugin-link에서 ID 추출 또는 fallback
      pluginName: record.fields["plugin-name"],
      pluginDescription: record.fields["plugin-desc"] || "",
      pluginUrl: record.fields["plugin-link"],
      pluginIcon: record.fields["plugin-icon"],
      categories: [], // Airtable에 'plugin-category' 필드가 없으므로 빈 배열로 초기화
    }));

    console.log("Fetched Airtable plugins:", airtablePlugins.length);
    console.log("Airtable Plugins:", airtablePlugins);

    // UI에 fetch 완료 메시지 전송
    figma.ui.postMessage({ type: "fetch-complete" });

    // 검색 기능 활성화 상태로 업데이트
    updateSearchReadyState(true);
  } catch (error) {
    console.error("Error fetching Airtable data:", error);
    airtablePlugins = []; // 실패 시 빈 배열로 설정
    figma.ui.postMessage({
      type: "fetch-error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // 검색 기능 비활성화 상태 유지
    updateSearchReadyState(false);
  }
}

// 검색 함수 (Airtable 데이터 사용)
async function searchPlugins(query: string): Promise<PluginInfo[]> {
  console.log("Searching for query:", query);

  // 캐시에서 검색
  const cachedResults = searchCache.get(query);
  if (cachedResults) {
    console.log("Found in cache");
    return cachedResults;
  }

  // Airtable 데이터에서 검색
  const lowercaseQuery = query.toLowerCase();
  console.log("Lowercase query:", lowercaseQuery);

  const results = airtablePlugins
    .filter(
      (plugin) =>
        `${plugin.pluginName} ${plugin.pluginDescription}`
          .toLowerCase()
          .includes(lowercaseQuery) &&
        !myPluginList.some((myPlugin) => myPlugin.id === plugin.id) // 이미 추가된 플러그인 제외
    )
    .slice(0, 10);

  console.log("Search results:", results);
  searchCache.set(query, results);
  return results;
}

// 플러그인 정보 추출 (URL에서)
function extractPluginInfo(
  url: string,
  category: string,
  description?: string,
  customName?: string
): Omit<PluginInfo, "categories"> | null {
  console.log("Extracting plugin info from URL:", url);

  // URL 정규화
  const normalizedUrl = url.trim().toLowerCase();
  console.log("Normalized URL:", normalizedUrl);

  // 다양한 URL 형식을 처리할 수 있는 정규 표현식
  const patterns = [/\/plugin\/(\d+)(?:\/([^/?]+))?/, /\/plugin\/(\d+)/];

  let match = null;
  for (const pattern of patterns) {
    match = normalizedUrl.match(pattern);
    if (match) break;
  }

  if (!match) {
    console.error("Failed to match URL pattern");
    return null;
  }

  console.log("URL match:", match);

  const [, id, nameFromUrl] = match;
  let pluginName =
    customName ||
    (nameFromUrl ? decodeURIComponent(nameFromUrl.replace(/-/g, " ")) : "");

  // 이름이 URL에서 추출되지 않고 사용자 지정 이름도 없는 경우 처리
  if (!pluginName) {
    console.log(
      'Name not found in URL and no custom name provided, using "Unknown Plugin"'
    );
    pluginName = "Unknown Plugin";
  }

  console.log("Extracted plugin info:", { id, pluginName, description });

  if (!id) {
    console.error("Failed to extract plugin ID");
    return null;
  }

  const pluginInfo: Omit<PluginInfo, "categories"> = {
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
  console.log("Initializing plugin...");

  // 저장된 사이즈 가져오기
  let savedSize: PluginSize;
  try {
    savedSize = (await figma.clientStorage.getAsync(
      "pluginSize"
    )) as PluginSize;
    if (savedSize) {
      console.log(
        `UI will be resized to saved size: ${savedSize.width}x${savedSize.height}`
      );
    } else {
      // 저장된 사이즈가 없으면 기본 사이즈 사용
      savedSize = { width: 500, height: 600 };
      console.log("No saved size found, using default size");
    }
  } catch (error) {
    console.error("Error initializing UI size:", error);
    // 오류 발생 시 기본 사이즈 사용
    savedSize = { width: 500, height: 600 };
  }

  // UI 표시 (저장된 사이즈 적용)
  figma.showUI(__html__, { width: savedSize.width, height: savedSize.height });
  console.log("UI shown");

  // 검색 기능 비활성화 상태로 초기화
  updateSearchReadyState(false);

  // My Plugin List 동기화
  try {
    await syncMyPluginList();
    console.log("My Plugin List synced");
  } catch (error) {
    console.error("Error syncing My Plugin List:", error);
  }

  // Airtable에서 모든 플러그인 데이터 가져오기 (only if not cached)
  try {
    // Check if Airtable plugins are already loaded
    if (airtablePlugins.length === 0) {
      await fetchAllDataFromAirtable();
      console.log("Airtable plugins fetched");
    } else {
      console.log("Airtable plugins already loaded");
      // 검색 기능 활성화 상태로 업데이트
      updateSearchReadyState(true);
    }
  } catch (error) {
    console.error("Error fetching Airtable plugins:", error);
  }

  // UI 크기 초기화 함수 호출 필요 없음
}

// 메인 실행 코드
initializePlugin()
  .then(() => {
    console.log("Plugin initialization complete");
  })
  .catch((error) => {
    console.error("Error during plugin initialization:", error);
  });

// figma.ui.onmessage 핸들러
figma.ui.onmessage = async (msg: {
  type: string;
  url?: string;
  name?: string;
  category?: string;
  description?: string;
  pluginId?: string;
  message?: string;
  width?: number;
  height?: number;
  query?: string;
  plugin?: PluginInfo;
}) => {
  console.log("Received message:", msg);

  if (msg.type === "resize") {
    const width = Math.max(500, Math.round(msg.width || 0));
    const height = Math.max(500, Math.round(msg.height || 0));

    console.log("Resizing to:", width, height);

    figma.ui.resize(width, height);
    await figma.clientStorage.setAsync("pluginSize", {
      width: width,
      height: height,
    });
  } else if (msg.type === "add-plugin") {
    try {
      if (!msg.url || !msg.category || !msg.name) {
        throw new Error("URL, name, and category are required");
      }

      console.log("Attempting to extract plugin info from URL:", msg.url);
      const pluginInfo = extractPluginInfo(
        msg.url,
        msg.category,
        msg.description,
        msg.name
      );
      if (!pluginInfo) {
        throw new Error("Failed to extract plugin information");
      }
      console.log("Successfully extracted plugin info:", pluginInfo);

      const existingPluginIndex = myPluginList.findIndex(
        (p) => p.id === pluginInfo.id
      );

      if (existingPluginIndex !== -1) {
        console.log(
          "Updating existing plugin:",
          myPluginList[existingPluginIndex]
        );
        if (!myPluginList[existingPluginIndex].categories) {
          myPluginList[existingPluginIndex].categories = [];
        }
        if (
          !myPluginList[existingPluginIndex].categories.includes(msg.category)
        ) {
          myPluginList[existingPluginIndex].categories.push(msg.category);
        }
        // Update name and description
        myPluginList[existingPluginIndex].pluginName = msg.name;
        myPluginList[existingPluginIndex].pluginDescription =
          msg.description || "";
      } else {
        console.log("Adding new plugin");
        const newPlugin: PluginInfo = {
          id: pluginInfo.id,
          pluginName: msg.name,
          pluginDescription: msg.description || "",
          pluginUrl: msg.url,
          pluginIcon: pluginInfo.pluginIcon,
          categories: [msg.category],
        };
        myPluginList.push(newPlugin);
      }

      await saveMyPluginList(myPluginList);

      figma.notify("Plugin added successfully", { timeout: 2000 });
      figma.ui.postMessage({ type: "plugin-added", plugin: pluginInfo });
    } catch (error) {
      console.error("Error adding plugin:", error);
      figma.notify(
        "Error adding plugin: " +
          (error instanceof Error
            ? error.message
            : "An unknown error occurred"),
        { error: true }
      );
    }
  } else if (msg.type === "add-plugin-default") {
    // 여기에 'add-plugin-default' 메시지 타입에 대한 처리를 추가합니다.
    try {
      if (!msg.url || !msg.category) {
        throw new Error("URL and category are required");
      }

      console.log("Attempting to extract plugin info from URL:", msg.url);
      const pluginInfo = extractPluginInfo(msg.url, msg.category);
      if (!pluginInfo) {
        throw new Error("Failed to extract plugin information");
      }
      console.log("Successfully extracted plugin info:", pluginInfo);

      const existingPluginIndex = myPluginList.findIndex(
        (p) => p.id === pluginInfo.id
      );

      if (existingPluginIndex !== -1) {
        console.log(
          "Updating existing plugin:",
          myPluginList[existingPluginIndex]
        );
        if (!myPluginList[existingPluginIndex].categories) {
          myPluginList[existingPluginIndex].categories = [];
        }
        if (
          !myPluginList[existingPluginIndex].categories.includes(msg.category)
        ) {
          myPluginList[existingPluginIndex].categories.push(msg.category);
        }
      } else {
        console.log("Adding new plugin");
        const newPlugin: PluginInfo = {
          id: pluginInfo.id,
          pluginName: pluginInfo.pluginName,
          pluginDescription: pluginInfo.pluginDescription || "",
          pluginUrl: pluginInfo.pluginUrl,
          pluginIcon: pluginInfo.pluginIcon,
          categories: [msg.category],
        };
        myPluginList.push(newPlugin);
      }

      await saveMyPluginList(myPluginList);

      figma.notify("Plugin added successfully", { timeout: 2000 });
      figma.ui.postMessage({ type: "plugin-added", plugin: pluginInfo });
    } catch (error) {
      console.error("Error adding plugin:", error);
      figma.notify(
        "Error adding plugin: " +
          (error instanceof Error
            ? error.message
            : "An unknown error occurred"),
        { error: true }
      );
    }
  } else if (msg.type === "get-plugins") {
    try {
      await syncMyPluginList();
      console.log("Retrieved My Plugin List:", myPluginList);
      const flattenedPlugins = myPluginList.reduce((acc, plugin) => {
        if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
          plugin.categories.forEach((category) => {
            acc.push(Object.assign({}, plugin, { category: category }));
          });
        } else {
          console.warn("Invalid plugin data:", plugin);
        }
        return acc;
      }, [] as Array<PluginInfo & { category: string }>);
      console.log("Flattened plugins to send:", flattenedPlugins);
      figma.ui.postMessage({ type: "plugins-list", plugins: flattenedPlugins });
    } catch (error) {
      console.error("Error fetching plugins:", error);
      figma.notify(
        "Error fetching plugins: " +
          (error instanceof Error ? error.message : "Failed to fetch plugins"),
        { error: true }
      );
    }
  } else if (msg.type === "open-plugin-page") {
    if (msg.url) {
      console.log("Opening plugin URL:", msg.url);
      figma.notify("Opening plugin page...");
      figma.openExternal(msg.url);
    } else {
      console.error("No URL provided for opening plugin page");
      figma.notify("Error: No URL provided", { error: true });
    }
  } else if (msg.type === "delete-plugin") {
    try {
      if (!msg.pluginId || !msg.category) {
        throw new Error("Plugin ID and category are required for deletion");
      }

      console.log("Before deletion:", myPluginList);

      myPluginList = myPluginList
        .map((plugin) => {
          if (plugin.id === msg.pluginId) {
            plugin.categories = plugin.categories.filter(
              (cat) => cat !== msg.category
            );
            // 카테고리가 모두 삭제되면 플러그인을 제거
            if (plugin.categories.length === 0) {
              return null;
            }
          }
          return plugin;
        })
        .filter((plugin) => plugin !== null) as PluginInfo[];

      console.log("After deletion:", myPluginList);

      await saveMyPluginList(myPluginList);
      figma.notify("Plugin deleted successfully", { timeout: 2000 });

      const flattenedPlugins = myPluginList.reduce((acc, plugin) => {
        if (plugin && plugin.categories && Array.isArray(plugin.categories)) {
          plugin.categories.forEach((category) => {
            acc.push(Object.assign({}, plugin, { category: category }));
          });
        } else {
          console.warn("Invalid plugin data:", plugin);
        }
        return acc;
      }, [] as Array<PluginInfo & { category: string }>);
      console.log("Flattened plugins after deletion:", flattenedPlugins);
      figma.ui.postMessage({ type: "plugins-list", plugins: flattenedPlugins });
    } catch (error) {
      console.error("Error deleting plugin:", error);
      figma.notify(
        "Error deleting plugin: " +
          (error instanceof Error
            ? error.message
            : "An unknown error occurred"),
        { error: true }
      );
    }
  } else if (msg.type === "notify") {
    figma.notify(msg.message || "", { timeout: 2000 });
  } else if (msg.type === "search-plugins") {
    try {
      console.log("Received search request:", msg.query);
      if (!msg.query) {
        throw new Error("Search query is required");
      }

      if (!searchReady) {
        throw new Error("Search function is not ready yet");
      }

      const searchResults = await searchPlugins(msg.query);
      console.log("Search results to be sent to UI:", searchResults);

      figma.ui.postMessage({
        type: "search-results",
        results: searchResults.map((plugin) => ({
          pluginName: plugin.pluginName,
          pluginDescription: plugin.pluginDescription,
          pluginIcon: plugin.pluginIcon,
          id: plugin.id,
          pluginUrl: plugin.pluginUrl,
          categories: plugin.categories,
        })),
      });
    } catch (error) {
      console.error("Error searching plugins:", error);
      figma.notify(
        "Error searching plugins: " +
          (error instanceof Error
            ? error.message
            : "An unknown error occurred"),
        { error: true }
      );
      figma.ui.postMessage({
        type: "search-error",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  } else if (msg.type === "add-plugin-from-search") {
    try {
      if (!msg.plugin) {
        throw new Error("Plugin data is required");
      }

      // 모달을 표시하여 카테고리 선택 (UI 측에서 처리)
      figma.ui.postMessage({ type: "show-category-modal", plugin: msg.plugin });
    } catch (error) {
      console.error("Error adding plugin from search:", error);
      figma.notify(
        "Error adding plugin: " +
          (error instanceof Error
            ? error.message
            : "An unknown error occurred"),
        { error: true }
      );
    }
  } else if (msg.type === "confirm-add-plugin") {
    try {
      const plugin = msg.plugin;
      if (!plugin || !msg.category) {
        throw new Error("Plugin data and category are required");
      }

      const existingPluginIndex = myPluginList.findIndex(
        (p) => p.id === plugin.id
      );

      if (existingPluginIndex !== -1) {
        console.log(
          "Updating existing plugin:",
          myPluginList[existingPluginIndex]
        );
        if (!myPluginList[existingPluginIndex].categories) {
          myPluginList[existingPluginIndex].categories = [];
        }
        if (
          !myPluginList[existingPluginIndex].categories.includes(msg.category)
        ) {
          myPluginList[existingPluginIndex].categories.push(msg.category);
        }
      } else {
        console.log("Adding new plugin");
        const newPlugin: PluginInfo = {
          id: plugin.id,
          pluginName: plugin.pluginName,
          pluginDescription: plugin.pluginDescription || "",
          pluginUrl: plugin.pluginUrl,
          pluginIcon: plugin.pluginIcon,
          categories: [msg.category],
        };
        myPluginList.push(newPlugin);
      }

      await saveMyPluginList(myPluginList);

      figma.notify("Plugin added successfully", { timeout: 2000 });
      figma.ui.postMessage({ type: "plugin-added", plugin: plugin });
    } catch (error) {
      console.error("Error confirming plugin addition:", error);
      figma.notify(
        "Error adding plugin: " +
          (error instanceof Error
            ? error.message
            : "An unknown error occurred"),
        { error: true }
      );
    }
  } else if (msg.type === "get-default-plugins") {
    console.log("Received get-default-plugins request");
    figma.ui.postMessage({ type: "default-plugins", plugins: defaultPlugins });
  } 
};
