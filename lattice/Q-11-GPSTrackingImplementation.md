---
node_type: Question
status: Complete
priority: Medium
created: 2025-11-09
updated: 2025-11-10
spawned_by:
  - Q-3
informs:
  - D-7
tags:
  - technical
  - gps
  - tracking
  - location
  - react-native
  - battery-optimization
---

# Q-11: Real-time GPS & Location Tracking Implementation

## Question

What is the optimal implementation strategy for real-time GPS tracking including update frequency, accuracy validation, and battery optimization?

## Context

Guards need to share real-time location with customers during active jobs (similar to Uber driver tracking). The Aegis platform uses React Native for mobile apps (D-1), Ably for real-time messaging (Q-3), and PostgreSQL with PostGIS for location storage (D-3). A critical challenge is that guards often work at remote sites with unreliable cellular connectivity, requiring robust offline handling and battery optimization.

## Research Objectives

- GPS update frequency and battery optimization strategies
- React Native location tracking library evaluation
- Accuracy requirements and validation methods
- Geofencing implementation for check-in/check-out
- Historical route tracking and storage strategies
- Real-time location broadcast via Ably
- Privacy considerations and data retention policies

## Priority & Timeline

- **Priority:** Medium (needed for production, basic tracking sufficient for demo)
- **Timeline:** Complete
- **Status:** Complete - Ready to inform D-7 (GPS Tracking Architecture Decision)

## Findings

After comprehensive research on GPS tracking implementation for mobile apps, I've identified industry best practices from rideshare (Uber, Lyft) and delivery (DoorDash) apps, evaluated React Native location libraries, and determined optimal strategies for battery efficiency, accuracy validation, and offline reliability.

### 1. GPS Update Frequency & Battery Optimization

**Industry Standards:**
- Uber, Lyft, and DoorDash use continuous real-time GPS tracking during active trips, with location updates sent to servers constantly while drivers are on duty
- Delivery apps like Routific provide live GPS tracking with real-time progress monitoring and accurate ETAs
- No specific public documentation on exact update intervals (likely 5-15 seconds based on observed responsiveness)

**Battery Optimization Strategies:**

**Motion Detection (Stationary vs. Moving States):**
- The most effective battery optimization uses a "significant motion sensor" to detect when the device is stationary vs. moving
- When stationary: Reduce location updates to minimal frequency (every 5-10 minutes) or stop entirely
- When moving: Resume active tracking at production frequency
- Motion detection can reduce battery consumption by up to 90% compared to continuous high-accuracy tracking

**Adaptive Frequency:**
- Use MIMD (Multiplicative Increase Multiplicative Decrease) approach to dynamically adjust sensing frequency based on context
- Instead of static update intervals, adapt based on user activity and movement patterns
- Android's Adaptive Battery intelligently aligns power consumption with app usage using App Standby Buckets

**Location Batching:**
- Batch location updates locally before transmitting to server
- Configure minimum batch size threshold (e.g., 5-10 points) before network transmission
- Batching reduces network requests, which are a major contributor to battery drain
- Trade-off: Slight delay in real-time visibility vs. significant battery savings

**Deferred Location Updates:**
- Use deferred location delivery when immediate updates aren't critical
- Set deferral value as large as possible if real-time tracking precision isn't required
- Can consume significantly less battery while providing more accurate locations

**Recommended Configuration for Aegis:**
- **Active job (guard moving):** 15-30 second updates with high accuracy
- **Active job (guard stationary):** 5 minute updates with reduced accuracy
- **Offline/background:** Use significant motion detection to minimize tracking
- **Batch size:** Collect 5-10 location points before network transmission (if bandwidth limited)

**Battery Impact Benchmarks:**
- Poorly configured background geolocation can drain 77% battery over 24 hours with only 6 minutes of active use
- Well-optimized configurations with motion detection and batching can maintain <5% battery drain per 8-hour shift
- Accuracy level significantly impacts battery drain: Low accuracy mode can reduce consumption by 40-60%

### 2. React Native Location Libraries Comparison

**expo-location vs. react-native-geolocation-service:**

**expo-location (RECOMMENDED):**
- **Popularity:** 420,292 weekly downloads, 43,500 GitHub stars
- **Best for:** Expo-managed workflows and managed React Native projects
- **Advantages:**
  - First-class Expo integration with config plugins for easier setup
  - Comprehensive permission handling for foreground and background location
  - Built-in support for background location with expo-task-manager
  - Polyfills navigator.geolocation for web/React Native API compatibility
  - Better documentation and community support
  - Allows polling current location or subscribing to location update events
- **Disadvantages:**
  - May require ejecting for some advanced native features
  - Slightly heavier dependency footprint

