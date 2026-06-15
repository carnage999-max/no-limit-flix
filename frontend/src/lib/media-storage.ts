import { promises as fs } from 'fs';
import path from 'path';

import { buildMediaUrl, normalizeMediaPath } from './media';

export const getMediaRoot = () => process.env.MEDIA_ROOT?.trim() || '/app/media';

export const getAbsoluteMediaPath = (relativePath: string) => {
  const normalized = normalizeMediaPath(relativePath);
  if (!normalized) {
    throw new Error('Media path is required');
  }

  const root = path.resolve(getMediaRoot());
  const absolute = path.resolve(root, normalized);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error('Resolved media path escapes MEDIA_ROOT');
  }

  return { absolute, normalized };
};

export const writeMediaBuffer = async (relativePath: string, buffer: Buffer) => {
  const { absolute, normalized } = getAbsoluteMediaPath(relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return {
    absolutePath: absolute,
    relativePath: normalized,
    publicUrl: buildMediaUrl(normalized),
  };
};

export const copyFileToMedia = async (sourcePath: string, relativePath: string) => {
  const { absolute, normalized } = getAbsoluteMediaPath(relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.copyFile(sourcePath, absolute);
  return {
    absolutePath: absolute,
    relativePath: normalized,
    publicUrl: buildMediaUrl(normalized),
  };
};
