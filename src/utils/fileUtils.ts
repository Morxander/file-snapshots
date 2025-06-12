import * as path from 'path';

export function getLanguageFromFilename(filename: string): string {
	const ext = path.extname(filename).toLowerCase();
	const languageMap: { [key: string]: string } = {
		'.js': 'javascript',
		'.ts': 'typescript',
		'.jsx': 'javascriptreact',
		'.tsx': 'typescriptreact',
		'.py': 'python',
		'.java': 'java',
		'.cpp': 'cpp',
		'.c': 'c',
		'.cs': 'csharp',
		'.php': 'php',
		'.rb': 'ruby',
		'.go': 'go',
		'.rs': 'rust',
		'.html': 'html',
		'.css': 'css',
		'.scss': 'scss',
		'.sass': 'sass',
		'.less': 'less',
		'.json': 'json',
		'.xml': 'xml',
		'.yaml': 'yaml',
		'.yml': 'yaml',
		'.md': 'markdown',
		'.sql': 'sql',
		'.sh': 'shellscript',
		'.bat': 'bat',
		'.ps1': 'powershell',
		'.al': 'al'
	};
	return languageMap[ext] || 'plaintext';
}

export function getFileExtension(filename: string): string {
	return path.extname(filename).slice(1) || 'txt';
} 