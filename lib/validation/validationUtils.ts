import { ValidationPoint, ValidationAction, ValidationState } from "./types";

/**
 * Helper to determine if a message has validation points that need attention
 */
export function hasPendingValidations(points?: ValidationPoint[]): boolean {
  if (!points || points.length === 0) return false;
  return points.some((point) => !point.tag);
}

export function getValidationStats(points: ValidationPoint[]): {
  total: number;
  completed: number;
  byTag: Record<string, number>;
} {
  const byTag: Record<string, number> = { WB: 0, ABE: 0, OSR: 0 };
  let completed = 0;

  points.forEach((point) => {
    if (point.tag) {
      byTag[point.tag] = (byTag[point.tag] || 0) + 1;
      completed += 1;
    }
  });

  return {
    total: points.length,
    completed,
    byTag,
  };
}

export function formatValidationSummary(points: ValidationPoint[]): string {
  const { total, byTag } = getValidationStats(points);
  const safeTotal = total || 1;
  return `Validation complete: ${byTag.WB} Within Boundary, ${byTag.ABE} At Boundary Edge, ${byTag.OSR} Outside Range (of ${safeTotal})`;
}

export function validationReducer(
  state: ValidationState,
  action: ValidationAction,
): ValidationState {
  switch (action.type) {
    case "setPoints":
      return {
        ...state,
        [action.messageId]: action.points,
      };
    case "setTag":
      return {
        ...state,
        [action.messageId]: (state[action.messageId] ?? []).map((point) =>
          point.id === action.pointId ? { ...point, tag: action.tag } : point,
        ),
      };
    case "setNote":
      return {
        ...state,
        [action.messageId]: (state[action.messageId] ?? []).map((point) =>
          point.id === action.pointId ? { ...point, note: action.note } : point,
        ),
      };
    case "reset":
      return {};
    default:
      return state;
  }
}
