import * as vscode from 'vscode';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

export interface SnapshotMetadata {
    id: string;
    name: string;
    originalFilePath: string;
    timestamp: number;
    fileSize: number;
    contentHash: string;
    contentStoragePath: string;
}

export class SnapshotManager {
    private db: sqlite3.Database | null = null;
    private dbPath: string;
    private storageDir: string;

    constructor(private context: vscode.ExtensionContext) {
        // Use .vscode/snapshots directory in the workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found. Please open a folder or workspace to use File Snapshots.');
        }
        
        this.storageDir = path.join(workspaceFolder.uri.fsPath, '.vscode', 'snapshots');
        this.dbPath = path.join(this.storageDir, 'snapshots.db');
    }

    async initialize(): Promise<void> {
        // Ensure storage directory exists
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }

        // Create snapshots content directory
        const contentDir = path.join(this.storageDir, 'content');
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
        }

        // Add to .gitignore on first initialization
        await this.ensureGitIgnore();

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    private async createTables(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                original_file_path TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                file_size INTEGER NOT NULL,
                content_hash TEXT NOT NULL,
                content_storage_path TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_snapshots_path ON snapshots(original_file_path);
            CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
        `;

        return new Promise((resolve, reject) => {
            this.db!.exec(createTableSQL, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async saveSnapshot(filePath: string, name: string): Promise<string> {
        if (!this.db) throw new Error('Database not initialized');

        // Read file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileStats = fs.statSync(filePath);
        
        // Generate unique ID and hash
        const snapshotId = this.generateId();
        const contentHash = this.generateHash(fileContent);
        
        // Save content to file system
        const contentFileName = `${snapshotId}.snapshot`;
        const contentStoragePath = path.join(this.storageDir, 'content', contentFileName);
        fs.writeFileSync(contentStoragePath, fileContent, 'utf8');

        // Save metadata to database
        const metadata: SnapshotMetadata = {
            id: snapshotId,
            name: name,
            originalFilePath: filePath,
            timestamp: Date.now(),
            fileSize: fileStats.size,
            contentHash: contentHash,
            contentStoragePath: contentStoragePath
        };

        return new Promise((resolve, reject) => {
            const insertSQL = `
                INSERT INTO snapshots (
                    id, name, original_file_path, timestamp, 
                    file_size, content_hash, content_storage_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            this.db!.run(insertSQL, [
                metadata.id,
                metadata.name,
                metadata.originalFilePath,
                metadata.timestamp,
                metadata.fileSize,
                metadata.contentHash,
                metadata.contentStoragePath
            ], function(err) {
                if (err) reject(err);
                else resolve(snapshotId);
            });
        });
    }

    async getSnapshotsForFile(filePath: string): Promise<SnapshotMetadata[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const selectSQL = `
                SELECT * FROM snapshots 
                WHERE original_file_path = ? 
                ORDER BY timestamp DESC
            `;

            this.db!.all(selectSQL, [filePath], (err, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    const snapshots = rows.map(row => ({
                        id: row.id,
                        name: row.name,
                        originalFilePath: row.original_file_path,
                        timestamp: row.timestamp,
                        fileSize: row.file_size,
                        contentHash: row.content_hash,
                        contentStoragePath: row.content_storage_path
                    }));
                    resolve(snapshots);
                }
            });
        });
    }

    async getAllSnapshots(): Promise<SnapshotMetadata[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const selectSQL = `
                SELECT * FROM snapshots 
                ORDER BY timestamp DESC
            `;

            this.db!.all(selectSQL, [], (err, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    const snapshots = rows.map(row => ({
                        id: row.id,
                        name: row.name,
                        originalFilePath: row.original_file_path,
                        timestamp: row.timestamp,
                        fileSize: row.file_size,
                        contentHash: row.content_hash,
                        contentStoragePath: row.content_storage_path
                    }));
                    resolve(snapshots);
                }
            });
        });
    }

    async getSnapshotContent(snapshotId: string): Promise<string> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const selectSQL = 'SELECT content_storage_path FROM snapshots WHERE id = ?';
            
            this.db!.get(selectSQL, [snapshotId], (err, row: any) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error('Snapshot not found'));
                } else {
                    try {
                        const content = fs.readFileSync(row.content_storage_path, 'utf8');
                        resolve(content);
                    } catch (fileErr) {
                        reject(fileErr);
                    }
                }
            });
        });
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private generateHash(content: string): string {
        // Simple hash function for content verification
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    async deleteSnapshot(snapshotId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            // First get the snapshot to find the content file path
            const selectSQL = 'SELECT content_storage_path FROM snapshots WHERE id = ?';
            
            this.db!.get(selectSQL, [snapshotId], (err, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    reject(new Error('Snapshot not found'));
                    return;
                }

                const contentPath = row.content_storage_path;

                // Delete from database
                const deleteSQL = 'DELETE FROM snapshots WHERE id = ?';
                this.db!.run(deleteSQL, [snapshotId], (deleteErr) => {
                    if (deleteErr) {
                        reject(deleteErr);
                        return;
                    }

                    // Delete the content file
                    try {
                        if (fs.existsSync(contentPath)) {
                            fs.unlinkSync(contentPath);
                        }
                        resolve();
                    } catch (fileErr) {
                        // Database record is already deleted, but warn about file
                        console.warn(`Snapshot deleted from database but failed to delete content file: ${fileErr}`);
                        resolve(); // Don't fail the operation
                    }
                });
            });
        });
    }

    private async ensureGitIgnore(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return;

            // Check if this is actually a git repository
            const gitDirPath = path.join(workspaceFolder.uri.fsPath, '.git');
            if (!fs.existsSync(gitDirPath)) {
                // Not a git repository, skip gitignore handling
                console.log('Workspace is not a git repository, skipping .gitignore setup');
                return;
            }

            // Check if we've already handled gitignore setup for this project
            const gitIgnoreMarkerPath = path.join(this.storageDir, '.gitignore-handled');
            if (fs.existsSync(gitIgnoreMarkerPath)) {
                // We've already offered to add to gitignore, respect user's current choice
                return;
            }

            const gitIgnorePath = path.join(workspaceFolder.uri.fsPath, '.gitignore');
            const snapshotsEntry = '.vscode/snapshots/';

            // Check if .gitignore exists
            if (fs.existsSync(gitIgnorePath)) {
                // Read existing .gitignore
                const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
                
                // Check if our entry already exists
                if (!gitIgnoreContent.includes(snapshotsEntry)) {
                    // Add our entry with a comment
                    const newContent = gitIgnoreContent.endsWith('\n') ? gitIgnoreContent : gitIgnoreContent + '\n';
                    const entryWithComment = `# File Snapshots extension\n${snapshotsEntry}\n`;
                    fs.writeFileSync(gitIgnorePath, newContent + entryWithComment, 'utf8');
                    console.log('Added .vscode/snapshots/ to .gitignore');
                }
            } else {
                // Create .gitignore with our entry
                const content = `# File Snapshots extension\n${snapshotsEntry}\n`;
                fs.writeFileSync(gitIgnorePath, content, 'utf8');
                console.log('Created .gitignore with snapshots entry');
            }

            // Create marker file to indicate we've handled gitignore setup
            fs.writeFileSync(gitIgnoreMarkerPath, 'This file indicates that gitignore setup has been handled for File Snapshots extension.\nIf you remove .vscode/snapshots/ from .gitignore, the extension will respect your choice.\n', 'utf8');

        } catch (error) {
            // Don't fail initialization if .gitignore update fails
            console.warn('Failed to update .gitignore:', error);
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            return new Promise((resolve) => {
                this.db!.close(() => {
                    this.db = null;
                    resolve();
                });
            });
        }
    }
} 