import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SnapshotManager } from '../SnapshotManager';
import { getFileExtension } from '../utils/fileUtils';

export async function exportSnapshotCommand(snapshotManager: SnapshotManager, treeItem: any) {
	try {
		if (treeItem && treeItem.snapshot) {
			const snapshot = treeItem.snapshot;
			const originalFileName = path.basename(snapshot.originalFilePath);
			const snapshotName = snapshot.name;
			const fileExtension = getFileExtension(originalFileName);

			// Create suggested filename
			const suggestedName = `${path.parse(originalFileName).name}_${snapshotName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;

			// Show save dialog
			const saveUri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(suggestedName),
				filters: {
					'All Files': ['*'],
					[`${fileExtension.toUpperCase()} Files`]: [fileExtension]
				},
				title: `Export snapshot "${snapshotName}"`
			});

			if (!saveUri) {
				return; // User cancelled
			}

			// Get snapshot content
			const snapshotContent = await snapshotManager.getSnapshotContent(snapshot.id);

			// Write content to selected file
			fs.writeFileSync(saveUri.fsPath, snapshotContent, 'utf8');

			// Show success message with option to open the exported file
			const choice = await vscode.window.showInformationMessage(
				`Snapshot "${snapshotName}" exported successfully to "${path.basename(saveUri.fsPath)}"`,
				'Open Exported File'
			);

			if (choice === 'Open Exported File') {
				const doc = await vscode.workspace.openTextDocument(saveUri);
				await vscode.window.showTextDocument(doc);
			}
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to export snapshot: ${error}`);
	}
} 