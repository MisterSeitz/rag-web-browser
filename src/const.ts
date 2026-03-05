export enum ContentCrawlerStatus {
    PENDING = 'pending',
    HANDLED = 'handled',
    FAILED = 'failed',
}

export enum Routes {
    SEARCH = '/search',
    SSE = '/sse',
    MESSAGE = '/message',
}

export enum ContentCrawlerTypes {
    PLAYWRIGHT = 'playwright',
    CHEERIO = 'cheerio',
}

export const PLAYWRIGHT_REQUEST_TIMEOUT_NORMAL_MODE_SECS = 60;

/**
 * Pay-per-event charge event name for a successfully crawled page.
 * This is the only billable event in the actor.
 */
export const PPE_EVENT_PAGE_CRAWLED = 'page-crawled';
