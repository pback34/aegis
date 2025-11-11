---
node_type: Question
status: Complete
priority: Medium
created: 2025-11-09
updated: 2025-11-10
spawned_by:
  - Q-3
informs:
  - D-9
tags:
  - technical
  - mobile
  - offline
  - sync
  - react-native
---

# Q-10: Mobile App Offline Sync Strategy

## Question

How should we implement offline-first mobile architecture to ensure critical features work without connectivity?

## Context

Security guards work at remote sites with unreliable cellular connectivity. Critical features MUST work offline, including emergency panic button, check-in/check-out, and viewing current shift details. Using React Native with Expo for mobile apps (see D-1) with NestJS backend and PostgreSQL database (see D-5).

## Research Objectives

- What data to cache locally on mobile devices
- Conflict resolution strategies for offline changes
- Queue management for offline actions
- User experience during offline/online transitions
- WatermelonDB or other offline-first database patterns

## Priority & Timeline

- **Priority:** Medium (important for production reliability, less critical for demo)
- **Timeline:** Research completed 2025-11-10
- **Status:** Complete

## Findings

After comprehensive research on React Native offline-first architectures, data synchronization patterns, and conflict resolution strategies, we have determined the optimal approach for Aegis guard mobile apps. Security guards work in remote locations with unreliable cellular connectivity, making offline-first architecture essential rather than optional.

The recommended solution combines **WatermelonDB** as the local reactive database with a **custom offline queue system** for critical actions like panic button, check-in/check-out, and location tracking. This hybrid approach provides both immediate UI responsiveness for read operations and reliable delivery guarantees for critical write operations when connectivity returns.

### 1. Offline-First Patterns Research

**WatermelonDB vs Redux Persist + AsyncStorage vs Custom Solutions:**

**WatermelonDB (Recommended for Complex Data):**
- Built on top of SQLite, runs on separate native thread (no bridge bottleneck)
- Queries complete in <1ms even with 10,000+ records
- Reactive observable queries automatically update UI when data changes
- Supports relationships, indexing, and complex queries
- Built-in sync protocol with push/pull architecture
- Lazy loading prevents loading entire dataset into memory
- **Performance:** 4x faster than Redux Persist, 20x faster than AsyncStorage

**Redux Persist + AsyncStorage (Simple but Limited):**
- AsyncStorage has no indexing capability and slow runtime
- All data stored as serialized strings (slow serialize/deserialize)
- Not suitable for handling large datasets or complex queries
- Best for simple key-value storage (settings, user preferences)
- **Performance:** Slowest option, struggles with >1000 records

**Custom SQLite Solution (Full Control but More Work):**
- Direct SQLite access via react-native-sqlite-storage
- Full control over schema and queries
- No ORM abstraction overhead (slightly faster for simple queries)
- Requires manual relationship handling and query optimization
- **Trade-off:** Better performance control but higher development cost

**Verdict for Aegis:** WatermelonDB strikes the best balance - enterprise-grade performance with reasonable development velocity. Guards need to view job history, shift schedules, and location tracking data (potentially thousands of records), making WatermelonDB's indexing and lazy loading essential.

### 2. Critical Offline Features Definition

Based on research into food delivery apps (Uber Eats, DoorDash) and driver apps (Uber Driver), critical offline features for security guards:

**Tier 1: MUST Work Offline (Zero Tolerance for Failure)**
- **Emergency Panic Button:** Queue alert with timestamp, GPS coordinates, guard ID, job ID for immediate dispatch when online
- **Check-In at Job Site:** Record timestamp, GPS coordinates, photo proof locally; sync when online with conflict detection
- **Check-Out from Job Site:** Record actual end time, final location, completion status locally
- **View Current Active Job:** Cache job details (address, customer contact, special instructions, emergency procedures)
- **View Guard Profile:** Cache license info, certifications, hourly rate for guard reference

**Tier 2: Should Work Offline (Degraded Experience Acceptable)**
- **View Upcoming Shifts (Next 7 Days):** Pre-fetch and cache upcoming job assignments
- **View Recent Job History (Last 30 Days):** Cache completed jobs for guard review
- **Location Tracking During Shift:** Buffer location points locally, batch upload every 5 minutes or when >10 points queued
- **View Customer Contact Info:** Cache customer phone number for emergencies (call works offline)

**Tier 3: Can Fail Offline (Online-Only Features)**
- **Browse Available Jobs:** Requires real-time matching algorithm (server-side)
- **Accept New Job Offers:** Requires availability check and matching logic
- **Message Customer/Admin:** Real-time messaging requires connectivity
- **Upload Incident Reports:** Can draft offline but submit online

