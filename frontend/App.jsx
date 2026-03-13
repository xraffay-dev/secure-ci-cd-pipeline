import { useState, useEffect } from "react";
import "./App.css";

const API = "/api";

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

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function TakeCard({ take, onToggleVote, hasUpvoted }) {
  return (
    <div className={`take-card ${hasUpvoted ? "take-card--upvoted" : ""}`}>
      <p className="take-text">&ldquo;{take.text}&rdquo;</p>
      <div className="take-footer">
        <span className="take-time">{timeAgo(take.timestamp)}</span>
        <button
          className={`upvote-btn ${hasUpvoted ? "upvoted" : ""}`}
          onClick={() => onToggleVote(take.id)}
          title={hasUpvoted ? "Remove your upvote" : "Upvote this take"}
        >
          <span className="upvote-arrow">▲</span>
          <span className="upvote-count">{take.votes}</span>
        </button>
      </div>
    </div>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">takes</span>
      </div>
      <div className="stat-divider" />
      <div className="stat">
        <span className="stat-value">{stats.totalVotes.toLocaleString()}</span>
        <span className="stat-label">upvotes</span>
      </div>
      <div className="stat-divider" />
      <div className="stat">
        <span className="stat-label">🔥 hottest&nbsp;</span>
        <span className="stat-hot">
          {stats.hottest?.slice(0, 40)}
          {stats.hottest?.length > 40 ? "…" : ""}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [takes, setTakes] = useState([]);
  const [stats, setStats] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [upvoted, setUpvoted] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("upvoted") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [takesRes, statsRes] = await Promise.all([
        fetch(`${API}/takes`),
        fetch(`${API}/stats`),
      ]);

      if (!takesRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch app data");
      }

      const nextTakes = await takesRes.json();
      const nextStats = await statsRes.json();

      setTakes(sortTakesByVotes(nextTakes));
      setStats(nextStats);
      setError("");
    } catch {
      setError("Could not connect to server. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  async function submitTake(e) {
    e.preventDefault();
    if (text.trim().length < 10) {
      setError("A little short for a hot take, no?");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/takes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        return;
      }

      const take = await res.json();

      setTakes((prev) => {
        const nextTakes = sortTakesByVotes([take, ...prev]);
        setStats(buildStats(nextTakes));
        return nextTakes;
      });

      setText("");
      setError("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to post. Is the server running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(id) {
    const hasUpvoted = upvoted.has(id);
    const endpoint = hasUpvoted ? "unvote" : "upvote";

    try {
      const res = await fetch(`${API}/takes/${id}/${endpoint}`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to update vote");
      }

      const updated = await res.json();

      setTakes((prev) => {
        const nextTakes = sortTakesByVotes(
          prev.map((take) => (take.id === id ? updated : take)),
        );
        setStats(buildStats(nextTakes));
        return nextTakes;
      });

      const newUpvoted = new Set(upvoted);

      if (hasUpvoted) {
        newUpvoted.delete(id);
      } else {
        newUpvoted.add(id);
      }

      setUpvoted(newUpvoted);
      setError("");

      try {
        localStorage.setItem("upvoted", JSON.stringify([...newUpvoted]));
      } catch {
        return;
      }
    } catch {
      setError("Failed to update vote. Please try again.");
    }
  }

  const charLeft = 280 - text.length;
  const isNearLimit = charLeft <= 30;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-flame">🔥</span>
            <span className="logo-text">
              HotTakes<span className="logo-dot">.dev</span>
            </span>
          </div>
          <p className="tagline">
            Anonymous developer opinions. No filters. No apologies.
          </p>
          <StatsBar stats={stats} />
        </div>
      </header>

      <main className="main">
        <section className="submit-section">
          <h2 className="section-label">Drop a take</h2>
          <form onSubmit={submitTake} noValidate>
            <div className="textarea-wrap">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError("");
                }}
                placeholder="Unpopular opinion: ______ is overrated..."
                maxLength={280}
                rows={3}
                disabled={submitting}
              />
              <span
                className={`char-count ${isNearLimit ? "char-count--warn" : ""}`}
              >
                {charLeft}
              </span>
            </div>
            {error && <p className="form-error">{error}</p>}
            {success && (
              <p className="form-success">
                Take dropped. Controversy incoming. 🔥
              </p>
            )}
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || text.trim().length < 10}
            >
              {submitting ? "Dropping..." : "Drop it 🔥"}
            </button>
          </form>
        </section>

        <section className="takes-section">
          <h2 className="section-label">Top takes</h2>
          {loading ? (
            <div className="loading">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          ) : (
            <div className="takes-list">
              {takes.map((take, i) => (
                <TakeCard
                  key={take.id}
                  take={take}
                  onToggleVote={toggleVote}
                  hasUpvoted={upvoted.has(take.id)}
                  rank={i + 1}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          Built with Express + React · All takes anonymous · Votes reset on
          restart
        </p>
      </footer>
    </div>
  );
}
