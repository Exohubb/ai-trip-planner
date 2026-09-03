import type { Itinerary } from "@shared/itinerarySchema";
import type { RequestStatus } from "../../hooks/useItineraryRequest";
import EmptyState from "../EmptyState";
import LoadingSkeleton from "../LoadingSkeleton";
import ErrorState from "../ErrorState";
import EmptyResultState from "../EmptyResultState";
import ItineraryView from "../ItineraryView";
import RetryBanner from "../RetryBanner";

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
  /** True when status is loading/error but a previous itinerary is retained (Req 5.5-5.6). */
  isBackground: boolean;
  /** Resubmits an Itinerary_Request using the last-entered Trip_Description (Req 9.4). */
  onRetry: () => void;
  /** Disables the retry control while a retry-triggered request is in flight (Req 9.2). */
  retryDisabled: boolean;
  /** Shown when the retry control is activated with a blank Trip_Description (Req 9.3). */
  retryValidationMessage: string | null;
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
}: ResultAreaProps) {
  if (status === "idle") {
    return <EmptyState />;
  }

  if (status === "loading" && !itinerary) {
    return <LoadingSkeleton />;
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
