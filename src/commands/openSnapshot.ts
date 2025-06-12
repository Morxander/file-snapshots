import * as vscode from 'vscode';
import { SnapshotManager } from '../SnapshotManager';

export async function openSnapshotCommand(snapshotManager: SnapshotManager, snapshot: any) {
	try {
		const content = await snapshotManager.getSnapshotContent(snapshot.id);
		const doc = await vscode.workspace.openTextDocument({
			content: content,
			language: 'plaintext'
		});
		await vscode.window.showTextDocument(doc);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open snapshot: ${error}`);
	}
} 