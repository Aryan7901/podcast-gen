export interface PodcastEvent {
  speaker: string;
  text: string;
  audio?: string;
}

export interface ChatMessage {
  speaker: string;
  text: string;
}

export interface SidebarProps {
  status: string;
  onReset: () => void;
  numTurns: number;
  setNumTurns: (n: number) => void;
  audioOn: boolean;
  setAudioOn: (b: boolean) => void;
  canExport: boolean;
  onExportMD: () => void;
  onExportAudio: () => void;
}

export interface ControlProps {
  variant: "sidebar" | "header";
  status: string;
  numTurns: number;
  setNumTurns: (val: number) => void;
  audioOn: boolean;
  setAudioOn: (val: boolean) => void;
  resetState: () => void;
  chatHistory: any[];
  audioChunks: string[];
  downloadFile: (blob: Blob, name: string) => void;
  handleDownloadAudio: () => void;
  showSettings: boolean;
}
