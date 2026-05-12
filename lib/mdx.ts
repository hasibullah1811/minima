/**
 * MDX filesystem engine
 * ----------------------
 * This module is the single bridge between *on-disk* lesson files (`/content/...`) and
 * the App Router. Responsibilities:
 *
 * 1. **Discovery** — enumerate all `(era, topic)` pairs for `generateStaticParams`.
 * 2. **Loading** — read a specific `.mdx` file for a route segment tuple.
 * 3. **Parsing** — split YAML frontmatter from MDX body via `gray-matter`.
 * 4. **Validation** — narrow unknown frontmatter to `MdxFrontmatter` so downstream code
 *    never receives loosely typed metadata.
 *
 * Path convention (intentionally strict):
 *   content/<era>/<topic>.mdx
 * where `<era>` ∈ `Era` and `<topic>` is the filename slug (no nested topic dirs yet).
 */
import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import type { Era, MdxFrontmatter } from "@/lib/types";

/** Absolute path to the `content/` directory at project root. */
const CONTENT_ROOT = path.join(process.cwd(), "content");

const ERA_SET = new Set<string>(["classical", "tree", "neural", "modern"]);

function isEra(value: unknown): value is Era {
  return typeof value === "string" && ERA_SET.has(value);
}

function isDifficulty(
  value: unknown,
): value is MdxFrontmatter["difficulty"] {
  return (
    value === "Beginner" || value === "Intermediate" || value === "Advanced"
  );
}

/**
 * Runtime type guard: YAML frontmatter is `unknown` by design; we validate field-by-field
 * so a malformed lesson fails fast at build/request time instead of corrupting the UI.
 */
export function isMdxFrontmatter(data: unknown): data is MdxFrontmatter {
  if (!data || typeof data !== "object") return false;
  const fm = data as Record<string, unknown>;

  if (typeof fm.title !== "string" || !fm.title.trim()) return false;
  if (typeof fm.description !== "string" || !fm.description.trim())
    return false;
  if (!isEra(fm.era)) return false;
  if (!isDifficulty(fm.difficulty)) return false;
  if (!Array.isArray(fm.tags) || !fm.tags.every((t) => typeof t === "string"))
    return false;
  if (typeof fm.publishedAt !== "string" || !fm.publishedAt.trim())
    return false;
  if (typeof fm.author !== "string" || !fm.author.trim()) return false;
  if (typeof fm.hasVisualizer !== "boolean") return false;

  return true;
}

export interface TopicSlug {
  eraId: Era;
  topic: string;
}

export interface LoadedMdx {
  /** Parsed, validated frontmatter used for layout chrome (badges, SEO, etc.). */
  frontmatter: MdxFrontmatter;
  /** Raw MDX source *without* frontmatter — fed to `next-mdx-remote` in the page layer. */
  body: string;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists every static route segment pair derived from the filesystem.
 * Called by `generateStaticParams` so Next can pre-render all lessons at build time.
 */
export async function listTopicSlugs(): Promise<TopicSlug[]> {
  const entries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true });
  const slugs: TopicSlug[] = [];

  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    if (!isEra(dirent.name)) continue;

    const eraDir = path.join(CONTENT_ROOT, dirent.name);
    const files = await fs.readdir(eraDir);

    for (const file of files) {
      if (!file.endsWith(".mdx")) continue;
      slugs.push({
        eraId: dirent.name,
        topic: file.replace(/\.mdx$/i, ""),
      });
    }
  }

  return slugs;
}

/**
 * Loads and validates a single lesson. Throws if the file is missing or frontmatter
 * does not satisfy `MdxFrontmatter` — callers should treat that as a 404 boundary.
 */
export async function loadMdxLesson(
  eraId: string,
  topic: string,
): Promise<LoadedMdx> {
  if (!isEra(eraId)) {
    throw new Error(`Unknown era segment: ${eraId}`);
  }

  const filePath = path.join(CONTENT_ROOT, eraId, `${topic}.mdx`);
  if (!(await pathExists(filePath))) {
    throw new Error(`MDX not found: ${filePath}`);
  }

  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);

  if (!isMdxFrontmatter(data)) {
    throw new Error(
      `Invalid frontmatter in ${filePath}. Expected MdxFrontmatter shape.`,
    );
  }

  if (data.era !== eraId) {
    throw new Error(
      `Frontmatter era "${data.era}" does not match path era "${eraId}" in ${filePath}`,
    );
  }

  return { frontmatter: data, body: content.trimStart() };
}
