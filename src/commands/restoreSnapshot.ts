import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SnapshotManager } from '../SnapshotManager';
import { SnapshotTreeProvider } from '../SnapshotTreeProvider';

export async function restoreSnapshotCommand(
	snapshotManager: SnapshotManager,
	treeProvider: SnapshotTreeProvider,
	treeItem: any
) {
	try {
		if (treeItem && treeItem.snapshot) {
			const snapshot = treeItem.snapshot;
			const originalFilePath = snapshot.originalFilePath;
			const originalFileName = path.basename(originalFilePath);
			const snapshotName = snapshot.name;

			// Check if original file still exists
			if (!fs.existsSync(originalFilePath)) {
				const choice = await vscode.window.showWarningMessage(
					`Original file "${originalFileName}" no longer exists. Would you like to create it with snapshot content?`,
					'Create File'
				);
				
				if (choice === 'Create File') {
					const snapshotContent = await snapshotManager.getSnapshotContent(snapshot.id);
					fs.writeFileSync(originalFilePath, snapshotContent, 'utf8');
					vscode.window.showInformationMessage(`File "${originalFileName}" created from snapshot "${snapshotName}"`);
					
					// Open the restored file
					const doc = await vscode.workspace.openTextDocument(originalFilePath);
					await vscode.window.showTextDocument(doc);
				}
				return;
			}

			// Show confirmation dialog
			const confirmChoice = await vscode.window.showWarningMessage(
				`Are you sure you want to restore "${originalFileName}" to snapshot "${snapshotName}"?\n\nThis will replace the current file content. A backup snapshot will be created automatically.`,
				{ modal: true },
				'Yes, Restore'
			);

			if (confirmChoice !== 'Yes, Restore') {
				return;
			}

			// Step 1: Create auto-backup snapshot of current version
			const autoSnapshotName = `Auto snapshot before restoring ${snapshotName}`;
			try {
				await snapshotManager.saveSnapshot(originalFilePath, autoSnapshotName);
				console.log(`Auto-backup snapshot created: "${autoSnapshotName}"`);
			} catch (backupError) {
				const continueChoice = await vscode.window.showErrorMessage(
					`Failed to create backup snapshot: ${backupError}\n\nDo you still want to continue with restore?`,
					{ modal: true },
					'Continue Anyway'
				);
				
				if (continueChoice !== 'Continue Anyway') {
					return;
				}
			}

			// Step 2: Restore the snapshot content
			const snapshotContent = await snapshotManager.getSnapshotContent(snapshot.id);
			fs.writeFileSync(originalFilePath, snapshotContent, 'utf8');

			// Step 3: Refresh the tree view and show success message
			treeProvider.refresh();
			vscode.window.showInformationMessage(
				`Successfully restored "${originalFileName}" to snapshot "${snapshotName}". Auto-backup created.`
			);

			// Step 4: Open the restored file if it's not already open
			const doc = await vscode.workspace.openTextDocument(originalFilePath);
			await vscode.window.showTextDocument(doc);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to restore snapshot: ${error}`);
	}
} 