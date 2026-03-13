const request = require("supertest");
const app = require("../index");

it("GET /api/takes returns a sorted array of takes", async () => {
  const res = await request(app).get("/api/takes");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  const votes = res.body.map((t) => t.votes);
  expect(votes).toEqual([...votes].sort((a, b) => b - a));
});

it("POST /api/takes creates a take and returns 201", async () => {
  const res = await request(app)
    .post("/api/takes")
    .send({ text: "This is a valid hot take for testing." });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({
    text: "This is a valid hot take for testing.",
    votes: 0,
  });
});

it("POST /api/takes rejects text shorter than 10 characters with 400", async () => {
  const res = await request(app).post("/api/takes").send({ text: "short" });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/at least 10/i);
});

it("POST /api/takes/:id/upvote increments the vote count", async () => {
  const { body: takes } = await request(app).get("/api/takes");
  const target = takes[0];
  const res = await request(app).post(`/api/takes/${target.id}/upvote`);
  expect(res.status).toBe(200);
  expect(res.body.votes).toBe(target.votes + 1);
});

it("vote toggle: upvote then unvote restores original count", async () => {
  const { body: takes } = await request(app).get("/api/takes");
  const target = takes[0];
  await request(app).post(`/api/takes/${target.id}/upvote`);
  const res = await request(app).post(`/api/takes/${target.id}/unvote`);
  expect(res.status).toBe(200);
  expect(res.body.votes).toBe(target.votes);
});
