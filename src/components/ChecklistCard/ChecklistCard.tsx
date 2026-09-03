import type { ChecklistBlock } from "@shared/itinerarySchema";
import styles from "./ChecklistCard.module.css";

export interface ChecklistCardProps {
  block: ChecklistBlock;
}

/**
 * Type-specific rendering for a `"checklist"` block (Requirement 13.2): a
 * packing/to-do checklist, distinct from the default Stop-style detail
 * rendering used for a plain Stop or an unrecognized block type. The
 * block's `title` is already shown by the enclosing `StopItem` summary
 * toggle, so it is not repeated here. Rendered read-only from the
 * validated AI response; checked state is not interactive (no user editing
 * is defined by Requirement 13).
 */
function ChecklistCard({ block }: ChecklistCardProps) {
  return (
    <div className={styles.container}>
      {block.items.length > 0 ? (
        <ul className={styles.itemList}>
          {block.items.map((item, index) => (
            <li key={`${item.label}-${index}`} className={styles.item}>
              <span aria-hidden="true" className={styles.checkbox}>
                {item.checked ? "☑" : "☐"}
              </span>
              <span className={item.checked ? styles.itemLabelChecked : styles.itemLabel}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default ChecklistCard;
