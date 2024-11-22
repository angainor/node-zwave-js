import path from "pathe";
import { Bytes } from "./Bytes.js";
import {
	type CopyFile,
	type ManageDirectory,
	type ReadFile,
	type ReadFileSystemInfo,
	type WriteFile,
} from "./bindings.js";
import { getErrorMessage } from "./errors.js";

export async function enumFilesRecursive(
	fs: ReadFileSystemInfo,
	rootDir: string,
	predicate?: (filename: string) => boolean,
): Promise<string[]> {
	const ret: string[] = [];
	try {
		const filesAndDirs = await fs.readDir(rootDir);
		for (const f of filesAndDirs) {
			const fullPath = path.join(rootDir, f);

			if ((await fs.stat(fullPath)).isDirectory()) {
				ret.push(
					...(await enumFilesRecursive(fs, fullPath, predicate)),
				);
			} else if (predicate == undefined || predicate(fullPath)) {
				ret.push(fullPath);
			}
		}
	} catch (e) {
		console.error(
			`Cannot read directory: "${rootDir}": ${getErrorMessage(e, true)}`,
		);
	}

	return ret;
}

export async function copyFilesRecursive(
	fs: ManageDirectory & CopyFile & ReadFileSystemInfo,
	sourceDir: string,
	targetDir: string,
	predicate?: (filename: string) => boolean,
): Promise<void> {
	const files = await enumFilesRecursive(fs, sourceDir, predicate);
	for (const file of files) {
		const relative = path.relative(sourceDir, file);
		const target = path.join(targetDir, relative);
		await fs.ensureDir(path.dirname(target));
		await fs.copyFile(file, target);
	}
}

export async function readTextFile(
	fs: ReadFile,
	filename: string,
	encoding: BufferEncoding = "utf8",
): Promise<string> {
	const buffer = await fs.readFile(filename);
	return Bytes.view(buffer).toString(encoding);
}

export async function writeTextFile(
	fs: WriteFile,
	filename: string,
	content: string,
	encoding: BufferEncoding = "utf8",
): Promise<void> {
	const buffer = Bytes.from(content, encoding);
	await fs.writeFile(filename, buffer);
}

export async function readJSON<T = any>(
	fs: ReadFile,
	filename: string,
): Promise<T> {
	const content = await readTextFile(fs, filename);
	return JSON.parse(content);
}

export async function pathExists(
	fs: ReadFileSystemInfo,
	filename: string,
): Promise<boolean> {
	try {
		await fs.stat(filename);
		return true;
	} catch {
		return false;
	}
}
