export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  MCP_LIMITER: RateLimit;
  LIVE_LIMITER: RateLimit;
  OVERPASS_LIMITER: RateLimit;
  OVERPASS_URL: string;
  // Optional custom-domain origin, e.g. https://walk.example.com.
  APP_ORIGIN?: string;
}
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
