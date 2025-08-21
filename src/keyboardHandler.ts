import * as vscode from 'vscode';
import { GitHistoryProvider } from './gitHistoryProvider';

export class KeyboardHandler {
    private gitHistoryProvider: GitHistoryProvider;

    constructor(gitHistoryProvider: GitHistoryProvider) {
        this.gitHistoryProvider = gitHistoryProvider;
    }

    async nextPage(): Promise<void> {
        try {
            const currentItem = this.gitHistoryProvider.getCurrentReadingItem();
            if (currentItem && currentItem.isReadingTxt) {
                await this.gitHistoryProvider.nextPage(currentItem);
            } else {
                vscode.window.showInformationMessage('请先选择一个正在阅读TXT的Git记录');
            }
        } catch (error) {
            console.error('键盘翻页失败:', error);
            vscode.window.showErrorMessage('翻页失败');
        }
    }

    async previousPage(): Promise<void> {
        try {
            const currentItem = this.gitHistoryProvider.getCurrentReadingItem();
            if (currentItem && currentItem.isReadingTxt) {
                await this.gitHistoryProvider.previousPage(currentItem);
            } else {
                vscode.window.showInformationMessage('请先选择一个正在阅读TXT的Git记录');
            }
        } catch (error) {
            console.error('键盘翻页失败:', error);
            vscode.window.showErrorMessage('翻页失败');
        }
    }

    // 注册键盘快捷键
    registerKeybindings(): void {
        // 这些快捷键已经在package.json中定义
        // 这里可以添加额外的键盘事件处理逻辑
        console.log('键盘事件处理器已注册');
    }

    // 处理自定义键盘事件
    handleCustomKeyEvent(key: string): void {
        switch (key) {
            case 'ArrowRight':
            case 'Right':
                this.nextPage();
                break;
            case 'ArrowLeft':
            case 'Left':
                this.previousPage();
                break;
            case 'Escape':
                this.stopReading();
                break;
            default:
                console.log(`未处理的键盘事件: ${key}`);
        }
    }

    // 停止阅读
    stopReading(): void {
        const selectedItem = this.gitHistoryProvider.getSelectedItem();
        if (selectedItem && selectedItem.isReadingTxt) {
            // 重置阅读状态
            selectedItem.isReadingTxt = false;
            selectedItem.txtContent = '';
            selectedItem.currentPage = 1;
            selectedItem.totalPages = 1;
            
            // 更新显示
            this.gitHistoryProvider.updateItem(selectedItem);
            vscode.window.showInformationMessage('已停止阅读TXT内容');
        }
    }

    // 获取当前键盘状态
    getKeyboardStatus(): { canNavigate: boolean; currentItem: any } {
        const selectedItem = this.gitHistoryProvider.getSelectedItem();
        return {
            canNavigate: selectedItem ? (selectedItem.isReadingTxt || false) : false,
            currentItem: selectedItem
        };
    }
} 