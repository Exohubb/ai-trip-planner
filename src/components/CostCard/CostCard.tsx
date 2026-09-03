import type { CostBlock } from "@shared/itinerarySchema";
import styles from "./CostCard.module.css";

export interface CostCardProps {
  block: CostBlock;
}

/**
 * Type-specific rendering for a `"cost"` block (Requirement 13.2): a list
 * of cost line items plus an optional total, distinct from the default
 * Stop-style detail rendering (description/location/notes) used for a
 * plain Stop or an unrecognized block type. The block's `title` is already
 * shown by the enclosing `StopItem` summary toggle, so it is not repeated
 * here.
 */
function CostCard({ block }: CostCardProps) {
  return (
    <div className={styles.container}>
      {block.costItems.length > 0 ? (
        <ul className={styles.itemList}>
          {block.costItems.map((item, index) => (
            <li key={`${item.label}-${index}`} className={styles.item}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemAmount}>
                {block.currency ? `${block.currency} ` : ""}
                {item.amount}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {block.total !== undefined ? (
        <p className={styles.total}>
          <span className={styles.totalLabel}>Total: </span>
          {block.currency ? `${block.currency} ` : ""}
          {block.total}
        </p>
      ) : null}
    </div>
  );
}

export default CostCard;
