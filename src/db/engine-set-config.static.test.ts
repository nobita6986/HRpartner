import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Define the root of our source directory
const SRC_DIR = path.resolve(__dirname, '..', '..', 'src');

function getAllTsFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllTsFiles(fullPath, arrayOfFiles);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('.test.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

describe('engine-set-config static checks', () => {
  it('rejects set_config with is_local=false (MUST always use true for engine context)', () => {
    const tsFiles = getAllTsFiles(SRC_DIR);
    const errors: string[] = [];

    tsFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Look for set_config('hrp.engine_context', ..., false)
      // This is a naive regex but sufficient for static linting
      const forbiddenPattern = /set_config\s*\(\s*['"]hrp\.engine_context['"]\s*,\s*[^,]+,\s*false\s*\)/g;
      
      if (forbiddenPattern.test(content)) {
        errors.push(`Found forbidden set_config(..., false) in ${file}`);
      }
    });

    expect(errors).toHaveLength(0);
  });
});
