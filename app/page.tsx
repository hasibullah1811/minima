'use client';

import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Network,
  Sparkles,
  Trees,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950 transition-opacity duration-700 ease-in-out ${
          loading ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!loading}
        aria-busy={loading}
      >
        <p className="animate-pulse select-none text-4xl font-semibold tracking-[0.35em] text-white sm:text-5xl">
          MINIMA.
        </p>
      </div>

      <div className="flex min-h-full flex-1 flex-col text-neutral-300">
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16 pt-20 sm:pt-28">
          <section className="text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">
              Open curriculum
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[3.25rem]">
              The invisible mechanics of Machine Learning, made visible.
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-neutral-400 sm:mx-0">
              An open-source, interactive exploration of algorithms from the
              Classical era to Modern Generative AI. Zero black boxes. Pure
              geometric intuition.
            </p>
          </section>

          <section className="mt-20">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Eras
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <article className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition-all hover:border-neutral-600">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-neutral-700/80 bg-neutral-950 text-cyan-400">
                      <Cpu className="size-5" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-white">
                        The Classical Era
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        Foundations &amp; geometry
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex-1 space-y-2 border-t border-neutral-800/80 pt-5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                    Modules
                  </p>
                  <nav className="flex flex-col gap-1.5" aria-label="Classical era lessons">
                    <Link
                      href="/era/classical/k-means"
                      className="group flex items-center justify-between gap-3 rounded-xl border border-transparent bg-neutral-950/40 px-3 py-2.5 text-sm text-neutral-400 transition-all hover:border-neutral-700 hover:bg-neutral-900/80 hover:text-white"
                    >
                      <span className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                        K-Means Clustering
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 text-neutral-600 transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-cyan-300"
                        aria-hidden
                      />
                    </Link>
                    <Link
                      href="/era/classical/knn"
                      className="group flex items-center justify-between gap-3 rounded-xl border border-transparent bg-neutral-950/40 px-3 py-2.5 text-sm text-neutral-400 transition-all hover:border-neutral-700 hover:bg-neutral-900/80 hover:text-white"
                    >
                      <span className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                        K-Nearest Neighbors
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 text-neutral-600 transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-cyan-300"
                        aria-hidden
                      />
                    </Link>
                  </nav>
                </div>
              </article>

              <EraPlaceholder
                title="The Tree Era"
                blurb="Ensembles &amp; decisions"
                icon={<Trees className="size-5" strokeWidth={1.5} aria-hidden />}
              />
              <EraPlaceholder
                title="The Neural Era"
                blurb="Layers &amp; representations"
                icon={
                  <Network className="size-5" strokeWidth={1.5} aria-hidden />
                }
              />
              <EraPlaceholder
                title="The Modern Era"
                blurb="Generative &amp; beyond"
                icon={
                  <Sparkles className="size-5" strokeWidth={1.5} aria-hidden />
                }
              />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function EraPlaceholder({
  title,
  blurb,
  icon,
}: {
  title: string;
  blurb: string;
  icon: ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-6 opacity-50 transition-opacity hover:opacity-[0.65]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-500">
            {icon}
          </span>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-neutral-400">
              {title}
            </h3>
            <p className="mt-1 text-sm text-neutral-600">{blurb}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Coming Soon
        </span>
      </div>
      <p className="mt-6 border-t border-neutral-800/60 pt-5 text-sm text-neutral-600">
        Curriculum in progress.
      </p>
    </article>
  );
}
