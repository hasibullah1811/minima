import { Code2, Github } from "lucide-react";

import packageJson from "../package.json";

const version = packageJson.version;

/**
 * Sitewide footer: attribution, repository link, and build version from `package.json`.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-neutral-900 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-8 px-6 sm:flex-row sm:items-start">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold tracking-[0.2em] text-white">
            MINIMA
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            © {year} Minima. Open source.
          </p>
        </div>
        <nav
          className="flex flex-col items-center gap-3 sm:items-end"
          aria-label="Footer"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="https://github.com/hasibullah1811"
              className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-neutral-500 transition-all duration-500 ease-out hover:text-neutral-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.18)]"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github
                className="size-3.5 shrink-0 opacity-70 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]"
                aria-hidden
              />
              Built by Hasibullah
            </a>
            <a
              href="https://github.com/hasibullah1811/minima"
              className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-neutral-500 transition-all duration-500 ease-out hover:text-neutral-200 hover:shadow-[0_0_14px_rgba(34,211,238,0.18)]"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Code2
                className="size-3.5 shrink-0 opacity-70 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]"
                aria-hidden
              />
              View Source/Contribute
            </a>
          </div>
          <small className="text-center text-xs text-neutral-500 sm:text-right">
            v{version}
          </small>
        </nav>
      </div>
    </footer>
  );
}
