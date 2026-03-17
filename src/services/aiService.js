import { useStore } from '../store';

const SYSTEM_PROMPT = `
You are an expert educational mentor. The user will provide a subject they want to learn.
Your job is to generate a comprehensive, structured learning roadmap.
The roadmap must be broken down into 4-6 chronological phases (e.g. Foundations, Intermediate, Advanced, Mastery).
Return ONLY a strictly valid JSON object. No markdown, no explanations, just the JSON.
The JSON must follow this exact schema:
{
  "subject": "The user's requested subject",
  "phases": [
    {
      "id": "phase-1",
      "title": "Name of Phase",
      "goal": "A short sentence describing the primary goal of this phase",
      "estimatedHours": 20,
      "difficulty": "Beginner | Intermediate | Advanced",
      "topics": [
        "Topic 1 (e.g. HTML5 Semantics)",
        "Topic 2",
        "Topic 3"
      ]
    }
  ]
}
Each phase should have 4-8 specific, searchable topics. DO NOT hallucinate estimatedHours; give a realistic, slightly conservative estimate for a serious learner.
`;

export async function generateRoadmap(subject, apiKey) {
    if (!apiKey) throw new Error("Gemini API Key is required.");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `System Instruction: ${SYSTEM_PROMPT}\n\nUser Request: Create a learning roadmap for: ${subject}` }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Failed to fetch from Gemini");
        }

        const data = await response.json();
        const textContent = data.candidates[0].content.parts[0].text;
        return JSON.parse(textContent);

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
}

const COURSE_EVAL_PROMPT = `
You are an expert curriculum evaluator. 
You will be provided with:
1. The desired phase topics that the student needs to learn.
2. A list of discovered courses with their curriculum data (from Tavily or Coursera API).

Layer 3 Analytics:
Evaluate each course based on its description, content, and domain types to determine which "phase topics" it covers, partially covers, or misses.
Calculate a coverage percentage.
Filter the list to ONLY include courses that cover at least 40% of the phase topics.
Sort the final list by coverage percentage (highest first).
Keep only the top 3 to 5 courses.

For each covered topic, assess whether it is explicitly verifiable from the Coursera description/domainTypes or whether it is inferred. Set verificationStatus as follows:
- "fully_verified": courseraData is present AND all topics in topicsCovered are explicitly mentioned in the description or domainTypes.
- "partially_verified": courseraData is present BUT some topics in topicsCovered are inferred rather than explicitly mentioned.
- "ai_estimated": no courseraData is available — all coverage is AI-inferred from Tavily snippet only.

For estimatedHours: use the Coursera workload field if it is non-null and non-empty. If it is null or empty, output exactly the string "Duration not available".

Layer 4 Gap Detection:
Identify which phase topics remain UNCOVERED by ALL of the recommended courses combined. These are "phaseGaps".

Return ONLY strictly valid JSON following this schema, no markdown blocks:
{
  "recommendedCourses": [
    {
      "name": "Course Name",
      "url": "Course URL",
      "platform": "Platform Name",
      "instructor": "Instructor Name (if available, else 'N/A')",
      "estimatedHours": "Workload from Coursera API, or 'Duration not available'",
      "topicsCovered": ["Topic 1", "Topic 2"],
      "topicsMissing": ["Topic 3"],
      "coveragePercentage": 75,
      "verificationStatus": "fully_verified | partially_verified | ai_estimated",
      "dataSource": "Coursera API | AI-estimated",
      "domainTags": ["Tag 1", "Tag 2"]
    }
  ],
  "phaseGaps": ["Any phase topics completely missing from all courses"]
}
`;

export async function evaluateCourses(phase, enrichedCourses, apiKey) {
    if (!apiKey) throw new Error("Gemini API Key is required.");

    try {
        const payloadStr = JSON.stringify({
            phaseTopics: phase.topics,
            discoveredCourses: enrichedCourses
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `System Instruction: ${COURSE_EVAL_PROMPT}\n\nData to evaluate: ${payloadStr}` }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            throw new Error("Failed to evaluate courses via AI.");
        }

        const data = await response.json();
        const textContent = data.candidates[0].content.parts[0].text;
        return JSON.parse(textContent);

    } catch (error) {
        console.error("Course Evaluation Error:", error);
        throw error;
    }
}

const GAP_FILLER_PROMPT = `
You are evaluating a set of "gap filler" courses specifically to address topics that were left uncovered after the initial course recommendations.

You will receive:
1. uncoveredTopics — the list of topics that no recommended course covered adequately.
2. gapFillerCourses — courses found via a targeted search for those missing topics.

For each gap filler course, determine:
- Which uncovered topics it addresses (topicsCovered from the uncoveredTopics list).
- Its verification status using the same rules as before (fully_verified / partially_verified / ai_estimated).
- Estimated hours from Coursera workload if available, else "Duration not available".

Only include courses that address at least one uncovered topic.
After matching, identify which uncovered topics remain unaddressed by ALL gap filler courses combined — these are unresolvedGaps.

Return ONLY strictly valid JSON, no markdown:
{
  "gapFillerCourses": [
    {
      "name": "Course Name",
      "url": "Course URL",
      "platform": "Platform Name",
      "instructor": "N/A if unknown",
      "estimatedHours": "Workload or 'Duration not available'",
      "topicsCovered": ["Uncovered topic this addresses"],
      "topicsMissing": ["Uncovered topics it still misses"],
      "coveragePercentage": 60,
      "verificationStatus": "fully_verified | partially_verified | ai_estimated",
      "dataSource": "Coursera API | AI-estimated",
      "domainTags": []
    }
  ],
  "unresolvedGaps": ["Topics no gap filler course could address — student must search manually"]
}
`;

export async function evaluateGapFillers(uncoveredTopics, gapFillerCourses, apiKey) {
    if (!apiKey) throw new Error("Gemini API Key is required.");
    if (!gapFillerCourses || gapFillerCourses.length === 0) {
        return { gapFillerCourses: [], unresolvedGaps: uncoveredTopics };
    }

    try {
        const payloadStr = JSON.stringify({ uncoveredTopics, gapFillerCourses });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `System Instruction: ${GAP_FILLER_PROMPT}\n\nData: ${payloadStr}` }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
            })
        });

        if (!response.ok) throw new Error("Gap filler AI evaluation failed.");

        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);

    } catch (error) {
        console.error("Gap Filler Evaluation Error:", error);
        // Fallback: treat all uncovered topics as unresolved
        return { gapFillerCourses: [], unresolvedGaps: uncoveredTopics };
    }
}
