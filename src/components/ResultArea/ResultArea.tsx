import type { Day, Itinerary } from "@shared/itinerarySchema";
import type { RequestStatus } from "../../hooks/useItineraryRequest";
import EmptyState from "../EmptyState";
import LoadingSkeleton from "../LoadingSkeleton";
import ErrorState from "../ErrorState";
import EmptyResultState from "../EmptyResultState";
import ItineraryView from "../ItineraryView";
import RetryBanner from "../RetryBanner";
import StreamingIndicator from "../StreamingIndicator";
import DayCard from "../DayCard";

export interface ResultAreaProps {
  status: RequestStatus;
  itinerary: Itinerary | null;
  errorMessage: string | null;
  /**
   * Id of the request whose itinerary is currently loaded. Passed through as
   * `ItineraryView`'s `key` so a new successful fetch resets its local edit
   * state, while background loading/error cycles that retain the same
   * itinerary (same requestId) do not.
   */
  requestId: number;
  /** True when status is loading/streaming/error but a previous itinerary is retained (Req 5.5-5.6). */
  isBackground: boolean;
  /** Resubmits an Itinerary_Request using the last-entered Trip_Description (Req 9.4). */
  onRetry: () => void;
  /** Disables the retry control while a retry-triggered request is in flight (Req 9.2). */
  retryDisabled: boolean;
  /** Shown when the retry control is activated with a blank Trip_Description (Req 9.3). */
  retryValidationMessage: string | null;
  /** Day objects accumulated so far from an in-progress/interrupted stream (Req 14.1/14.2/14.3). */
  partialDays?: Day[];
  /** True when the current error resulted from an interrupted stream (Req 14.3). */
  streamIncomplete?: boolean;
}

/** Read-only preview of the Days streamed in so far, with no edit controls wired up yet. */
function PartialDayPreview({ days }: { days: Day[] }) {
  return (
    <div>
      {days.map((day, index) => (
        <DayCard key={day.id} day={day} dayNumber={index + 1} />
      ))}
    </div>
  );
}

/**
 * Pure switch over `{ status, itinerary }` that renders exactly one of the
 * result states (Requirement 7.5). Retained-itinerary/background cases
 * (Requirement 5.5-5.6, 7.6) fall through to the populated placeholder
 * because `itinerary` is non-null in those cases, regardless of `status`.
 */
function ResultArea({
  status,
  itinerary,
  errorMessage,
  requestId,
  isBackground,
  onRetry,
  retryDisabled,
  retryValidationMessage,
  partialDays = [],
  streamIncomplete = false,
}: ResultAreaProps) {
  if (status === "idle") {
    return <EmptyState />;
  }

  if (status === "loading" && !itinerary) {
    return <LoadingSkeleton />;
  }

  // Streaming, no previously retained itinerary: render whatever Day entries
  // have arrived so far alongside the in-progress indicator (Req 14.1/14.2).
  // Falls back to the regular full-page loading skeleton before the first
  // Day has completed, since there's nothing to preview yet.
  if (status === "streaming" && !itinerary) {
    if (partialDays.length === 0) return <LoadingSkeleton message="Generating your itinerary…" />;
    return (
      <>
        <StreamingIndicator />
        <PartialDayPreview days={partialDays} />
      </>
    );
  }

  // A stream failed/was interrupted with no previously retained itinerary
  // (Req 14.3): keep whatever Day entries were already rendered, and show
  // an error state indicating the itinerary is incomplete, rather than
  // discarding everything.
  if (status === "error" && streamIncomplete && !itinerary) {
    if (partialDays.length === 0) {
      return (
        <ErrorState
          message={errorMessage ?? "Something went wrong. Please try again."}
          onRetry={onRetry}
          retryDisabled={retryDisabled}
          retryValidationMessage={retryValidationMessage}
        />
      );
    }
    return (
      <>
        <RetryBanner
          message={errorMessage ?? "Something went wrong. Please try again."}
          onRetry={onRetry}
          retryDisabled={retryDisabled}
          retryValidationMessage={retryValidationMessage}
        />
        <PartialDayPreview days={partialDays} />
      </>
    );
  }

  if (status === "error" && !itinerary) {
    return (
      <ErrorState
        message={errorMessage ?? "Something went wrong. Please try again."}
        onRetry={onRetry}
        retryDisabled={retryDisabled}
        retryValidationMessage={retryValidationMessage}
      />
    );
  }

  if (status === "success" && itinerary && itinerary.days.length === 0) {
    return <EmptyResultState onRetry={onRetry} retryDisabled={retryDisabled} />;
  }

  if (itinerary) {
    return (
      <>
        {isBackground && status === "streaming" ? <StreamingIndicator /> : null}
        {isBackground && status === "error" ? (
          <RetryBanner
            message={errorMessage ?? "Something went wrong. Please try again."}
            onRetry={onRetry}
            retryDisabled={retryDisabled}
            retryValidationMessage={retryValidationMessage}
          />
        ) : null}
        <ItineraryView key={requestId} days={itinerary.days} />
      </>
    );
  }

  return <EmptyState />;
}

export default ResultArea;
