CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(320),
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS feedback_createdAt_idx ON feedback ("createdAt");
