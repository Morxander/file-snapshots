import { SnapshotTreeProvider } from '../SnapshotTreeProvider';

export function refreshSnapshotsCommand(treeProvider: SnapshotTreeProvider) {
	treeProvider.refresh();
} 