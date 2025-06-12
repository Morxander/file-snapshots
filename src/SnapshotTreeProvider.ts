import * as vscode from 'vscode';
import * as path from 'path';
import { SnapshotManager, SnapshotMetadata } from './SnapshotManager';

export class SnapshotTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'snapshot' | 'file',
        public readonly snapshot?: SnapshotMetadata,
        public readonly filePath?: string
    ) {
        super(label, collapsibleState);
        
        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.iconPath = this.getIconPath();
        this.contextValue = type;
        
        if (type === 'file' && snapshot) {
            this.command = {
                command: 'file-snapshots.openSnapshot',
                title: 'Open Snapshot',
                arguments: [snapshot]
            };
        }
    }

    private getTooltip(): string {
        if (this.type === 'snapshot' && this.snapshot) {
            const date = new Date(this.snapshot.timestamp).toLocaleString();
            return `Snapshot: ${this.snapshot.name}\nCreated: ${date}\nSize: ${this.snapshot.fileSize} bytes`;
        } else if (this.type === 'file' && this.filePath) {
            return `File: ${this.filePath}`;
        }
        return this.label;
    }

    private getDescription(): string {
        if (this.type === 'snapshot' && this.snapshot) {
            const date = new Date(this.snapshot.timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffDays > 0) {
                return `${diffDays}d ago`;
            } else if (diffHours > 0) {
                return `${diffHours}h ago`;
            } else if (diffMinutes > 0) {
                return `${diffMinutes}m ago`;
            } else {
                return 'Just now';
            }
        }
        return '';
    }

    private getIconPath(): vscode.ThemeIcon {
        if (this.type === 'snapshot') {
            return new vscode.ThemeIcon('archive');
        } else {
            return new vscode.ThemeIcon('file');
        }
    }
}

export class SnapshotTreeProvider implements vscode.TreeDataProvider<SnapshotTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnapshotTreeItem | undefined | null | void> = new vscode.EventEmitter<SnapshotTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SnapshotTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private snapshots: SnapshotMetadata[] = [];

    constructor(private snapshotManager: SnapshotManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SnapshotTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SnapshotTreeItem): Promise<SnapshotTreeItem[]> {
        if (!element) {
            // Root level - show snapshots
            await this.loadAllSnapshots();
            const snapshotItems: SnapshotTreeItem[] = [];
            
            for (const snapshot of this.snapshots) {
                const snapshotItem = new SnapshotTreeItem(
                    snapshot.name,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'snapshot',
                    snapshot
                );
                snapshotItems.push(snapshotItem);
            }
            
            // Sort snapshots by timestamp (newest first)
            return snapshotItems.sort((a, b) => {
                if (a.snapshot && b.snapshot) {
                    return b.snapshot.timestamp - a.snapshot.timestamp;
                }
                return 0;
            });
        } else if (element.type === 'snapshot' && element.snapshot) {
            // Show files for this snapshot (currently only one file per snapshot)
            const fileName = path.basename(element.snapshot.originalFilePath);
            const fileItem = new SnapshotTreeItem(
                fileName,
                vscode.TreeItemCollapsibleState.None,
                'file',
                element.snapshot,
                element.snapshot.originalFilePath
            );
            return [fileItem];
        }
        
        return [];
    }

    private async loadAllSnapshots(): Promise<void> {
        try {
            this.snapshots = await this.getAllSnapshots();
        } catch (error) {
            console.error('Failed to load snapshots:', error);
            this.snapshots = [];
        }
    }

    private async getAllSnapshots(): Promise<SnapshotMetadata[]> {
        // We need to add this method to SnapshotManager
        // For now, we'll return an empty array and implement it next
        try {
            return await this.snapshotManager.getAllSnapshots();
        } catch (error) {
            console.error('Error getting all snapshots:', error);
            return [];
        }
    }

    async onSnapshotCreated(): Promise<void> {
        // Refresh the tree when a new snapshot is created
        this.refresh();
    }
} 