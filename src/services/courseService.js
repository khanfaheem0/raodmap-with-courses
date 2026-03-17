import { evaluateCourses, evaluateGapFillers } from './aiService';

const ALLOWED_DOMAINS = [
    "coursera.org", "freecodecamp.org", "theodinproject.com",
    "cs50.harvard.edu", "ocw.mit.edu", "khanacademy.org", "developer.mozilla.org"
];

/**
 * Returns true if the URL is a direct, individual course/lesson page.
 * Rejects Coursera search pages, articles, browse pages, etc.
 */
function isDirectCourseUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace("www.", "");

        const isAllowed = ALLOWED_DOMAINS.some(d => host === d || host.endsWith("." + d));
        if (!isAllowed) return false;

        // Coursera-specific: only accept /learn/slug paths
        if (host === "coursera.org") {
            return /^\/learn\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname);
        }

        // Other trusted domains: reject generic search/blog/article paths
        const badPatterns = ["/courses?", "/articles/", "/search", "/browse/", "?query=", "/blog/", "/news/"];
        return !badPatterns.some(p => url.includes(p));
    } catch {
        return false;
    }
}

/**
 * Enriches a list of Tavily results with Coursera API data where available.
 */
async function enrichWithCoursera(results) {
    return Promise.all(results.map(async (result) => {
        const { url, title, content } = result;
        let courseraData = null;

        if (url.includes('coursera.org')) {
            const match = url.match(/learn\/([^\/?#]+)/);
            const slug = match ? match[1] : null;
            if (slug) {
                try {
                    const courseraRes = await fetch(`/api/coursera/courses.v1?q=slug&slug=${slug}&fields=name,slug,description,domainTypes,workload,primaryLanguages,subtitleLanguages,partnerIds,instructorIds`);
                    if (courseraRes.ok) {
                        const cData = await courseraRes.json();
                        if (cData.elements?.length > 0) courseraData = cData.elements[0];
                    }
                } catch { console.warn('Coursera enrichment failed for:', slug); }
            }
        }

        return { url, title, tavilyContent: content, courseraData, platform: new URL(url).hostname.replace('www.', '') };
    }));
}


async function tavilySearch(query, tavilyKey) {
    const requestBody = {
        query,
        include_domains: ALLOWED_DOMAINS,
        search_depth: "advanced",
        max_results: 10
    };

    console.log('[Tavily] Sending request via Vite proxy → /api/tavily/search');
    console.log('[Tavily] Payload:', JSON.stringify(requestBody, null, 2));

    const res = await fetch("/api/tavily/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tavilyKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
        const errBody = await res.text();
        console.error('[Tavily] Error response:', res.status, errBody);
        throw new Error(`Tavily returned ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    console.log(`[Tavily] Success — ${data.results?.length || 0} results returned`);
    return data.results || [];
}

export async function fetchCoursesForPhase(phase, apiKeys) {
    if (!apiKeys.tavily) throw new Error("Tavily API Key is required.");
    if (!apiKeys.gemini) throw new Error("Gemini API Key is required for course evaluation.");

    const QUERY_LIMIT = 380;
    const phasePrefix = `${phase.title} course tutorial`;

    // Build topic chunks so each query stays under QUERY_LIMIT characters
    const chunks = [];
    let currentChunk = [];
    let currentLength = phasePrefix.length;

    for (const topic of phase.topics) {
        const addedLength = topic.length + 1;
        if (currentLength + addedLength > QUERY_LIMIT && currentChunk.length >= 2) {
            chunks.push([...currentChunk]);
            currentChunk = [topic];
            currentLength = phasePrefix.length + addedLength;
        } else {
            currentChunk.push(topic);
            currentLength += addedLength;
        }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    console.log(`[Tavily] ${phase.topics.length} topics → ${chunks.length} query chunk(s)`);

    try {
        // LAYER 1: Discovery via Tavily — one search per chunk, merged + deduped
        const allRawResults = [];
        const seenUrls = new Set();

        for (let i = 0; i < chunks.length; i++) {
            const chunkQuery = `${phase.title} ${chunks[i].join(' ')} course tutorial`;
            console.log(`[Tavily] Chunk ${i + 1}/${chunks.length}: "${chunkQuery}" (${chunkQuery.length} chars)`);
            const chunkResults = await tavilySearch(chunkQuery, apiKeys.tavily);
            for (const result of chunkResults) {
                if (!seenUrls.has(result.url)) {
                    seenUrls.add(result.url);
                    allRawResults.push(result);
                }
            }
        }

        console.log(`[Tavily] Total unique results after merge: ${allRawResults.length}`);

        // Strict URL filter — reject search pages, articles, non-course pages
        let validResults = allRawResults.filter(r => isDirectCourseUrl(r.url));
        console.log(`[Tavily] Valid direct course URLs after filter: ${validResults.length}`);

        // If fewer than 3 valid URLs, fire a secondary targeted search
        if (validResults.length < 3) {
            const top3Topics = phase.topics.slice(0, 3);
            const secondaryQuery = `${top3Topics.join(' ')} online course tutorial`;
            console.log(`[Tavily] < 3 valid results — secondary search: "${secondaryQuery}"`);
            const secondaryResults = await tavilySearch(secondaryQuery, apiKeys.tavily);
            const secondaryValid = secondaryResults.filter(r =>
                isDirectCourseUrl(r.url) && !validResults.find(vr => vr.url === r.url)
            );
            validResults = [...validResults, ...secondaryValid];
        }

        if (validResults.length === 0) {
            throw new Error("No valid course URLs found for this phase. Try a different subject.");
        }

        // LAYER 2: Curriculum enrichment
        const enrichedCourses = await enrichWithCoursera(validResults);

        // LAYER 3 & 4: AI verification (coverage %) and gap reporting
        const evaluatedResult = await evaluateCourses(phase, enrichedCourses, apiKeys.gemini);

        if (!evaluatedResult.recommendedCourses || evaluatedResult.recommendedCourses.length === 0) {
            throw new Error("No courses met the 40% coverage threshold for this phase.");
        }

        // LAYER 5: Gap filler — one budget-capped search for uncovered topics
        const uncoveredTopics = evaluatedResult.phaseGaps || [];
        let gapFillerCourses = [];
        let unresolvedGaps = [];

        if (uncoveredTopics.length > 0) {
            const GAP_QUERY_LIMIT = 380;
            const gapPrefix = 'learn';

            // Cap to first 3 uncovered topics if combined query would exceed limit
            const topicsForQuery = uncoveredTopics.reduce((acc, topic) => {
                const candidate = [...acc, topic];
                const queryLength = gapPrefix.length + 1 + candidate.join(' ').length;
                return queryLength <= GAP_QUERY_LIMIT ? candidate : acc;
            }, []).slice(0, 3);

            const gapQuery = `learn ${topicsForQuery.join(' ')}`;
            console.log(`[Gap Filler] ${uncoveredTopics.length} uncovered topics → query: "${gapQuery}" (${gapQuery.length} chars)`);

            try {
                const gapRaw = await tavilySearch(gapQuery, apiKeys.tavily);
                const gapValid = gapRaw.filter(r => isDirectCourseUrl(r.url) && !validResults.find(v => v.url === r.url));
                console.log(`[Gap Filler] ${gapValid.length} valid new URLs found`);

                const gapEnriched = await enrichWithCoursera(gapValid);
                const gapResult = await evaluateGapFillers(uncoveredTopics, gapEnriched, apiKeys.gemini);

                gapFillerCourses = gapResult.gapFillerCourses || [];
                unresolvedGaps = gapResult.unresolvedGaps || [];

                console.log(`[Gap Filler] ${gapFillerCourses.length} gap filler courses found, ${unresolvedGaps.length} topics still unresolved`);
            } catch (e) {
                console.warn('[Gap Filler] Search failed, treating all gaps as unresolved:', e.message);
                unresolvedGaps = uncoveredTopics;
            }
        }

        return {
            ...evaluatedResult,
            gapFillerCourses,
            unresolvedGaps
        };

    } catch (error) {
        console.error("Course Search Error:", error);
        throw error;
    }
}
