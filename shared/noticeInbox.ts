export type InboxNotice = {
  subjectId: number | null;
  reviewStatus: "pending" | "approved" | "dismissed";
};

export function filterInboxNotices<T extends InboxNotice>(notices: T[], subjectId: number | "all") {
  return subjectId === "all" ? notices : notices.filter(notice => notice.subjectId === subjectId);
}

export function hasPendingInboxReview(notices: InboxNotice[]) {
  return notices.some(notice => notice.reviewStatus === "pending");
}
