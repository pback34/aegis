---
node_type: Decision
decision_type: Design
status: Proposed
created: 2025-11-10
updated: 2025-11-10
priority: High
spawned_by:
  - Q-11
  - D-2
informs:
  - A-6-1
depends_on:
  - D-1
  - D-2
tags:
  - technical
  - location
  - mapping
  - geocoding
  - gps
  - real-time
  - mvp

# AI Metadata
created_by: AI:DecisionAgent
ai_confidence: 0.90
human_review_required: true
review_status: Pending
---

# D-6: Location & Mapping API Architecture

## Decision

Implement a comprehensive Location & Mapping API with 8 endpoints for geocoding (forward/reverse), map configuration, real-time guard location tracking, location history visualization, and service area validation. Use **backend proxy for geocoding** (security, caching, rate limiting) while allowing **direct frontend access to map tiles** (performance), with Mapbox as the mapping provider and Ably for real-time location streaming.

## Rationale

The initial MVP API design (D-2) specified only 2 location endpoints:
- `POST /api/jobs/:id/location` - Guard updates location
- `GET /api/jobs/:id/location` - Customer views guard location

**This was insufficient for a complete map-based user experience.** The architecture gap analysis revealed critical missing functionality:

### 1. Address Input/Geocoding Problem

**User Story**: "Customer needs to create a job by entering '123 Main St, Los Angeles, CA' or dropping a pin on a map"

**Missing Capability**:
- No way to convert text address → coordinates (forward geocoding)
- No way to convert map pin coordinates → readable address (reverse geocoding)
- Frontend would need to call Mapbox API directly (security risk, no caching, cost tracking impossible)

**Solution**: Backend geocoding proxy API
- `POST /api/geocoding/forward` - Address → coordinates
- `POST /api/geocoding/reverse` - Coordinates → address
- **Benefits**:
  - Centralized caching (Redis, 24-hour TTL) reduces Mapbox API calls by 80-90%
  - Rate limiting prevents abuse (10 req/sec per user)
  - Cost tracking for Mapbox usage
  - Mapbox secret token never exposed to frontend

### 2. Map Configuration Problem

**User Story**: "Frontend needs to display map with correct token, style, and default location"

**Missing Capability**:
- No API to provide map configuration to frontend
- Hard-coding Mapbox token in frontend is insecure
- Different tokens needed for dev/staging/prod

**Solution**: Map configuration endpoint
- `GET /api/map/config` - Returns Mapbox public token, style URL, default center
- **Benefits**:
  - Token rotation without frontend deployment
  - Environment-specific configuration
  - Feature flags (enable/disable routing, real-time tracking)
  - Service area boundaries for map viewport restrictions

### 3. Location History Problem

**User Story**: "Customer wants to see the guard's complete route after job completion"

**Missing Capability**:
- Only current location available
- No way to visualize guard's path during job
- No audit trail for disputes

**Solution**: Location history endpoint
- `GET /api/jobs/:id/location/history` - Returns route as LineString + points
- **Benefits**:
  - Complete route visualization with Mapbox GL JS
  - Distance traveled calculation (billing verification)
  - Douglas-Peucker simplification for large datasets
  - Dispute resolution (proof of service)

### 4. Service Area Validation Problem

**User Story**: "Customer enters address outside Los Angeles, needs to know if service is available"

**Missing Capability**:
- No way to check if location is in service coverage
- Customer creates job only to be rejected later
- Poor user experience

**Solution**: Service area validation endpoint
- `POST /api/locations/validate-service-area` - Check if coordinates are covered
- **Benefits**:
  - Proactive coverage check before job creation
  - Show nearest serviced city if unavailable
  - Estimated wait time if available
  - Reduces failed job attempts

### 5. Offline Sync Problem

**User Story**: "Guard is at remote site with spotty cellular, location updates buffer offline"

**Missing Capability**:
- Single location update endpoint can't handle batches
- Guard reconnects and floods API with individual requests
- Poor network efficiency

**Solution**: Batch location update endpoint
- `POST /api/jobs/:id/location/batch` - Upload 100 points at once
- **Benefits**:
  - Efficient offline-to-online sync
  - Single transaction for all points
  - Reduced network overhead
  - Aligns with mobile offline-first architecture (D-1)

