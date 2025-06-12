import * as vscode from 'vscode';
import { SnapshotManager } from './SnapshotManager';
import { SnapshotTreeProvider } from './SnapshotTreeProvider';
import { registerCommands } from './commands';

let snapshotManager: SnapshotManager;
let treeProvider: SnapshotTreeProvider;

export async function activate(context: vscode.ExtensionContext) {
	console.log('File Snapshots extension is now active!');

	// Initialize snapshot manager
	snapshotManager = new SnapshotManager(context);
	try {
		await snapshotManager.initialize();
		console.log('Snapshot manager initialized successfully');
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to initialize snapshot storage: ${error}`);
		return;
	}

	// Initialize tree provider
	treeProvider = new SnapshotTreeProvider(snapshotManager);
	vscode.window.createTreeView('fileSnapshots', { treeDataProvider: treeProvider });

	// Register all commands
	const commandDisposables = registerCommands(context, snapshotManager, treeProvider);

	// Add all disposables to context subscriptions
	context.subscriptions.push(...commandDisposables);
}

export async function deactivate() {
	console.log('File Snapshots extension is now deactivated.');
	if (snapshotManager) {
		await snapshotManager.close();
	}
} 