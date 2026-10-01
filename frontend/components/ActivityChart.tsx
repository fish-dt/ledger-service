type DayActivity = { day: string; matched: number; flagged: number };

const WIDTH = 640;
const HEIGHT = 160;
const BAR_GAP = 14;

export function ActivityChart({ data }: { data: DayActivity[] }) {
  const barWidth = data.length ? WIDTH / data.length - BAR_GAP : WIDTH;
  const max = Math.max(...data.map((d) => d.matched + d.flagged), 1);

  return (
    <div className="rounded border border-hairline bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink">Reconciliation activity</h2>
          <p className="text-sm text-ink-muted">Rows processed per day, last 7 runs</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ok" /> Matched
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-brand" /> Flagged
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          No runs yet — once you upload a payout file this fills in.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT + 24}`}
          className="w-full"
          role="img"
          aria-label="Rows processed per day"
        >
          {data.map((d, i) => {
            const x = i * (barWidth + BAR_GAP);
            const matchedHeight = (d.matched / max) * HEIGHT;
            const flaggedHeight = (d.flagged / max) * HEIGHT;
            const isEmpty = d.matched === 0 && d.flagged === 0;
            return (
              <g key={`${d.day}-${i}`}>
                {isEmpty ? (
                  <rect x={x} y={HEIGHT - 2} width={barWidth} height={2} className="fill-hairline" />
                ) : (
                  <>
                    <rect
                      x={x}
                      y={HEIGHT - matchedHeight - flaggedHeight}
                      width={barWidth}
                      height={matchedHeight}
                      className="fill-ok"
                      rx={2}
                    />
                    <rect
                      x={x}
                      y={HEIGHT - flaggedHeight}
                      width={barWidth}
                      height={flaggedHeight}
                      className="fill-brand"
                      rx={2}
                    />
                  </>
                )}
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT + 18}
                  textAnchor="middle"
                  className="fill-ink-faint text-[11px]"
                >
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