### 6. Map Tile Access Strategy

**Decision: Direct Frontend Access (NOT proxied through backend)**

**Rationale**:
- Map tiles are static, cacheable assets
- Proxying would add latency (bad UX)
- Mapbox CDN already optimized globally
- Mapbox public tokens have URL referrer restrictions (secure enough)
- Backend proxy would increase infrastructure costs unnecessarily

**Implementation**:
- Frontend receives public Mapbox token via `/api/map/config`
- Frontend calls Mapbox Tiles API directly
- Token restricted to aegis.com domain in Mapbox dashboard

**Trade-off**: Slightly reduced control vs. significantly better performance

### 7. Real-Time Location Streaming Architecture

**Decision: Use Ably for WebSocket streaming (NOT polling)**

**Rationale** (from Q-11, D-1):
- Polling guard location every 5 seconds = inefficient (high battery drain, network overhead)
- Ably provides pub/sub channels for real-time updates
- Guard publishes to `jobs:{jobId}:location` channel
- Customer subscribes to channel, receives updates instantly
- **Benefits**:
  - Sub-second latency (< 500ms typical)
  - Automatic connection recovery
  - Scales to 1000s of concurrent jobs
  - No backend WebSocket infrastructure needed

**Fallback**: If Ably connection fails, frontend polls `/api/jobs/:id/location` every 30 seconds

### 8. PostGIS for Spatial Queries

**Decision: Store all location data in PostgreSQL with PostGIS extension**

**Rationale**:
- PostGIS provides spatial indexes (GIST) for efficient geospatial queries
- ST_Contains() for service area validation (< 10ms query time)
- ST_Distance() for proximity calculations
- ST_MakeLine() for route generation
- ACID transactions for location history
- No separate geospatial database needed (simplicity)

**Alternative Considered: MongoDB with geospatial features**
- Rejected: Already using PostgreSQL for primary data
- MongoDB adds complexity, operational overhead
- PostGIS is more mature for geospatial operations

## Alternatives Considered

### Alternative 1: Direct Frontend Mapbox API Access (No Backend Proxy)

**Pros**:
- Simpler architecture (no proxy code)
- Slightly lower latency (no backend hop)
- Fewer moving parts

**Cons**:
- **Mapbox secret token exposed to frontend** (security risk)
- No centralized caching (higher Mapbox costs)
- No rate limiting control (abuse risk)
- No usage tracking (cost monitoring impossible)
- **REJECTED**: Security and cost risks outweigh simplicity

### Alternative 2: Polling Instead of Ably for Real-Time

**Pros**:
- Simpler backend (no Ably integration)
- No third-party dependency
- Lower infrastructure cost

**Cons**:
- Polling every 5 seconds = high battery drain (Q-11 research shows 77% battery drain in 24 hours)
- Higher network overhead
- Stale data (5-second delay)
- Poor UX for "Uber-like" real-time experience
- **REJECTED**: Battery life and UX are critical for guards

### Alternative 3: Google Maps Instead of Mapbox

**Pros**:
- More familiar to developers
- Slightly better geocoding accuracy
- Better integration with Google ecosystem

**Cons**:
- **Cost**: $7/1000 map loads vs. Mapbox free tier (50K/month)
- Estimated $500-1,000/month additional cost at scale
- Weaker offline map support (critical for guards at remote sites)
- No free tier for MVP testing
- **REJECTED**: Mapbox free tier saves $6,000-12,000 annually for MVP

### Alternative 4: Store Location History in Separate Time-Series Database (InfluxDB)

**Pros**:
- Optimized for time-series data
- Better compression
- Faster range queries

**Cons**:
- Additional infrastructure (InfluxDB cluster)
- Operational complexity
- Learning curve for team
- PostGIS with proper indexes is sufficient for MVP scale (< 10M points)
- **DEFERRED**: Re-evaluate if location history queries become bottleneck (> 100ms p95)

## Implications

### Development Requirements

1. **Backend Implementation** (Week 7-8):
   - LocationsController with 8 endpoints
   - GeocodingService (Mapbox proxy)
   - ServiceAreaService (PostGIS spatial queries)
   - LocationStreamService (Ably publishing)
   - LocationHistory entity and repository

