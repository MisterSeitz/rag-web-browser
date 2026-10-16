import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

import type { OrganicResult, SearchResultType } from '../types.js';

// Google's click-tracking redirect endpoints, sometimes served instead of a plain result anchor.
// Relative to the page origin; crawling them lets Google's redirect resolve to the real destination.
const GOOGLE_REDIRECT_PATH_PREFIXES = ['/goto', '/url'];

function isGoogleRedirectPath(href: string): boolean {
    return GOOGLE_REDIRECT_PATH_PREFIXES.some(
        (prefix) => href === prefix || href.startsWith(`${prefix}?`) || href.startsWith(`${prefix}/`),
    );
}

/** Resolves a Google redirect href against the page it was loaded from. */
function resolveUrl(href: string, pageUrl: string): string {
    try {
        return new URL(href, pageUrl).href;
    } catch {
        return href;
    }
}

/** Validates that a URL is absolute http/https and not one of Google's own internal search links. */
function isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        if (
            (urlObj.hostname === 'google.com' || urlObj.hostname.endsWith('.google.com'))
            && (urlObj.pathname.startsWith('/search') || urlObj.pathname === '/')
        ) {
            return false;
        }
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Deduplicates search results based on their title and URL (source @apify/google-search).
 */
export const deduplicateResults = <T extends { title?: string; url?: string }>(results: T[]): T[] => {
    const deduplicatedResults = [];
    const resultHashes = new Set();
    for (const result of results) {
        // date defaults to now so it is not stable
        const hash = JSON.stringify({ title: result.title, url: result.url });
        if (!resultHashes.has(hash)) {
            deduplicatedResults.push(result);
            resultHashes.add(hash);
        }
    }
    return deduplicatedResults;
};

/**
 * Parses a single organic search result.
 */
const parseResult = ($: CheerioAPI, el: Element, pageUrl: string) => {
    $(el).find('div.action-menu').remove();

    const descriptionSelector = '.VwiC3b';

    // 1. Title Extraction
    let headingEl = $(el).find('h3').first();
    if (!headingEl.length) {
        headingEl = $(el).find('div[role="heading"]').first();
    }
    const title = headingEl.text()?.trim() || '';

    // 2. Link Extraction (Anchor prioritizing heading association)
    let anchor = headingEl.closest('a');
    if (!anchor.length) {
        anchor = $(el).find('a:has(h3), a:has([role="heading"])').first();
    }
    if (!anchor.length) {
        // Find first link that is not internal anchor / search
        for (const a of $(el).find('a').toArray()) {
            const h = $(a).attr('href') || '';
            if (h && !h.startsWith('#') && !h.includes('/search?') && h !== '/') {
                anchor = $(a);
                break;
            }
        }
    }
    if (!anchor.length) {
        anchor = $(el).find('a').first();
    }

    let href = anchor.attr('href') || '';

    // Unwrap or resolve Google redirect / relative URL
    if (href && isGoogleRedirectPath(href)) {
        if (href.includes('/url?')) {
            try {
                const u = new URL(href, pageUrl);
                const target = u.searchParams.get('q') || u.searchParams.get('url');
                if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
                    href = target;
                } else {
                    href = resolveUrl(href, pageUrl);
                }
            } catch {
                href = resolveUrl(href, pageUrl);
            }
        } else {
            href = resolveUrl(href, pageUrl);
        }
    } else if (href.startsWith('/')) {
        href = resolveUrl(href, pageUrl);
    } else if (href.startsWith('//')) {
        href = `https:${href}`;
    }

    // 3. Description / Snippet Extraction
    let description = ($(el).find(descriptionSelector).text() || '').trim();
    if (!description) {
        description = ($(el).find('[style*="-webkit-line-clamp"], .yXK7lf, .MUxGbd').first().text() || '').trim();
    }

    const searchResult: OrganicResult = {
        title,
        description,
        url: href,
    };

    return searchResult;
};

/**
 * Extracts search results from the given selectors (source: @apify/google-search).
 */
const extractResultsFromSelectors = ($: CheerioAPI, selectors: string[], pageUrl: string) => {
    const searchResults: OrganicResult[] = [];
    const selector = selectors.join(', ');
    for (const resultEl of $(selector)) {
        const results = $(resultEl).map((_i, el) => parseResult($, el as Element, pageUrl)).toArray();
        for (const result of results) {
            if (result.title && result.url && isValidUrl(result.url)) {
                searchResults.push(result);
            }
        }
    }
    return searchResults;
};

/**
 * If true, the results are not inherent to the given query, but to a similar suggested query
 */
const areTheResultsSuggestions = ($: CheerioAPI) => {
    // Check if the message "No results found" is shown
    return $('div#topstuff > div.fSp71d').children().length > 0;
};

/**
 * Extracts organic search results from the given Cheerio instance (source: @apify/google-search).
 */
export const scrapeOrganicResults = ($: CheerioAPI, pageUrl = 'https://www.google.com'): OrganicResult[] => {
    const resultSelectors = [
        '.g', // Any standard result card
        '.tF2Cxc', // Direct result wrapper
        '.hlcw0c', // Top result with site links
        '.g.Ww4FFb', // General search results
        '.MjjYud', // General search results card container
        '#rso > div', // Top-level result items under rso
        '.sATSHe', // Another modern selector
    ];

    const searchResults = extractResultsFromSelectors($, resultSelectors, pageUrl);
    const deduplicatedResults = deduplicateResults(searchResults);
    let resultType: SearchResultType = 'ORGANIC';
    if (areTheResultsSuggestions($)) {
        resultType = 'SUGGESTED';
    }
    return deduplicatedResults.map((result) => ({
        ...result,
        resultType,
    }));
};
