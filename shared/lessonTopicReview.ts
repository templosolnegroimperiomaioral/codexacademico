export function attachesTopicToClassOnReview(reviewStatus: "approved" | "dismissed") {
  return reviewStatus === "approved";
}
