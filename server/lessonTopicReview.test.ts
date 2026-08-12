import { describe, expect, it } from "vitest";
import { attachesTopicToClassOnReview } from "../shared/lessonTopicReview";

describe("revisão de tema detectado", () => {
  it("associa à aula somente depois da aprovação", () => {
    expect(attachesTopicToClassOnReview("approved")).toBe(true);
    expect(attachesTopicToClassOnReview("dismissed")).toBe(false);
  });
});
