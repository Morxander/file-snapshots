import * as vscode from 'vscode';
import * as path from 'path';
import { SnapshotManager } from '../SnapshotManager';
import { SnapshotTreeProvider } from '../SnapshotTreeProvider';

export async function deleteSnapshotCommand(
	snapshotManager: SnapshotManager,
	treeProvider: SnapshotTreeProvider,
	treeItem: any
) {
	try {
		if (treeItem && treeItem.snapshot) {
			const snapshot = treeItem.snapshot;
			const snapshotName = snapshot.name;
			const originalFileName = path.basename(snapshot.originalFilePath);

			// Show confirmation dialog
			const confirmChoice = await vscode.window.showWarningMessage(
				`Are you sure you want to delete snapshot "${snapshotName}" of "${originalFileName}"?\n\nThis action cannot be undone.`,
				{ modal: true },
				'Yes, Delete'
			);

			if (confirmChoice !== 'Yes, Delete') {
				return;
			}

			// Delete the snapshot
			await snapshotManager.deleteSnapshot(snapshot.id);

			// Refresh the tree view and show success message
			treeProvider.refresh();
			vscode.window.showInformationMessage(
				`Snapshot "${snapshotName}" deleted successfully.`
			);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to delete snapshot: ${error}`);
	}
} 