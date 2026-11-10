declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** "1" when self-hosted behind oauth2-proxy (see DEPLOY.md). */
    SELF_HOSTED?: string;
  }
}
