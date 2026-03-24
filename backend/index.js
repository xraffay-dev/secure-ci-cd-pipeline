const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8000;

function sortTakesByVotes(items) {
  return [...items].sort(
    (a, b) => b.votes - a.votes || b.timestamp - a.timestamp,
  );
}

function buildStats(items) {
  const sorted = sortTakesByVotes(items);

  return {
    total: items.length,
    totalVotes: items.reduce((sum, take) => sum + take.votes, 0),
    hottest: sorted[0]?.text ?? null,
  };
}

app.use(cors());
app.use(express.json());

let takes = [
  {
    id: "1",
    text: "CSS is a programming language and I will die on this hill.",
    votes: 214,
    timestamp: Date.now() - 172800000,
  },
  {
    id: "2",
    text: "TypeScript is just JavaScript with extra meetings.",
    votes: 187,
    timestamp: Date.now() - 86400000,
  },
  {
    id: "3",
    text: "The best code is no code. Most of us are in the wrong profession.",
    votes: 143,
    timestamp: Date.now() - 43200000,
  },
  {
    id: "4",
    text: "Tabs are objectively superior to spaces. Fight me.",
    votes: 98,
    timestamp: Date.now() - 36000000,
  },
  {
    id: "5",
    text: "Docker solves problems that Docker itself created.",
    votes: 76,
    timestamp: Date.now() - 21600000,
  },
  {
    id: "6",
    text: "Your microservices architecture is actually a distributed monolith. Congrats.",
    votes: 54,
    timestamp: Date.now() - 7200000,
  },
  {
    id: "7",
    text: "The real 10x engineer is the one who says no to 90% of features.",
    votes: 41,
    timestamp: Date.now() - 3600000,
  },
  {
    id: "8",
    text: "Kubernetes is just job security for DevOps engineers.",
    votes: 33,
    timestamp: Date.now() - 1800000,
  },
];

let nextId = 9;

app.get("/api/takes", (req, res) => {
  res.json(sortTakesByVotes(takes));
});

app.post("/api/takes", (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string" || text.trim().length < 10) {
    return res
      .status(400)
      .json({ error: "Take must be at least 10 characters." });
  }

  if (text.trim().length > 280) {
    return res
      .status(400)
      .json({ error: "Take must be under 280 characters." });
  }

  const take = {
    id: String(nextId++),
    text: text.trim(),
    votes: 0,
    timestamp: Date.now(),
  };
  takes.unshift(take);
  res.status(201).json(take);
});

app.post("/api/takes/:id/upvote", (req, res) => {
  const take = takes.find((t) => t.id === req.params.id);
  if (!take) return res.status(404).json({ error: "Take not found." });
  take.votes += 1;
  res.json(take);
});

app.post("/api/takes/:id/unvote", (req, res) => {
  const take = takes.find((t) => t.id === req.params.id);

  if (!take) {
    return res.status(404).json({ error: "Take not found." });
  }

  if (take.votes <= 0) {
    return res.status(400).json({ error: "Take has no votes to remove." });
  }

  take.votes -= 1;
  res.json(take);
});

app.get("/api/stats", (req, res) => {
  res.json(buildStats(takes));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🔥 HotTakes server running on http://localhost:${PORT}`);
  });
}

app.use(express.static(path.join(__dirname, 'client/dist')))

module.exports = app;
