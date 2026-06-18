// Minimal structural types for Vercel Node serverless handlers, so we don't
// depend on @vercel/node at build time. The runtime objects are supplied by
// Vercel and are compatible with these shapes.
export interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: any;
}

export interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: any): VercelResponse;
  setHeader(name: string, value: string): void;
}
