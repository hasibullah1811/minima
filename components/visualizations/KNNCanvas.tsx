'use client';

import { RefreshCw, Scale, SlidersHorizontal, Weight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const VIEW_W = 600;
const VIEW_H = 400;
const TRAIN_N = 100;
const PADDING = 16;

const COLOR_A = "#3b82f6";
const COLOR_B = "#ec4899";

const K_MIN = 1;
const K_MAX = 15;
const K_STEP = 2;

const GRID_COLS = 30;
const GRID_ROWS = 30;
const DIST_EPS = 1e-6;

export type PointClass = "A" | "B";
export type DistanceMetric = "euclidean" | "manhattan";

export interface TrainingPoint {
  id: number;
  x: number;
  y: number;
  cls: PointClass;
}

export interface NeighborInfo {
  point: TrainingPoint;
  distance: number;
}

export interface KnnVoteTally {
  countA: number;
  countB: number;
  scoreA: number;
  scoreB: number;
  prediction: PointClass | null;
  confusionZone: boolean;
}

export interface HeatmapCell {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
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

function neighborDistance(
  p: TrainingPoint,
  tx: number,
  ty: number,
  metric: DistanceMetric,
): number {
  if (metric === "manhattan") {
    return Math.abs(p.x - tx) + Math.abs(p.y - ty);
  }
  return Math.hypot(p.x - tx, p.y - ty);
}

/** Majority or weighted vote + ambiguity flag for UI ring. */
function computeKnnAt(
  training: TrainingPoint[],
  tx: number,
  ty: number,
  kRaw: number,
  metric: DistanceMetric,
  weighted: boolean,
): {
  neighbors: NeighborInfo[];
  kthRadius: number;
  tally: KnnVoteTally;
} {
  const kEff = clamp(
    kRaw,
    K_MIN,
    Math.min(K_MAX, Math.max(1, training.length)),
  );

  const scored: NeighborInfo[] = training.map((p) => ({
    point: p,
    distance: neighborDistance(p, tx, ty, metric),
  }));
  scored.sort((a, b) => a.distance - b.distance);

  const neighbors = scored.slice(0, kEff);
  const kthRadius =
    neighbors.length > 0 ? neighbors[neighbors.length - 1]!.distance : 0;

  let countA = 0;
  let countB = 0;
  let scoreA = 0;
  let scoreB = 0;

  for (const n of neighbors) {
    const w = weighted ? 1 / Math.max(n.distance, DIST_EPS) : 1;
    if (n.point.cls === "A") {
      countA++;
      scoreA += w;
    } else {
      countB++;
      scoreB += w;
    }
  }

  let prediction: PointClass | null = null;
  if (neighbors.length > 0) {
    if (weighted) {
      if (scoreA > scoreB) prediction = "A";
      else if (scoreB > scoreA) prediction = "B";
      else prediction = neighbors[0]!.point.cls;
    } else {
      if (countA > countB) prediction = "A";
      else if (countB > countA) prediction = "B";
      else prediction = neighbors[0]!.point.cls;
    }
  }

  const countTie = countA === countB;
  const countClose =
    countA > 0 && countB > 0 && Math.abs(countA - countB) === 1;

  const maxS = Math.max(scoreA, scoreB, DIST_EPS);
  const scoreGap = Math.abs(scoreA - scoreB);
  const weightedAmbiguous =
    weighted && (scoreGap < DIST_EPS * 100 || scoreGap / maxS < 0.12);

  const confusionZone =
    neighbors.length === 0
      ? false
      : countTie ||
        countClose ||
        (weighted && weightedAmbiguous);

  return {
    neighbors,
    kthRadius,
    tally: {
      countA,
      countB,
      scoreA,
      scoreB,
      prediction,
      confusionZone,
    },
  };
}

function classifyCell(
  training: TrainingPoint[],
  cx: number,
  cy: number,
  kEff: number,
  metric: DistanceMetric,
  weighted: boolean,
): PointClass | null {
  return computeKnnAt(training, cx, cy, kEff, metric, weighted).tally
    .prediction;
}

/** ~100 points: two biased clouds plus a messy central overlap. */
function generateDataset(): TrainingPoint[] {
  const pts: TrainingPoint[] = [];

  for (let i = 0; i < TRAIN_N; i++) {
    const roll = Math.random();
    let cls: PointClass;
    let x: number;
    let y: number;

    if (roll < 0.42) {
      cls = "A";
      const cx = VIEW_W * 0.28;
      const cy = VIEW_H * 0.52;
      const angle = randomInRange(0, Math.PI * 2);
      const r = randomInRange(20, 108) + randomInRange(-16, 16);
      x = cx + r * Math.cos(angle);
      y = cy + r * Math.sin(angle) * 0.82;
    } else if (roll < 0.84) {
      cls = "B";
      const cx = VIEW_W * 0.72;
      const cy = VIEW_H * 0.48;
      const angle = randomInRange(0, Math.PI * 2);
      const r = randomInRange(22, 110) + randomInRange(-18, 18);
      x = cx + r * Math.cos(angle);
      y = cy + r * Math.sin(angle) * 0.86;
    } else {
      cls = Math.random() < 0.5 ? "A" : "B";
      x = VIEW_W * 0.5 + randomInRange(-100, 100);
      y = VIEW_H * 0.5 + randomInRange(-105, 105);
    }

    pts.push({
      id: i,
      x: clamp(x, PADDING, VIEW_W - PADDING),
      y: clamp(y, PADDING, VIEW_H - PADDING),
      cls,
    });
  }

  return pts.sort(() => Math.random() - 0.5).map((p, idx) => ({ ...p, id: idx }));
}

function randomInRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function diamondPolygonPoints(cx: number, cy: number, r: number): string {
  if (r <= 0) return "";
  return `${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy} ${cx},${cy - r}`;
}

export default function KNNCanvas() {
  const [trainingData, setTrainingData] = useState<TrainingPoint[]>([]);
  const [targetPoint, setTargetPoint] = useState({
    x: VIEW_W / 2,
    y: VIEW_H / 2,
  });
  const [k, setK] = useState(3);
  const [dragging, setDragging] = useState(false);
  const [distanceMetric, setDistanceMetric] =
    useState<DistanceMetric>("euclidean");
  const [weightedVoting, setWeightedVoting] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef(false);

  useEffect(() => {
    setTrainingData(generateDataset());
  }, []);

  const kSafe = useMemo(
    () =>
      clamp(k, K_MIN, Math.min(K_MAX, Math.max(1, trainingData.length || 1))),
    [k, trainingData.length],
  );

  const { neighbors, kthRadius, tally } = useMemo(
    () =>
      trainingData.length > 0
        ? computeKnnAt(
            trainingData,
            targetPoint.x,
            targetPoint.y,
            kSafe,
            distanceMetric,
            weightedVoting,
          )
        : {
            neighbors: [] as NeighborInfo[],
            kthRadius: 0,
            tally: {
              countA: 0,
              countB: 0,
              scoreA: 0,
              scoreB: 0,
              prediction: null,
              confusionZone: false,
            } satisfies KnnVoteTally,
          },
    [
      trainingData,
      targetPoint.x,
      targetPoint.y,
      kSafe,
      distanceMetric,
      weightedVoting,
    ],
  );

  const heatmapCells = useMemo((): HeatmapCell[] => {
    if (trainingData.length === 0) return [];
    const cw = VIEW_W / GRID_COLS;
    const ch = VIEW_H / GRID_ROWS;
    const inset = 0.35;
    const cells: HeatmapCell[] = [];

    for (let j = 0; j < GRID_ROWS; j++) {
      for (let i = 0; i < GRID_COLS; i++) {
        const cx = (i + 0.5) * cw;
        const cy = (j + 0.5) * ch;
        const pred = classifyCell(
          trainingData,
          cx,
          cy,
          kSafe,
          distanceMetric,
          weightedVoting,
        );
        const fill =
          pred === "B" ? COLOR_B : pred === "A" ? COLOR_A : "#737373";
        cells.push({
          key: `${i}-${j}`,
          x: i * cw + inset,
          y: j * ch + inset,
          width: cw - inset * 2,
          height: ch - inset * 2,
          fill,
        });
      }
    }
    return cells;
  }, [trainingData, kSafe, distanceMetric, weightedVoting]);

  const neighborIds = useMemo(
    () => new Set(neighbors.map((n) => n.point.id)),
    [neighbors],
  );

  const regenerate = useCallback(() => {
    setTrainingData(generateDataset());
  }, []);

  const moveTargetToClient = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = clientToSvg(svg, clientX, clientY);
    setTargetPoint({
      x: clamp(x, PADDING, VIEW_W - PADDING),
      y: clamp(y, PADDING, VIEW_H - PADDING),
    });
  }, []);

  const onPointerDownSvg = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const svg = svgRef.current;
      if (!svg) return;
      e.preventDefault();
      dragRef.current = true;
      setDragging(true);
      svg.setPointerCapture(e.pointerId);
      moveTargetToClient(e.clientX, e.clientY);
    },
    [moveTargetToClient],
  );

  const onPointerMoveSvg = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!dragRef.current) return;
      moveTargetToClient(e.clientX, e.clientY);
    },
    [moveTargetToClient],
  );

  const onPointerUpSvg = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    setDragging(false);
    svgRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  const transitionClass = "transition-all duration-500 ease-in-out";

  const coreFill =
    tally.prediction === "B"
      ? COLOR_B
      : tally.prediction === "A"
        ? COLOR_A
        : "#a3a3a3";

  const ringStroke = tally.confusionZone ? "#d4d4d8" : coreFill;
  const ringPingClass = tally.confusionZone
    ? `${transitionClass} animate-pulse opacity-50`
    : `${transitionClass} animate-ping opacity-35`;

  const voteLabel =
    tally.prediction === "A"
      ? "BLUE"
      : tally.prediction === "B"
        ? "PINK"
        : "—";

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="not-prose my-8 flex w-full flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-2xl sm:p-6">
      <div className="flex flex-col gap-4 border-b border-neutral-800/80 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <label
              htmlFor="knn-k-slider"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500"
            >
              <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
              Neighbors (k):{" "}
              <span className="font-mono text-neutral-200">{kSafe}</span>
            </label>
            <input
              id="knn-k-slider"
              type="range"
              min={K_MIN}
              max={K_MAX}
              step={K_STEP}
              value={kSafe}
              onChange={(e) => setK(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 accent-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
              Distance
            </span>
            <div className="inline-flex rounded-lg border border-neutral-700 bg-neutral-950 p-0.5">
              <button
                type="button"
                onClick={() => setDistanceMetric("euclidean")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                  distanceMetric === "euclidean"
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Scale className="size-3.5 shrink-0" aria-hidden />
                Euclidean
              </button>
              <button
                type="button"
                onClick={() => setDistanceMetric("manhattan")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                  distanceMetric === "manhattan"
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Manhattan
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWeightedVoting((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-2 self-start rounded-lg border px-4 py-2.5 text-sm font-medium transition-all lg:self-end ${
              weightedVoting
                ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-100"
                : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500"
            }`}
          >
            <Weight className="size-4 shrink-0" aria-hidden />
            Weighted voting
          </button>

          <button
            type="button"
            onClick={regenerate}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-900 lg:self-end"
          >
            <RefreshCw className="size-4 shrink-0" aria-hidden />
            Regenerate Dataset
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800/90 bg-neutral-950/80 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          {weightedVoting ? "Weighted scores" : "Majority vote"}
        </p>
        <p className="mt-1 text-sm font-medium text-neutral-200">
          {weightedVoting ? (
            <>
              Scores:{" "}
              <span className="font-mono text-cyan-300/90">
                {fmt(tally.scoreA)}
              </span>{" "}
              Blue,{" "}
              <span className="font-mono text-pink-300/90">
                {fmt(tally.scoreB)}
              </span>{" "}
              Pink{" "}
              <span className="text-neutral-600">·</span>{" "}
              <span className="text-neutral-500">
                (raw {tally.countA}/{tally.countB})
              </span>
            </>
          ) : (
            <>
              Votes:{" "}
              <span className="font-mono text-cyan-300/90">{tally.countA}</span>{" "}
              Blue,{" "}
              <span className="font-mono text-pink-300/90">{tally.countB}</span>{" "}
              Pink
            </>
          )}{" "}
          <span className="text-neutral-500">→</span>{" "}
          <span className="text-neutral-400">Prediction:</span>{" "}
          <span
            className="font-semibold tracking-wide"
            style={{
              color:
                tally.prediction === "B"
                  ? COLOR_B
                  : tally.prediction === "A"
                    ? COLOR_A
                    : undefined,
            }}
          >
            {voteLabel}
          </span>
          {tally.confusionZone ? (
            <span className="ml-2 rounded-md border border-neutral-600/60 bg-neutral-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              Confusion zone
            </span>
          ) : null}
        </p>
      </div>

      <div
        className={`relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950 ${
          dragging ? "cursor-grabbing" : "cursor-crosshair"
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none select-none"
          role="img"
          aria-label="K-Nearest Neighbors sandbox: drag the target point"
          onPointerDown={onPointerDownSvg}
          onPointerMove={onPointerMoveSvg}
          onPointerUp={onPointerUpSvg}
          onPointerCancel={onPointerUpSvg}
        >
          <g className="pointer-events-none" aria-hidden>
            {heatmapCells.map((cell) => (
              <rect
                key={cell.key}
                x={cell.x}
                y={cell.y}
                width={cell.width}
                height={cell.height}
                rx={1.2}
                ry={1.2}
                fill={cell.fill}
                fillOpacity={0.05}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.4}
                className={transitionClass}
              />
            ))}
          </g>

          {trainingData.map((p) => {
            const inHood = neighborIds.has(p.id);
            const fill = p.cls === "A" ? COLOR_A : COLOR_B;
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={inHood ? 4 : 3}
                fill={fill}
                className={transitionClass}
                opacity={inHood ? 0.95 : 0.5}
                pointerEvents="none"
              />
            );
          })}

          {distanceMetric === "euclidean" ? (
            <circle
              cx={targetPoint.x}
              cy={targetPoint.y}
              r={kthRadius}
              fill="#262626"
              fillOpacity={0.1}
              stroke="#525252"
              strokeWidth={1}
              strokeOpacity={0.55}
              strokeDasharray="4 4"
              className={transitionClass}
              pointerEvents="none"
            />
          ) : kthRadius > 0 ? (
            <polygon
              points={diamondPolygonPoints(
                targetPoint.x,
                targetPoint.y,
                kthRadius,
              )}
              fill="#262626"
              fillOpacity={0.1}
              stroke="#525252"
              strokeWidth={1}
              strokeOpacity={0.55}
              strokeDasharray="4 4"
              className={transitionClass}
              pointerEvents="none"
            />
          ) : null}

          {neighbors.map((n) => (
            <line
              key={`web-${n.point.id}`}
              x1={targetPoint.x}
              y1={targetPoint.y}
              x2={n.point.x}
              y2={n.point.y}
              stroke="rgb(34 211 238)"
              strokeWidth={1}
              strokeOpacity={0.55}
              className={transitionClass}
              style={{
                filter: "drop-shadow(0 0 3px rgba(34,211,238,0.35))",
              }}
              pointerEvents="none"
            />
          ))}

          <g
            transform={`translate(${targetPoint.x}, ${targetPoint.y})`}
            className={transitionClass}
          >
            <circle
              cx={0}
              cy={0}
              r={22}
              fill="none"
              stroke={ringStroke}
              strokeWidth={1.5}
              className={ringPingClass}
              style={{ transformOrigin: "0px 0px" }}
              pointerEvents="none"
            />
            <circle
              cx={0}
              cy={0}
              r={11}
              fill={coreFill}
              stroke="#0a0a0a"
              strokeWidth={2}
              className={transitionClass}
              pointerEvents="none"
            />
          </g>
        </svg>
      </div>
      <p className="text-center text-xs text-neutral-500">
        Heatmap: 30×30 field (updates when data, k, metric, or weighting
        change—not every drag). Radar is a circle (L2) or diamond (L1) to the
        k-th neighbor distance. k uses odd steps (1–15).
      </p>
    </div>
  );
}
