import type { ChartBlock } from "@shared/itinerarySchema";
import styles from "./ChartCard.module.css";

export interface ChartCardProps {
  block: ChartBlock;
}

/**
 * Type-specific rendering for a `"chart"` block (Requirement 13.2): a
 * simple bar chart of labeled numeric data points, distinct from the
 * default Stop-style detail rendering used for a plain Stop or an
 * unrecognized block type. The block's `title` is already shown by the
 * enclosing `StopItem` summary toggle, so it is not repeated here.
 * Rendered as plain CSS bars (no charting dependency) to keep the visual
 * representation type-specific while matching the project's
 * minimal-dependency approach.
 */
function ChartCard({ block }: ChartCardProps) {
  const maxValue = Math.max(1, ...block.chartData.map((point) => Math.abs(point.value)));

  return (
    <div className={styles.container}>
      {block.chartData.length > 0 ? (
        <ul className={styles.barList}>
          {block.chartData.map((point, index) => (
            <li key={`${point.label}-${index}`} className={styles.barRow}>
              <span className={styles.barLabel}>{point.label}</span>
              <span className={styles.barTrack}>
                <span
                  className={styles.bar}
                  style={{ width: `${(Math.abs(point.value) / maxValue) * 100}%` }}
                />
              </span>
              <span className={styles.barValue}>{point.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default ChartCard;
