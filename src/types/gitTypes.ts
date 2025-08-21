export interface GitRecordItem {
    commitHash: string;
    author: string;
    date: Date;
    message: string;
    associatedTxtPath?: string;
    currentPage?: number;
    totalPages?: number;
    txtContent?: string;
    isReadingTxt?: boolean;
}

export interface GitCommit {
    hash: string;
    author: string;
    date: string;
    message: string;
}

export interface GitHistoryOptions {
    maxCount?: number;
    since?: string;
    until?: string;
    author?: string;
} 