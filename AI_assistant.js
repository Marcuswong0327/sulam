import { openRouterAPIKey, openRouterEndPointURL, systemRequirement } from "./config";
import { wikipediaURL } from "./config";
import { MODELS } from "./config";

//js hook to wire AI Assistant button
const aiAskBtn = document.getElementById("aiAskBtn");
const aiAnswerEl = document.getElementById("aiAnswer");
const aiQuestionEl = document.getElementById("aiQuestion");

if (aiAskBtn) {
    aiAskBtn.addEventListener("click", async () => {
        const q = aiQuestionEl.value.trim();
        if (!q) return;

        // dot animation when generating response
        let dots = 0;
        aiAnswerEl.textContent = "🤖 Thinking";
        const interval = setInterval(() => {
            aiAnswerEl.textContent = "🤖 Thinking" + ".".repeat(dots % 4);
            dots++;
        }, 500);

        try {
            const answer = await askAIDestination(q);
            clearInterval(interval);
            aiAnswerEl.textContent = answer;
        } catch (err) {
            clearInterval(interval);
            aiAnswerEl.textContent = "⚠️ Failed to get response.";
            console.error(err);
        }
    });

    // Optional: submit on Enter key
    aiQuestionEl.addEventListener("keypress", (e) => {
        if (e.key === "Enter") aiAskBtn.click();
    });
}

const OPENROUTER_API_KEY = openRouterAPIKey;

async function fetchWikipediaSummary(title) {
    // Hybrid AI using simple Wikipedia REST API for web data
    try {
        const url = `${wikipediaURL}${encodeURIComponent(title)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.extract || null;
    } catch (err) {
        console.error("Failed to fetch Wikipedia summary:", err);
    }
}


async function askAIDestination(question) {
    const current = poiModal._current;
    if (!current) return "Please select a POI or Zone first.";

    const { title, desc, coords } = current;
    const lat = coords?.lat;
    const lng = coords?.lng;

    // Fetch web data
    const wikiSummary = (await fetchWikipediaSummary(title))?.slice(0, 800);

    // Prepare webResults text
    const webResults = wikiSummary
        ? `Wikipedia summary:\n${wikiSummary}`
        : "No external data found.";

    for (const model of MODELS) {
        try {
            const response = await fetch(
                openRouterEndPointURL,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "KUL City Walk AI Assistant"
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role: "system",
                                content: systemRequirement
                            },
                            {
                                role: "user",
                                content: `
Place name: ${title}

Description from map database:
${desc || "No description available."}

Coordinates:
Latitude: ${lat ?? "Unknown"}
Longitude: ${lng ?? "Unknown"}

External search results:
${webResults}

Question:
${question}
`
                            }
                        ],
                        max_tokens: 150
                    })
                }
            );

            const data = await response.json();

            if (data.error) {
                console.warn(`Model failed: ${model}`, data.error.message);
                continue; // try next model
            }

            const content = data.choices?.[0]?.message?.content;
            if (content && content.trim()) return content;

            console.warn(`Empty response from model: ${model}`);
            continue;
        } catch (err) {
            console.warn(`Request failed for model: ${model}`, err);
        }
    }
    return "⚠️ AI is temporarily unavailable due to free model limits. Please try again in a moment.";
}


