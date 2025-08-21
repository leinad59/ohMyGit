import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { TxtContentManager as ITxtContentManager } from './types/readerTypes';

export class TxtContentManager implements ITxtContentManager {
    private fileCache: Map<string, { content: string; timestamp: number }> = new Map();
    private readonly cacheTimeout = 5 * 60 * 1000; // 5分钟缓存超时
    private readonly maxCacheSize = 10; // 最大缓存文件数

    async loadFile(filePath: string): Promise<string> {
        try {
            // 检查缓存
            const cached = this.fileCache.get(filePath);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.content;
            }

            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                throw new Error(`文件不存在: ${filePath}`);
            }

            // 读取文件内容
            const content = await this.readFileWithEncoding(filePath);
            
            // 缓存文件内容
            this.cacheFile(filePath, content);
            
            return content;
        } catch (error) {
            console.error('读取TXT文件失败:', error);
            throw error;
        }
    }

    getPageContent(content: string, page: number, pageSize: number): string {
        // 按字符数分页，而不是按行数
        const totalLength = content.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalLength);
        
        if (startIndex >= totalLength) {
            return '';
        }
        
        return content.substring(startIndex, endIndex);
    }

    getTotalPages(content: string, pageSize: number): number {
        // 按字符数计算总页数
        return Math.ceil(content.length / pageSize);
    }

    cacheFile(filePath: string, content: string): void {
        // 清理过期缓存
        this.cleanExpiredCache();
        
        // 如果缓存已满，删除最旧的条目
        if (this.fileCache.size >= this.maxCacheSize) {
            const oldestKey = this.fileCache.keys().next().value;
            this.fileCache.delete(oldestKey);
        }
        
        this.fileCache.set(filePath, {
            content,
            timestamp: Date.now()
        });
    }

    clearCache(): void {
        this.fileCache.clear();
    }

    private async readFileWithEncoding(filePath: string): Promise<string> {
        // 尝试不同的编码格式
        const encodings = ['utf8', 'gbk', 'gb2312', 'big5'];
        
        for (const encoding of encodings) {
            try {
                const buffer = await fs.promises.readFile(filePath);
                
                if (encoding === 'utf8') {
                    return buffer.toString('utf8');
                } else {
                    // 对于非UTF-8编码，使用iconv-lite进行转换
                    // 注意：这里需要安装iconv-lite依赖
                    try {
                        const iconv = require('iconv-lite');
                        return iconv.decode(buffer, encoding);
                    } catch (iconvError) {
                        // 如果iconv-lite不可用，尝试直接解码
                        continue;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        // 如果所有编码都失败，使用默认UTF-8
        const buffer = await fs.promises.readFile(filePath);
        return buffer.toString('utf8');
    }

    private cleanExpiredCache(): void {
        const now = Date.now();
        for (const [key, value] of this.fileCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.fileCache.delete(key);
            }
        }
    }

    // 获取文件统计信息
    async getFileStats(filePath: string): Promise<{ size: number; lines: number }> {
        try {
            const content = await this.loadFile(filePath);
            const lines = content.split('\n');
            const stats = fs.statSync(filePath);
            
            return {
                size: stats.size,
                lines: lines.length
            };
        } catch (error) {
            throw new Error(`获取文件统计信息失败: ${error}`);
        }
    }

    // 检查文件是否可读
    isFileReadable(filePath: string): boolean {
        try {
            return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    }
} 