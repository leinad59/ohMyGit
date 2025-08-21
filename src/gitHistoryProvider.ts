import * as vscode from 'vscode';
import { GitRecordItem } from './types/gitTypes';
import { ConfigManager } from './configManager';
import { TxtContentManager } from './txtContentManager';
import { InlineReader } from './inlineReader';

export class GitHistoryProvider implements vscode.TreeDataProvider<GitRecordItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GitRecordItem | undefined | null | void> = new vscode.EventEmitter<GitRecordItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GitRecordItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private gitRecords: GitRecordItem[] = [];
    private txtContentManager: TxtContentManager;
    private inlineReader: InlineReader;
    private configManager: ConfigManager;
    private readingProgress: Map<string, { currentPage: number; totalPages: number }> = new Map();
    private context: vscode.ExtensionContext | undefined;
    private isHiddenMode: boolean = false;

    constructor(configManager: ConfigManager, context?: vscode.ExtensionContext) {
        this.configManager = configManager;
        this.txtContentManager = new TxtContentManager();
        this.inlineReader = new InlineReader(this.txtContentManager, this.configManager);
        this.context = context;
        this.loadReadingProgress();
    }

    refresh(): void {
        // 保存当前的阅读状态
        const currentReadingItem = this.getCurrentReadingItem();
        const savedReadingState = currentReadingItem ? {
            commitHash: currentReadingItem.commitHash,
            currentPage: currentReadingItem.currentPage,
            totalPages: currentReadingItem.totalPages,
            txtContent: currentReadingItem.txtContent,
            isReadingTxt: currentReadingItem.isReadingTxt
        } : null;

        // 重新加载配置和Git历史记录
        this.loadGitHistory();
        
        // 恢复阅读状态
        if (savedReadingState) {
            const itemToRestore = this.gitRecords.find(item => item.commitHash === savedReadingState.commitHash);
            if (itemToRestore) {
                itemToRestore.currentPage = savedReadingState.currentPage;
                itemToRestore.totalPages = savedReadingState.totalPages;
                itemToRestore.txtContent = savedReadingState.txtContent;
                itemToRestore.isReadingTxt = savedReadingState.isReadingTxt;
            }
        }
        
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GitRecordItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            this.formatTreeItemLabel(element),
            vscode.TreeItemCollapsibleState.None
        );

        // 设置描述信息
        if (this.isHiddenMode) {
            // 在隐藏模式下，始终显示作者和时间
            treeItem.description = `${element.author} - ${element.date.toLocaleDateString()}`;
        } else if (element.isReadingTxt && element.txtContent) {
            // 在正常模式下，如果正在阅读TXT则显示TXT内容
            treeItem.description = `${element.txtContent} (${element.currentPage}/${element.totalPages})`;
        } else {
            // 在正常模式下，显示作者和时间
            treeItem.description = `${element.author} - ${element.date.toLocaleDateString()}`;
        }

        // 设置图标
        if (this.isHiddenMode) {
            // 在隐藏模式下，显示Git提交图标
            treeItem.iconPath = new vscode.ThemeIcon('git-commit');
        } else if (element.isReadingTxt) {
            // 在正常模式下，如果正在阅读TXT则显示书本图标
            treeItem.iconPath = new vscode.ThemeIcon('book');
        } else {
            // 在正常模式下，显示Git提交图标
            treeItem.iconPath = new vscode.ThemeIcon('git-commit');
        }

        // 设置命令
        treeItem.command = {
            command: 'ohmygit.toggleTxtDisplay',
            title: '切换TXT显示',
            arguments: [element]
        };

        // 移除tooltip，不显示任何悬浮提示
        treeItem.tooltip = '';

        return treeItem;
    }

    getChildren(element?: GitRecordItem): Thenable<GitRecordItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.gitRecords);
    }

    private async loadGitHistory(): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                this.gitRecords = [];
                return;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const { simpleGit } = await import('simple-git');
            const git = simpleGit(workspaceRoot);

            // 检查是否为Git仓库
            const isRepo = await git.checkIsRepo();
            if (!isRepo) {
                this.gitRecords = [];
                return;
            }

            // 获取Git历史记录
            const log = await git.log({
                maxCount: 20,
                format: {
                    hash: '%H',
                    author: '%an',
                    date: '%ad',
                    message: '%s'
                }
            });

            this.gitRecords = log.all.map(commit => ({
                commitHash: commit.hash,
                author: commit.author,
                date: new Date(commit.date),
                message: commit.message,
                associatedTxtPath: this.configManager.getTxtFilePath(),
                currentPage: 1,
                totalPages: 1,
                txtContent: '',
                isReadingTxt: false
            }));

        } catch (error) {
            console.error('加载Git历史记录失败:', error);
            vscode.window.showErrorMessage('加载Git历史记录失败');
            this.gitRecords = [];
        }
    }

    private formatTreeItemLabel(item: GitRecordItem): string {
        // 在隐藏模式下，始终显示Git消息
        if (this.isHiddenMode) {
            return item.message;
        }
        
        // 在正常模式下，如果正在阅读TXT则显示📖图标
        if (item.isReadingTxt) {
            return `📖`;
        }
        return item.message;
    }

    // 获取当前选中的记录项
    getSelectedItem(): GitRecordItem | undefined {
        // 这里需要实现获取当前选中项的逻辑
        // 暂时返回第一个记录项作为示例
        return this.gitRecords.length > 0 ? this.gitRecords[0] : undefined;
    }

    // 更新记录项
    updateItem(item: GitRecordItem): void {
        const index = this.gitRecords.findIndex(record => record.commitHash === item.commitHash);
        if (index !== -1) {
            this.gitRecords[index] = item;
            this._onDidChangeTreeData.fire();
        }
    }

    // 切换TXT显示状态
    async toggleTxtDisplay(item: GitRecordItem): Promise<void> {
        // 如果在隐藏模式下点击，先退出隐藏模式
        if (this.isHiddenMode) {
            this.isHiddenMode = false;
            this._onDidChangeTreeData.fire();
        }

        if (item.isReadingTxt) {
            // 如果正在显示TXT，则翻到下一页
            await this.inlineReader.nextPage(item);
        } else {
            // 先清除其他记录的阅读状态
            this.clearOtherReadingStates(item);
            
            // 检查是否有保存的阅读进度（以TXT文件路径为key）
            const txtPath = item.associatedTxtPath;
            const savedProgress = txtPath ? this.readingProgress.get(txtPath) : null;
            if (savedProgress) {
                // 恢复阅读进度
                await this.inlineReader.restoreReadingProgress(item, savedProgress);
            } else {
                // 如果未显示TXT，则开始显示
                await this.inlineReader.displayTxtContent(item);
            }
        }
        
        // 保存阅读进度（以TXT文件路径为key）
        if (item.isReadingTxt && item.currentPage && item.totalPages && item.associatedTxtPath) {
            this.readingProgress.set(item.associatedTxtPath, {
                currentPage: item.currentPage,
                totalPages: item.totalPages
            });
            this.saveReadingProgress();
        }
        
        this.updateItem(item);
    }

    // 清除所有阅读状态
    private clearAllReadingStates(): void {
        for (const item of this.gitRecords) {
            item.isReadingTxt = false;
            item.txtContent = '';
            item.currentPage = 1;
            item.totalPages = 1;
        }
        // 不清除持久化的阅读进度
    }

    // 切换隐藏模式
    toggleHiddenMode(): void {
        this.isHiddenMode = !this.isHiddenMode;
        this._onDidChangeTreeData.fire();
    }

    // 获取当前隐藏模式状态
    getHiddenMode(): boolean {
        return this.isHiddenMode;
    }

    // 清除其他记录的阅读状态
    private clearOtherReadingStates(currentItem: GitRecordItem): void {
        for (const item of this.gitRecords) {
            if (item.commitHash !== currentItem.commitHash) {
                item.isReadingTxt = false;
                item.txtContent = '';
                item.currentPage = 1;
                item.totalPages = 1;
            }
        }
    }

    // 保存阅读进度到工作区状态
    private saveReadingProgress(): void {
        if (this.context) {
            const progressObj: any = {};
            this.readingProgress.forEach((value, key) => {
                progressObj[key] = value;
            });
            this.context.workspaceState.update('ohmygit.readingProgress', progressObj);
        }
    }

    // 从工作区状态加载阅读进度
    private loadReadingProgress(): void {
        if (this.context) {
            const progressObj = this.context.workspaceState.get('ohmygit.readingProgress', {});
            this.readingProgress.clear();
            Object.entries(progressObj).forEach(([key, value]: [string, any]) => {
                this.readingProgress.set(key, value);
            });
        }
    }

    // 获取当前选中的阅读项
    getCurrentReadingItem(): GitRecordItem | undefined {
        return this.gitRecords.find(item => item.isReadingTxt);
    }

    // 跳转到指定页面
    async goToPage(item: GitRecordItem, pageNumber: number): Promise<void> {
        await this.inlineReader.goToPage(item, pageNumber);
        
        // 保存阅读进度
        if (item.isReadingTxt && item.currentPage && item.totalPages && item.associatedTxtPath) {
            this.readingProgress.set(item.associatedTxtPath, {
                currentPage: item.currentPage,
                totalPages: item.totalPages
            });
            this.saveReadingProgress();
        }
        
        this.updateItem(item);
    }

    // 下一页
    async nextPage(item: GitRecordItem): Promise<void> {
        await this.inlineReader.nextPage(item);
        
        // 保存阅读进度
        if (item.isReadingTxt && item.currentPage && item.totalPages && item.associatedTxtPath) {
            this.readingProgress.set(item.associatedTxtPath, {
                currentPage: item.currentPage,
                totalPages: item.totalPages
            });
            this.saveReadingProgress();
        }
        
        this.updateItem(item);
    }

    // 上一页
    async previousPage(item: GitRecordItem): Promise<void> {
        await this.inlineReader.previousPage(item);
        
        // 保存阅读进度
        if (item.isReadingTxt && item.currentPage && item.totalPages && item.associatedTxtPath) {
            this.readingProgress.set(item.associatedTxtPath, {
                currentPage: item.currentPage,
                totalPages: item.totalPages
            });
            this.saveReadingProgress();
        }
        
        this.updateItem(item);
    }
} 