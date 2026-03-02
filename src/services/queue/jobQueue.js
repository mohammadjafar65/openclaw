const { query, execute, queryOne } = require('../../config/database');

/**
 * Database-backed job queue — no Redis or external services needed.
 * Jobs are rows in the job_queue MySQL table.
 */

async function enqueue(type, payload, options = {}) {
  const { priority = 5, delay = 0 } = options;
  const runAt = new Date(Date.now() + delay * 1000);

  const result = await execute(
    `INSERT INTO job_queue (type, payload, priority, run_at) VALUES (?, ?, ?, ?)`,
    [type, JSON.stringify(payload), priority, runAt]
  );
  return result.insertId;
}

async function dequeue(types = [], limit = 10) {
  const typeFilter = types.length > 0
    ? `AND type IN (${types.map(() => '?').join(',')})`
    : '';

  const jobs = await query(
    `SELECT * FROM job_queue
     WHERE status = 'pending'
     AND run_at <= NOW()
     AND attempts < max_attempts
     ${typeFilter}
     ORDER BY priority ASC, created_at ASC
     LIMIT ?`,
    [...types, limit]
  );

  if (jobs.length === 0) return [];

  // Mark as processing
  const ids = jobs.map(j => j.id);
  await execute(
    `UPDATE job_queue SET status = 'processing', attempts = attempts + 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );

  return jobs.map(j => ({ ...j, payload: JSON.parse(j.payload || '{}') }));
}

async function complete(jobId) {
  await execute(
    `UPDATE job_queue SET status = 'done', processed_at = NOW() WHERE id = ?`,
    [jobId]
  );
}

async function fail(jobId, errorMsg) {
  const job = await queryOne('SELECT * FROM job_queue WHERE id = ?', [jobId]);
  const isFinal = job && job.attempts >= job.max_attempts;

  await execute(
    `UPDATE job_queue SET status = ?, error = ?, processed_at = NOW() WHERE id = ?`,
    [isFinal ? 'failed' : 'pending', errorMsg, jobId]
  );

  // If not final, reset to pending with a backoff delay
  if (!isFinal) {
    const backoffSeconds = Math.pow(2, job.attempts) * 60; // exponential backoff
    await execute(
      `UPDATE job_queue SET run_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id = ?`,
      [backoffSeconds, jobId]
    );
  }
}

async function getStats() {
  const rows = await query(
    `SELECT status, COUNT(*) as count FROM job_queue GROUP BY status`
  );
  return rows.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {});
}

async function clearCompleted(olderThanHours = 24) {
  await execute(
    `DELETE FROM job_queue WHERE status IN ('done', 'failed') AND processed_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [olderThanHours]
  );
}

module.exports = { enqueue, dequeue, complete, fail, getStats, clearCompleted };
