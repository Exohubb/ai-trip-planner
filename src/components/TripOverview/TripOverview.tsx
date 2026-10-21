import { useEffect, useState, type CSSProperties } from "react";
import {
  CalendarDays,
  ChevronsDown,
  MapPin,
  MapPinned,
  Printer,
  Sparkles,
  Sun,
  Wallet,
  WandSparkles,
} from "lucide-react";
import type { Itinerary } from "@shared/itinerarySchema";
import { formatAmount } from "../../lib/stopCategory";
import styles from "./TripOverview.module.css";

export interface TripOverviewProps {
  itinerary: Itinerary;
  /** Cover photo (featured-destination samples); AI trips use a gradient cover. */
  coverImage?: string;
  /** True for a ready-made sample rather than an AI-generated plan. */
  isSample?: boolean;
  onExpandAll?: () => void;
  /** For samples: regenerate this destination with the user's preferences. */
  onCustomize?: () => void;
}

function budgetTotal(itinerary: Itinerary): number | undefined {
  const budget = itinerary.budget;
  if (!budget) return undefined;
  if (budget.total !== undefined) return budget.total;
  if (budget.items.length === 0) return undefined;
  return budget.items.reduce((sum, item) => sum + item.amount, 0);
}

/** Header card for a displayed itinerary: title, summary, key stats, actions, day jump links. */
function TripOverview({ itinerary, coverImage, isSample = false, onExpandAll, onCustomize }: TripOverviewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const stopCount = itinerary.days.reduce((sum, day) => sum + day.stops.length, 0);
  const total = budgetTotal(itinerary);
  const title = itinerary.title ?? itinerary.destination ?? "Your trip itinerary";

  // Highlight the day currently in view in the jump-link bar.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = itinerary.days
      .map((_, i) => document.getElementById(`day-${i + 1}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveDay(Number(visible[0].target.id.replace("day-", "")));
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [itinerary.days]);

  const coverStyle =
    coverImage && !imageFailed ? undefined : ({ "--cover": "var(--gradient-brand)" } as CSSProperties);

  return (
    <>
      <section className={styles.overview} aria-labelledby="trip-title">
        <div className={styles.cover} style={coverStyle}>
          {coverImage && !imageFailed ? (
            <img className={styles.coverImage} src={coverImage} alt="" onError={() => setImageFailed(true)} />
          ) : (
            <span className={styles.coverPattern} aria-hidden="true" />
          )}
          <div className={styles.coverShade} aria-hidden="true" />
          <div className={styles.coverContent}>
            <span className={styles.badge}>
              {isSample ? (
                <>
                  <MapPinned size={14} aria-hidden="true" /> Curated sample plan
                </>
              ) : (
                <>
                  <Sparkles size={14} aria-hidden="true" /> AI-generated itinerary
                </>
              )}
            </span>
            <h2 id="trip-title" className={styles.title}>
              {title}
            </h2>
            {itinerary.destination ? (
              <p className={styles.destination}>
                <MapPin size={16} aria-hidden="true" />
                {itinerary.destination}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.body}>
          {itinerary.summary ? <p className={styles.summary}>{itinerary.summary}</p> : null}

          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>
                <CalendarDays size={16} aria-hidden="true" /> Duration
              </dt>
              <dd>
                {itinerary.days.length} {itinerary.days.length === 1 ? "day" : "days"}
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>
                <MapPinned size={16} aria-hidden="true" /> Planned stops
              </dt>
              <dd>{stopCount}</dd>
            </div>
            {total !== undefined ? (
              <div className={styles.stat}>
                <dt>
                  <Wallet size={16} aria-hidden="true" /> Est. budget
                </dt>
                <dd>
                  {formatAmount(total, itinerary.budget?.currency)}
                  <small> / person</small>
                </dd>
              </div>
            ) : null}
            {itinerary.bestTime ? (
              <div className={`${styles.stat} ${styles.statWide}`}>
                <dt>
                  <Sun size={16} aria-hidden="true" /> Best time to visit
                </dt>
                <dd className={styles.statText}>{itinerary.bestTime}</dd>
              </div>
            ) : null}
          </dl>

          <div className={styles.actions} data-no-print>
            {onCustomize ? (
              <button type="button" className={styles.primaryAction} onClick={onCustomize}>
                <WandSparkles size={16} aria-hidden="true" />
                Personalize with AI
              </button>
            ) : null}
            {onExpandAll ? (
              <button type="button" className={styles.action} onClick={onExpandAll}>
                <ChevronsDown size={16} aria-hidden="true" />
                Expand all stops
              </button>
            ) : null}
            <button type="button" className={styles.action} onClick={() => window.print()}>
              <Printer size={16} aria-hidden="true" />
              Print / save PDF
            </button>
          </div>
        </div>
      </section>

      {itinerary.days.length > 1 ? (
        <nav className={styles.dayNav} aria-label="Jump to day" data-no-print>
          {itinerary.days.map((day, i) => (
            <a
              key={day.id}
              href={`#day-${i + 1}`}
              className={styles.dayLink}
              aria-current={activeDay === i + 1 ? "true" : undefined}
              onClick={() => setActiveDay(i + 1)}
            >
              <span className={styles.dayLinkNumber}>{i + 1}</span>
              <span className={styles.dayLinkText}>{day.title ?? `${day.stops.length} stops`}</span>
            </a>
          ))}
        </nav>
      ) : null}
    </>
  );
}

export default TripOverview;
