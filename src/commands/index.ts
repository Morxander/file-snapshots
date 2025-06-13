import * as vscode from 'vscode';
import { SnapshotManager } from '../SnapshotManager';
import { SnapshotTreeProvider } from '../SnapshotTreeProvider';

// Export individual command handlers
export { takeSnapshotCommand } from './takeSnapshot';
export { openSnapshotCommand } from './openSnapshot';
export { deleteSnapshotCommand } from './deleteSnapshot';
export { restoreSnapshotCommand } from './restoreSnapshot';
export { exportSnapshotCommand } from './exportSnapshot';

// Import command handlers for registry
import { takeSnapshotCommand } from './takeSnapshot';
import { openSnapshotCommand } from './openSnapshot';
import { refreshSnapshotsCommand } from './refreshSnapshots';
import { deleteSnapshotCommand } from './deleteSnapshot';
import { diffSnapshotCommand } from './diffSnapshot';
import { restoreSnapshotCommand } from './restoreSnapshot';
import { exportSnapshotCommand } from './exportSnapshot';

export function registerCommands(
	context: vscode.ExtensionContext,
	snapshotManager: SnapshotManager,
	treeProvider: SnapshotTreeProvider
): vscode.Disposable[] {
	const disposables: vscode.Disposable[] = [];

	// Take snapshot command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.takeSnapshot', (uri?: vscode.Uri) =>
			takeSnapshotCommand(snapshotManager, treeProvider, uri)
		)
	);

	// Refresh snapshots command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.refreshSnapshots', () =>
			refreshSnapshotsCommand(treeProvider)
		)
	);

	// Open snapshot command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.openSnapshot', (snapshot) =>
			openSnapshotCommand(snapshotManager, snapshot)
		)
	);

	// Delete snapshot command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.deleteSnapshot', (treeItem) =>
			deleteSnapshotCommand(snapshotManager, treeProvider, treeItem)
		)
	);

	// Diff snapshot command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.diffSnapshot', (treeItem) =>
			diffSnapshotCommand(snapshotManager, treeItem)
		)
	);

	// Restore snapshot command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.restoreSnapshot', (treeItem) =>
			restoreSnapshotCommand(snapshotManager, treeProvider, treeItem)
		)
	);

	// Export snapshot command
	disposables.push(
		vscode.commands.registerCommand('file-snapshots.exportSnapshot', (treeItem) =>
			exportSnapshotCommand(snapshotManager, treeItem)
		)
	);

	return disposables;
} 