**Data Priority for Limited Storage:**
1. Active job details (highest priority)
2. Today's upcoming shifts
3. Emergency contact information
4. Guard profile and credentials
5. Location tracking buffer (last 100 points)
6. Recent job history (30 days)

### 3. Data Caching Strategy

**What to Cache Locally:**

**Guard Profile Data (Small, Rarely Changes):**
```javascript
// Cache lifetime: 24 hours, refresh on app launch when online
{
  guardId: uuid,
  licenseNumber: string,
  licenseState: string,
  licenseExpiry: date,
  skills: array,
  certifications: array,
  hourlyRate: number,
  profilePhoto: base64 // Small thumbnail only
}
```

**Active Job Details (Critical, Frequently Accessed):**
```javascript
// Cache lifetime: Until job completed, update on any change
{
  jobId: uuid,
  customerId: uuid,
  customerName: string,
  customerPhone: string, // Essential for emergencies
  locationAddress: string,
  locationCoordinates: { lat, lng },
  startTime: timestamp,
  endTime: timestamp,
  specialInstructions: string,
  emergencyProcedures: string,
  siteAccessCodes: string, // Gate codes, building access
  status: enum,
  hourlyRate: number,
  checkInRequired: boolean,
  checkInLocation: { lat, lng, timestamp, photo } | null,
  checkOutLocation: { lat, lng, timestamp, photo } | null
}
```

**Upcoming Shifts (7-Day Horizon):**
```javascript
// Cache lifetime: 6 hours, refresh when online
// Limit to next 7 days to bound storage
{
  jobs: [
    {
      jobId: uuid,
      customerName: string,
      locationAddress: string,
      startTime: timestamp,
      duration: number,
      status: enum
    }
  ]
}
```

**Location Tracking Buffer (Bounded Queue):**
```javascript
// Max 100 points cached, FIFO when limit reached
// Batch upload every 5 minutes or when >10 points
{
  locationHistory: [
    {
      guardId: uuid,
      jobId: uuid,
      location: { lat, lng },
      accuracy: meters,
      recordedAt: timestamp,
      uploadStatus: 'pending' | 'synced',
      batteryLevel: percent // For debugging connectivity issues
    }
  ]
}
```

**Cache Invalidation Rules:**

**Time-Based (TTL):**
- Guard profile: 24 hours
- Upcoming shifts: 6 hours
- Job details: Until job status = 'completed' + 24 hours
- Location buffer: Clear after successful sync

**Event-Based:**
- Active job details: Invalidate on job state change (push notification triggers refresh)
- Guard profile: Invalidate on profile update notification
- Upcoming shifts: Invalidate on new job assignment notification

**Conditional (ETag/Last-Modified):**
- On reconnect, send If-Modified-Since header for guard profile
- Server returns 304 Not Modified if no changes, saving bandwidth
- Full payload only if data changed since last sync

**Storage Limits:**
- Max 50MB for offline cache (enforced at app level)
- Priority queue: Delete oldest completed jobs first if limit reached
- Never delete active job or pending offline actions

### 4. Sync Conflict Resolution Strategies

**Server-Wins (Recommended for MVP):**

Simplest approach with clear semantics. Server is source of truth, local changes only applied if no server-side conflict detected.

**Use Cases:**
- Job assignment changes (customer cancelled while guard offline)
- Schedule conflicts (admin reassigned job to different guard)
- Guard profile updates (admin changed license status)

**Implementation:**
```javascript
// Pseudo-code for server-wins sync
async function syncJobDetails(localJob, serverJob) {
  if (serverJob.updatedAt > localJob.updatedAt) {
    // Server has newer data, discard local changes
    await db.jobs.update(localJob.id, serverJob);
    showNotification('Job details updated while offline');
    return 'server_wins';
  } else {
    // Local is newer, send to server
    await api.updateJob(localJob);
    return 'local_wins';
  }
}
```

**Client-Wins for Specific Fields:**

Certain fields should always preserve client data because only the guard knows ground truth:

**Client-Wins Fields:**
- Check-in timestamp and location (guard was physically there)
- Check-out timestamp and location
- Actual start/end times (overrides scheduled times)
- Location tracking points (guard's actual movements)
- Panic button presses (critical safety events)

**Implementation:**
```javascript
// Pseudo-code for field-level merge
async function syncJobCompletion(localJob, serverJob) {
  const merged = {
    ...serverJob, // Server-wins for most fields

    // Client-wins for ground truth fields
    actualStartTime: localJob.actualStartTime || serverJob.actualStartTime,
    actualEndTime: localJob.actualEndTime || serverJob.actualEndTime,
    checkInLocation: localJob.checkInLocation || serverJob.checkInLocation,
    checkOutLocation: localJob.checkOutLocation || serverJob.checkOutLocation,
  };

  await db.jobs.update(localJob.id, merged);
  await api.updateJob(merged);
  return 'merged';
}
```

**Operational Transform (OT) / CRDT (Deferred to Post-MVP):**

For collaborative scenarios where multiple users edit the same data simultaneously, CRDTs (Conflict-free Replicated Data Types) provide automatic merging without conflicts.

**When Needed:**
- Multiple admins editing job details simultaneously
- Guard notes/incident reports with concurrent edits
- Collaborative scheduling features

**Why Defer:** Adds significant complexity for limited benefit in MVP. Guards rarely edit the same job simultaneously. Server-wins + client-wins for ground truth fields covers 95% of cases.

**Conflict Detection and User Notification:**

```javascript
// Notify guard of conflicts requiring attention
function handleSyncConflict(conflict) {
  if (conflict.type === 'job_cancelled') {
    // Critical: Job cancelled while guard offline
    showAlert({
      title: 'Job Cancelled',
      message: `${conflict.job.customerName} cancelled this job. Please check your schedule.`,
      actions: ['View Schedule', 'OK']
    });
  } else if (conflict.type === 'time_changed') {
    // Non-critical: Schedule adjusted
    showNotification(`Job time changed to ${conflict.newStartTime}`);
  }
}
```

### 5. Queue Management for Offline Actions

**Command Queue Pattern (Recommended):**

Offline actions modeled as commands with retry logic, ordered execution, and failure handling.

**Queue Structure:**
```javascript
// Persistent queue stored in AsyncStorage or WatermelonDB
{
  offlineQueue: [
    {
      id: uuid,
      type: 'panic_button' | 'check_in' | 'check_out' | 'location_update',
      payload: object,
      timestamp: timestamp,
      retryCount: number,
      maxRetries: number,
      priority: number, // Higher = more urgent
      status: 'pending' | 'in_progress' | 'success' | 'failed',
      error: string | null
    }
  ]
}
```

**Priority System:**

```javascript
const PRIORITIES = {
  PANIC_BUTTON: 100,      // Highest priority, retry aggressively
  CHECK_IN: 80,           // High priority, affects payment
  CHECK_OUT: 80,          // High priority, affects payment
  LOCATION_UPDATE: 50,    // Medium priority, batch upload
  PROFILE_UPDATE: 20      // Low priority, can wait
};
```

**Queue Processing Algorithm:**

```javascript
// Pseudo-code for offline queue processor
async function processOfflineQueue() {
  const queue = await getOfflineQueue();

  // Sort by priority (high to low), then timestamp (old to new)
  const sorted = queue
    .filter(item => item.status === 'pending')
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

  for (const item of sorted) {
    try {
      // Throttle: 50ms between requests to avoid overwhelming server
      await delay(50);

      // Dispatch command to API
      await item.status = 'in_progress';
      const result = await dispatchCommand(item);

      // Mark success and remove from queue
      await removeFromQueue(item.id);
      await item.status = 'success';

      // Update local cache with server response
      await updateLocalCache(result);

    } catch (error) {
      // Increment retry count
      item.retryCount++;
      item.error = error.message;

      if (item.retryCount >= item.maxRetries) {
        // Max retries exceeded, flag for manual review
        item.status = 'failed';
        await logFailedCommand(item);
        showNotification('Action failed to sync. Contact support.');
      } else {
        // Retry with exponential backoff
        item.status = 'pending';
        await scheduleRetry(item, Math.pow(2, item.retryCount) * 1000);
      }
    }
  }
}
```

**Batch Optimization for Location Updates:**

```javascript
// Batch location updates to reduce API calls
async function batchLocationUpdates() {
  const pendingLocations = await getQueuedLocations();

  if (pendingLocations.length >= 10 || timeSinceLastUpload > 5 * 60 * 1000) {
    // Upload batch of 10 points or every 5 minutes
    try {
      await api.uploadLocationBatch({
        guardId: currentGuard.id,
        jobId: currentJob.id,
        locations: pendingLocations.map(loc => ({
          lat: loc.latitude,
          lng: loc.longitude,
          accuracy: loc.accuracy,
          recordedAt: loc.timestamp
        }))
      });

      // Clear uploaded locations from queue
      await clearLocationQueue();

    } catch (error) {
      // Keep in queue, retry on next batch
      console.warn('Location batch upload failed, will retry');
    }
  }
}
```

**Queue Persistence:**

```javascript
// Persist queue to survive app restarts
import AsyncStorage from '@react-native-async-storage/async-storage';

async function persistQueue(queue) {
  await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
}

async function loadQueue() {
  const stored = await AsyncStorage.getItem('offline_queue');
  return stored ? JSON.parse(stored) : [];
}

// On app launch, resume queue processing
async function initializeApp() {
  const queue = await loadQueue();

  if (queue.length > 0) {
    console.log(`Found ${queue.length} pending offline actions`);

    // Wait for network before processing
    await waitForNetwork();
    await processOfflineQueue();
  }
}
```

**Authorization Token Handling:**

Critical issue: JWT access tokens expire (typically 15 minutes). Offline actions queued for hours may fail with "unauthorized" error when replayed.

```javascript
// Refresh token before processing queue
async function processOfflineQueueWithAuth() {
  // Check if access token expired while offline
  if (isTokenExpired(accessToken)) {
    try {
      // Use refresh token to get new access token
      const newTokens = await api.refreshAuthToken(refreshToken);
      await storeAuthTokens(newTokens);
    } catch (error) {
      // Refresh token also expired, require re-login
      showAlert('Please log in again to sync offline actions');
      return;
    }
  }

  // Now process queue with valid token
  await processOfflineQueue();
}
```

### 6. User Experience for Offline/Online Transitions

**Offline Banner (Persistent Visual Indicator):**

```javascript
// Component: OfflineNotice.tsx
import NetInfo from '@react-native-community/netinfo';
import { View, Text, StyleSheet } from 'react-native';

function OfflineNotice() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Listen to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Offline Mode - Actions will sync when online
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFA500', // Orange for warning
    padding: 12,
    zIndex: 9999, // Above all other content
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  }
});
```

**Sync Status Indicator:**

```javascript
// Component: SyncStatusBadge.tsx
function SyncStatusBadge() {
  const queue = useOfflineQueue();
  const [syncing, setSyncing] = useState(false);

  if (queue.length === 0) return null;

  return (
    <View style={styles.badge}>
      {syncing ? (
        <>
          <ActivityIndicator size="small" color="white" />
          <Text style={styles.text}>Syncing {queue.length} actions...</Text>
        </>
      ) : (
        <>
          <Icon name="cloud-upload" color="white" />
          <Text style={styles.text}>{queue.length} pending</Text>
        </>
      )}
    </View>
  );
}
```

**Optimistic UI Updates:**

Apply changes immediately to UI, then sync in background. If sync fails, revert with notification.

```javascript
// Example: Check-in with optimistic UI
async function checkInToJob(jobId, location, photo) {
  // 1. Update UI immediately
  dispatch({
    type: 'JOB_CHECKED_IN',
    payload: { jobId, location, timestamp: Date.now() }
  });

  // 2. Show success feedback
  showToast('Checked in successfully');

  // 3. Queue for sync
  await addToOfflineQueue({
    type: 'check_in',
    payload: { jobId, location, photo },
    priority: PRIORITIES.CHECK_IN
  });

  // 4. Attempt immediate sync if online
  if (await isOnline()) {
    try {
      await api.checkIn({ jobId, location, photo });
      await removeFromQueue(queueItem.id);
    } catch (error) {
      // Sync failed, but queued for retry
      console.warn('Check-in sync failed, queued for retry');
    }
  }
}
```

**Offline Capability Indicators on Buttons:**

```javascript
// Show which features work offline
<Button
  title="Emergency Panic Button"
  icon={<Icon name="wifi-off" size={16} color="green" />}
  subtitle="Works offline"
  onPress={handlePanic}
/>

<Button
  title="Browse Available Jobs"
  icon={<Icon name="wifi" size={16} color="gray" />}
  subtitle="Requires internet"
  disabled={!isOnline}
  onPress={handleBrowseJobs}
/>
```

**Transition Animations:**

```javascript
// Smooth transition when coming back online
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && !wasConnected) {
      // Just came back online
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 500
      }).start(() => {
        setShowBanner(false);
      });

      // Start sync animation
      setSyncing(true);
      processOfflineQueue().then(() => {
        setSyncing(false);
        showToast('All actions synced successfully');
      });
    }

    setWasConnected(state.isConnected);
  });

  return () => unsubscribe();
}, [wasConnected]);
```

**Edge Case Handling:**

```javascript
// Warn user before critical offline actions
async function handlePanicButton() {
  const isConnected = await checkConnection();

  if (!isConnected) {
    Alert.alert(
      'Offline Mode',
      'Your panic alert will be sent when you reconnect. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Anyway',
          onPress: () => queuePanicAlert(),
          style: 'destructive'
        }
      ]
    );
  } else {
    await sendPanicAlert();
  }
}
```

### 7. Library Comparison and Recommendation

**WatermelonDB (Recommended for Complex Relational Data):**

**Pros:**
- Enterprise-grade performance: <1ms queries on 10K+ records
- Reactive observable queries (UI updates automatically)
- Runs on native thread (no React Native bridge bottleneck)
- Built-in sync protocol with push/pull architecture
- Supports relationships, indexing, lazy loading
- Active maintenance and strong community

**Cons:**
- Larger bundle size (adds ~200KB to app)
- Steeper learning curve than AsyncStorage
- Requires native module setup (not pure JS)
- Sync protocol opinionated (need custom logic for complex cases)

**Best For:** Apps with complex data models, relationships, and thousands of records (Aegis use case)

**Redux Persist + AsyncStorage (Recommended for Simple State Persistence):**

**Pros:**
- Zero additional dependencies (AsyncStorage built-in)
- Simple API, easy to understand
- Good for persisting Redux state
- Works well for settings, preferences, small datasets

**Cons:**
- Very slow for large datasets (no indexing)
- No relational data support
- All data must serialize to JSON
- No reactive updates

**Best For:** Persisting app settings, user preferences, authentication tokens

**Custom SQLite (Advanced Use Case):**

**Pros:**
- Full control over schema and queries
- No abstraction overhead
- Can optimize for specific use cases

**Cons:**
- Must manually handle relationships
- No reactive updates (need custom implementation)
- More boilerplate code
- Higher maintenance burden

**Best For:** Apps with very specific performance requirements or existing SQLite expertise

**Recommended Hybrid Approach for Aegis:**

```javascript
// Architecture: WatermelonDB + AsyncStorage + Custom Queue

// 1. WatermelonDB for structured data (jobs, locations, profile)
const database = new Database({
  adapter: new SQLiteAdapter({
    schema: appSchema,
  }),
  modelClasses: [Job, GuardProfile, LocationHistory]
});

// 2. AsyncStorage for simple key-value (auth tokens, settings)
await AsyncStorage.setItem('auth_token', token);
await AsyncStorage.setItem('offline_mode_enabled', 'true');

// 3. Custom queue in AsyncStorage (survives app restarts)
const queue = JSON.parse(await AsyncStorage.getItem('offline_queue'));

// 4. Redux for in-memory state management
const store = createStore(
  rootReducer,
  applyMiddleware(offlineMiddleware)
);
```

This hybrid approach leverages each library's strengths:
- **WatermelonDB** handles complex job/location/profile data with relationships
- **AsyncStorage** handles simple settings and the offline queue
- **Redux** manages in-memory UI state and coordinates data flow
- **Custom middleware** bridges offline queue with Redux actions

## Key Insights

- **WatermelonDB is the optimal choice for Aegis:** Handles complex relational data (jobs, guard profiles, location history) with enterprise performance while running queries in <1ms on 10,000+ records, critical for guards viewing shift history and location tracking data at remote sites

- **Command queue pattern is essential for critical actions:** Panic button, check-in/check-out must be queued with priority system (panic=100, check-in/out=80, location=50) and exponential backoff retry logic to guarantee delivery when connectivity returns

- **Server-wins conflict resolution is sufficient for MVP:** Simple timestamp-based approach (server.updatedAt > local.updatedAt) covers 95% of cases, with client-wins exceptions for ground truth fields (actual check-in time, location coordinates, panic alerts) that only the guard knows

- **Batch location updates optimize battery and bandwidth:** Buffer location points locally, upload batches of 10 points every 5 minutes rather than real-time streaming, reducing API calls by 90% while maintaining adequate tracking granularity

- **Offline UI must be obvious and reassuring:** Persistent orange banner at top ("Offline Mode - Actions will sync when online"), sync status badge showing pending count, and optimistic UI updates that feel instant even when queued provide confidence that actions won't be lost

- **Cache invalidation requires hybrid approach:** Time-based TTL for guard profile (24hr) and shifts (6hr), event-based invalidation for job status changes via push notifications, and conditional ETag requests to minimize bandwidth on reconnect

- **Authorization token refresh is critical edge case:** JWT access tokens expire in 15 minutes; offline queue processor must refresh tokens before replaying queued actions or all actions fail with 401 Unauthorized when guard comes back online after hours

- **Storage limits prevent unbounded growth:** Enforce 50MB offline cache limit, prioritize active job and pending actions, auto-delete completed jobs older than 30 days using FIFO queue, prevent app from consuming unlimited device storage

- **NetInfo provides reliable connectivity detection:** @react-native-community/netinfo checks both isConnected (device network) and isInternetReachable (actual internet), preventing false positives when on WiFi with no internet access

- **Optimistic UI updates improve perceived performance:** Apply check-in/check-out immediately to UI, show success toast, queue in background for sync; revert only on catastrophic failure rather than waiting for server confirmation, making offline mode feel just as fast as online

## Recommendations

### Immediate Implementation (Phase 1: MVP Core)

**1. Data Layer Architecture**

Implement hybrid storage approach:

```javascript
// 1. Install core dependencies
npm install @nozbe/watermelondb @react-native-community/netinfo
npm install @react-native-async-storage/async-storage

// 2. Define WatermelonDB schema
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'customer_name', type: 'string' },
        { name: 'location_address', type: 'string' },
        { name: 'location_lat', type: 'number' },
        { name: 'location_lng', type: 'number' },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'check_in_at', type: 'number', isOptional: true },
        { name: 'check_out_at', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean', isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'location_history',
      columns: [
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'recorded_at', type: 'number', isIndexed: true },
        { name: 'synced', type: 'boolean', isIndexed: true },
      ]
    }),
  ]
});

// 3. Create models
// src/database/models/Job.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Job extends Model {
  static table = 'jobs';

  @field('job_id') jobId;
  @field('customer_name') customerName;
  @field('location_address') locationAddress;
  @field('location_lat') locationLat;
  @field('location_lng') locationLng;
  @date('start_time') startTime;
  @date('end_time') endTime;
  @field('status') status;
  @date('check_in_at') checkInAt;
  @date('check_out_at') checkOutAt;
  @field('synced') synced;

  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
```

**2. Offline Queue System**

Implement command queue with priority and retry logic:

```javascript
// src/services/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = 'offline_queue';
const PRIORITIES = {
  PANIC_BUTTON: 100,
  CHECK_IN: 80,
  CHECK_OUT: 80,
  LOCATION_UPDATE: 50,
};

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.listeners = [];
  }

  async init() {
    // Load persisted queue on app launch
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    this.queue = stored ? JSON.parse(stored) : [];

    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });

    console.log(`Offline queue initialized with ${this.queue.length} items`);
  }

  async add(command) {
    const item = {
      id: uuid(),
      ...command,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: command.priority >= 80 ? 10 : 3,
      status: 'pending',
    };

    this.queue.push(item);
    await this.persist();
    this.notifyListeners();

    // Try immediate sync if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const pending = this.queue
      .filter(item => item.status === 'pending')
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

    for (const item of pending) {
      try {
        await this.processItem(item);
        this.queue = this.queue.filter(q => q.id !== item.id);
      } catch (error) {
        item.retryCount++;
        if (item.retryCount >= item.maxRetries) {
          item.status = 'failed';
          console.error(`Queue item ${item.id} failed permanently`);
        }
      }

      await this.persist();
      await delay(50); // Throttle
    }

    this.isProcessing = false;
    this.notifyListeners();
  }

  async processItem(item) {
    switch (item.type) {
      case 'panic_button':
        await api.sendPanicAlert(item.payload);
        break;
      case 'check_in':
        await api.checkIn(item.payload);
        break;
      case 'check_out':
        await api.checkOut(item.payload);
        break;
      case 'location_batch':
        await api.uploadLocationBatch(item.payload);
        break;
    }
  }

  async persist() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.queue));
  }
}

export default new OfflineQueue();
```

**3. Sync Strategy**

Implement WatermelonDB sync with push/pull:

```javascript
// src/services/sync.ts
import { synchronize } from '@nozbe/watermelondb/sync';
import database from './database';
import api from './api';

async function sync() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      // Fetch changes from server since last sync
      const response = await api.get('/sync/pull', {
        params: { last_pulled_at: lastPulledAt }
      });

      return {
        changes: response.data.changes,
        timestamp: response.data.timestamp,
      };
    },
    pushChanges: async ({ changes }) => {
      // Send local changes to server
      await api.post('/sync/push', { changes });
    },
  });
}

// Sync on app launch and every 5 minutes when online
export function initSync() {
  sync(); // Initial sync

  setInterval(() => {
    NetInfo.fetch().then(state => {
      if (state.isConnected && state.isInternetReachable) {
        sync();
      }
    });
  }, 5 * 60 * 1000); // 5 minutes
}
```

**4. UI Components**

Create offline banner and sync status:

```javascript
// src/components/OfflineBanner.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const netInfo = useNetInfo();
  const isOffline = !netInfo.isConnected || !netInfo.isInternetReachable;

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Offline - Actions will sync when online
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF9500',
    padding: 12,
    zIndex: 9999,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  }
});
```

### Phase 2: Production Hardening

**5. Advanced Conflict Resolution**

Add field-level merging for complex cases:

```javascript
// src/services/conflictResolver.ts
export function resolveJobConflict(local, server) {
  // Server-wins by default
  const resolved = { ...server };

  // Client-wins for ground truth fields
  if (local.checkInAt && (!server.checkInAt || local.checkInAt < server.checkInAt)) {
    resolved.checkInAt = local.checkInAt;
    resolved.checkInLocation = local.checkInLocation;
  }

  if (local.checkOutAt && (!server.checkOutAt || local.checkOutAt > server.checkOutAt)) {
    resolved.checkOutAt = local.checkOutAt;
    resolved.checkOutLocation = local.checkOutLocation;
  }

  return resolved;
}
```

**6. Background Location Tracking**

Implement location buffering with batch upload:

```javascript
// src/services/locationTracker.ts
import BackgroundGeolocation from 'react-native-background-geolocation';
import database from './database';
import offlineQueue from './offlineQueue';

export function startLocationTracking(jobId) {
  BackgroundGeolocation.onLocation(location => {
    // Buffer location in WatermelonDB
    database.write(async () => {
      await database.get('location_history').create(record => {
        record.jobId = jobId;
        record.latitude = location.coords.latitude;
        record.longitude = location.coords.longitude;
        record.accuracy = location.coords.accuracy;
        record.recordedAt = Date.now();
        record.synced = false;
      });
    });

    // Batch upload every 10 points
    checkLocationBatch(jobId);
  });

  BackgroundGeolocation.start();
}

async function checkLocationBatch(jobId) {
  const unsynced = await database
    .get('location_history')
    .query(Q.where('job_id', jobId), Q.where('synced', false))
    .fetch();

  if (unsynced.length >= 10) {
    offlineQueue.add({
      type: 'location_batch',
      priority: PRIORITIES.LOCATION_UPDATE,
      payload: {
        jobId,
        locations: unsynced.map(loc => ({
          lat: loc.latitude,
          lng: loc.longitude,
          accuracy: loc.accuracy,
          recordedAt: loc.recordedAt
        }))
      }
    });

    // Mark as synced
    await database.write(async () => {
      for (const loc of unsynced) {
        await loc.update(record => {
          record.synced = true;
        });
      }
    });
  }
}
```

**7. Storage Management**

Implement cache cleanup to prevent unbounded growth:

```javascript
// src/services/cacheManager.ts
const MAX_CACHE_SIZE_MB = 50;

export async function cleanupCache() {
  // Delete completed jobs older than 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  await database.write(async () => {
    const oldJobs = await database
      .get('jobs')
      .query(
        Q.where('status', 'completed'),
        Q.where('updated_at', Q.lt(thirtyDaysAgo))
      )
      .fetch();

    for (const job of oldJobs) {
      await job.markAsDeleted();
    }
  });

  // Delete synced location history older than 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  await database.write(async () => {
    const oldLocations = await database
      .get('location_history')
      .query(
        Q.where('synced', true),
        Q.where('recorded_at', Q.lt(sevenDaysAgo))
      )
      .fetch();

    for (const location of oldLocations) {
      await location.markAsDeleted();
    }
  });
}

// Run cleanup on app launch and daily
setInterval(cleanupCache, 24 * 60 * 60 * 1000);
```

### Backend Requirements (For Complete Solution)

**8. Sync API Endpoints**

Server must implement sync protocol:

```typescript
// Backend: src/sync/sync.controller.ts
@Controller('sync')
export class SyncController {
  @Post('pull')
  async pullChanges(@Body() body: { last_pulled_at: number, guard_id: string }) {
    // Return changes since last_pulled_at
    const changes = {
      jobs: await this.jobsService.getChangesSince(body.last_pulled_at, body.guard_id),
      guard_profile: await this.guardService.getProfileChanges(body.last_pulled_at, body.guard_id),
    };

    return {
      changes,
      timestamp: Date.now(),
    };
  }

  @Post('push')
  async pushChanges(@Body() body: { changes: any, guard_id: string }) {
    // Apply changes from client
    // Detect conflicts and resolve (server-wins default)

    const conflicts = [];

    for (const change of body.changes.jobs) {
      const serverJob = await this.jobsService.findById(change.id);

      if (serverJob.updatedAt > change.updatedAt) {
        // Server has newer data, conflict detected
        conflicts.push({
          type: 'job',
          id: change.id,
          resolution: 'server_wins'
        });
      } else {
        // Apply client change
        await this.jobsService.update(change.id, change);
      }
    }

    return { conflicts };
  }
}
```

### Testing Strategy

**9. Offline Scenario Testing**

Create comprehensive test suite:

```javascript
// __tests__/offline.test.ts
import offlineQueue from '../src/services/offlineQueue';
import NetInfo from '@react-native-community/netinfo';

describe('Offline Queue', () => {
  it('should queue panic button when offline', async () => {
    // Mock offline state
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await offlineQueue.add({
      type: 'panic_button',
      priority: 100,
      payload: { guardId: 'test-guard', jobId: 'test-job' }
    });

    expect(offlineQueue.queue.length).toBe(1);
    expect(offlineQueue.queue[0].type).toBe('panic_button');
  });

  it('should process queue when coming back online', async () => {
    // Add items to queue
    await offlineQueue.add({ type: 'check_in', priority: 80, payload: {} });
    await offlineQueue.add({ type: 'location_batch', priority: 50, payload: {} });

    // Mock online state
    NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    // Trigger network change
    await offlineQueue.processQueue();

    // Queue should be empty after successful processing
    expect(offlineQueue.queue.length).toBe(0);
  });

  it('should prioritize panic button over location updates', async () => {
    await offlineQueue.add({ type: 'location_batch', priority: 50, payload: {} });
    await offlineQueue.add({ type: 'panic_button', priority: 100, payload: {} });

    const sorted = offlineQueue.queue.sort((a, b) => b.priority - a.priority);

    expect(sorted[0].type).toBe('panic_button');
    expect(sorted[1].type).toBe('location_batch');
  });
});
```

### Monitoring and Analytics

**10. Track Offline Usage Metrics**

Instrument offline behavior for debugging:

```javascript
// src/services/analytics.ts
import analytics from '@react-native-firebase/analytics';

export function trackOfflineEvent(event: string, metadata: object) {
  analytics().logEvent('offline_' + event, {
    ...metadata,
    timestamp: Date.now(),
    network_type: netInfo.type,
  });
}

// Track key metrics
trackOfflineEvent('queue_item_added', { type: 'panic_button', queue_length: 5 });
trackOfflineEvent('sync_started', { items_pending: 5 });
trackOfflineEvent('sync_completed', { items_synced: 5, duration_ms: 1200 });
trackOfflineEvent('sync_failed', { error: 'network_timeout', retry_count: 3 });
```

This data helps identify:
- How often guards work offline
- Which features used most offline
- Sync failure rates and causes
- Average queue size and processing time

## Related Nodes

- **Spawned by:** Q-3 (Technical Architecture Research)
- **Informs:** D-9 (Mobile Offline Sync Decision - to be created)
- **Dependencies:** D-1 (Tech Stack: React Native + Expo), D-5 (Database: PostgreSQL + TypeORM)

## Success Criteria

This research successfully answers:

1. What offline-first pattern to use: WatermelonDB + Custom Queue (hybrid approach)
2. What data to cache: Active job, upcoming shifts (7 days), guard profile, location buffer (100 points)
3. How to handle conflicts: Server-wins default, client-wins for ground truth fields (check-in location/time)
4. How to queue offline actions: Priority-based command queue with retry logic and exponential backoff
5. What UI to show: Persistent offline banner, sync status badge, optimistic UI updates
6. What libraries to use: WatermelonDB (data), AsyncStorage (queue), NetInfo (connectivity), Redux (state)
7. Cache invalidation strategy: TTL for profile/shifts, event-based for job updates, conditional ETags

All research objectives have been met with specific, actionable recommendations ready for implementation.