2. **Database Schema**:
   - `location_history` table with PostGIS geography column
   - `service_areas` table with polygon boundaries
   - Spatial indexes (GIST) on all geography columns
   - Data retention policy (30-day TTL)

3. **Frontend Integration**:
   - Mapbox GL JS (web) / @rnmapbox/maps (mobile)
   - Geocoding autocomplete for address input
   - Real-time marker updates via Ably subscription
   - Route polyline rendering for location history
   - Service area validation before job creation

4. **Caching Strategy**:
   - Redis cache for geocoding results (24-hour TTL, 80-90% hit rate)
   - Current location cache (10-second TTL)
   - Map config cache (1-hour TTL)
   - Service area validation cache (1-hour TTL)

### Cost Impact

**Mapbox Costs** (Free Tier Sufficient for MVP):
- 50,000 map loads/month (free)
- 100,000 geocoding requests/month (free)
- **Projected MVP**: 5,000 loads, 1,500 geocodes = **$0/month**

**Future Production Costs** (1,000 guards, 500 jobs/day):
- Map loads: 50,000/month = $0 (within free tier)
- Geocoding: 15,000/month = $0 (within free tier)
- **Mapbox remains free until 5,000+ guards**

**Ably Costs** (Included in D-1):
- Real-time location streaming covered by existing Ably plan
- 3M messages/month (free tier) sufficient

### Performance Targets

- Geocoding API response: p95 < 100ms (with caching)
- Location update latency: < 2 seconds (mobile → customer)
- Location history query: < 500ms (200 points)
- Service area validation: < 50ms (PostGIS spatial index)
- Map tile load time: < 1 second (Mapbox CDN)

### Security Considerations

1. **Geocoding Rate Limiting**: 10 req/sec per user (prevent abuse)
2. **Location Update Authorization**: Guards can only update their assigned jobs
3. **Location History Privacy**: Only job participants can view history
4. **Mapbox Token Security**: Public token with URL referrer restrictions
5. **Data Retention**: Location history deleted after 30 days (CCPA compliance)

### Testing Requirements

- Unit tests for geocoding service (mocked Mapbox responses)
- Integration tests with test Mapbox API (sandbox mode)
- PostGIS spatial query tests with test database
- E2E test: Customer creates job with map pin, guard accepts, customer tracks location
- Load test: 100 concurrent location updates (target: < 2s latency)

## Risks & Mitigation

### Risk 1: Mapbox API Outage

**Risk**: Mapbox API down prevents geocoding and map rendering

**Mitigation**:
- Fallback to cached geocoding results (Redis, 24-hour cache)
- Display error message: "Map temporarily unavailable, enter coordinates manually"
- Monitor Mapbox status page via PagerDuty integration
- **Severity**: Medium | **Likelihood**: Low | **Priority**: Monitoring

### Risk 2: Location Tracking Privacy Concerns

**Risk**: Guards concerned about privacy, always-on tracking

**Mitigation**:
- Clear UI indicator when tracking is active (only during jobs)
- Explicit consent before accepting job
- Location data deleted after 30 days
- Transparency in privacy policy
- **Severity**: Medium | **Likelihood**: Medium | **Priority**: UX design

### Risk 3: Poor GPS Accuracy at Indoor/Dense Urban Sites

**Risk**: Guard at parking garage or dense urban area has poor GPS (> 100m accuracy)

**Mitigation**:
- Reject location updates with accuracy > 100 meters
- Display warning to guard: "GPS signal weak, move to open area"
- Allow manual check-in/check-out as fallback
- Use accelerometer to detect stationary vs. moving (filter GPS drift)
- **Severity**: Medium | **Likelihood**: High | **Priority**: Implement filtering

### Risk 4: Mapbox Cost Escalation at Scale

**Risk**: Free tier exhausted at 5,000+ guards (50K map loads/month)

**Mitigation**:
- Monitor Mapbox usage via dashboard (set 80% alert)
- Aggressive caching reduces load (24-hour geocoding cache)
- Static map images for thumbnails (cheaper than interactive maps)
- Plan for $500-1,000/month Mapbox costs at 10,000 guards
- **Severity**: Low | **Likelihood**: Medium | **Priority**: Cost monitoring

