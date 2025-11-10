---
node_type: Question
status: Complete
priority: Medium
created: 2025-11-09
updated: 2025-11-10
spawned_by:
  - Q-3
informs:
  - D-6
tags:
  - technical
  - matching
  - algorithm
  - postgis
  - optimization
---

# Q-8: Matching Algorithm Design

## Question

How should the guard-to-job matching algorithm work to efficiently and fairly match available guards with customer job requests?

## Context

The Aegis platform operates as an "Uber for Security Guards" marketplace where customers request security services and the system must efficiently match available guards to jobs. Based on D-3 (Database Schema), we have:

- PostgreSQL with PostGIS extension for geospatial queries
- Guards with skills (JSONB array), availability status, current location (PostGIS Point)
- Jobs with required skills, location coordinates, start time, hourly rate
- Performance target: Matching must complete in < 5 seconds for good UX

This research explores matching algorithm patterns from leading on-demand platforms (Uber, DoorDash, TaskRabbit) and PostGIS optimization techniques to design an efficient, fair matching system for Aegis.

## Research Findings

### 1. Industry Matching Algorithm Patterns

#### Uber's Approach: Beyond Simple Proximity

**Key Insights:**
- **Travel time over distance**: Uber uses estimated travel time (duration) to reach the rider, NOT simple geographic distance. Traffic, overpasses, rivers, and road topology affect matching.
- **Batch matching for optimization**: When multiple requests arrive simultaneously, Uber uses batch-matching algorithms to minimize total wait time across all riders (33% improvement over greedy first-come-first-served).
- **Network-level optimization**: Rather than optimizing individual matches, Uber predicts imminent demand and optimizes for aggregate wait time across the entire network.
- **Multi-factor scoring**: Proximity is weighted alongside driver ratings, acceptance rates, and historical performance.
- **Geospatial indexing**: Uses Geohash or R-tree spatial indexing to find nearby drivers at scale (1M+ requests/second).

**Relevance to Aegis**: Security guards have similar constraints - travel time to job site matters more than straight-line distance, and batch matching could optimize when multiple jobs are posted simultaneously.

#### DoorDash's Dispatch System: DeepRed

**Key Insights:**
- **Machine learning layer**: Three ML models predict (1) order ready time, (2) travel times, and (3) dasher acceptance probability.
- **Optimization layer**: Formulated as Mixed-Integer Programming (MIP) problem solved with Gurobi optimizer (10x faster than Hungarian algorithm).
- **Strategic batching**: Groups orders to reduce dasher idle time and improve delivery efficiency.
- **Performance metrics**: Prioritizes dasher efficiency, fulfillment quality, proximity to restaurant, and dasher ratings.

**Relevance to Aegis**: ML models for guard acceptance prediction and travel time estimation could significantly improve matching accuracy. MIP formulation enables batch optimization.

#### TaskRabbit's Skill-Based Matching

**Key Insights:**
- **Multi-dimensional scoring**: Algorithm considers past behavior, skill preferences, proximity, availability, and previous performance.
- **Automated matching replaced auctions**: TaskRabbit V.3 shifted from manual bidding to automated algorithm, improving task completion rates.
- **Location prioritization evolution**: Recently changed to prioritize taskers based on city of residence rather than service area, indicating ongoing refinement of proximity weighting.

**Relevance to Aegis**: Security guards require specific skills (armed/unarmed, K-9, crowd control), making skill-based filtering critical. Automated matching is essential for real-time bookings.

### 2. PostGIS Geospatial Query Optimization

#### ST_DWithin for Radius Searches

**Best Practice Query Pattern:**
```sql
-- Find guards within 15 miles of job location
SELECT
  gp.id,
  gp.user_id,
  u.name,
  gp.skills,
  gp.hourly_rate_cents,
  ST_Distance(gp.current_location, job_point) / 1609.34 AS distance_miles
FROM guard_profiles gp
JOIN users u ON gp.user_id = u.id
WHERE gp.availability_status = 'available'
  AND gp.skills @> '["armed", "patrol"]'::jsonb  -- Skill filtering
  AND ST_DWithin(
    gp.current_location::geography,
    ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography,  -- Job location
    24140  -- 15 miles = 24,140 meters
  )
ORDER BY gp.current_location <-> ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)
LIMIT 10;
```

**Key Optimization Techniques:**

1. **GIST Index on Geography**: Essential for fast spatial queries
   ```sql
   CREATE INDEX idx_guard_profiles_location
   ON guard_profiles USING GIST (current_location);
   ```

2. **GIN Index for JSONB Skills**: Enables fast skill containment queries
   ```sql
   CREATE INDEX idx_guard_profiles_skills
   ON guard_profiles USING GIN (skills);
   ```

3. **Partial Index for Available Guards**: Only index guards who are actually available
   ```sql
   CREATE INDEX idx_guard_profiles_available
   ON guard_profiles (availability_status)
   WHERE availability_status = 'available';
   ```

4. **CLUSTER for Physical Ordering**: Reorganizes table data to match index order (90% performance improvement)
   ```sql
   CLUSTER guard_profiles USING idx_guard_profiles_location;
   ```

