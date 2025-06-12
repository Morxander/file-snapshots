import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SnapshotManager } from '../SnapshotManager';
import { getLanguageFromFilename, getFileExtension } from '../utils/fileUtils';

export async function diffSnapshotCommand(snapshotManager: SnapshotManager, treeItem: any) {
	try {
		if (treeItem && treeItem.snapshot) {
			const snapshot = treeItem.snapshot;
			const originalFilePath = snapshot.originalFilePath;
			const originalFileName = path.basename(originalFilePath);
			const snapshotName = snapshot.name;

			// Get snapshot content
			const snapshotContent = await snapshotManager.getSnapshotContent(snapshot.id);
			
			// Check if original file still exists
			if (!fs.existsSync(originalFilePath)) {
				const choice = await vscode.window.showWarningMessage(
					`Original file "${originalFileName}" no longer exists. Would you like to see the snapshot content only?`,
					'Show Snapshot'
				);
				
				if (choice === 'Show Snapshot') {
					// Just show the snapshot content
					const doc = await vscode.workspace.openTextDocument({
						content: snapshotContent,
						language: getLanguageFromFilename(originalFileName)
					});
					await vscode.window.showTextDocument(doc);
				}
				return;
			}

			// Create temporary URI for snapshot content
			const snapshotUri = vscode.Uri.parse(`untitled:Snapshot - ${snapshotName}.${getFileExtension(originalFileName)}`);
			const currentFileUri = vscode.Uri.file(originalFilePath);

			// Create a temporary document for the snapshot
			const snapshotDoc = await vscode.workspace.openTextDocument({
				content: snapshotContent,
				language: getLanguageFromFilename(originalFileName)
			});

			// Use VS Code's built-in diff command
			await vscode.commands.executeCommand(
				'vscode.diff',
				snapshotDoc.uri,           // Left side - snapshot
				currentFileUri,            // Right side - current file
				`${snapshotName} ↔ ${originalFileName}`,  // Title
				{
					preview: true
				}
			);

			// Show information about the diff
			vscode.window.showInformationMessage(
				`Comparing snapshot "${snapshotName}" with current "${originalFileName}"`
			);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to compare snapshot: ${error}`);
	}
} 