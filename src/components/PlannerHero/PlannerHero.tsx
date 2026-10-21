import { useEffect, useState, type ReactNode } from "react";
import { Clock3, Globe2, Sparkles, Wand2 } from "lucide-react";
import TravelScene from "../AuthPage/TravelScene";
import { prefersReducedMotion } from "../../lib/motion";
import styles from "./PlannerHero.module.css";

const DESTINATION_WORDS = ["Lisbon", "Kyoto", "Patagonia", "Bali", "Rome", "Iceland", "Marrakech"];
const WORD_INTERVAL_MS = 2800;

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export interface PlannerHeroProps {
  /** Signed-in user's first name, or undefined for demo/standalone. */
  firstName?: string;
  isDemo?: boolean;
  /** The planner card (TripInputForm) rendered over the scene. */
  children: ReactNode;
}

/** Animated travel-scene hero that frames the trip planner card. */
function PlannerHero({ firstName, isDemo = false, children }: PlannerHeroProps) {
  const [animate] = useState(() => !prefersReducedMotion());
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => setWordIndex((i) => (i + 1) % DESTINATION_WORDS.length), WORD_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [animate]);

  const greeting = greetingForHour(new Date().getHours());
  const word = DESTINATION_WORDS[wordIndex];

  return (
    <section id="plan" className={styles.hero} aria-labelledby="planner-title">
      <div className={styles.sceneWrap} data-no-print>
        <TravelScene animate={animate} />
        <div className={styles.sceneFade} aria-hidden="true" />
      </div>

      <div className={styles.inner}>
        <div className={styles.intro}>
          <span className={styles.greeting}>
            <span className={styles.wave} aria-hidden="true">
              👋
            </span>
            {isDemo ? "Welcome aboard, explorer" : firstName ? `${greeting}, ${firstName}` : greeting}
          </span>
          <h1 id="planner-title" className={styles.title}>
            Your next adventure{" "}
            <span className={styles.titleBreak}>
              starts in{" "}
              <span className="sr-only">any city you choose</span>
              <span key={word} className={styles.word} aria-hidden="true">
                {word}
              </span>
            </span>
          </h1>
          <p className={styles.subtitle}>
            Tell us your dream trip in a sentence, choose how long and how you like to travel, and get a day-by-day plan
            with times, costs and local tips.
          </p>
          <ul className={styles.badges} aria-label="What you get">
            <li>
              <Wand2 size={15} aria-hidden="true" /> AI-crafted itineraries
            </li>
            <li>
              <Clock3 size={15} aria-hidden="true" /> Streams in seconds
            </li>
            <li>
              <Globe2 size={15} aria-hidden="true" /> Any destination
            </li>
            <li>
              <Sparkles size={15} aria-hidden="true" /> Refine with one sentence
            </li>
          </ul>
        </div>

        <div className={styles.card} data-no-print>
          {children}
        </div>
      </div>
    </section>
  );
}

export default PlannerHero;