5. **KNN Distance Operator (<->)**: For efficient nearest-neighbor queries
   - Returns 2D distance and uses index when in ORDER BY clause
   - Combine with ST_DWithin to limit search radius

6. **LATERAL JOIN for Multiple Matches**: Standard pattern for finding N nearest neighbors per job
   ```sql
   SELECT j.id, nearby_guards.*
   FROM jobs j
   CROSS JOIN LATERAL (
     SELECT gp.*, ST_Distance(gp.current_location, j.location_coordinates) AS distance
     FROM guard_profiles gp
     WHERE ST_DWithin(gp.current_location, j.location_coordinates, 24140)
       AND gp.availability_status = 'available'
     ORDER BY gp.current_location <-> j.location_coordinates
     LIMIT 5
   ) nearby_guards;
   ```

**Performance Expectations:**
- With proper indexes: O(log n) query time instead of O(n) table scan
- Target: < 50ms for proximity queries on 10K+ guard dataset
- ST_DWithin creates bounding box search rectangle, then exact distance filtering on indexed subset

### 3. Real-Time vs Batch Matching Trade-offs

#### Real-Time Matching (Immediate Assignment)

**Advantages:**
- Instant confirmation for customers (better UX)
- Lower system complexity (no queuing/batching logic)
- Works well for low-volume, sporadic requests

**Disadvantages:**
- Greedy matching may be suboptimal (assign closest guard even if better match arriving soon)
- No opportunity to optimize across multiple simultaneous requests
- Can lead to uneven guard utilization

**Best For:** Low-volume markets, urgent requests, simple one-to-one matching

#### Batch Matching (Periodic Optimization)

