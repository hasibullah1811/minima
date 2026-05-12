import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";

import KMeansCanvas from "@/components/visualizations/KMeansCanvas";
import KNNCanvas from "@/components/visualizations/KNNCanvas";
import { loadMdxLesson, listTopicSlugs } from "@/lib/mdx";
import type { Era } from "@/lib/types";

/**
 * Route: `/era/[eraId]/[topic]`
 * ---------------------------
 * **Data flow**
 * 1. `generateStaticParams` walks `/content` and emits every `(eraId, topic)` slug pair.
 * 2. At build time (and on ISR if enabled later), this Server Component loads the MDX file,
 *    validates frontmatter (`lib/mdx.ts`), and compiles MDX → React via `next-mdx-remote` RSC.
 * 3. Layout chrome (title, description, badges) comes from validated metadata, not from
 *    ad-hoc parsing in the view — keeping the UI decoupled from filesystem details.
 *
 * **MDX component map**
 * Shortcodes in MDX (e.g. `<KMeansCanvas />`) are explicitly mapped here so that:
 * - imports stay server-oriented where possible, and
 * - client islands are opt-in per component (`"use client"` inside the target module).
 */
export const dynamicParams = false;

const mdxComponents = {
  KMeansCanvas,
  KNNCanvas,
};

export async function generateStaticParams(): Promise<
  { eraId: Era; topic: string }[]
> {
  const slugs = await listTopicSlugs();
  return slugs.map(({ eraId, topic }) => ({ eraId, topic }));
}

type PageParams = { eraId: string; topic: string };

export async function generateMetadata(props: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { eraId, topic } = await props.params;

  try {
    const { frontmatter } = await loadMdxLesson(eraId, topic);
    return {
      title: frontmatter.title,
      description: frontmatter.description,
      openGraph: {
        title: frontmatter.title,
        description: frontmatter.description,
        type: "article",
        publishedTime: frontmatter.publishedAt,
      },
    };
  } catch {
    return { title: "Lesson not found" };
  }
}

export default async function EraTopicPage(props: {
  params: Promise<PageParams>;
}) {
  const { eraId, topic } = await props.params;

  let lesson: Awaited<ReturnType<typeof loadMdxLesson>>;
  try {
    lesson = await loadMdxLesson(eraId, topic);
  } catch {
    notFound();
  }

  const { content } = await compileMDX({
    source: lesson.body,
    components: mdxComponents,
    options: {
      parseFrontmatter: false,
    },
  });

  const { frontmatter } = lesson;

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <header className="border-b border-neutral-900 pb-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 font-medium uppercase tracking-wide text-neutral-200">
            {frontmatter.era}
          </span>
          <Badge icon={<IconGauge className="size-3.5" />}>
            {frontmatter.difficulty}
          </Badge>
          {frontmatter.hasVisualizer ? (
            <Badge icon={<IconSparkles className="size-3.5" />}>
              Includes visualizer
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {frontmatter.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-neutral-400">
          {frontmatter.description}
        </p>
        <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <IconCalendar className="size-4 shrink-0 text-neutral-600" />
            <dt className="sr-only">Published</dt>
            <dd>{frontmatter.publishedAt}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Author</dt>
            <dd>{frontmatter.author}</dd>
          </div>
        </dl>
        {frontmatter.tags.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {frontmatter.tags.map((tag) => (
              <li key={tag}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs font-medium text-neutral-300">
                  <IconTag className="size-3 shrink-0 text-neutral-500" />
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="prose prose-invert prose-neutral max-w-none pt-12 prose-headings:scroll-mt-24 prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline">
        {content}
      </div>
    </article>
  );
}

function Badge({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 font-medium text-neutral-200">
      <span className="text-neutral-400 [&>svg]:block" aria-hidden>
        {icon}
      </span>
      {children}
    </span>
  );
}

/** Inline SVGs avoid bundling `lucide-react` in the RSC graph (prevents dev worker chunk misses). */
function IconGauge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M5.6 18.4l1.4-1.4M12 21v-2M18.4 18.4l-1.4-1.4M21 12h-2M18.4 5.6l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 12 12 5l2.5 7 7 2.5-7 2.5L12 19l-2.5-7-7-2.5 7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 3.5v4M16 3.5v4M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12V6.5A2.5 2.5 0 0 1 5.5 4H9l11 11-5 5L3 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}
