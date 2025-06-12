import * as vscode from 'vscode';
import { SnapshotManager } from '../SnapshotManager';
import { SnapshotTreeProvider } from '../SnapshotTreeProvider';

export async function takeSnapshotCommand(
	snapshotManager: SnapshotManager,
	treeProvider: SnapshotTreeProvider,
	uri?: vscode.Uri
) {
	// If no URI provided (e.g., called from command palette), use the active editor
	let targetUri = uri;
	if (!targetUri) {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage('No file is currently open. Please open a file or right-click on a file to create a snapshot.');
			return;
		}
		
		// Check if the active document is saved
		if (activeEditor.document.isUntitled) {
			vscode.window.showErrorMessage('Please save the file before creating a snapshot.');
			return;
		}
		
		targetUri = activeEditor.document.uri;
	}

	// Ensure we're working with a file (not a folder or other resource)
	if (targetUri.scheme !== 'file') {
		vscode.window.showErrorMessage('Can only create snapshots of saved files.');
		return;
	}

	const fileName = targetUri.fsPath.split('/').pop() || 'Unknown';
	const snapshotName = await vscode.window.showInputBox({
		prompt: `Enter a name for the snapshot of "${fileName}"`,
		placeHolder: 'Snapshot name',
		validateInput: (value: string) => {
			if (!value || value.trim().length === 0) {
				return 'Snapshot name cannot be empty';
			}
			return null;
		}
	});

	if (snapshotName) {
		try {
			const snapshotId = await snapshotManager.saveSnapshot(targetUri.fsPath, snapshotName.trim());
			vscode.window.showInformationMessage(`Snapshot "${snapshotName}" created successfully for ${fileName}`);
			
			// Refresh the tree view
			treeProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to create snapshot: ${error}`);
		}
	}
} 