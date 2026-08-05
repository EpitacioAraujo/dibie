/** Move um item de lugar numa lista, sem mutar a original. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
