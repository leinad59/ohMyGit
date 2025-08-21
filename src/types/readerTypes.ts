export interface TxtContentManager {
    loadFile(filePath: string): Promise<string>;
    getPageContent(content: string, page: number, pageSize: number): string;
    getTotalPages(content: string, pageSize: number): number;
    cacheFile(filePath: string, content: string): void;
    clearCache(): void;
}

import { GitRecordItem } from './gitTypes';

export interface InlineReader {
    displayTxtContent(item: GitRecordItem): void;
    nextPage(item: GitRecordItem): void;
    previousPage(item: GitRecordItem): void;
    updateDisplay(item: GitRecordItem): void;
}

export interface ReaderConfig {
    txtFilePath: string;
    pageSize: number;
    enableCache: boolean;
    maxCacheSize: number;
} 