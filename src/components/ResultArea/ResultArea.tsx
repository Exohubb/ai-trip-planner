import type { Itinerary } from "@shared/itinerarySchema";
import type { RequestStatus } from "../../hooks/useItineraryRequest";
import EmptyState from "../EmptyState";
import LoadingSkeleton from "../LoadingSkeleton";
import ErrorState from "../ErrorState";
import EmptyResultState from "../EmptyResultState";
import styles from "./ResultArea.module.css";

export interface ResultAreaProps {
  status: RequestStatus;
  itinerary: Itinerary | null;
  errorMessage: string | null;
}

/**
 * Pure switch over `{ status, itinerary }` that renders exactly one of the
 * result states (Requirement 7.5). Retained-itinerary/background cases
 * (Requirement 5.5-5.6, 7.6) fall through to the populated placeholder
 * because `itinerary` is non-null in those cases, regardless of `status`.
 */
function ResultArea({ status, itinerary, errorMessage }: ResultAreaProps) {
  if (status === "idle") {
    return <EmptyState />;
  }

  if (status === "loading" && !itinerary) {
    return <LoadingSkeleton />;
  }

  if (status === "error" && !itinerary) {
    return <ErrorState message={errorMessage ?? "Something went wrong. Please try again."} />;
  }

  if (status === "success" && itinerary && itinerary.days.length === 0) {
    return <EmptyResultState />;
  }

  if (itinerary) {
    // Populated view placeholder — ItineraryView itself is built in task 11.
    return (
      <div className={styles.placeholder}>
        <p>{itinerary.days.length} day itinerary ready.</p>
      </div>
    );
  }

  return <EmptyState />;
}

export default ResultArea;