### Risk 5: Offline Sync Data Loss

**Risk**: Mobile app crashes before syncing offline locations

**Mitigation**:
- WatermelonDB persists locations locally (D-1 offline-first design)
- Automatic retry on app restart
- Location sync priority: high (sent before other data)
- 24-hour buffer for offline data (reject older)
- **Severity**: Medium | **Likelihood**: Low | **Priority**: Robust offline handling

## Success Metrics

1. **Geocoding Accuracy**: > 95% of addresses successfully geocoded
2. **Cache Hit Rate**: > 80% for geocoding (reduces Mapbox API calls)
3. **Location Update Latency**: p95 < 2 seconds (mobile → customer view)
4. **Location Accuracy**: Median < 20 meters (filter poor readings)
5. **Real-Time Success**: > 99% of location updates reach customer via Ably
6. **Cost Efficiency**: Mapbox costs remain $0 for MVP (< 50K loads/month)

## Dependencies

### Blocks These Decisions/Artifacts

- A-6-1: Location & Mapping API Specification (implementation details)
- Frontend map integration (web and mobile)
- Guard mobile app GPS tracking implementation

### Depends On

- D-1: MVP Technical Architecture (Mapbox, Ably, PostGIS decisions)
- D-2: MVP API Design (REST API patterns, authentication)
- Q-11: GPS Tracking Implementation Research (accuracy, battery optimization)

## Next Steps After Approval

1. **Week 7-8: Backend Implementation**:
   - Implement LocationsController with 8 endpoints
   - Create GeocodingService (Mapbox proxy)
   - Implement ServiceAreaService with PostGIS queries
   - Set up Ably location streaming

2. **Database Setup**:
   - Create `location_history` table with spatial index
   - Create `service_areas` table with LA polygon
   - Implement data retention cron job (30-day cleanup)

3. **Frontend Integration (Week 9-10)**:
   - Integrate Mapbox GL JS (web) and @rnmapbox/maps (mobile)
   - Implement address autocomplete with geocoding API
   - Add real-time location marker updates via Ably
   - Display location history as route polyline

4. **Testing**:
   - Unit tests for all services
   - Integration tests with Mapbox sandbox
   - E2E test: Complete job creation → location tracking flow
   - Load test: 100 concurrent location updates

## Related Nodes

- **Spawned by**: Q-11 (GPS Tracking Research), D-2 (API Design gap)
- **Informs**: A-6-1 (Location API Specification)
- **Depends on**: D-1 (Technical Architecture), D-2 (API Patterns)

## Review Notes

**For Human Reviewer:**

This is a **High priority, high-confidence (0.90) design decision** that fills a critical gap in the MVP API. Key points for your consideration:

1. **Completeness**: The original D-2 had only 2 location endpoints. This adds 6 more for a complete map experience. Does this feel complete or over-engineered?

2. **Backend Proxy Strategy**: Geocoding is proxied through backend (security, caching), but map tiles are not (performance). Do you agree with this split?

3. **Mapbox vs. Google Maps**: Mapbox saves $6,000-12,000 annually but is less familiar. Are you comfortable with this trade-off?

4. **Real-Time via Ably**: Uses existing Ably integration. Alternative is polling (simpler but worse UX/battery). Comfortable with Ably dependency?

5. **Scope**: 8 endpoints feels right for MVP. Any missing functionality for "pin on map" or "track guard" features?

Please approve, request revisions, or reject with feedback.

---

**AI Confidence Rationale**: 0.90 confidence based on:
- ✅ Clear gap in original D-2 API design identified
- ✅ Industry-standard patterns (geocoding proxy, PostGIS, Ably streaming)
- ✅ Cost-effective solution (Mapbox free tier sufficient)
- ✅ Aligns with D-1 architecture (Mapbox, Ably, PostGIS)
- ⚠️ Minor uncertainty on optimal caching TTLs (might need tuning)
- ⚠️ Service area polygon approach works for MVP, might need refinement at scale

**Human review required**: YES (High priority + adds 6 new API endpoints to MVP)
