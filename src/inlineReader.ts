import * as vscode from 'vscode';
import { GitRecordItem } from './types/gitTypes';
import { TxtContentManager } from './txtContentManager';
import { ConfigManager } from './configManager';

export class InlineReader {
    private txtContentManager: TxtContentManager;
    private configManager: ConfigManager;

    constructor(txtContentManager: TxtContentManager, configManager: ConfigManager) {
        this.txtContentManager = txtContentManager;
        this.configManager = configManager;
    }

    async displayTxtContent(item: GitRecordItem): Promise<void> {
        try {
            const txtFilePath = item.associatedTxtPath;
            if (!txtFilePath) {
                const action = await vscode.window.showErrorMessage(
                    '未配置TXT文件路径，请先配置TXT文件路径',
                    '配置TXT文件路径',
                    '取消'
                );
                
                if (action === '配置TXT文件路径') {
                    vscode.commands.executeCommand('ohmygit.configureTxtPath');
                }
                return;
            }

            // 检查文件是否存在
            if (!this.txtContentManager.isFileReadable(txtFilePath)) {
                vscode.window.showErrorMessage(`TXT文件不存在或无法读取: ${txtFilePath}`);
                return;
            }

            // 加载文件内容
            const content = await this.txtContentManager.loadFile(txtFilePath);
            const pageSize = this.configManager.getPageSize();
            const totalPages = this.txtContentManager.getTotalPages(content, pageSize);

            // 更新记录项状态
            item.isReadingTxt = true;
            item.currentPage = 1;
            item.totalPages = totalPages;
            item.txtContent = this.txtContentManager.getPageContent(content, 1, pageSize);

            // 移除开始阅读的提示消息

        } catch (error) {
            console.error('显示TXT内容失败:', error);
            vscode.window.showErrorMessage(`显示TXT内容失败: ${error}`);
        }
    }

    // 从阅读进度恢复
    async restoreReadingProgress(item: GitRecordItem, savedProgress: { currentPage: number; totalPages: number }): Promise<void> {
        try {
            const txtFilePath = item.associatedTxtPath;
            if (!txtFilePath || !this.txtContentManager.isFileReadable(txtFilePath)) {
                return;
            }

            const content = await this.txtContentManager.loadFile(txtFilePath);
            const pageSize = this.configManager.getPageSize();
            const totalPages = this.txtContentManager.getTotalPages(content, pageSize);

            // 确保保存的页码在有效范围内
            const currentPage = Math.min(savedProgress.currentPage, totalPages);
            
            item.isReadingTxt = true;
            item.currentPage = currentPage;
            item.totalPages = totalPages;
            item.txtContent = this.txtContentManager.getPageContent(content, currentPage, pageSize);

        } catch (error) {
            console.error('恢复阅读进度失败:', error);
        }
    }

    async nextPage(item: GitRecordItem): Promise<void> {
        if (!item.isReadingTxt || !item.associatedTxtPath) {
            return;
        }

        try {
            const txtFilePath = item.associatedTxtPath;
            const content = await this.txtContentManager.loadFile(txtFilePath);
            const pageSize = this.configManager.getPageSize();
            const totalPages = this.txtContentManager.getTotalPages(content, pageSize);

            if (item.currentPage && item.currentPage < totalPages) {
                item.currentPage++;
                item.txtContent = this.txtContentManager.getPageContent(content, item.currentPage, pageSize);
                item.totalPages = totalPages; // 确保totalPages是最新的
            }

        } catch (error) {
            console.error('翻到下一页失败:', error);
            vscode.window.showErrorMessage(`翻页失败: ${error}`);
        }
    }

    async previousPage(item: GitRecordItem): Promise<void> {
        if (!item.isReadingTxt || !item.associatedTxtPath) {
            return;
        }

        try {
            const txtFilePath = item.associatedTxtPath;
            const content = await this.txtContentManager.loadFile(txtFilePath);
            const pageSize = this.configManager.getPageSize();

            if (item.currentPage && item.currentPage > 1) {
                item.currentPage--;
                item.txtContent = this.txtContentManager.getPageContent(content, item.currentPage, pageSize);
                const totalPages = this.txtContentManager.getTotalPages(content, pageSize);
                item.totalPages = totalPages; // 确保totalPages是最新的
            }

        } catch (error) {
            console.error('翻到上一页失败:', error);
            vscode.window.showErrorMessage(`翻页失败: ${error}`);
        }
    }

    updateDisplay(item: GitRecordItem): void {
        // 这个方法用于更新显示，通常由GitHistoryProvider调用
        // 在这里可以添加额外的显示逻辑
        if (item.isReadingTxt && item.txtContent) {
            // 可以在这里添加显示格式化的逻辑
            console.log(`更新显示: ${item.commitHash} - 第${item.currentPage}页`);
        }
    }

    // 停止阅读TXT内容
    stopReading(item: GitRecordItem): void {
        item.isReadingTxt = false;
        item.txtContent = '';
        item.currentPage = 1;
        item.totalPages = 1;
        vscode.window.showInformationMessage('停止阅读TXT内容');
    }

    // 跳转到指定页面
    async goToPage(item: GitRecordItem, pageNumber: number): Promise<void> {
        if (!item.isReadingTxt || !item.associatedTxtPath) {
            return;
        }

        try {
            const txtFilePath = item.associatedTxtPath;
            const content = await this.txtContentManager.loadFile(txtFilePath);
            const pageSize = this.configManager.getPageSize();
            const totalPages = this.txtContentManager.getTotalPages(content, pageSize);

            if (pageNumber >= 1 && pageNumber <= totalPages) {
                item.currentPage = pageNumber;
                item.totalPages = totalPages;
                item.txtContent = this.txtContentManager.getPageContent(content, pageNumber, pageSize);
                // 移除跳转提示消息
            }

        } catch (error) {
            console.error('跳转页面失败:', error);
            vscode.window.showErrorMessage(`跳转页面失败: ${error}`);
        }
    }

    // 获取当前阅读状态
    getReadingStatus(item: GitRecordItem): { isReading: boolean; currentPage: number; totalPages: number } {
        return {
            isReading: item.isReadingTxt || false,
            currentPage: item.currentPage || 1,
            totalPages: item.totalPages || 1
        };
    }
} 