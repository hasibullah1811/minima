'use client';

import { Delaunay } from "d3-delaunay";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type SVGAttributes,
} from "react";
import {
  AlertTriangle,
  CircleDot,
  FastForward,
  Hand,
  Layers,
  Pause,
  Play,
  SlidersHorizontal,
  Trash2,
  Wand2,
} from "lucide-react";

const VIEW_W = 600;
const VIEW_H = 400;
const POINT_COUNT = 150;
const PADDING = 20;
const AUTO_PLAY_MS = 800;
const CONVERGE_EPS = 1e-9;
const MAX_CENTROID_HISTORY = 400;
const BAD_SPAWN_MIN = 30;
const BAD_SPAWN_MAX = 80;

/** Seven saturated cluster hues (first `k` used at runtime). */
const CLUSTER_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#22d3ee",
] as const;

export type DatasetShape = "random" | "twoMoons" | "concentricRings";

export type InitMode = "random" | "manualGod";

export interface Point {
  id: number;
  x: number;
  y: number;
  clusterIndex: number | null;
}

export interface CentroidHistoryPoint {
  x: number;
  y: number;
}

export interface Centroid {
  id: number;
  x: number;
  y: number;
  color: string;
  history: CentroidHistoryPoint[];
}

export interface VoronoiCellPath {
  centroidId: number;
  clusterIndex: number;
  d: string;
  fill: string;
}

type AlgorithmStep = "init" | "assign" | "update";

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const mapped = pt.matrixTransform(ctm.inverse());
  return { x: mapped.x, y: mapped.y };
}

function clampToView(x: number, y: number): { x: number; y: number } {
  return {
    x: clamp(x, PADDING, VIEW_W - PADDING),
    y: clamp(y, PADDING, VIEW_H - PADDING),
  };
}

/** Convert `d3-delaunay` cell polygon to an SVG `d` attribute (no DOM — strings only). */
function cellPolygonToPathD(
  poly: ArrayLike<[number, number]> | null | undefined,
): string {
  if (!poly || !("length" in poly) || poly.length < 2) return "";
  const p0 = poly[0]!;
  let d = `M ${p0[0]} ${p0[1]}`;
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i]!;
    d += ` L ${p[0]} ${p[1]}`;
  }
  d += " Z";
  return d;
}

function buildVoronoiPaths(centroids: Centroid[]): VoronoiCellPath[] {
  if (centroids.length === 0) return [];
  try {
    const sites = centroids.map((c) => [c.x, c.y] as [number, number]);
    const delaunay = Delaunay.from(sites);
    const voronoi = delaunay.voronoi([0, 0, VIEW_W, VIEW_H]);
    return centroids.map((c, i) => ({
      centroidId: c.id,
      clusterIndex: i,
      d: cellPolygonToPathD(voronoi.cellPolygon(i)),
      fill: c.color,
    }));
  } catch {
    return [];
  }
}

function computeWCSS(points: Point[], centroids: Centroid[]): number {
  let sum = 0;
  for (const p of points) {
    if (p.clusterIndex === null) continue;
    const c = centroids[p.clusterIndex];
    if (!c) continue;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    sum += dx * dx + dy * dy;
  }
  return sum;
}