**react-native-geolocation-service:**
- **Popularity:** 96,430 weekly downloads, 1,646 GitHub stars
- **Best for:** Bare React Native projects or when you need direct Google Location Services API access
- **Advantages:**
  - Direct access to native Google Location Services API
  - Lower-level control over location services
  - Lightweight with minimal dependencies
- **Disadvantages:**
  - Less comprehensive documentation
  - More manual configuration required
  - Smaller community support

**react-native-background-geolocation (Commercial, Premium Option):**
- **Type:** Commercial library with licensing fees
- **Advantages:**
  - Industry-leading battery optimization with sophisticated motion detection
  - Built-in geofencing with DWELL transition support
  - Automatic handling of iOS/Android battery optimization challenges (Android 14, iOS 17)
  - Extensive configuration options for accuracy, distance filters, and update intervals
  - Offline buffering with automatic sync when connectivity restored
  - Production-proven by thousands of location-tracking apps
- **Disadvantages:**
  - License cost: ~$699/app (one-time) or subscription pricing
  - Overkill for basic location tracking needs
  - Additional vendor dependency
- **Recommendation:** Consider for production if battery optimization and reliability are critical differentiators

**Aegis Recommendation:**
- **For MVP/Demo:** Use **expo-location** with expo-task-manager for background tracking
  - Faster development with Expo workflow
  - Free and open-source
  - Sufficient for basic real-time tracking needs
  - Can be optimized with manual motion detection and batching logic

- **For Production (if budget allows):** Upgrade to **react-native-background-geolocation**
  - Superior battery optimization out-of-box
  - Reduced development time for advanced features
  - Better reliability at remote sites with poor connectivity
  - Professional support for location tracking issues
  - ROI justification: Prevents guard complaints about battery drain, improves customer tracking reliability

### 3. GPS Accuracy Requirements & Filtering

**Typical Mobile GPS Accuracy:**
- **Optimal conditions (outdoors, clear sky):** 3-10 meters horizontal accuracy
- **With Wi-Fi available:** 20-50 meters (can be as low as 5 meters indoors)
- **Rural areas without Wi-Fi:** Several hundred meters to several kilometers
- **Vertical accuracy:** Typically 3x worse than horizontal accuracy

**Recommended Accuracy Thresholds:**

