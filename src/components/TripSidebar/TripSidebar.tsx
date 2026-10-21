import { useState, type CSSProperties, type ReactNode } from "react";
import { Backpack, Check, Lightbulb, Wallet } from "lucide-react";
import type { Itinerary } from "@shared/itinerarySchema";
import { formatAmount } from "../../lib/stopCategory";
import styles from "./TripSidebar.module.css";

const BAR_COLORS = ["#4f46e5", "#9333ea", "#db2777", "#ea580c", "#16a34a", "#0891b2"];

function SideCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={styles.card} aria-label={title}>
      <h3 className={styles.cardTitle}>
        <span className={styles.cardIcon} aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function BudgetCard({ budget }: { budget: NonNullable<Itinerary["budget"]> }) {
  const total = budget.total ?? budget.items.reduce((sum, item) => sum + item.amount, 0);
  const max = Math.max(1, ...budget.items.map((item) => item.amount));

  return (
    <SideCard icon={<Wallet size={18} />} title="Estimated budget">
      <p className={styles.total}>
        {formatAmount(total, budget.currency)}
        <span className={styles.totalHint}>per person, whole trip</span>
      </p>
      {budget.items.length > 0 ? (
        <ul className={styles.bars}>
          {budget.items.map((item, i) => {
            const share = total > 0 ? Math.round((item.amount / total) * 100) : 0;
            return (
              <li key={`${item.label}-${i}`} className={styles.barRow}>
                <div className={styles.barHeader}>
                  <span>{item.label}</span>
                  <span className={styles.barAmount}>
                    {formatAmount(item.amount, budget.currency)} <small>{share}%</small>
                  </span>
                </div>
                <span className={styles.track} aria-hidden="true">
                  <span
                    className={styles.fill}
                    style={
                      {
                        width: `${(item.amount / max) * 100}%`,
                        "--bar": BAR_COLORS[i % BAR_COLORS.length],
                        "--delay": `${i * 90}ms`,
                      } as CSSProperties
                    }
                  />
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SideCard>
  );
}

function PackingCard({ items }: { items: string[] }) {
  const [packed, setPacked] = useState<Set<number>>(() => new Set());
  const percent = items.length > 0 ? Math.round((packed.size / items.length) * 100) : 0;

  function toggle(index: number) {
    setPacked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <SideCard icon={<Backpack size={18} />} title="Packing list">
      <div className={styles.progressRow}>
        <span className={styles.progressText}>
          {packed.size} of {items.length} packed
        </span>
        <span className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${percent}%` }} />
        </span>
      </div>
      <ul className={styles.checklist}>
        {items.map((item, i) => (
          <li key={`${item}-${i}`}>
            <label className={styles.checkItem}>
              <input
                type="checkbox"
                className={styles.checkInput}
                checked={packed.has(i)}
                onChange={() => toggle(i)}
              />
              <span className={styles.checkBox} aria-hidden="true">
                <Check size={13} strokeWidth={3} />
              </span>
              <span className={styles.checkLabel}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </SideCard>
  );
}

function TipsCard({ tips }: { tips: string[] }) {
  return (
    <SideCard icon={<Lightbulb size={18} />} title="Local tips">
      <ul className={styles.tips}>
        {tips.map((tip, i) => (
          <li key={`${tip}-${i}`} className={styles.tip}>
            {tip}
          </li>
        ))}
      </ul>
    </SideCard>
  );
}

export interface TripSidebarProps {
  itinerary: Itinerary;
  /** Extra content appended at the bottom (e.g. the refinement form). */
  children?: ReactNode;
}

/** Trip-wide info cards shown beside the day timeline. */
function TripSidebar({ itinerary, children }: TripSidebarProps) {
  const { budget, packingList, tips } = itinerary;
  return (
    <div className={styles.sidebar}>
      {budget && (budget.items.length > 0 || budget.total !== undefined) ? <BudgetCard budget={budget} /> : null}
      {packingList && packingList.length > 0 ? <PackingCard items={packingList} /> : null}
      {tips && tips.length > 0 ? <TipsCard tips={tips} /> : null}
      {children}
    </div>
  );
}

export default TripSidebar;