function formatInertia(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function makeCentroid(
  id: number,
  x: number,
  y: number,
  color: string,
): Centroid {
  return { id, x, y, color, history: [] };
}

function generateRandomPoints(startId: number): Point[] {
  const out: Point[] = [];
  let id = startId;
  for (let i = 0; i < POINT_COUNT; i++) {
    out.push({
      id: id++,
      x: randomInRange(PADDING, VIEW_W - PADDING),
      y: randomInRange(PADDING, VIEW_H - PADDING),
      clusterIndex: null,
    });
  }
  return out;
}

/** Two interlocking semi-crescents with jitter (non-linear separability demo). */
function generateTwoMoonsPoints(startId: number): Point[] {
  const nA = Math.floor(POINT_COUNT / 2);
  const nB = POINT_COUNT - nA;
  const R = 88;
  const c1 = { x: VIEW_W * 0.32, y: VIEW_H * 0.48 };
  const c2 = { x: VIEW_W * 0.52, y: VIEW_H * 0.42 };
  const pts: Point[] = [];
  let id = startId;
  for (let i = 0; i < nA; i++) {
    const u = nA <= 1 ? 0.5 : i / (nA - 1);
    const theta = Math.PI * u + Math.PI;
    pts.push({
      id: id++,
      x: clamp(
        c1.x + R * Math.cos(theta) + randomInRange(-4.5, 4.5),
        PADDING,
        VIEW_W - PADDING,
      ),
      y: clamp(
        c1.y + R * Math.sin(theta) + randomInRange(-4.5, 4.5),
        PADDING,
        VIEW_H - PADDING,
      ),
      clusterIndex: null,
    });
  }
  for (let i = 0; i < nB; i++) {
    const u = nB <= 1 ? 0.5 : i / (nB - 1);
    const theta = Math.PI * u;
    pts.push({
      id: id++,
      x: clamp(
        c2.x + R * Math.cos(theta) + randomInRange(-4.5, 4.5),
        PADDING,
        VIEW_W - PADDING,
      ),
      y: clamp(
        c2.y + R * Math.sin(theta) + randomInRange(-4.5, 4.5),
        PADDING,
        VIEW_H - PADDING,
      ),
      clusterIndex: null,
    });
  }
  return pts;
}

/** Dense inner disk + sparse annulus (spherical centroid bias demo). */
function generateConcentricRingsPoints(startId: number): Point[] {
  const inner = 60;
  const outer = POINT_COUNT - inner;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const pts: Point[] = [];
  let id = startId;
  for (let i = 0; i < inner; i++) {
    const ang = randomInRange(0, Math.PI * 2);
    const r = randomInRange(32, 58);
    pts.push({
      id: id++,
      x: clamp(cx + r * Math.cos(ang), PADDING, VIEW_W - PADDING),
      y: clamp(cy + r * Math.sin(ang), PADDING, VIEW_H - PADDING),
      clusterIndex: null,
    });
  }
  for (let i = 0; i < outer; i++) {
    const ang = randomInRange(0, Math.PI * 2);
    const r = randomInRange(98, 158);
    pts.push({
      id: id++,
      x: clamp(cx + r * Math.cos(ang), PADDING, VIEW_W - PADDING),
      y: clamp(cy + r * Math.sin(ang), PADDING, VIEW_H - PADDING),
      clusterIndex: null,
    });
  }
  return pts;
}

function generatePointsForDataset(
  shape: DatasetShape,
  startId: number,
): Point[] {
  switch (shape) {
    case "random":
      return generateRandomPoints(startId);
    case "twoMoons":
      return generateTwoMoonsPoints(startId);
    case "concentricRings":
      return generateConcentricRingsPoints(startId);
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

function confidenceOpacity(
  point: Point,
  centroids: Centroid[],
  maxByCluster: ReadonlyMap<number, number>,
): number {
  if (point.clusterIndex === null) return 0.55;
  const c = centroids[point.clusterIndex];
  if (!c) return 0.55;
  const maxD = maxByCluster.get(point.clusterIndex) ?? 1e-6;
  const d = Math.hypot(point.x - c.x, point.y - c.y);
  const t = clamp(d / maxD, 0, 1);
  return 0.9 - t * (0.9 - 0.2);
}

export default function KMeansCanvas() {
  const [datasetShape, setDatasetShape] = useState<DatasetShape>("random");
  const [k, setK] = useState<number>(3);
  const [initMode, setInitMode] = useState<InitMode>("random");
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [step, setStep] = useState<AlgorithmStep>("init");
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [converged, setConverged] = useState(false);
  const [inertia, setInertia] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const nextIdRef = useRef(0);
  const pointsRef = useRef<Point[]>([]);
  const centroidsRef = useRef<Centroid[]>([]);
  const stepRef = useRef<AlgorithmStep>("init");
  pointsRef.current = points;
  centroidsRef.current = centroids;
  stepRef.current = step;

  const kSafe = clamp(k, 2, 7);

  const resetAlgorithm = useCallback(() => {
    setCentroids([]);
    setStep("init");
    setConverged(false);
    setIsAutoPlay(false);
    setInertia(0);
    setPoints((prev) => prev.map((p) => ({ ...p, clusterIndex: null })));
  }, []);

  const loadDataset = useCallback(
    (shape: DatasetShape) => {
      nextIdRef.current = 0;
      const next = generatePointsForDataset(shape, 0);
      setPoints(next);
      setDatasetShape(shape);
      setCentroids([]);
      setStep("init");
      setConverged(false);
      setIsAutoPlay(false);
      setInertia(0);
    },
    [],
  );

  useEffect(() => {
    loadDataset("random");
  }, [loadDataset]);

  const kSkipMount = useRef(true);
  useEffect(() => {
    if (kSkipMount.current) {
      kSkipMount.current = false;
      return;
    }
    resetAlgorithm();
  }, [k, resetAlgorithm]);

  const initModeSkip = useRef(true);
  useEffect(() => {
    if (initModeSkip.current) {
      initModeSkip.current = false;
      return;
    }
    resetAlgorithm();
  }, [initMode, resetAlgorithm]);

  const prevCentroidCount = useRef(0);
  useEffect(() => {
    if (initMode !== "manualGod") {
      prevCentroidCount.current = centroids.length;
      return;
    }
    const n = centroids.length;
    if (
      n === kSafe &&
      n >= 2 &&
      prevCentroidCount.current === n - 1
    ) {
      setStep("assign");
      setConverged(false);
      setInertia(0);
    }
    prevCentroidCount.current = n;
  }, [centroids.length, initMode, kSafe]);

  const clearCanvas = useCallback(() => {
    nextIdRef.current = 0;
    setPoints([]);
    setCentroids([]);
    setStep("init");
    setConverged(false);
    setIsAutoPlay(false);
    setInertia(0);
  }, []);

  const spawnCentroids = useCallback(() => {
    if (initMode === "manualGod") return;
    const pts = pointsRef.current;
    const kActive = clamp(k, 2, 7);
    if (pts.length < kActive) return;

    const picks = new Set<number>();
    while (picks.size < kActive) {
      picks.add(Math.floor(Math.random() * pts.length));
    }
    const indices = [...picks];
    const nextCentroids: Centroid[] = Array.from(
      { length: kActive },
      (_, i) => {
        const p = pts[indices[i]!];
        return makeCentroid(i, p.x, p.y, CLUSTER_COLORS[i]!);
      },
    );
    setCentroids(nextCentroids);
    setStep("assign");
    setConverged(false);
    setInertia(0);
  }, [k, initMode]);

  const badSpawnCentroids = useCallback(() => {
    if (initMode === "manualGod") return;
    const kActive = clamp(k, 2, 7);
    const pts = pointsRef.current;
    if (pts.length < kActive) return;

    const nextCentroids: Centroid[] = Array.from(
      { length: kActive },
      (_, i) =>
        makeCentroid(
          i,
          randomInRange(BAD_SPAWN_MIN, BAD_SPAWN_MAX),
          randomInRange(BAD_SPAWN_MIN, BAD_SPAWN_MAX),
          CLUSTER_COLORS[i]!,
        ),
    );
    setCentroids(nextCentroids);
    setStep("assign");
    setConverged(false);
    setInertia(0);
  }, [k, initMode]);

  const assignPoints = useCallback(() => {
    const c = centroidsRef.current;
    if (c.length === 0) return;

    const pts = pointsRef.current;
    const nextPts = pts.map((point) => {
      let best = 0;
      let bestD = Infinity;
      c.forEach((centroid, index) => {
        const d = Math.hypot(centroid.x - point.x, centroid.y - point.y);
        if (d < bestD) {
          bestD = d;
          best = index;
        }
      });
      return { ...point, clusterIndex: best };
    });

    setPoints(nextPts);
    setInertia(computeWCSS(nextPts, c));
    setStep("update");
  }, []);

  const updateCentroids = useCallback((): boolean => {
    const pts = pointsRef.current;
    const prev = centroidsRef.current;
    if (prev.length === 0) return false;

    const next: Centroid[] = prev.map((centroid, index) => {
      const assigned = pts.filter((p) => p.clusterIndex === index);
      if (assigned.length === 0) return centroid;

      const nx = assigned.reduce((s, p) => s + p.x, 0) / assigned.length;
      const ny = assigned.reduce((s, p) => s + p.y, 0) / assigned.length;
      const positionChanged =
        Math.hypot(centroid.x - nx, centroid.y - ny) > CONVERGE_EPS;

      let history = centroid.history;
      if (positionChanged) {
        const appended: CentroidHistoryPoint[] = [
          ...centroid.history,
          { x: centroid.x, y: centroid.y },
        ];
        history =
          appended.length > MAX_CENTROID_HISTORY
            ? appended.slice(-MAX_CENTROID_HISTORY)
            : appended;
      }

      return {
        ...centroid,
        x: nx,
        y: ny,
        history,
      };
    });

    let moved = false;
    for (let i = 0; i < prev.length; i++) {
      if (
        Math.hypot(prev[i]!.x - next[i]!.x, prev[i]!.y - next[i]!.y) >
        CONVERGE_EPS
      ) {
        moved = true;
        break;
      }
    }

    setCentroids(next);
    setInertia(computeWCSS(pts, next));
    setStep("assign");

    const convergedNow = !moved;
    setConverged(convergedNow);
    if (convergedNow) {
      setIsAutoPlay(false);
    }
    return convergedNow;
  }, []);

  const assignPointsRef = useRef(assignPoints);
  const updateCentroidsRef = useRef(updateCentroids);
  assignPointsRef.current = assignPoints;
  updateCentroidsRef.current = updateCentroids;

  useEffect(() => {
    if (!isAutoPlay || converged) return;
    if (centroidsRef.current.length === 0) return;

    const id = window.setInterval(() => {
      const s = stepRef.current;
      if (s === "assign") {
        assignPointsRef.current();
      } else if (s === "update") {
        updateCentroidsRef.current();
      }
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(id);
  }, [isAutoPlay, converged]);

  const stepForward = useCallback(() => {
    if (centroidsRef.current.length === 0) return;
    const s = stepRef.current;
    if (s === "assign") {
      assignPoints();
    } else if (s === "update") {
      updateCentroids();
    }
  }, [assignPoints, updateCentroids]);

  const toggleAutoPlay = useCallback(() => {
    if (converged) return;
    if (centroidsRef.current.length === 0) return;
    setIsAutoPlay((v) => !v);
  }, [converged]);

  const resetManualCentroids = useCallback(() => {
    setCentroids([]);
    setStep("init");
    setConverged(false);
    setIsAutoPlay(false);
    setInertia(0);
    setPoints((prev) => prev.map((p) => ({ ...p, clusterIndex: null })));
  }, []);

  const handleSvgClick = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const svg = svgRef.current;
      if (!svg) return;
      const raw = clientToSvg(svg, e.clientX, e.clientY);
      const { x, y } = clampToView(raw.x, raw.y);
      const kActive = kSafe;

      if (initMode === "manualGod") {
        if (centroidsRef.current.length >= kActive) return;
        setCentroids((prev) => {
          if (prev.length >= kActive) return prev;
          const idx = prev.length;
          return [
            ...prev,
            makeCentroid(idx, x, y, CLUSTER_COLORS[idx]!),
          ];
        });
        setConverged(false);
        return;
      }

      const id = nextIdRef.current++;
      setPoints((prev) => [
        ...prev,
        { id, x, y, clusterIndex: null },
      ]);
      setConverged(false);
    },
    [initMode, kSafe],
  );

  const canSpawnRandom =
    initMode === "random" && points.length >= kSafe && kSafe >= 2;
  const transitionClass = "transition-all duration-500 ease-in-out";
  const showDistanceWeb = step === "update";
  const showVoronoi =
    centroids.length > 0 && (step === "assign" || step === "update");

  const voronoiPaths = useMemo((): VoronoiCellPath[] => {
    if (!showVoronoi) return [];
    return buildVoronoiPaths(centroids);
  }, [centroids, showVoronoi]);

  const clusterMaxDistances = useMemo((): Map<number, number> => {
    const m = new Map<number, number>();
    if (!centroids.length) return m;
    for (let ci = 0; ci < centroids.length; ci++) {
      let max = 0;
      for (const p of points) {
        if (p.clusterIndex !== ci) continue;
        const c = centroids[ci];
        if (!c) continue;
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d > max) max = d;
      }
      m.set(ci, max > CONVERGE_EPS ? max : 1e-6);
    }
    return m;
  }, [points, centroids]);

  const manualSeedsReady =
    initMode === "manualGod" && centroids.length >= kSafe && kSafe >= 2;

  const canvasCursorClass =
    initMode === "manualGod"
      ? centroids.length >= kSafe
        ? "cursor-not-allowed"
        : "cursor-crosshair"
      : "cursor-crosshair";

  return (
    <div className="not-prose my-8 flex w-full flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-2xl">
      {/* Top bar: dataset, k, clear */}
      <div className="flex flex-col gap-3 border-b border-neutral-800/80 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <label
            htmlFor="dataset-shape"
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500"
          >
            <Layers className="size-3.5 shrink-0" aria-hidden />
            Dataset
          </label>
          <div className="relative">
            <select
              id="dataset-shape"
              value={datasetShape}
              onChange={(e) =>
                loadDataset(e.target.value as DatasetShape)
              }
              className="w-full appearance-none rounded-lg border border-neutral-700 bg-neutral-950 py-2.5 pl-3 pr-9 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            >
              <option value="random">Random — uniform cloud</option>
              <option value="twoMoons">Two Moons — non-convex</option>
              <option value="concentricRings">
                Concentric Rings — multi-scale
              </option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
              ▾
            </span>
          </div>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <label
            htmlFor="kmeans-k-slider"
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500"
          >
            <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
            Clusters (k):{" "}
            <span className="font-mono text-neutral-200">{kSafe}</span>
          </label>
          <input
            id="kmeans-k-slider"
            type="range"
            min={2}
            max={7}
            step={1}
            value={kSafe}
            onChange={(e) => setK(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 accent-cyan-400"
          />
        </div>

        <button
          type="button"
          onClick={clearCanvas}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white sm:self-end"
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          Clear Canvas
        </button>
      </div>

      {/* Middle bar: initialization mode */}
      <div className="flex flex-col gap-3 border-b border-neutral-800/80 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Initialization
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-neutral-700 bg-neutral-950 p-0.5">
            <button
              type="button"
              onClick={() => setInitMode("random")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                initMode === "random"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Wand2 className="size-4 shrink-0" aria-hidden />
              Random seeds
            </button>
            <button
              type="button"
              onClick={() => setInitMode("manualGod")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                initMode === "manualGod"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Hand className="size-4 shrink-0" aria-hidden />
              Manually place seeds
            </button>
          </div>
          {initMode === "manualGod" ? (
            <button
              type="button"
              onClick={resetManualCentroids}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              Reset seeds
            </button>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-neutral-500">
          {initMode === "manualGod" ? (
            <>
              Crosshair: click up to <span className="font-mono">{kSafe}</span>{" "}
              times to place centroids. Canvas locks once seeds are set; use
              &quot;Reset seeds&quot; to reposition.
            </>
          ) : (
            <>
              Click the canvas to append individual data points. Use{" "}
              <span className="font-medium text-neutral-400">Spawn</span> or{" "}
              <span className="font-medium text-neutral-400">Bad Spawn</span>{" "}
              to auto-place seeds.
            </>
          )}
        </p>
      </div>

      {/* Bottom bar: algorithm + inertia */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {initMode === "random" ? (
              <>
                <button
                  type="button"
                  onClick={spawnCentroids}
                  disabled={!canSpawnRandom}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-[0_0_15px_rgba(255,255,255,0.06)] transition-all hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CircleDot className="size-4 shrink-0" aria-hidden />
                  Spawn Centroids
                </button>
                <button
                  type="button"
                  onClick={badSpawnCentroids}
                  disabled={!canSpawnRandom}
                  title="Pack seeds in the top-left corner"
                  className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-neutral-950 px-4 py-2 text-sm font-medium text-amber-200/95 transition-all hover:border-amber-400/50 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  Bad Spawn
                </button>
              </>
            ) : (
              <span
                className={`rounded-md border px-3 py-2 text-xs font-medium ${
                  manualSeedsReady
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                    : "border-neutral-700 bg-neutral-950 text-neutral-400"
                }`}
              >
                {manualSeedsReady
                  ? "Seeds ready — run Assign / Step."
                  : `Place ${kSafe - centroids.length} more seed(s).`}
              </span>
            )}
            <button
              type="button"
              onClick={stepForward}
              disabled={centroids.length === 0}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FastForward className="size-4 shrink-0" aria-hidden />
              Step Forward
            </button>
            <button
              type="button"
              onClick={toggleAutoPlay}
              disabled={centroids.length === 0 || converged}
              className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm font-medium text-neutral-100 transition-all hover:border-neutral-500 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAutoPlay ? (
                <>
                  <Pause className="size-4 shrink-0" aria-hidden />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-4 shrink-0" aria-hidden />
                  Auto-Play
                </>
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {converged ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Converged
              </span>
            ) : null}
            <p className="font-mono text-xs text-neutral-500">
              Step:{" "}
              <span className="font-medium uppercase text-neutral-300">
                {step}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800/90 bg-neutral-950/80 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Inertia (WCSS)
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-neutral-100 tabular-nums">
            {formatInertia(inertia)}
          </p>
        </div>
      </div>

      <div
        className={`relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950 ${canvasCursorClass}`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none"
          role="img"
          aria-label="K-means sandbox"
          onClick={handleSvgClick}
        >
          <g className="pointer-events-none" aria-hidden>
            {voronoiPaths.map((cell) =>
              cell.d ? (
                <path
                  key={`voronoi-${cell.centroidId}`}
                  d={cell.d}
                  fill={cell.fill}
                  fillOpacity={0.05}
                  stroke={cell.fill}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  className={transitionClass}
                />
              ) : null,
            )}

            {showDistanceWeb
              ? points.map((point) => {
                  if (point.clusterIndex === null) return null;
                  const c = centroids[point.clusterIndex];
                  if (!c) return null;
                  return (
                    <line
                      key={`web-${point.id}`}
                      x1={point.x}
                      y1={point.y}
                      x2={c.x}
                      y2={c.y}
                      stroke={c.color}
                      strokeWidth={1}
                      strokeOpacity={0.15}
                      className={transitionClass}
                    />
                  );
                })
              : null}

            {centroids.map((centroid) => {
              const trail: CentroidHistoryPoint[] = [
                ...centroid.history,
                { x: centroid.x, y: centroid.y },
              ];
              if (trail.length < 2) return null;
              const pointsAttr = trail.map((h) => `${h.x},${h.y}`).join(" ");
              return (
                <polyline
                  key={`trail-${centroid.id}`}
                  points={pointsAttr}
                  fill="none"
                  stroke={centroid.color}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={transitionClass}
                />
              );
            })}
          </g>

          {points.map((point) => (
            <circle
              key={point.id}
              cx={point.x}
              cy={point.y}
              r={3}
              fill={
                point.clusterIndex !== null
                  ? CLUSTER_COLORS[point.clusterIndex]
                  : "#737373"
              }
              className={transitionClass}
              opacity={confidenceOpacity(
                point,
                centroids,
                clusterMaxDistances,
              )}
            />
          ))}

          {centroids.map((centroid) => (
            <g
              key={centroid.id}
              className={transitionClass}
              style={{
                transform: `translate(${centroid.x}px, ${centroid.y}px)`,
              }}
            >
              <circle
                cx={0}
                cy={0}
                r={18}
                fill="none"
                stroke={centroid.color}
                strokeWidth={1.5}
                className={`${transitionClass} animate-ping opacity-40`}
                style={{ transformOrigin: "0px 0px" }}
              />
              <circle
                cx={0}
                cy={0}
                r={7}
                fill={centroid.color}
                stroke="#0a0a0a"
                strokeWidth={2}
                className={transitionClass}
              />
              <Crosshair className={transitionClass} stroke="#0a0a0a" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Crosshair({
  className,
  stroke,
}: {
  className?: string;
  stroke: SVGAttributes<SVGPathElement>["stroke"];
}) {
  return (
    <path
      d="M -4 0 L 4 0 M 0 -4 L 0 4"
      stroke={stroke}
      strokeWidth={1.5}
      className={className}
    />
  );
}