**Filtering Strategy:**
1. **Primary threshold:** Reject readings with accuracy > 100 meters (general best practice)
2. **Granular thresholds by use case:**
   - Street level: 10-100 meters (acceptable for most tracking)
   - Neighborhood level: 100-500 meters (degraded mode, still usable)
   - City level: 500-2000 meters (show warning to guard)
   - Reject: > 2000 meters (unreliable, don't send to customer)

**Additional Filtering Criteria:**

**Satellite Count:**
- 12 satellites = outstanding
- 9 satellites = healthy
- 5 or fewer = poor
- Less than 3 = invalid reading (reject)

**Accelerometer Cross-Validation:**
- Use accelerometer data to detect when device isn't moving
- Reject GPS readings showing movement when accelerometer indicates stationary (likely GPS drift)
- Helps filter out "indoor wandering" caused by multipath interference

**Statistical Filtering:**
- GPS accuracy values represent Circular Error Probable (CEP): 50% of readings within stated accuracy
- Use Kalman filtering or moving average to smooth GPS jitter
- Reject outlier points that deviate significantly from recent trajectory

**Speed Validation:**
- Reject readings indicating impossible speeds (e.g., >100 mph for walking guard)
- Calculate speed from consecutive readings: `distance / time`
- Helps catch GPS glitches that show teleportation

**Aegis Filtering Implementation:**
```javascript
function isAcceptableLocation(location, previousLocation) {
  // Reject if accuracy is poor
  if (location.accuracy > 100) return false;

  // Reject if insufficient satellites (if available from device)
  if (location.satellites && location.satellites < 3) return false;

  // Validate speed if we have previous location
  if (previousLocation) {
    const distance = calculateDistance(previousLocation, location);
    const timeDelta = location.timestamp - previousLocation.timestamp;
    const speedMph = (distance / timeDelta) * 2.237; // m/s to mph

    if (speedMph > 80) return false; // Impossible for security guard
  }

  return true;
}
```

**Recommended for Aegis:**
- **Accept:** Accuracy ≤ 50 meters (ideal for customer display)
- **Accept with warning:** 50-100 meters (still useful, show reduced confidence)
- **Degraded mode:** 100-200 meters (show guard a "GPS signal weak" warning)
- **Reject:** > 200 meters (don't send to customer, prompt guard to move outdoors)

### 4. Geofencing for Check-in/Check-out Validation

**How Geofencing Works:**
- Define a circular virtual boundary using three parameters: latitude, longitude, and radius
- Monitor for transition events: ENTER, EXIT, DWELL
- Use device's native geofencing APIs (Android Geofencing API, iOS Region Monitoring)

**Radius Configuration:**

**Recommended Radius:**
- **100-150 meters:** Best balance for most use cases
- **200-500 meters:** For sites with poor GPS accuracy or large campuses
- Larger radius reduces false negatives (failed check-ins) but increases false positives (check-in from wrong location)

**Accuracy Considerations:**
- Wi-Fi available: 20-50 meter accuracy, can use smaller geofence
- Rural/remote sites: 100-500 meter accuracy, requires larger geofence
- Indoor locations: Poor GPS, may need Wi-Fi or beacon-based check-in alternative

**Transition Types:**

**GEOFENCE_TRANSITION_ENTER:**
- Triggers immediately when device crosses boundary
- Risk: Brief crossings (e.g., driving past) cause false alarms

**GEOFENCE_TRANSITION_DWELL (RECOMMENDED):**
- Triggers only when user stays inside geofence for specified duration
- Duration threshold: 30-60 seconds
- Reduces false alarms from brief boundary crossings
- Better for check-in validation (guard must remain on-site)

**GEOFENCE_TRANSITION_EXIT:**
- Triggers when device leaves boundary
- Useful for automatic check-out or alert when guard leaves post

**Implementation with PostGIS:**

The existing D-3 schema already includes PostGIS support. Geofence validation can be done server-side:

```sql
-- Check if guard is within 200m of job location
SELECT ST_DWithin(
  guard_current_location::geography,
  job_location::geography,
  200  -- radius in meters
) AS is_within_geofence;
```

**Client-Side Geofencing (React Native):**
```javascript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK = 'geofence-task';

// Define geofence
await Location.startGeofencingAsync(GEOFENCE_TASK, [
  {
    identifier: 'job-site-123',
    latitude: 34.0522,
    longitude: -118.2437,
    radius: 150, // meters
    notifyOnEnter: true,
    notifyOnExit: true,
  }
]);

// Handle geofence events
TaskManager.defineTask(GEOFENCE_TASK, ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (eventType === Location.GeofencingEventType.Enter) {
    console.log("Guard entered job site:", region.identifier);
    // Enable check-in button
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log("Guard left job site:", region.identifier);
    // Alert guard or auto-checkout
  }
});
```

**Aegis Geofencing Strategy:**
- **Check-in validation:** 150-200 meter radius around job site
- **Transition type:** DWELL with 30-second delay to avoid false positives
- **Backup verification:** Require photo proof at check-in (in case GPS is unreliable)
- **Server-side validation:** Use PostGIS ST_DWithin to verify check-in location server-side
- **Fallback for poor GPS:** Allow manual check-in with photo verification if GPS accuracy > 200m
- **Notifications:** Alert guard when entering/exiting geofence for situational awareness

### 5. Historical Route Tracking & Storage

**Storage Strategies:**

**Dual Storage Approach (Recommended for Aegis):**

**1. Real-time buffer in jobs.tracking_points (JSONB):**
- Store last 50-100 location points in JSONB array for quick access
- Used for real-time customer map display
- Lightweight, fast reads without joins
- Automatically trimmed as new points arrive (sliding window)

```sql
-- jobs table (from D-3)
jobs:
  - tracking_points JSONB  -- Array of last 50 points

-- Example data
{
  "tracking_points": [
    {
      "lat": 34.0522,
      "lng": -118.2437,
      "accuracy": 15,
      "timestamp": "2025-11-10T14:30:00Z"
    },
    // ... up to 50 recent points
  ]
}
```

**2. Long-term archive in location_history table:**
- Store all location points for 30-day retention (per D-3)
- Used for dispute resolution, route playback, and compliance audits
- Separate table prevents jobs table bloat
- Automatic deletion after 30 days (CCPA compliance)

```sql
-- location_history table (from D-3)
location_history:
  - id (PK)
  - guard_id (FK)
  - job_id (FK)
  - location (GEOGRAPHY(Point, 4326))
  - accuracy_meters (FLOAT)
  - recorded_at (TIMESTAMP)
  - created_at (TIMESTAMP DEFAULT NOW())

-- Index for time-series queries
CREATE INDEX idx_location_history_job_recorded
  ON location_history (job_id, recorded_at);

-- Automated cleanup (run daily via cron)
DELETE FROM location_history
WHERE created_at < NOW() - INTERVAL '30 days';
```

**Benefits of Dual Approach:**
- Fast real-time queries (JSONB array in jobs table, no join)
- Complete historical archive for compliance (location_history table)
- Efficient storage (active tracking in JSONB, old data in normalized table)
- Privacy-compliant (automatic 30-day deletion)

**Alternative: PostGIS Geography Arrays:**

Some implementations store GPS tracks as PostGIS LineString or MultiPoint:

```sql
-- Track as LineString
CREATE TABLE gps_tracks (
  job_id UUID PRIMARY KEY,
  track GEOGRAPHY(LineString, 4326),
  timestamps TIMESTAMP[]
);

-- Query track length
SELECT ST_Length(track::geography) / 1000 AS distance_km
FROM gps_tracks WHERE job_id = '...';
```

**Pros:**
- Native PostGIS spatial functions (length, simplification, buffer)
- Efficient storage for long tracks (single geometry vs. many rows)
- Built-in spatial indexing (GIST)

**Cons:**
- More complex updates (rebuild entire LineString vs. append point)
- Harder to query individual points with metadata (accuracy, speed)
- Less flexible for partial track queries

**Aegis Recommendation:**
- **Stick with dual JSONB + location_history approach from D-3**
- More flexible for incremental updates
- Easier to add metadata per point (accuracy, battery level, speed)
- Familiar structure for frontend developers
- Can still use PostGIS for distance calculations and geofencing

**Display Strategy:**

**Customer real-time view:**
- Fetch `jobs.tracking_points` JSONB array
- Display last 50 points as polyline on map
- Update every 30 seconds with new points
- Show guard's current position with animated marker

**Historical route playback:**
- Query `location_history` table filtered by job_id and time range
- Support playback with time slider
- Show speed, accuracy, and timestamps for each point
- Useful for incident investigation and customer disputes

### 6. Real-time Location Broadcast via Ably

**Ably Asset Tracking Architecture:**

Ably provides a purpose-built Asset Tracking SDK for real-time location sharing between publishers (guards) and subscribers (customers).

**Channel Structure:**
- Each trackable asset (guard on active job) has a unique `trackableId`
- Channel name format: `tracking:{trackableId}`
- Example: `tracking:job-a1b2c3d4` or `tracking:guard-12345`

**Recommendation for Aegis:**
- Use job ID as trackableId: `tracking:job-{jobId}`
- Benefit: Multiple customers can subscribe to same job (if needed)
- Alternative: `tracking:guard-{guardId}` if guard can have multiple simultaneous jobs

**Publisher SDK (Guard Mobile App):**

```javascript
import { AblyPublisher } from '@ably/asset-tracking-publisher';

// Initialize publisher when guard checks in
const publisher = new AblyPublisher({
  ablyKey: 'YOUR_ABLY_KEY',
  trackableId: `job-${jobId}`,
  locationSource: expoLocationSource, // or custom source
  sendResolution: {
    accuracy: 'balanced', // high, balanced, low
    desiredInterval: 30000, // 30 seconds
    minimumDisplacement: 10, // 10 meters
  }
});

// Start tracking
await publisher.track();

// Stop tracking when guard checks out
await publisher.stop();
```

**Subscriber SDK (Customer Web/Mobile App):**

```javascript
import { AblySubscriber } from '@ably/asset-tracking-subscriber';

// Initialize subscriber
const subscriber = new AblySubscriber({
  ablyKey: 'YOUR_ABLY_KEY',
  trackableId: `job-${jobId}`,
  resolution: {
    accuracy: 'balanced',
    desiredInterval: 30000,
  }
});

// Listen for location updates
subscriber.locations.subscribe((locationUpdate) => {
  console.log('Guard location:', locationUpdate);
  updateMapMarker(locationUpdate.location.latitude, locationUpdate.location.longitude);
});

// Start receiving updates
await subscriber.start();
```

**Key Features:**

**Reliability:**
- No location update is lost, delivered multiple times, or sent out of order
- Automatic reconnection with stream resumption from exact point of disconnection
- Handles brief network interruptions seamlessly (critical for remote sites)

**Resolution Control:**
- Both publisher and subscriber can control update frequency
- Publisher sets minimum resolution, subscriber can request higher resolution
- Trade-off: Battery conservation (publisher) vs. real-time visibility (subscriber)

**Offline Handling:**
- Location updates queued locally when offline
- Automatically sent when connectivity restored
- Ably handles buffering and ordering

**Alternative: Custom Ably Realtime Implementation:**

If Asset Tracking SDK is too opinionated, use standard Ably Realtime:

```javascript
// Guard app publishes location
import Ably from 'ably';

const ably = new Ably.Realtime('YOUR_ABLY_KEY');
const channel = ably.channels.get(`jobs:${jobId}:location`);

// Publish location every 30 seconds
setInterval(() => {
  channel.publish('location-update', {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    accuracy: currentLocation.accuracy,
    timestamp: new Date().toISOString(),
  });
}, 30000);

// Customer app subscribes
channel.subscribe('location-update', (message) => {
  console.log('Guard location:', message.data);
  updateMap(message.data);
});
```

**Channel Naming Convention:**
- `jobs:{jobId}:location` - Location updates for specific job
- `jobs:{jobId}:status` - Job status changes (started, paused, completed)
- `jobs:{jobId}:messages` - In-app messaging between guard and customer
- `guards:{guardId}:presence` - Guard online/offline status

**Aegis Recommendation:**
- **For MVP:** Use Ably Realtime with custom implementation (more control, simpler)
- **For Production:** Consider Ably Asset Tracking SDK if reliability and offline handling prove challenging
- **Update frequency:** 30 seconds (balance between real-time feel and battery/bandwidth)
- **Channel structure:** `jobs:{jobId}:location` for location updates
- **Presence:** Use Ably Presence API to show guard online/offline status

**Bandwidth Considerations:**
- Location update payload: ~200 bytes per message
- 30-second interval: 2 messages/minute = 120 messages/hour
- 8-hour shift: ~960 messages = ~192 KB total bandwidth
- Ably free tier: 3M messages/month = ~100K jobs/month at this rate

### 7. Privacy & Data Retention Policies

**Regulatory Framework:**

**CCPA (California Consumer Privacy Act):**
- Precise geolocation data is classified as personal information
- Requires notice and transparency about data collection
- Consumers have rights to access, deletion, and opt-out from data selling
- Must disclose data retention periods
- CPRA (California Privacy Rights Act) requires limiting data retention duration

**GDPR (European Union, if expanding internationally):**
- Location data is sensitive personal information requiring explicit consent
- Users must actively opt-in with clear understanding of purpose and usage
- Must disclose: type of data, usage purpose, retention period, third-party sharing
- Users can withdraw consent at any time
- "Right to be forgotten" allows users to request data deletion

**Key Requirements for Mobile Apps:**

**Explicit Consent:**
- GDPR: Requires explicit opt-in for location tracking
- Users must understand: Why location is collected, how it's used, who it's shared with
- Cannot make app functionality dependent on location consent (except core features)

**Transparency & Disclosure:**
- Privacy policy must clearly state:
  - Type of location data collected (GPS coordinates, accuracy, timestamp)
  - Purpose (real-time tracking during active jobs, dispute resolution, route history)
  - Retention period (30 days for Aegis per D-3)
  - Third-party sharing (Ably for real-time delivery, none for sale/marketing)
  - User rights (access, deletion, opt-out)

**Data Retention Best Practices:**

**Minimum Necessary Principle:**
- Only collect location during active jobs (not 24/7 tracking)
- Stop tracking immediately when job completes
- Delete data after legitimate business need expires

**Retention Periods by Purpose:**
- **Real-time tracking:** While job is active (delete when job completes)
- **Dispute resolution:** 30 days (sufficient for customer complaints)
- **Compliance/audit:** Varies by jurisdiction (California: 30 days minimum)
- **Analytics (aggregate):** Can be longer if properly anonymized

**User Rights Implementation:**

**Right to Access:**
- Provide API endpoint for users to download their location history
- Format: JSON or CSV with timestamps, coordinates, accuracy
- Response time: Within 30 days of request (CCPA)

**Right to Deletion:**
- Soft delete users table (per D-3)
- Cascade delete location_history records for deleted user
- Provide "Delete my data" option in app settings
- Exceptions: Can retain if legally required (e.g., active dispute)

**Right to Opt-Out:**
- Allow guards to pause location tracking (with warning about job consequences)
- Provide granular controls: tracking during jobs (required) vs. analytics (optional)

**Aegis Privacy Strategy:**

**Data Collection:**
- **When:** Only during active jobs (check-in to check-out)
- **Stop:** Immediately upon job completion or guard opt-out
- **Retention:** 30 days in location_history, then automatic deletion
- **Real-time buffer:** Cleared when job completes (tracking_points JSONB)

**User Controls:**
- Guards: See "Location Sharing Active" indicator during jobs
- Guards: Can view their own location history in app
- Guards: Can download location data (JSON export)
- Guards: Can request account deletion (includes all location data)

**Privacy Policy Disclosures:**
```
Location Data Collection (Example Language):

We collect precise GPS location data from security guards only during active
job assignments to:
1. Provide real-time location tracking to customers for safety and transparency
2. Verify check-in/check-out at job sites via geofencing
3. Resolve disputes about job completion or guard presence

Location data is retained for 30 days, then automatically deleted. Guards can
access and download their location history at any time through app settings.

We share location data with:
- Ably Inc. (real-time messaging provider) to deliver updates to customers
- AWS (infrastructure provider) for database storage

We do not sell location data to third parties or use it for advertising.

You can request deletion of your location data by contacting privacy@aegis.com
or using the "Delete My Data" option in app settings.
```

**Automated Compliance:**

**Daily Cron Job:**
```sql
-- Delete location history older than 30 days
DELETE FROM location_history
WHERE created_at < NOW() - INTERVAL '30 days';

-- Log deletion for audit trail
INSERT INTO audit_log (action, table_name, records_deleted, timestamp)
VALUES ('privacy_retention', 'location_history', ROW_COUNT(), NOW());
```

**User Deletion Workflow:**
```sql
-- When user requests account deletion
BEGIN;

-- Soft delete user
UPDATE users SET deleted_at = NOW() WHERE id = :userId;

-- Hard delete location history
DELETE FROM location_history WHERE guard_id = :userId;

-- Clear tracking points from active jobs
UPDATE jobs SET tracking_points = '[]'::jsonb WHERE guard_id = :userId;

COMMIT;
```

**Monitoring & Alerts:**
- Alert if deletion cron job fails (data retention violation risk)
- Dashboard showing: data retention compliance, avg retention period, deletion requests
- Regular audit: Verify no location data > 30 days exists

**International Expansion Considerations:**
- GDPR (EU): May need Data Protection Officer (DPO), stricter consent requirements
- Canada (PIPEDA): Similar to CCPA, requires consent and transparency
- Australia (Privacy Act): Requires privacy policy and data security measures

## Key Insights

1. **Motion-Aware Tracking is Essential:** The most effective battery optimization uses significant motion detection to toggle between active tracking (15-30 second updates) and stationary mode (5-10 minute updates or paused), reducing battery consumption by up to 90% compared to continuous tracking.

2. **expo-location is Sufficient for MVP:** With 420K weekly downloads and first-class Expo integration, expo-location provides adequate functionality for Aegis MVP. Consider upgrading to commercial react-native-background-geolocation (~$699) for production if battery optimization becomes a competitive differentiator or guard complaints emerge.

3. **Accuracy Filtering Prevents Bad Data:** Reject GPS readings with accuracy > 100 meters, insufficient satellites (< 3), or impossible speeds to ensure reliable customer tracking. Use 50-100 meter threshold for customer display and show warnings for degraded GPS signal.

4. **Geofencing Requires 150-200m Radius:** Given typical mobile GPS accuracy of 20-100 meters (worse at remote sites), use 150-200 meter geofence radius with DWELL transition (30-second delay) to prevent false check-in failures. Always provide photo backup verification for poor GPS conditions.

5. **Dual Storage Optimizes Performance:** Store last 50 location points in jobs.tracking_points JSONB for fast real-time access, archive all points in location_history table for 30-day compliance retention. This prevents jobs table bloat while maintaining audit trail.

6. **Ably Asset Tracking SDK May Be Overkill:** For MVP, use standard Ably Realtime with custom implementation (channel: `jobs:{jobId}:location`, 30-second updates). Ably's automatic reconnection and message ordering handle unreliable connectivity at remote sites. Upgrade to Asset Tracking SDK only if offline buffering proves insufficient.

7. **30-Day Retention Balances Privacy and Disputes:** CCPA requires data minimization, while customer disputes typically arise within 7-14 days. 30-day retention (per D-3) satisfies both regulatory compliance and business needs. Automated deletion via daily cron job is mandatory.

8. **Offline Buffering is Non-Negotiable:** Guards at remote sites will lose connectivity. Store location updates locally (queue up to 50 points) and sync when connectivity restored using incremental synchronization (only send new points, not entire dataset).

9. **Battery Drain is Top Guard Complaint:** Poorly optimized location tracking (77% battery drain per 24 hours) will cause guard attrition. Well-configured motion detection, batching, and reduced accuracy modes can limit drain to <5% per 8-hour shift, making it acceptable for professional use.

10. **Privacy Transparency Builds Trust:** Guards need clear visibility into when location tracking is active (indicator), ability to view their own history, and one-click data export. Customers need assurance that location isn't tracked 24/7, only during active jobs. Privacy policy must be specific, not boilerplate.

## Recommendations

### Immediate Next Steps

1. **Implement MVP Location Tracking (Week 1-2):**
   - Install expo-location and expo-task-manager in React Native mobile app
   - Configure background location permissions (iOS: "When In Use" + background modes, Android: ACCESS_FINE_LOCATION + ACCESS_BACKGROUND_LOCATION)
   - Implement basic location tracking: Start on check-in, stop on check-out
   - Store location updates locally with offline queue (max 50 points)
   - Send location to backend API every 30 seconds when online

2. **Set Up Ably Integration (Week 2):**
   - Create Ably account and provision API key
   - Implement location broadcast: Publish to `jobs:{jobId}:location` channel
   - Add customer subscription in web dashboard
   - Display guard location on Mapbox map with 30-second refresh
   - Show "Last updated" timestamp for transparency

3. **Add Accuracy Filtering (Week 2):**
   - Implement client-side filter: Reject readings with accuracy > 100m or satellites < 3
   - Show guard warning if GPS accuracy is poor (> 100m): "Weak GPS signal - move outdoors"
   - Send accuracy metadata with each location update for customer UI (show confidence indicator)

4. **Implement Geofencing Validation (Week 3):**
   - Add geofence definition to jobs table: `site_location GEOGRAPHY(Point, 4326)`, `site_radius_meters INTEGER DEFAULT 150`
   - Use expo-location geofencing API to monitor ENTER/EXIT events
   - Enable check-in button only when guard is within geofence (or GPS accuracy > 200m, then require photo)
   - Server-side validation: Use PostGIS ST_DWithin to verify check-in location
   - Backup: Always require photo proof at check-in regardless of geofence status

### Technical Architecture Decisions

**Location Tracking Library:**
- **MVP (now):** expo-location with expo-task-manager
  - Free, well-documented, sufficient for basic tracking
  - Implement custom battery optimization logic (motion detection, batching)

- **Production (post-MVP evaluation):** Consider react-native-background-geolocation if:
  - Beta testers report excessive battery drain (> 10% per shift)
  - Offline sync proves unreliable at remote sites
  - Development time for custom optimization exceeds license cost ROI

**Location Update Frequency:**
- **Active job, guard moving:** 15-30 seconds with high accuracy (GPS + Wi-Fi + cell)
- **Active job, guard stationary:** 5 minutes with balanced accuracy (reduce when motion stops for > 2 minutes)
- **Job paused/break:** Stop tracking, only resume when job resumes
- **Background/offline:** No tracking (privacy + battery)

**Accuracy Filtering Logic:**
```javascript
// Client-side filter before sending to server
function filterLocation(location) {
  // Reject poor accuracy
  if (location.accuracy > 100) return null;

  // Reject insufficient satellites (if available)
  if (location.satellites && location.satellites < 3) return null;

  // Categorize accuracy for UI
  if (location.accuracy <= 50) return { ...location, quality: 'high' };
  if (location.accuracy <= 100) return { ...location, quality: 'medium' };
  return { ...location, quality: 'low' }; // Show warning
}
```

**Geofencing Configuration:**
- **Radius:** 150 meters (standard), 200 meters (rural/poor GPS areas)
- **Transition:** DWELL with 30-second delay (prevents false positives from drive-bys)
- **Validation:** Server-side PostGIS check + photo requirement
- **Fallback:** If GPS accuracy > 200m, allow manual check-in with photo only

**Historical Route Storage:**
- **Real-time buffer:** `jobs.tracking_points` JSONB array (last 50 points)
- **Archive:** `location_history` table (all points, 30-day retention)
- **Update strategy:**
  - Append new point to tracking_points array
  - If array length > 50, remove oldest point (shift)
  - Insert to location_history for permanent archive
  - Daily cron: Delete location_history rows > 30 days old

**Ably Channel Structure:**
- `jobs:{jobId}:location` - Location updates (30-second interval)
- `jobs:{jobId}:status` - Job status changes (started, paused, completed, emergency)
- `jobs:{jobId}:messages` - Chat between guard and customer
- `guards:{guardId}:presence` - Online/offline status (Ably Presence API)

**Offline Buffering:**
- Store last 50 location updates in local SQLite database (or AsyncStorage for simplicity)
- On connectivity restored: Send buffered updates in batch with timestamps
- Server: Sort by timestamp, insert to location_history, update tracking_points with latest
- Client: Clear local buffer after successful sync
- Conflict resolution: Last write wins (timestamp-based)

**Privacy & Data Retention:**
- **Collection:** Only during active jobs (check-in to check-out)
- **Retention:** 30 days in location_history, then automatic deletion
- **User rights:** Guards can view/download their location history, request deletion
- **Transparency:** Show "Location Sharing Active" indicator in guard app
- **Compliance:** Privacy policy disclosures, automated deletion cron job, audit logging

### Battery Optimization Techniques

**Motion Detection (Phase 1 - MVP):**
```javascript
import * as Location from 'expo-location';

let isStationary = false;
let stationaryTimer = null;

// Monitor location changes
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 15000, // 15 seconds
    distanceInterval: 10, // 10 meters
  },
  (location) => {
    // Check if guard has moved
    const movedSignificantly = checkMovement(location, lastLocation);

    if (!movedSignificantly) {
      // Start stationary timer
      if (!stationaryTimer) {
        stationaryTimer = setTimeout(() => {
          isStationary = true;
          switchToStationaryMode(); // Reduce to 5 min updates
        }, 120000); // 2 minutes
      }
    } else {
      // Reset stationary state
      clearTimeout(stationaryTimer);
      stationaryTimer = null;
      if (isStationary) {
        isStationary = false;
        switchToActiveMode(); // Resume 15-30 sec updates
      }
    }

    // Send location update
    sendLocationUpdate(location);
  }
);

function switchToStationaryMode() {
  // Reduce update frequency to 5 minutes
  subscription.remove();
  subscription = await Location.watchPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 300000, // 5 minutes
    distanceInterval: 50,
  }, handleLocationUpdate);
}
```

**Batching (Phase 2 - If bandwidth is concern):**
- Collect 5-10 location points locally before sending batch to server
- Reduces network requests (major battery drain source)
- Trade-off: 2-5 minute delay in customer view (acceptable for most jobs)

**Adaptive Accuracy (Phase 2):**
- Start job: High accuracy (GPS + Wi-Fi + cell)
- After 30 minutes: Switch to Balanced accuracy if stationary
- Rural areas: Use Low accuracy (GPS only) to reduce cell tower polling

**Expected Battery Impact:**
- **Poorly configured:** 10-20% drain per hour (unacceptable)
- **MVP with motion detection:** 5-8% per 8-hour shift (acceptable)
- **Production optimized:** 3-5% per 8-hour shift (excellent)

### Testing & Validation

**Location Accuracy Testing:**
- Test in various environments: Downtown (Wi-Fi rich), suburban, rural, indoors
- Validate geofencing: Walk in/out of 150m radius, verify DWELL delay
- Measure accuracy: Compare reported accuracy vs. ground truth (known locations)

**Battery Benchmarks:**
- Test 8-hour simulated shift with location tracking enabled
- Measure battery drain with/without motion detection
- Target: < 10% drain per shift (< 5% ideal)
- Test on both iOS and Android devices (different behavior)

**Offline Sync Testing:**
- Simulate connectivity loss during active job (airplane mode)
- Verify local buffering (50+ points stored)
- Restore connectivity, verify sync (all points sent, no duplicates)
- Check server: location_history has correct timestamps, tracking_points updated

**Privacy Compliance Testing:**
- Verify tracking stops immediately on check-out
- Test 30-day deletion cron job (create old records, run job, verify deletion)
- Test user data export (guard requests download, receives JSON with all locations)
- Test user deletion (guard deletes account, verify location_history cleared)

### Long-term Considerations

**Scalability:**
- Ably free tier: 3M messages/month supports ~100K active job-hours/month (plenty for MVP)
- If scaling beyond: Ably standard plan $99/month for 30M messages
- location_history table: Partition by month if > 10M rows (time-series optimization)
- Consider moving hot tracking data to Redis if PostgreSQL queries slow (> 50ms)

**Feature Enhancements (Post-MVP):**
- Route playback with time slider (historical view)
- Speed tracking (detect if guard is patrolling vs. stationary)
- Heatmap of guard presence (time spent in each area of site)
- Geofence alerts to customer (guard left site early)
- Multiple geofences per job (patrol route checkpoints)
- Indoor positioning using Wi-Fi/Bluetooth beacons (for mall security, etc.)

**Competitive Differentiation:**
- Most competitors offer basic GPS tracking
- Aegis can differentiate with:
  - Better battery efficiency (guards prefer our app)
  - More reliable offline handling (works at remote sites)
  - Transparent privacy controls (guards trust us with location data)
  - Advanced features (route playback, geofence alerts, patrol checkpoints)

## Related Nodes

- **Spawned by:** Q-3 (Technical Architecture Research - recommended GPS tracking features)
- **Informs:** D-7 (GPS Tracking Architecture Decision - to be created)
- **Depends on:** D-1 (React Native mobile platform), D-3 (PostGIS database schema), Q-3 (Ably real-time messaging recommendation)
- **Related:** Q-10 (Mobile Offline Sync - coordinates with offline location buffering)
