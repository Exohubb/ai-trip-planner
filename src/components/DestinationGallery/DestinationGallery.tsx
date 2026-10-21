import { useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, CalendarDays, Compass, MapPin, Sparkles, Sun } from "lucide-react";
import { budgetLabel, type Destination } from "../../data/destinations";
import styles from "./DestinationGallery.module.css";

export interface DestinationGalleryProps {
  destinations: Destination[];
  /** Opens the destination's ready-made sample itinerary. */
  onExplore: (destination: Destination) => void;
  /** Generates a fresh, personalized itinerary for the destination with AI. */
  onGenerate: (destination: Destination) => void;
  disabled?: boolean;
}

const ALL = "All";

/** Filterable grid of featured destinations with instant sample plans. */
function DestinationGallery({ destinations, onExplore, onGenerate, disabled = false }: DestinationGalleryProps) {
  const [filter, setFilter] = useState(ALL);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());

  const filters = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach((d) => d.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    // Only tags shared by 2+ destinations make useful filters.
    const shared = [...counts.entries()].filter(([, n]) => n > 1).map(([t]) => t);
    return [ALL, ...shared];
  }, [destinations]);

  const visible = filter === ALL ? destinations : destinations.filter((d) => d.tags.includes(filter));

  return (
    <section id="explore" className={styles.section} aria-labelledby="explore-title" data-no-print>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <Compass size={14} aria-hidden="true" /> Featured destinations
          </span>
          <h2 id="explore-title" className={styles.title}>
            Not sure where to go? Start here.
          </h2>
          <p className={styles.subtitle}>
            Open a ready-made plan instantly, or let the AI build one around your dates and travel style.
          </p>
        </div>
        <div className={styles.filters} role="group" aria-label="Filter destinations">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className={styles.filter}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {visible.map((d, i) => {
          const showImage = !brokenImages.has(d.id);
          return (
            <article
              key={d.id}
              className={styles.card}
              style={{ "--card-gradient": d.gradient, "--delay": `${i * 70}ms` } as CSSProperties}
              aria-labelledby={`dest-${d.id}`}
            >
              <div className={styles.media}>
                {showImage ? (
                  <img
                    className={styles.image}
                    src={d.image}
                    alt={`${d.name}, ${d.country}`}
                    loading="lazy"
                    decoding="async"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(d.id))}
                  />
                ) : null}
                <div className={styles.mediaShade} aria-hidden="true" />
                <span className={styles.budgetBadge} title={budgetLabel(d.budgetLevel)}>
                  <span aria-hidden="true">{"$".repeat(d.budgetLevel)}</span>
                  <span className="sr-only">{budgetLabel(d.budgetLevel)}</span>
                </span>
                <div className={styles.mediaText}>
                  <h3 id={`dest-${d.id}`} className={styles.name}>
                    {d.name}
                  </h3>
                  <p className={styles.country}>
                    <MapPin size={14} aria-hidden="true" />
                    {d.country}
                  </p>
                </div>
              </div>

              <div className={styles.body}>
                <p className={styles.tagline}>{d.tagline}</p>
                <dl className={styles.meta}>
                  <div>
                    <dt>
                      <CalendarDays size={14} aria-hidden="true" />
                      <span className="sr-only">Sample length</span>
                    </dt>
                    <dd>{d.sample.days.length} days</dd>
                  </div>
                  <div>
                    <dt>
                      <Sun size={14} aria-hidden="true" />
                      <span className="sr-only">Best time</span>
                    </dt>
                    <dd>{d.bestTime}</dd>
                  </div>
                </dl>
                <div className={styles.tags}>
                  {d.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => onExplore(d)}
                    aria-label={`View the ${d.name} sample itinerary`}
                  >
                    View plan
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => onGenerate(d)}
                    disabled={disabled}
                    aria-label={`Generate a personalized ${d.name} itinerary with AI`}
                  >
                    <Sparkles size={15} aria-hidden="true" />
                    Ask AI
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default DestinationGallery;
