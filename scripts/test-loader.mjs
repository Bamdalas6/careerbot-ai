import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

export async function resolve(specifier, context, defaultResolve) {
  let target = specifier;
  if (target.startsWith('@/')) {
    target = path.resolve(process.cwd(), 'src', target.slice(2));
  } else if (target.startsWith('./') || target.startsWith('../')) {
    if (context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      target = path.resolve(parentDir, target);
    }
  }

  if (target.startsWith('/') || /^[a-zA-Z]:\\/.test(target)) {
    for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
      const candidate = target + ext;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return defaultResolve(pathToFileURL(candidate).href, context);
      }
    }
  }

  return defaultResolve(specifier, context);
}
