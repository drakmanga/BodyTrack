export interface PageParams {
  page: number;
  size: number;
  skip: number;
  take: number;
}

export function parsePageParams(
  query: { page?: string; size?: string },
  opts: { defaultSize: number; maxSize: number },
): PageParams {
  const page = Math.max(0, Number(query.page ?? 0) || 0);
  const rawSize = Number(query.size ?? opts.defaultSize) || opts.defaultSize;
  const size = Math.min(opts.maxSize, Math.max(1, rawSize));
  return { page, size, skip: page * size, take: size };
}

export interface PageEnvelope<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export function buildPage<T>(content: T[], totalElements: number, page: number, size: number): PageEnvelope<T> {
  return {
    content,
    page: {
      size,
      number: page,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    },
  };
}
