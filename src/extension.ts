import * as vscode from 'vscode';
import { GitHistoryProvider } from './gitHistoryProvider';
import { KeyboardHandler } from './keyboardHandler';
import { ConfigManager } from './configManager';

let gitHistoryProvider: GitHistoryProvider;
let keyboardHandler: KeyboardHandler;
let configManager: ConfigManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Oh My Git 插件已激活');

    // 初始化配置管理器
    configManager = new ConfigManager();

    // 初始化Git历史记录提供者
    gitHistoryProvider = new GitHistoryProvider(configManager, context);

    // 注册视图提供者
    const gitHistoryView = vscode.window.registerTreeDataProvider(
        'ohmygit.gitHistoryView',
        gitHistoryProvider
    );

    // 初始化键盘事件处理器
    keyboardHandler = new KeyboardHandler(gitHistoryProvider);

    // 注册命令
    const showGitHistoryCommand = vscode.commands.registerCommand(
        'ohmygit.showGitHistory',
        () => {
            gitHistoryProvider.refresh();
        }
    );

    const nextPageCommand = vscode.commands.registerCommand(
        'ohmygit.nextPage',
        async () => {
            await keyboardHandler.nextPage();
        }
    );

    const previousPageCommand = vscode.commands.registerCommand(
        'ohmygit.previousPage',
        async () => {
            await keyboardHandler.previousPage();
        }
    );

    const toggleTxtDisplayCommand = vscode.commands.registerCommand(
        'ohmygit.toggleTxtDisplay',
        (item: any) => {
            if (item) {
                gitHistoryProvider.toggleTxtDisplay(item);
            }
        }
    );

    const configureTxtPathCommand = vscode.commands.registerCommand(
        'ohmygit.configureTxtPath',
        async () => {
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                openLabel: '选择TXT文件',
                filters: {
                    'Text Files': ['txt']
                }
            };

            const fileUri = await vscode.window.showOpenDialog(options);
            if (fileUri && fileUri.length > 0) {
                const filePath = fileUri[0].fsPath;
                await configManager.setTxtFilePath(filePath);
                gitHistoryProvider.refresh();
            }
        }
    );

    const showConfigCommand = vscode.commands.registerCommand(
        'ohmygit.showConfig',
        () => {
            configManager.showConfigurationInfo();
        }
    );

    const refreshConfigCommand = vscode.commands.registerCommand(
        'ohmygit.refreshConfig',
        () => {
            configManager.updateConfiguration();
            gitHistoryProvider.refresh();
        }
    );

    // 导航命令
    const firstPageCommand = vscode.commands.registerCommand(
        'ohmygit.firstPage',
        async () => {
            const currentItem = gitHistoryProvider.getCurrentReadingItem();
            if (currentItem && currentItem.isReadingTxt) {
                await gitHistoryProvider.goToPage(currentItem, 1);
            } else {
                vscode.window.showInformationMessage('请先选择一个正在阅读的Git记录');
            }
        }
    );

    const previousPageBtnCommand = vscode.commands.registerCommand(
        'ohmygit.previousPageBtn',
        async () => {
            const currentItem = gitHistoryProvider.getCurrentReadingItem();
            if (currentItem && currentItem.isReadingTxt) {
                await gitHistoryProvider.previousPage(currentItem);
            } else {
                vscode.window.showInformationMessage('请先选择一个正在阅读的Git记录');
            }
        }
    );

    const nextPageBtnCommand = vscode.commands.registerCommand(
        'ohmygit.nextPageBtn',
        async () => {
            const currentItem = gitHistoryProvider.getCurrentReadingItem();
            if (currentItem && currentItem.isReadingTxt) {
                await gitHistoryProvider.nextPage(currentItem);
            } else {
                vscode.window.showInformationMessage('请先选择一个正在阅读的Git记录');
            }
        }
    );

    const lastPageCommand = vscode.commands.registerCommand(
        'ohmygit.lastPage',
        async () => {
            const currentItem = gitHistoryProvider.getCurrentReadingItem();
            if (currentItem && currentItem.isReadingTxt && currentItem.totalPages) {
                await gitHistoryProvider.goToPage(currentItem, currentItem.totalPages);
            } else {
                vscode.window.showInformationMessage('请先选择一个正在阅读的Git记录');
            }
        }
    );

    const goToPageCommand = vscode.commands.registerCommand(
        'ohmygit.goToPage',
        async () => {
            const currentItem = gitHistoryProvider.getCurrentReadingItem();
            if (!currentItem || !currentItem.isReadingTxt) {
                vscode.window.showInformationMessage('请先选择一个正在阅读的Git记录');
                return;
            }

            const currentPage = currentItem.currentPage || 1;
            const totalPages = currentItem.totalPages || 1;
            
            const pageNumber = await vscode.window.showInputBox({
                prompt: `请输入要跳转的页码 (1-${totalPages})`,
                placeHolder: `当前第${currentPage}页，共${totalPages}页`,
                value: currentPage.toString(),
                validateInput: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num < 1) {
                        return '请输入大于0的数字';
                    }
                    if (num > totalPages) {
                        return `页码不能超过总页数 ${totalPages}`;
                    }
                    return null;
                }
            });

            if (pageNumber) {
                const targetPage = parseInt(pageNumber);
                await gitHistoryProvider.goToPage(currentItem, targetPage);
            }
        }
    );

    const toggleHiddenModeCommand = vscode.commands.registerCommand(
        'ohmygit.toggleHiddenMode',
        () => {
            gitHistoryProvider.toggleHiddenMode();
        }
    );

    // 将命令添加到上下文
    context.subscriptions.push(
        gitHistoryView,
        showGitHistoryCommand,
        nextPageCommand,
        previousPageCommand,
        toggleTxtDisplayCommand,
        configureTxtPathCommand,
        showConfigCommand,
        refreshConfigCommand,
        firstPageCommand,
        previousPageBtnCommand,
        nextPageBtnCommand,
        lastPageCommand,
        goToPageCommand,
        toggleHiddenModeCommand
    );

    // 监听配置变化
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('ohmygit')) {
            configManager.updateConfiguration();
            gitHistoryProvider.refresh();
        }
    });

    // 延迟初始刷新，确保所有组件都已初始化
    setTimeout(() => {
        gitHistoryProvider.refresh();
    }, 100);
}

export function deactivate() {
    console.log('Oh My Git 插件已停用');
} 