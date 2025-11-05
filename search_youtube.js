#!/usr/bin/env node

const QUERY = "How to make vegan dishes?";
const SEARCH_URL = "https://www.youtube.com/results?search_query=" + encodeURIComponent(QUERY);

async function main() {
  const res = await fetch(SEARCH_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch search results: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const initialData = extractInitialData(html);
  const videos = collectVideos(initialData).slice(0, 10);

  if (!videos.length) {
    console.error("No videos found in search results.");
    process.exit(1);
  }

  for (const [index, video] of videos.entries()) {
    console.log(`${index + 1}. ${video.title}`);
    console.log(`   https://www.youtube.com/watch?v=${video.id}`);
    if (video.description) {
      console.log(`   ${video.description}`);
    }
    if (video.lengthText) {
      console.log(`   Duration: ${video.lengthText}`);
    }
    console.log();
  }
}

function extractInitialData(html) {
  const match = html.match(/var ytInitialData = (.*?);<\/script>/s);
  if (!match) {
    throw new Error("Unable to locate ytInitialData payload.");
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Failed to parse ytInitialData payload: ${error.message}`);
  }
}

function collectVideos(root) {
  const videos = [];

  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;

    if (current.videoRenderer) {
      const renderer = current.videoRenderer;
      const { videoId, title, descriptionSnippet, lengthText } = renderer;
      videos.push({
        id: videoId,
        title: flattenRuns(title?.runs),
        description: flattenRuns(descriptionSnippet?.runs),
        lengthText: lengthText?.simpleText,
      });
      continue;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return videos;
}

function flattenRuns(runs) {
  if (!Array.isArray(runs)) return "";
  return runs.map((run) => run.text).join("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
