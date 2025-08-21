import * as vscode from 'vscode';

export class ConfigManager {
    private readonly configSection = 'ohmygit';

    constructor() {
        this.updateConfiguration();
    }

    // 获取TXT文件路径
    getTxtFilePath(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<string>('txtFilePath', '');
    }

    // 设置TXT文件路径
    async setTxtFilePath(filePath: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('txtFilePath', filePath, vscode.ConfigurationTarget.Workspace);
    }

    // 获取每页显示字符数
    getPageSize(): number {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<number>('pageSize', 30);
    }

    // 设置每页显示字符数
    async setPageSize(pageSize: number): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('pageSize', pageSize, vscode.ConfigurationTarget.Workspace);
    }

    // 更新配置
    updateConfiguration(): void {
        console.log('配置已更新');
        console.log(`TXT文件路径: ${this.getTxtFilePath()}`);
        console.log(`每页字符数: ${this.getPageSize()}`);
    }

    // 验证配置
    validateConfiguration(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const txtFilePath = this.getTxtFilePath();
        const pageSize = this.getPageSize();

        if (!txtFilePath) {
            errors.push('未配置TXT文件路径');
        } else {
            // 检查文件是否存在
            const fs = require('fs');
            if (!fs.existsSync(txtFilePath)) {
                errors.push(`TXT文件不存在: ${txtFilePath}`);
            }
        }

        if (pageSize <= 0) {
            errors.push('每页字符数必须大于0');
        }

        if (pageSize > 1000) {
            errors.push('每页字符数不能超过1000');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // 获取所有配置
    getAllConfig(): { txtFilePath: string; pageSize: number } {
        return {
            txtFilePath: this.getTxtFilePath(),
            pageSize: this.getPageSize()
        };
    }

    // 重置配置
    async resetConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('txtFilePath', '', vscode.ConfigurationTarget.Workspace);
        await config.update('pageSize', 30, vscode.ConfigurationTarget.Workspace);
        this.updateConfiguration();
    }

    // 显示配置信息
    showConfigurationInfo(): void {
        const config = this.getAllConfig();
        const validation = this.validateConfiguration();

        let message = `配置信息:\n`;
        message += `TXT文件路径: ${config.txtFilePath || '未设置'}\n`;
        message += `每页字符数: ${config.pageSize}\n`;
        message += `配置状态: ${validation.isValid ? '有效' : '无效'}`;

        if (!validation.isValid) {
            message += `\n错误信息:\n${validation.errors.join('\n')}`;
        }

        vscode.window.showInformationMessage(message);
    }

    // 打开配置设置
    openConfiguration(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', 'ohmygit');
    }

    // 监听配置变化
    onConfigurationChange(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(this.configSection)) {
                this.updateConfiguration();
                callback();
            }
        });
    }
} 