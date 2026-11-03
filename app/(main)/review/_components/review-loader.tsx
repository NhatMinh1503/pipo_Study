import { getDueFlashcards } from "@/server/queries/flashcards";

import { ReviewSession } from "./review-session";

export async function ReviewLoader() {
  const cards = await getDueFlashcards();
  return <ReviewSession cards={cards} />;
}
