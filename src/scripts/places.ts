// Chip-list rules shared by the cities to visit and the places to finish, as in the app's SearchFormModel.
export function addPlace(list: readonly string[], code: string, max: number): string[] {
  if (list.includes(code)) return [...list];
  if (max <= 1) return [code];
  return list.length < max ? [...list, code] : [...list];
}

export const removePlace = (list: readonly string[], code: string) => list.filter((c) => c !== code);
