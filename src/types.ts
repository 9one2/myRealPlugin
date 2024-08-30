export interface PluginData {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface PluginInfo extends PluginData {
  category: string;
}