/**
 * Splits text content into overlapping chunks suitable for embedding into
 * vector databases. Chunks are split on paragraph/sentence boundaries when
 * possible to preserve semantic coherence.
 */

export interface ChunkOptions {
    /** Target size of each chunk in characters. */
    chunkSize: number;
    /** Number of overlapping characters between consecutive chunks. */
    chunkOverlap: number;
}

export interface ContentChunk {
    /** The chunk text. */
    text: string;
    /** 0-based index of this chunk within the page. */
    index: number;
    /** Character offset where this chunk starts in the original text. */
    startChar: number;
    /** Character offset where this chunk ends (exclusive) in the original text. */
    endChar: number;
}

/**
 * Split `text` into overlapping chunks. The algorithm tries to break on double
 * newlines (paragraphs), then single newlines, then sentence-ending punctuation,
 * and finally falls back to the exact character boundary.
 */
export function chunkText(text: string, options: ChunkOptions): ContentChunk[] {
    const { chunkSize, chunkOverlap } = options;

    if (!text || text.length === 0) return [];
    if (chunkSize <= 0) return [];
    if (text.length <= chunkSize) {
        return [{ text, index: 0, startChar: 0, endChar: text.length }];
    }

    const chunks: ContentChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);

        // If we haven't reached the end, try to find a good break point
        if (end < text.length) {
            end = findBreakPoint(text, start, end);
        }

        chunks.push({
            text: text.slice(start, end),
            index,
            startChar: start,
            endChar: end,
        });

        index++;
        const step = end - start - chunkOverlap;

        // Ensure we always advance by at least 1 character to avoid infinite loops
        start += Math.max(step, 1);
    }

    return chunks;
}

/**
 * Look backwards from `end` to find the best break point. Preference order:
 * 1. Double newline (paragraph boundary)
 * 2. Single newline
 * 3. Sentence-ending punctuation followed by a space
 * 4. Any space
 * 5. Fall back to the hard boundary at `end`
 *
 * We only search within the last 20% of the chunk to avoid making chunks too small.
 */
function findBreakPoint(text: string, start: number, end: number): number {
    const searchFrom = start + Math.floor((end - start) * 0.8);
    const segment = text.slice(searchFrom, end);

    // 1. Paragraph boundary
    const paraIdx = segment.lastIndexOf('\n\n');
    if (paraIdx !== -1) return searchFrom + paraIdx + 2;

    // 2. Single newline
    const newlineIdx = segment.lastIndexOf('\n');
    if (newlineIdx !== -1) return searchFrom + newlineIdx + 1;

    // 3. Sentence-ending punctuation (. ! ?) followed by space
    const sentenceMatch = segment.match(/.*[.!?]\s/s);
    if (sentenceMatch) return searchFrom + sentenceMatch[0].length;

    // 4. Any space
    const spaceIdx = segment.lastIndexOf(' ');
    if (spaceIdx !== -1) return searchFrom + spaceIdx + 1;

    // 5. Hard boundary
    return end;
}
