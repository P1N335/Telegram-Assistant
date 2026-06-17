import type { PetMoodLabel } from "@tpc/shared";

/** Человекочитаемая метка настроения питомца для UI. */
export function moodLabelRu(label: PetMoodLabel): string {
  switch (label) {
    case "happy":
      return "Счастлив";
    case "neutral":
      return "В норме";
    case "sad":
      return "Грустит";
    case "tired":
      return "Устал";
  }
}
