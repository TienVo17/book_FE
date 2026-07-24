import fs from 'fs';
import path from 'path';

const testFilePattern = /\.(test|spec)\.(js|jsx|ts|tsx)$/;
const localHostPattern = new RegExp(['local', 'host'].join(''), 'i');
const ipv4LoopbackPattern = /(?:^|[^0-9])127(?:\.[0-9]{1,3}){0,3}(?:[^0-9]|$)/;
const ipv6LoopbackPatterns = [
  ['[', '::', '1', ']'].join(''),
  ['[', '0:0:0:0:0:0:0:1', ']'].join(''),
  ['[', '::', '0001', ']'].join(''),
];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }

    return /\.(js|jsx|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe('backend request source migration', () => {
  it('keeps loopback API hosts exclusively in the canonical URL resolver', () => {
    const sourceDirectory = path.join(process.cwd(), 'src');
    const resolverPath = path.join(sourceDirectory, 'api', 'ApiUrl.ts');
    const filesOutsideResolver = sourceFiles(sourceDirectory)
      .filter((filePath) => path.resolve(filePath) !== path.resolve(resolverPath))
      .filter((filePath) => !testFilePattern.test(filePath));

    const filesWithForbiddenHost = filesOutsideResolver.filter((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      return localHostPattern.test(source)
        || ipv4LoopbackPattern.test(source)
        || ipv6LoopbackPatterns.some((host) => source.includes(host));
    });

    expect(filesWithForbiddenHost).toEqual([]);
  });
});