**Advantages:**
- 33% improvement in aggregate wait times (Uber's data)
- Can optimize for fairness (distribute jobs evenly across guards)
- Reduces guard idle time by strategic batching
- Enables MIP/optimization algorithms

**Disadvantages:**
- Adds latency (wait for batch window, e.g., 30-60 seconds)
- More complex implementation (queuing, batch assembly, optimization solver)
- May frustrate customers expecting instant matches

**Best For:** High-volume markets, predictable demand patterns, maximizing network efficiency

#### Hybrid Approach (Recommended)

**Strategy:**
- **Real-time for urgent requests**: Jobs starting within 2 hours get immediate greedy matching
- **Batch for advance bookings**: Jobs starting 2+ hours out wait up to 60 seconds to accumulate batch, then optimize
- **Dynamic switching**: Use real-time during off-peak, batch during peak demand

**Implementation:**
```javascript
async function matchJob(job) {
  const timeUntilStart = job.start_time - Date.now();

  if (timeUntilStart < 2 * 60 * 60 * 1000) {
    // Urgent: Real-time greedy matching
    return await greedyMatch(job);
  } else {
    // Advance booking: Add to batch queue
    await addToBatchQueue(job);
    return await waitForBatchMatch(job, { timeout: 60000 });
  }
}
```

### 4. Scoring Formula and Ranking Criteria

Based on industry research and Aegis requirements, the recommended multi-factor scoring formula:

#### Weighted Scoring Formula

```
match_score = (w1 * proximity_score)
            + (w2 * skill_score)
            + (w3 * rating_score)
            + (w4 * acceptance_score)
            + (w5 * fairness_score)

Where:
  w1 = 0.40  (Proximity weight - most important)
  w2 = 0.25  (Skill match weight)
  w3 = 0.15  (Rating/quality weight)
  w4 = 0.10  (Acceptance rate weight)
  w5 = 0.10  (Fairness/distribution weight)
```

#### Component Calculations

**1. Proximity Score (0-100)**
```javascript
// Normalize distance to 0-100 (closer = higher score)
// Max search radius: 25 miles (40 km)
proximity_score = Math.max(0, 100 * (1 - (distance_miles / 25)));

// Examples:
// 0 miles   -> 100 points
// 5 miles   -> 80 points
// 15 miles  -> 40 points
// 25+ miles -> 0 points (out of range)
```

**2. Skill Match Score (0-100)**
```javascript
// Calculate percentage of required skills that guard possesses
const required_skills = job.required_skills;  // ["armed", "patrol", "access_control"]
const guard_skills = guard.skills;             // ["armed", "unarmed", "patrol", "k9"]

const matched_skills = required_skills.filter(s => guard_skills.includes(s));
const skill_match_percentage = (matched_skills.length / required_skills.length);

skill_score = skill_match_percentage * 100;

// Bonus: +20 points if guard has ALL required skills AND additional relevant skills
if (skill_match_percentage === 1.0 && guard_skills.length > required_skills.length) {
  skill_score = Math.min(100, skill_score + 20);
}

// Examples:
// 3/3 skills + extras -> 100 points (bonus applied)
// 3/3 skills exact     -> 100 points
// 2/3 skills           -> 67 points
// 0/3 skills           -> 0 points (should filter out)
```

**3. Rating Score (0-100)**
```javascript
// Normalize 5-star rating to 0-100 scale
// Minimum acceptable rating: 3.0 stars
rating_score = ((guard.average_rating - 3.0) / 2.0) * 100;

// Examples:
// 5.0 stars -> 100 points
// 4.0 stars -> 50 points
// 3.0 stars -> 0 points
// < 3.0     -> Filtered out (not eligible)
```

**4. Acceptance Rate Score (0-100)**
```javascript
// Directly use acceptance rate percentage
// Guards with higher acceptance rates get priority
acceptance_score = guard.acceptance_rate * 100;

// Examples:
// 95% acceptance -> 95 points
// 75% acceptance -> 75 points
// 50% acceptance -> 50 points
```

**5. Fairness Score (0-100)**
```javascript
// Penalize guards who have received many recent jobs (prevent monopolization)
// Look at jobs assigned in past 7 days
const jobs_last_week = guard.jobs_count_last_7_days;
const avg_jobs_last_week = platform.avg_jobs_per_guard_last_7_days;

// Guards below average get bonus, above average get penalty
const fairness_ratio = avg_jobs_last_week / Math.max(1, jobs_last_week);
fairness_score = Math.min(100, fairness_ratio * 50);

// Examples:
// 0 jobs (avg=5)     -> 100 points (needs work)
// 2 jobs (avg=5)     -> 100 points (below average)
// 5 jobs (avg=5)     -> 50 points (at average)
// 10 jobs (avg=5)    -> 25 points (above average, penalized)
// 20 jobs (avg=5)    -> 12.5 points (hogging jobs)
```

#### Final Ranking Query

```sql
WITH scored_guards AS (
  SELECT
    gp.id,
    gp.user_id,
    u.name,

    -- Proximity score (40% weight)
    GREATEST(0, 100 * (1 - (ST_Distance(gp.current_location::geography, $job_location::geography) / 1609.34 / 25))) AS proximity_score,

    -- Skill match score (25% weight)
    (
      SELECT COUNT(*)::float / jsonb_array_length($required_skills)
      FROM jsonb_array_elements_text($required_skills) AS req_skill
      WHERE gp.skills @> jsonb_build_array(req_skill)
    ) * 100 AS skill_score,

    -- Rating score (15% weight)
    ((COALESCE(u.average_rating, 4.0) - 3.0) / 2.0) * 100 AS rating_score,

    -- Acceptance rate score (10% weight)
    COALESCE(gp.acceptance_rate, 0.8) * 100 AS acceptance_score,

    -- Fairness score (10% weight)
    LEAST(100, (
      (SELECT AVG(job_count) FROM (
        SELECT COUNT(*) as job_count
        FROM jobs
        WHERE matched_at >= NOW() - INTERVAL '7 days'
        GROUP BY guard_id
      ) avg_calc) / GREATEST(1, (
        SELECT COUNT(*)
        FROM jobs
        WHERE guard_id = gp.user_id
          AND matched_at >= NOW() - INTERVAL '7 days'
      ))
    ) * 50) AS fairness_score,

    ST_Distance(gp.current_location::geography, $job_location::geography) / 1609.34 AS distance_miles

  FROM guard_profiles gp
  JOIN users u ON gp.user_id = u.id
  WHERE gp.availability_status = 'available'
    AND u.status = 'active'
    AND u.average_rating >= 3.0
    AND ST_DWithin(
      gp.current_location::geography,
      $job_location::geography,
      40234  -- 25 miles in meters
    )
    -- Require at least 50% skill match
    AND (
      SELECT COUNT(*)::float / jsonb_array_length($required_skills)
      FROM jsonb_array_elements_text($required_skills) AS req_skill
      WHERE gp.skills @> jsonb_build_array(req_skill)
    ) >= 0.5
)
SELECT
  *,
  (0.40 * proximity_score +
   0.25 * skill_score +
   0.15 * rating_score +
   0.10 * acceptance_score +
   0.10 * fairness_score) AS final_score
FROM scored_guards
ORDER BY final_score DESC
LIMIT 10;
```

### 5. Fairness and Distribution Algorithms

#### Key Fairness Challenges in Gig Platforms

**Research Findings:**
- **Winner-take-all dynamics**: Without fairness mechanisms, highly-rated guards near demand centers monopolize jobs, leading to guard starvation and churn
- **Transparency issues**: 6 of 7 major gig platforms use opaque algorithmic matching, reducing worker trust
- **Acceptance rate pressure**: Workers feel compelled to accept unfavorable jobs to avoid algorithm deprioritization

#### Recommended Fairness Strategies

**1. Minimax Share (MMS) Approach**
- Minimize the maximum cost (or minimize wait time) among all guards
- Ensures no guard is disproportionately disadvantaged
- Implementation: Track jobs-per-guard over rolling 7-day window, boost score for underutilized guards

**2. Non-Wastefulness Principle**
- No job reassignment should make one guard strictly better off while making another worse off
- Prevents "gaming" the system through strategic declining

**3. Fairness Score Integration (10% weight)**
- As detailed in scoring formula above
- Guards with fewer recent jobs receive score boost
- Prevents same guards from dominating all requests

**4. Rotation Policy for Tie-Breaking**
- When multiple guards have similar final scores (within 5 points), rotate through them using round-robin
- Track last-assigned timestamp per guard
- Example: Guards A, B, C all score 85-88 points. If A was last assigned, select B this time.

**5. Transparency Mechanisms**
- Show guards their current matching score components (anonymized)
- Explain why they didn't receive a job ("3 guards were closer", "required armed certification")
- Publish platform-wide statistics (avg jobs/week, avg earnings)

#### Implementation Example

```javascript
async function applyFairnessFilter(rankedGuards, job) {
  // Get top 10 guards by score
  const topGuards = rankedGuards.slice(0, 10);

  // Check for score clustering (within 5 points)
  const topScore = topGuards[0].final_score;
  const clusteredGuards = topGuards.filter(g => topScore - g.final_score <= 5);

  if (clusteredGuards.length > 1) {
    // Tie-breaking: Use rotation based on last assignment time
    clusteredGuards.sort((a, b) => {
      return (a.last_job_assigned_at || 0) - (b.last_job_assigned_at || 0);
    });
    return clusteredGuards[0];  // Return guard who hasn't worked most recently
  }

  return topGuards[0];  // Clear winner, no tie-breaking needed
}
```

### 6. Edge Cases and Handling Strategies

#### Edge Case 1: No Available Guards Within Radius

**Scenario**: Customer posts job in remote area, no guards within 25-mile search radius

**Handling Options:**

**Option A: Expand Search Radius Incrementally (Recommended for MVP)**
```javascript
async function findGuardsWithExpanding(job) {
  const radiusSteps = [15, 25, 40, 60];  // miles

  for (const radius of radiusSteps) {
    const guards = await searchGuards(job, radius);
    if (guards.length > 0) {
      return {
        guards,
        radius,
        message: radius > 25 ? `Expanded search to ${radius} miles` : null
      };
    }
  }

  return { guards: [], radius: 60, message: "No guards available. We'll notify you when guards become available." };
}
```

**Option B: Notify Offline Guards**
- Send push notifications to offline guards within 40 miles
- Offer bonus incentive for accepting ($10-20 extra)
- Give 15-minute response window

**Option C: Waitlist with Auto-Retry**
- Place job in pending queue
- Retry matching every 30 minutes
- Notify customer of estimated wait time

**Recommended Approach:** Option A for MVP (expanding radius), add Options B/C post-MVP

#### Edge Case 2: Multiple Simultaneous Requests (Contention)

**Scenario**: 5 jobs posted within 60 seconds, 8 available guards, potential double-assignment

**Solution: Pessimistic Locking with Reservation Timeout**

```javascript
async function matchWithReservation(job) {
  const transaction = await db.transaction();

  try {
    // Find top 5 guards
    const guards = await findBestMatches(job);

    // Attempt to reserve first available guard (pessimistic lock)
    for (const guard of guards) {
      const reserved = await db.query(`
        UPDATE guard_profiles
        SET
          availability_status = 'reserved',
          reserved_until = NOW() + INTERVAL '5 minutes',
          reserved_for_job_id = $1
        WHERE user_id = $2
          AND availability_status = 'available'
        RETURNING *
      `, [job.id, guard.user_id]);

      if (reserved.rowCount > 0) {
        // Successfully reserved this guard
        await notifyGuard(guard, job);
        await transaction.commit();

        // Set timeout to auto-release if not accepted
        scheduleReservationTimeout(guard.user_id, job.id, 5 * 60 * 1000);

        return { success: true, guard };
      }
    }

    // No guards could be reserved
    await transaction.rollback();
    return { success: false, message: "All guards currently reserved" };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**Reservation Timeout Handling:**
```javascript
function scheduleReservationTimeout(guardId, jobId, timeoutMs) {
  setTimeout(async () => {
    // Check if guard accepted job
    const job = await db.query('SELECT status FROM jobs WHERE id = $1', [jobId]);

    if (job.status === 'matched') {
      // Guard hasn't accepted yet, release and re-match
      await db.query(`
        UPDATE guard_profiles
        SET availability_status = 'available', reserved_until = NULL, reserved_for_job_id = NULL
        WHERE user_id = $1 AND reserved_for_job_id = $2
      `, [guardId, jobId]);

      await rematchJob(jobId);  // Try next best guard
    }
  }, timeoutMs);
}
```

#### Edge Case 3: Guard Declines Job After Assignment

**Scenario**: Matched guard declines job via app within acceptance window

**Handling: Sequential Fallback Matching**

```javascript
async function handleGuardDecline(jobId, guardId, reason) {
  // Log decline reason for analytics
  await db.query(`
    INSERT INTO job_decline_history (job_id, guard_id, reason, declined_at)
    VALUES ($1, $2, $3, NOW())
  `, [jobId, guardId, reason]);

  // Update guard acceptance rate
  await updateAcceptanceRate(guardId);

  // Release guard
  await db.query(`
    UPDATE guard_profiles
    SET availability_status = 'available', reserved_for_job_id = NULL
    WHERE user_id = $1
  `, [guardId]);

  // Reset job to 'requested' status
  await db.query(`
    UPDATE jobs
    SET status = 'requested', guard_id = NULL, matched_at = NULL
    WHERE id = $1
  `, [jobId]);

  // Re-run matching, excluding declined guard
  const excludedGuards = await db.query(`
    SELECT guard_id FROM job_decline_history WHERE job_id = $1
  `, [jobId]);

  await matchJob(jobId, { excludeGuards: excludedGuards.map(r => r.guard_id) });
}
```

**Acceptance Rate Update:**
```javascript
async function updateAcceptanceRate(guardId) {
  // Calculate acceptance rate from last 100 job offers
  await db.query(`
    UPDATE guard_profiles gp
    SET acceptance_rate = (
      SELECT
        COUNT(*) FILTER (WHERE j.status IN ('accepted', 'in_progress', 'completed'))::float /
        GREATEST(1, COUNT(*))
      FROM (
        SELECT status FROM jobs WHERE guard_id = $1 ORDER BY created_at DESC LIMIT 100
      ) j
    )
    WHERE user_id = $1
  `, [guardId]);
}
```

#### Edge Case 4: Guard Goes Offline Mid-Job

**Scenario**: Guard accepts job but GPS shows offline/no location updates during shift

**Detection:**
```javascript
// Background job running every 2 minutes
async function detectOfflineGuards() {
  const staleGuards = await db.query(`
    SELECT j.id as job_id, j.guard_id, j.customer_id, u.name
    FROM jobs j
    JOIN users u ON j.guard_id = u.id
    JOIN guard_profiles gp ON u.id = gp.user_id
    WHERE j.status = 'in_progress'
      AND (
        -- No location update in 10 minutes
        (SELECT MAX(recorded_at) FROM location_history WHERE guard_id = j.guard_id AND job_id = j.id)
        < NOW() - INTERVAL '10 minutes'
      )
  `);

  for (const job of staleGuards) {
    await handleOfflineGuard(job);
  }
}
```

**Handling:**
```javascript
async function handleOfflineGuard(job) {
  // 1. Alert customer
  await notifyCustomer(job.customer_id, {
    type: 'guard_offline',
    message: `Guard ${job.name} appears offline. We're investigating.`
  });

  // 2. Attempt to contact guard via SMS and push notification
  await sendUrgentNotification(job.guard_id, {
    title: 'Location Update Required',
    body: 'Please ensure your app is open and GPS is enabled'
  });

  // 3. Flag job for admin review
  await db.query(`
    UPDATE jobs SET admin_review_required = true, review_reason = 'guard_offline'
    WHERE id = $1
  `, [job.job_id]);

  // 4. If still offline after 15 minutes, escalate
  setTimeout(() => checkAndEscalate(job.job_id), 15 * 60 * 1000);
}
```

#### Edge Case 5: Skill Mismatch After Assignment

**Scenario**: Job requires "armed" guard but matched guard's license expired

**Prevention (Recommended):**
```sql
-- Filter out guards with expired certifications during matching
SELECT * FROM guard_profiles
WHERE availability_status = 'available'
  AND skills @> $required_skills
  -- Verify armed certification not expired
  AND (
    NOT $required_skills @> '["armed"]'::jsonb
    OR (
      license_expiry IS NOT NULL
      AND license_expiry > NOW() + INTERVAL '7 days'
    )
  );
```

**Detection and Handling:**
```javascript
async function validateMatchBeforeNotification(guard, job) {
  // Double-check license validity
  if (job.required_skills.includes('armed')) {
    const licenseValid = await checkLicenseExpiry(guard.id);
    if (!licenseValid) {
      // Mark guard profile for admin review
      await db.query(`
        UPDATE guard_profiles
        SET availability_status = 'pending_review', review_reason = 'expired_license'
        WHERE user_id = $1
      `, [guard.id]);

      // Re-match job with next best guard
      return await matchJob(job.id, { excludeGuards: [guard.id] });
    }
  }

  return { valid: true, guard };
}
```

### 7. Performance and Scalability Considerations

#### Query Performance Targets

**Matching Algorithm Performance:**
- **Target latency**: < 5 seconds end-to-end (requirement met)
- **Database query**: < 50ms (PostGIS with indexes)
- **Scoring calculation**: < 10ms (in-application)
- **Notification delivery**: < 500ms (Ably real-time)
- **Total overhead**: < 1 second (buffer for retries, logging)

#### Optimization Strategies

**1. Database-Level Optimizations**

```sql
-- Essential indexes (from D-3)
CREATE INDEX idx_guard_profiles_location ON guard_profiles USING GIST (current_location);
CREATE INDEX idx_guard_profiles_skills ON guard_profiles USING GIN (skills);
CREATE INDEX idx_guard_profiles_available ON guard_profiles (availability_status)
  WHERE availability_status = 'available';

-- Additional composite index for common query pattern
CREATE INDEX idx_guard_profiles_available_location
ON guard_profiles (availability_status, user_id)
WHERE availability_status = 'available'
INCLUDE (current_location, skills, hourly_rate_cents);

-- Cluster table for physical ordering (90% speedup)
CLUSTER guard_profiles USING idx_guard_profiles_location;
ANALYZE guard_profiles;
```

**2. Redis Caching Strategy**

```javascript
const CACHE_TTL = {
  GUARD_AVAILABILITY: 60,      // 1 minute (changes frequently)
  GUARD_LOCATION: 120,          // 2 minutes (updates periodically)
  GUARD_SKILLS: 3600,           // 1 hour (rarely changes)
  SCORING_WEIGHTS: 86400,       // 24 hours (platform config)
};

async function getCachedGuardProfile(guardId) {
  const cacheKey = `guard:${guardId}:profile`;

  let profile = await redis.get(cacheKey);
  if (profile) return JSON.parse(profile);

  profile = await db.query('SELECT * FROM guard_profiles WHERE user_id = $1', [guardId]);
  await redis.setex(cacheKey, CACHE_TTL.GUARD_SKILLS, JSON.stringify(profile));

  return profile;
}

// Invalidate cache on guard profile updates
async function updateGuardProfile(guardId, updates) {
  await db.query('UPDATE guard_profiles SET ... WHERE user_id = $1', [guardId]);
  await redis.del(`guard:${guardId}:profile`);  // Invalidate cache
}
```

**3. Horizontal Scaling Preparation**

```javascript
// Partition matching by geographic region (future scalability)
const REGIONS = {
  'us-west': { lat_min: 32, lat_max: 49, lng_min: -125, lng_max: -102 },
  'us-east': { lat_min: 24, lat_max: 47, lng_min: -102, lng_max: -66 },
};

function getJobRegion(lat, lng) {
  for (const [region, bounds] of Object.entries(REGIONS)) {
    if (lat >= bounds.lat_min && lat <= bounds.lat_max &&
        lng >= bounds.lng_min && lng <= bounds.lng_max) {
      return region;
    }
  }
  return 'default';
}

// Route to region-specific matching service
async function matchJob(job) {
  const region = getJobRegion(job.latitude, job.longitude);
  return await matchingServices[region].match(job);
}
```

**4. Monitoring and Performance Tracking**

```javascript
// Instrument matching algorithm with metrics
async function instrumentedMatch(job) {
  const startTime = Date.now();

  try {
    const result = await matchGuardToJob(job);

    // Log metrics
    metrics.histogram('matching.duration', Date.now() - startTime, {
      status: 'success',
      guards_found: result.candidates.length
    });

    return result;
  } catch (error) {
    metrics.increment('matching.errors', { error: error.name });
    throw error;
  }
}

// Alert on slow queries
if (Date.now() - startTime > 5000) {
  logger.warn('Slow matching query', {
    job_id: job.id,
    duration: Date.now() - startTime
  });
}
```

#### Scalability Milestones

| Milestone | Guards | Concurrent Jobs | Expected Performance | Scaling Strategy |
|-----------|--------|-----------------|----------------------|-------------------|
| MVP | 50-100 | 10-20 | < 50ms queries | Single PostgreSQL instance |
| Beta | 500-1K | 50-100 | < 100ms queries | Read replica, Redis cache |
| Launch | 2K-5K | 200-500 | < 200ms queries | Connection pooling (PgBouncer), partitioned indexes |
| Growth | 10K-20K | 1K-2K | < 500ms queries | Geospatial sharding by region, separate matching services |
| Scale | 50K+ | 5K+ | < 1s queries | Dedicated geospatial database (e.g., CockroachDB), ML-based prediction |

**Critical Threshold**: If matching queries exceed 500ms at p95, implement regional sharding immediately.

## Key Insights

1. **Proximity alone is insufficient**: Industry leaders (Uber, DoorDash) use travel time estimation, not distance. Aegis should use PostGIS geography type for accurate distance calculations and consider traffic/road topology in future iterations.

2. **Batch matching dramatically improves outcomes**: 33% improvement in aggregate wait times by waiting just 30-60 seconds to accumulate requests. Hybrid approach (real-time for urgent, batch for advance bookings) optimizes both UX and efficiency.

3. **Multi-factor scoring prevents gaming**: Weighting proximity (40%), skills (25%), rating (15%), acceptance rate (10%), and fairness (10%) creates robust matching that balances customer needs with guard opportunity distribution.

4. **PostGIS optimization is critical**: GIST indexes on geography, GIN indexes on JSONB skills, and CLUSTER optimization can deliver 90% query performance improvements. Target < 50ms for proximity queries.

5. **Fairness mechanisms prevent winner-take-all**: Without fairness scoring, highly-rated guards near demand centers monopolize jobs. 7-day rolling job count with score boosting for underutilized guards distributes opportunities.

6. **Edge cases require thoughtful handling**: No available guards (expanding radius), simultaneous requests (pessimistic locking), guard declines (sequential fallback), and offline guards (detection and escalation) all need robust handling.

7. **Real-time notification is table stakes**: Guards expect instant job notifications (Ably/WebSocket). Reservation timeouts (5 minutes) prevent guards from hoarding offers without accepting.

8. **Skill filtering is non-negotiable**: Security industry requires strict certification matching (armed/unarmed, license expiry). Pre-filter guards during query to avoid post-match validation failures.

9. **Acceptance rate tracking drives quality**: Track last 100 job offers per guard. Guards with < 70% acceptance rate receive lower priority or require improvement plan.

10. **Performance monitoring guides optimization**: Instrument matching latency, cache hit rates, and query performance. Alert on > 5s matching time or < 50% cache hit rate.

## Recommendations

### MVP Matching Algorithm (Phase 1)

**Approach: Proximity-First with Skill Filtering and Multi-Factor Scoring**

Implement a real-time greedy matching algorithm with the following characteristics:

1. **Core Algorithm Flow:**
   ```
   Job Posted → PostGIS Proximity Query (25-mile radius)
             → Skill Filter (minimum 50% match)
             → Multi-Factor Scoring (5 components)
             → Rank Top 10 Guards
             → Apply Fairness Tie-Breaking
             → Reserve Top Guard (5-minute timeout)
             → Notify Guard via Ably Push
             → Wait for Accept/Decline
             → If Declined: Sequential Fallback to #2, #3, etc.
             → If No Response (5 min): Auto-decline and Fallback
   ```

2. **PostGIS Proximity Query:**
   - Use ST_DWithin with 25-mile (40 km) initial radius
   - If no guards found, expand to 40 miles, then 60 miles
   - Use KNN operator (<->) for ordering by distance
   - Target: < 50ms query time with GIST index

3. **Skill Filtering:**
   - Require 100% match for critical skills (armed certification)
   - Allow partial match (>= 50%) for preferred skills (K-9, crowd control)
   - Verify license expiry > 7 days for armed jobs
   - Use GIN index on JSONB skills column

4. **Multi-Factor Scoring:**
   - Proximity: 40% weight (normalized 0-100 based on distance)
   - Skills: 25% weight (percentage of required skills possessed)
   - Rating: 15% weight (normalize 3.0-5.0 stars to 0-100)
   - Acceptance Rate: 10% weight (direct percentage)
   - Fairness: 10% weight (inverse of jobs-last-7-days ratio)

5. **Guard Notification Strategy:**
   - **Sequential notification** (not broadcast) for MVP
   - Notify top-ranked guard first
   - 5-minute acceptance window
   - If declined/timeout: Automatically notify guard #2
   - Continue until match or exhausted top 10 guards

6. **Timeout Handling:**
   - 5-minute reservation timeout per guard
   - Auto-release guard if no response
   - Sequential fallback to next best guard
   - After 3 declines: Alert admin, flag job for review
   - After 10 guards exhausted: Expand radius or waitlist

7. **Fairness Mechanisms:**
   - Track jobs assigned per guard in rolling 7-day window
   - Boost score by 10% for guards with 0 jobs this week
   - Rotate through tied guards (within 5 points) using last-assigned timestamp
   - Display job distribution metrics in guard dashboard

8. **Edge Case Handling:**
   - No guards available: Expand radius incrementally (25→40→60 miles)
   - Multiple simultaneous jobs: Pessimistic locking with UPDATE WHERE available
   - Guard declines: Sequential fallback, update acceptance rate
   - Guard offline: Detection after 10 minutes, customer alert, admin escalation
   - Skill mismatch: Pre-filter during query, double-check before notification

### Production Enhancements (Phase 2 - Post-MVP)

1. **Batch Matching for Advance Bookings:**
   - Jobs starting > 2 hours out wait up to 60 seconds for batch assembly
   - Solve as Mixed-Integer Programming (MIP) problem using library like Google OR-Tools
   - Optimize for minimum aggregate wait time across all customers
   - Target: 33% improvement over greedy matching

2. **Machine Learning Integration:**
   - Model 1: Guard acceptance probability (based on distance, time, rate, historical patterns)
   - Model 2: Travel time estimation (incorporate traffic, road topology)
   - Model 3: Job duration prediction (improve scheduling accuracy)
   - Train on historical data after 1000+ completed jobs

3. **Dynamic Pricing Integration:**
   - Surge pricing during high demand / low supply
   - Adjust guard hourly rate based on urgency, skills required, location
   - Display predicted earnings to guards before acceptance

4. **Geographic Partitioning:**
   - Split database by region (West Coast, East Coast, etc.) at 10K+ guards
   - Route matching queries to regional services
   - Maintain global view for cross-region edge cases

5. **Advanced Fairness Features:**
   - Guarantee minimum jobs per week for active guards (e.g., 5 jobs if available 40+ hours)
   - Priority queue for guards who haven't worked in 7+ days
   - Transparency dashboard showing "why didn't I get this job?" explanations

### Implementation Roadmap

**Week 1-2: Database Foundation**
- [ ] Create indexes (GIST, GIN, partial, composite)
- [ ] Implement PostGIS ST_DWithin proximity query
- [ ] Test query performance with 100+ guard dataset
- [ ] CLUSTER table and measure before/after performance

**Week 3-4: Scoring Algorithm**
- [ ] Implement 5-component scoring formula
- [ ] Create ranking SQL query
- [ ] Add fairness job-counting logic
- [ ] Unit test scoring edge cases (ties, zero ratings, etc.)

**Week 5-6: Matching Service**
- [ ] Build NestJS matching service with transaction support
- [ ] Implement pessimistic locking for guard reservation
- [ ] Add 5-minute timeout with auto-release
- [ ] Sequential fallback logic for declines

**Week 7-8: Integration & Edge Cases**
- [ ] Integrate with Ably for guard notifications
- [ ] Implement expanding radius search (25→40→60 miles)
- [ ] Build decline handling and acceptance rate tracking
- [ ] Offline guard detection background job

**Week 9-10: Testing & Optimization**
- [ ] Load test with 100 concurrent matching requests
- [ ] Optimize slow queries (target < 50ms)
- [ ] Add Redis caching for guard availability
- [ ] E2E test: Job posted → Matched → Accepted → Started

**Week 11-12: Monitoring & Launch**
- [ ] Instrument matching latency metrics
- [ ] Set up alerts (> 5s matching, < 50% cache hit)
- [ ] Create admin dashboard for matching analytics
- [ ] Document algorithm for future ML team

### Success Criteria

**Performance:**
- 95% of matching requests complete in < 5 seconds
- PostGIS proximity queries execute in < 50ms
- Zero database deadlocks during simultaneous job posts

**Quality:**
- 90%+ customer satisfaction with guard matching ("right guard for the job")
- 80%+ guard acceptance rate on first offer (indicates good matches)
- < 5% jobs requiring admin escalation (exhausted all guards)

**Fairness:**
- Gini coefficient < 0.4 for job distribution across guards (lower = more equal)
- No guard receives > 3x platform average jobs per week
- 80%+ of active guards receive at least 1 job per week

**Scalability:**
- System handles 50 concurrent job posts without degradation
- Database performance remains stable up to 1000 guards
- Redis cache hit rate > 80% for guard availability queries

## Related Nodes

- **Spawned by:** Q-3 (Technical Architecture)
- **Informs:** D-6 (Matching Algorithm Implementation Decision - to be created)
- **Depends on:** D-3 (Database Schema with PostGIS), D-2 (API Design)

## Research Methodology

**Web Search Queries Executed:**
1. "Uber ride matching algorithm how it works proximity scoring"
2. "DoorDash dasher dispatch algorithm delivery matching"
3. "TaskRabbit worker matching algorithm skill-based proximity"
4. "on-demand marketplace matching algorithm best practices 2024"
5. "PostGIS ST_DWithin nearest neighbor query performance optimization"
6. "PostGIS geospatial queries proximity search within radius miles"
7. "gig economy fairness algorithm job distribution avoid worker starvation"
8. "marketplace fairness algorithm prevent same worker getting all jobs"
9. "ride sharing scoring formula distance rating acceptance rate weight"
10. "on-demand platform timeout handling guard decline job reassignment"
11. "real-time vs batch matching algorithm marketplace job assignment"

**Sources Analyzed:**
- Academic papers on stable matching theory and ride-sharing optimization
- Engineering blogs from Uber, DoorDash, Urban Company
- PostGIS documentation and GIS Stack Exchange optimization guides
- Research on algorithmic fairness in gig economy platforms
- Technical documentation on PostgreSQL spatial indexing

**Research Duration:** ~4 hours comprehensive analysis

## Notes

**For Decision Maker (D-6):**

This research provides a complete blueprint for implementing the guard-to-job matching algorithm. Key decisions needed:

1. **MVP Scope:** Approve recommended real-time greedy matching with multi-factor scoring for Phase 1?
2. **Fairness Weight:** 10% weight on fairness score balances opportunity distribution without over-penalizing high performers. Acceptable?
3. **Notification Strategy:** Sequential (one guard at a time) vs. broadcast (top 3 simultaneously). Recommend sequential for MVP to avoid coordination complexity.
4. **Timeout Duration:** 5-minute guard acceptance window. Too long (frustrates customers) or too short (pressures guards)?
5. **Skill Matching:** Require 100% match or allow 50% partial match? Security industry may demand 100%.
6. **Phase 2 Timing:** When to invest in ML models and batch optimization? After 1000 jobs completed?

**Technical Risks:**
- PostGIS query performance depends heavily on proper indexing. MUST run CLUSTER and ANALYZE.
- Pessimistic locking could cause deadlocks under high concurrency. Need transaction retry logic.
- Fairness scoring adds query complexity. May need to cache job counts in Redis.

**Open Questions:**
- Should guards see predicted earnings before accepting?
- How to handle guards who repeatedly decline high-value jobs to cherry-pick?
- Should customers be able to "request specific guard" (bypassing matching)?
