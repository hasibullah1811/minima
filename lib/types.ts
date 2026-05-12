/**
 * Content contract: every MDX lesson under `/content/<era>/<topic>.mdx` must expose
 * this frontmatter shape so the routing engine (`lib/mdx.ts`) and UI can stay in sync.
 *
 * `Era` doubles as the first URL segment (`/era/[eraId]/...`) and the on-disk folder name.
 */
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Era = "classical" | "tree" | "neural" | "modern";

export interface MdxFrontmatter {
  title: string;
  description: string;
  era: Era;
  difficulty: Difficulty;
  tags: string[];
  publishedAt: string;
  author: string;
  hasVisualizer: boolean;
}
