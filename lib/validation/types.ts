import type { SSTTag } from "../raven/sst";

export type { SSTTag };

export interface ValidationPoint {
  id: string;
  field: string;
  voice: string;
  tag?: SSTTag;
  note?: string;
}

export type ValidationState = Record<string, ValidationPoint[]>;

export type ValidationAction =
  | { type: "setTag"; messageId: string; pointId: string; tag: SSTTag }
  | { type: "setNote"; messageId: string; pointId: string; note: string }
  | { type: "setPoints"; messageId: string; points: ValidationPoint[] }
  | { type: "reset" };

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
