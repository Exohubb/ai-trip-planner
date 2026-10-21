import { MessageSquareText, Route, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import styles from "./HowItWorks.module.css";

const STEPS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: MessageSquareText,
    title: "Describe it",
    text: "Write your trip in plain English, then pick the length, budget, pace and interests.",
  },
  {
    icon: Route,
    title: "Watch it build",
    text: "Gemini streams a day-by-day plan with times, places, prices and insider tips.",
  },
  {
    icon: SlidersHorizontal,
    title: "Make it yours",
    text: "Reorder or remove stops, tick off your packing list, or ask for changes in one sentence.",
  },
  {
    icon: ShieldCheck,
    title: "Validated output",
    text: "Every AI response is schema-checked on the server and in the browser before it's shown.",
  },
];

/** Four-step explainer shown below the destination gallery. */
function HowItWorks() {
  return (
    <section id="how" className={styles.section} aria-labelledby="how-title" data-no-print>
      <h2 id="how-title" className={styles.title}>
        How it works
      </h2>
      <ol className={styles.steps}>
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={styles.icon} aria-hidden="true">
              <Icon size={22} />
            </span>
            <h3 className={styles.stepTitle}>{title}</h3>
            <p className={styles.text}>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default HowItWorks;
