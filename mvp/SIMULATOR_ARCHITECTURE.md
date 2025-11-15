# Aegis MVP - Simulator Architecture

**Document Version**: 1.0
**Created**: 2025-11-15
**Status**: Design Phase
**References**: TESTING_STRATEGY.md, MVP_IMPLEMENTATION_PLAN.md

---

## 1. Executive Summary

This document outlines the architecture for a multi-agent simulation system to test the Aegis MVP during development. The simulator will create realistic guard and customer behaviors, enabling comprehensive testing of real-time features, geocoding, matching algorithms, and payment flows without requiring manual intervention.

**Key Design Principle**: Build a traditional bot framework first (Phase 1), then layer AI agent intelligence on top (Phase 2). This ensures we have a working, deterministic testing foundation before adding adaptive AI behavior.

---

## 2. Problem Statement

### 2.1 Current Limitations

**Development Testing Gaps**:
- No way to test multi-user scenarios without manual browser juggling
- Geocoding implementation exists but isn't stress-tested
- Real-time location tracking requires actual GPS movement
- Guard matching algorithm untested with concurrent bookings
- Payment flows require manual test card entry
- Race conditions and edge cases difficult to reproduce

**Manual Testing Overhead**:
- Testing guard-customer interaction requires 2+ devices
- Location updates need physical movement or GPS spoofing
- Testing at scale (10+ concurrent users) is impossible manually
- Regression testing is time-consuming and error-prone

### 2.2 Desired Capabilities

1. **Automated Multi-User Simulation**: Spawn 10-100 virtual guards and customers
2. **Realistic Geographic Distribution**: Guards spread across city with simulated GPS movement
3. **Behavioral Scenarios**: Rush hour, quiet periods, emergency bookings, cancellations
4. **Real-Time Testing**: Validate Ably location updates with moving guards
5. **Load Testing**: Stress-test matching algorithm and payment processing
6. **Regression Testing**: Replay recorded scenarios to catch bugs

---

## 3. Architecture Overview

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SIMULATOR CONTROL CENTER                          │
│                     (Web Dashboard + CLI Interface)                      │
│                                                                           │
│  Features:                                                                │
│  - Start/Stop simulations                                                 │
│  - Configure scenarios (rush hour, quiet, chaos)                          │
│  - Real-time metrics dashboard                                            │
│  - Live map view of all agents                                            │
│  - Event log viewer                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
┌───────────────────▼──────────────┐   ┌────────────▼──────────────────┐
│     BOT ORCHESTRATOR              │   │   SCENARIO ENGINE             │
│                                   │   │                               │
│  - Spawns/manages bot instances   │   │  - Scenario definitions       │
│  - Coordinates timing             │   │  - Parameter configurations   │
│  - Collects metrics               │   │  - Event sequencing           │
│  - Handles cleanup                │   │  - Geographic data            │
└───────────────────┬──────────────┘   └───────────────────────────────┘
                    │
        ┌───────────┼───────────────────────────┐
        │           │                           │
┌───────▼─────┐ ┌──▼─────────┐ ┌──────────▼────────┐
│   Guard     │ │   Guard    │ │    Customer       │
│   Bot #1    │ │   Bot #2   │ │     Bot #1        │
│             │ │            │ │                   │
│  Phase 1:   │ │            │ │                   │
│  Scripted   │ │            │ │                   │
│  Behavior   │ │            │ │                   │
│             │ │            │ │                   │
│  Phase 2:   │ │            │ │                   │
│  AI Agent   │ │            │ │                   │
│  Decisions  │ │            │ │                   │
└─────┬───────┘ └──┬─────────┘ └──────────┬────────┘
      │            │                       │
      └────────────┴───────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              SIMULATOR SUPPORT SERVICES                  │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   GPS        │  │   Metrics     │  │   Event      │ │
│  │   Movement   │  │   Collector   │  │   Logger     │ │
│  │   Simulator  │  │               │  │              │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Address    │  │   Name        │  │   Payment    │ │
│  │   Generator  │  │   Generator   │  │   Mock       │ │
│  │              │  │               │  │              │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                AEGIS MVP BACKEND API                     │
│                                                          │
│  - Real authentication (JWT)                             │
│  - Real database (test DB)                               │
│  - Real Ably pub/sub                                     │
│  - Real Stripe test mode                                 │
│  - All business logic                                    │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Phase 1 vs Phase 2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PHASE 1                                  │
│              Traditional Bot Framework (Week 1)                  │
│                                                                   │
│  ┌────────────┐                                                  │
│  │   Bot      │                                                  │
│  │  Instance  │                                                  │
│  └─────┬──────┘                                                  │
│        │                                                          │
│        ▼                                                          │
│  ┌───────────────────────────────────┐                          │
│  │   Scripted Behavior Engine        │                          │
│  │                                   │                          │
│  │  - Predefined action sequences    │                          │
│  │  - Simple decision trees          │                          │
│  │  - Random variation (10-20%)      │                          │
│  │  - Time-based triggers            │                          │
│  └───────────────────────────────────┘                          │
│                                                                   │
│  Examples:                                                        │
│  - Guard: Login → Set Available → Accept First Job → Complete    │
│  - Customer: Login → Create Booking → Wait → Rate Guard          │
│  - Random delays: 5-15 seconds between actions                   │
└─────────────────────────────────────────────────────────────────┘

                            ▼ Upgrade ▼

┌─────────────────────────────────────────────────────────────────┐
│                         PHASE 2                                  │
│            AI-Powered Agent Framework (Week 2-3)                 │
│                                                                   │
│  ┌────────────┐                                                  │
│  │   Bot      │                                                  │
│  │  Instance  │                                                  │
│  └─────┬──────┘                                                  │
│        │                                                          │
│        ▼                                                          │
│  ┌───────────────────────────────────┐                          │
│  │   AI Agent Decision Layer         │                          │
│  │   (Claude API / Local LLM)        │                          │
│  │                                   │                          │
│  │  - Receives context (state, env)  │                          │
│  │  - Makes decisions via LLM        │                          │
│  │  - Personality-driven behavior    │                          │
│  │  - Learns from past actions       │                          │
│  └────────────┬──────────────────────┘                          │
│               │                                                   │
│               ▼                                                   │
│  ┌───────────────────────────────────┐                          │
│  │   Action Execution Engine         │                          │
│  │   (Same as Phase 1)               │                          │
│  │                                   │                          │
│  │  - Translates decisions → API     │                          │
│  │  - Handles retries/errors         │                          │
│  │  - Manages bot state              │                          │
│  └───────────────────────────────────┘                          │
│                                                                   │
│  Examples:                                                        │
│  - Guard AI: "I'm 5 miles away, pay is $20/hr, I'm busy"         │
│    → Decision: Reject job                                        │
│  - Customer AI: "Emergency need, willing to pay premium"          │
│    → Decision: Create urgent booking with high hourly rate       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Specifications

### 4.1 Bot Orchestrator

**Responsibilities**:
- Spawn and manage bot instances (guards and customers)
- Coordinate concurrent bot actions
- Manage bot lifecycle (start, pause, stop, cleanup)
- Collect metrics from all bots
- Handle bot failures and restarts

**API**:
```typescript
interface BotOrchestrator {
  // Bot management
  spawnGuard(config: GuardBotConfig): Promise<GuardBot>;
  spawnCustomer(config: CustomerBotConfig): Promise<CustomerBot>;
  stopBot(botId: string): Promise<void>;
  stopAll(): Promise<void>;

  // Scenario execution
  runScenario(scenario: Scenario): Promise<SimulationReport>;
  pauseSimulation(): void;
  resumeSimulation(): void;

  // Metrics
  getMetrics(): SimulationMetrics;
  getBotStatus(botId: string): BotStatus;
  getAllBots(): Bot[];
}
```

**Key Features**:
- Concurrent bot execution with rate limiting
- Graceful shutdown with cleanup
- Error isolation (one bot failure doesn't crash simulation)
- Resource management (connection pooling, memory limits)

### 4.2 Guard Bot

**Behaviors (Phase 1 - Scripted)**:
1. **Registration Flow**: Register → Verify email → Complete profile
2. **Availability Cycle**: Login → Set available → Browse jobs → Accept/Reject → Complete
3. **Location Updates**: Send GPS coordinates every 10 seconds during active jobs
4. **Job Completion**: Navigate to location → Mark arrived → Complete job

**Decision Parameters**:
```typescript
interface GuardBotConfig {
  // Identity
  email: string;
  fullName: string;
  phone: string;
  licenseNumber: string;

  // Behavior settings
  acceptanceRate: number;        // 0-1, probability of accepting jobs
  responseTimeMin: number;        // Minimum seconds to respond to job
  responseTimeMax: number;        // Maximum seconds to respond to job
  availabilityHours: [number, number];  // e.g., [8, 18] for 8am-6pm

  // Location
  startLocation: GeoLocation;
  movementSpeed: number;          // mph for GPS simulation

  // Phase 2 (AI)
  personality?: 'eager' | 'selective' | 'lazy' | 'professional';
  aiEnabled?: boolean;
}
```

**State Machine**:
```
OFFLINE → REGISTERING → IDLE → AVAILABLE → MATCHED
  → TRAVELING → ON_JOB → COMPLETING → AVAILABLE
```

### 4.3 Customer Bot

**Behaviors (Phase 1 - Scripted)**:
1. **Registration Flow**: Register → Verify email → Add payment method
2. **Booking Cycle**: Login → Create booking → Wait for match → Track guard → Rate
3. **Payment**: Authorize payment → Wait for completion → Payment captured

**Decision Parameters**:
```typescript
interface CustomerBotConfig {
  // Identity
  email: string;
  fullName: string;
  phone: string;

  // Booking patterns
  bookingFrequency: number;       // Bookings per hour
  preferredDuration: [number, number];  // e.g., [2, 8] hours
  maxDistance: number;            // Max miles from current location

  // Location
  location: GeoLocation;

  // Behavior
  cancellationRate: number;       // 0-1, probability of canceling

  // Phase 2 (AI)
  personality?: 'demanding' | 'flexible' | 'budget-conscious';
  aiEnabled?: boolean;
}
```

**State Machine**:
```
OFFLINE → REGISTERING → IDLE → CREATING_BOOKING → WAITING_MATCH
  → TRACKING_GUARD → RATING → IDLE
```

### 4.4 GPS Movement Simulator

**Purpose**: Simulate realistic guard movement along roads from point A to B.

**Features**:
- Path generation using OpenStreetMap routing
- Realistic speed variations (traffic, stops)
- GPS noise simulation (±5-10m accuracy)
- Route following with waypoints

**Implementation**:
```typescript
interface GPSSimulator {
  // Generate route from current location to destination
  generateRoute(from: GeoLocation, to: GeoLocation): Promise<Route>;

  // Get next position along route based on speed and time elapsed
  getNextPosition(
    currentPos: GeoLocation,
    route: Route,
    elapsedSeconds: number,
    speedMph: number
  ): GeoLocation;

  // Add realistic GPS noise
  addGPSNoise(position: GeoLocation): GeoLocation;
}

interface Route {
  waypoints: GeoLocation[];
  totalDistanceMiles: number;
  estimatedDurationMinutes: number;
}
```

**Data Source**:
- Use OpenRouteService API or OSRM for routing
- Fallback: Linear interpolation between points

### 4.5 Scenario Engine

**Purpose**: Define and execute test scenarios with configurable parameters.

**Scenario Types**:

1. **Smoke Test**:
   - 1 customer, 1 guard
   - Single booking flow end-to-end
   - Duration: 2 minutes

2. **Rush Hour**:
   - 20 customers, 10 guards
   - High booking frequency (5-10/min)
   - Duration: 30 minutes
   - Tests: Matching algorithm, concurrent bookings

3. **Quiet Period**:
   - 10 customers, 5 guards
   - Low booking frequency (1-2/min)
   - Duration: 1 hour
   - Tests: Idle state handling, timeouts

4. **Geographic Spread**:
   - 50 guards distributed across city
   - 100 customers in different neighborhoods
   - Tests: Distance-based matching, geocoding accuracy

5. **Chaos Mode**:
   - Random cancellations (20%)
   - Random guard unavailability
   - Network delays (simulated)
   - Tests: Error handling, race conditions

**Scenario Configuration**:
```typescript
interface Scenario {
  name: string;
  duration: number;              // Seconds
  guards: GuardBotConfig[];
  customers: CustomerBotConfig[];
  events: ScenarioEvent[];       // Timed events during simulation
  metrics: MetricTarget[];       // Expected outcomes
}

interface ScenarioEvent {
  timeOffset: number;            // Seconds from scenario start
  type: 'spawn_guard' | 'spawn_customer' | 'kill_bot' | 'network_delay';
  params: Record<string, any>;
}

interface MetricTarget {
  name: string;
  operator: '>=' | '<=' | '==' | 'between';
  value: number | [number, number];
}

// Example scenario
const rushHourScenario: Scenario = {
  name: 'Rush Hour Test',
  duration: 1800,  // 30 minutes
  guards: generateGuards(10, {
    startLocation: downtownCenter,
    radius: 5,  // 5 mile radius
    acceptanceRate: 0.8
  }),
  customers: generateCustomers(20, {
    location: downtownCenter,
    radius: 10,
    bookingFrequency: 0.5  // 1 booking every 2 minutes
  }),
  events: [
    { timeOffset: 600, type: 'spawn_guard', params: { count: 5 } },
    { timeOffset: 900, type: 'network_delay', params: { durationMs: 5000 } }
  ],
  metrics: [
    { name: 'bookings_created', operator: '>=', value: 150 },
    { name: 'avg_match_time_sec', operator: '<=', value: 30 },
    { name: 'match_success_rate', operator: '>=', value: 0.95 }
  ]
};
```

### 4.6 Control Center (Web Dashboard)

**Pages**:

1. **Simulation Control**:
   - Scenario selector dropdown
   - Start/Stop/Pause buttons
   - Real-time status indicator
   - Configuration editor

2. **Live Map**:
   - Mapbox GL showing all guards (green) and customers (blue)
   - Real-time position updates
   - Active job connections (lines between customer/guard)
   - Clickable markers for bot details

3. **Metrics Dashboard**:
   - Real-time graphs:
     - Bookings created over time
     - Active jobs
     - Guard utilization rate
     - Average match time
   - Summary statistics
   - Target vs actual metrics

4. **Event Log**:
   - Filterable event stream
   - Bot actions (login, accept job, complete)
   - System events (matching, payment)
   - Errors and warnings

5. **Bot Inspector**:
   - List of all active bots
   - Bot state details
   - Action history
   - Manual control (pause, resume, trigger action)

**Tech Stack**:
- Next.js (reuse existing frontend setup)
- React Query for data fetching
- Mapbox GL for map
- Recharts for metrics graphs
- WebSocket for real-time updates

### 4.7 AI Agent Decision Layer (Phase 2)

**Architecture**:
```typescript
interface AIAgent {
  // Core decision-making
  decide(context: AgentContext): Promise<AgentDecision>;

  // Personality and state
  personality: Personality;
  memory: AgentMemory;
}

interface AgentContext {
  // Current state
  botType: 'guard' | 'customer';
  currentState: BotState;

  // Environment
  availableJobs?: Job[];
  currentJob?: Job;
  balance?: number;

  // Personality traits
  personality: Personality;

  // History
  recentActions: Action[];
  recentDecisions: Decision[];
}

interface AgentDecision {
  action: 'accept_job' | 'reject_job' | 'create_booking' | 'cancel_booking'
          | 'set_available' | 'set_unavailable' | 'wait';
  reasoning: string;           // Why the agent made this decision
  confidence: number;          // 0-1
  params?: Record<string, any>;
}

interface Personality {
  // Guard personalities
  eagerness?: number;          // 0-1, how eager to accept jobs
  selectivity?: number;        // 0-1, how picky about job details
  efficiency?: number;         // 0-1, how quickly they complete jobs

  // Customer personalities
  patience?: number;           // 0-1, how long they'll wait
  priceConsciousness?: number; // 0-1, how much they care about price
  flexibility?: number;        // 0-1, how flexible with timing
}
```

**LLM Integration**:
```typescript
class ClaudeAIAgent implements AIAgent {
  async decide(context: AgentContext): Promise<AgentDecision> {
    const prompt = this.buildPrompt(context);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',  // Fast, cheap model
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseDecision(response.content[0].text);
  }

  private buildPrompt(context: AgentContext): string {
    return `You are a ${context.botType} in a security guard marketplace app.

Personality: ${JSON.stringify(context.personality, null, 2)}

Current State: ${context.currentState}

${context.availableJobs ? `Available Jobs:
${context.availableJobs.map(j =>
  `- Job ${j.id}: $${j.hourlyRate}/hr, ${j.distanceMiles} miles away, ${j.duration}hr duration`
).join('\n')}` : ''}

Recent Actions: ${context.recentActions.slice(-3).join(', ')}

What should you do next? Respond in JSON format:
{
  "action": "accept_job|reject_job|create_booking|wait",
  "reasoning": "brief explanation",
  "confidence": 0.0-1.0,
  "params": { "jobId": "..." }
}`;
  }
}
```

**Cost Optimization**:
- Use Haiku (cheapest model) for decisions
- Cache prompts to reduce tokens
- Batch decisions when possible
- Fallback to scripted behavior if API fails
- Rate limit: Max 100 decisions/minute

**Expected Costs**:
- 10 bots making 1 decision/minute for 1 hour: ~6,000 decisions
- Haiku: $0.25/million input tokens, $1.25/million output tokens
- Avg prompt: ~200 tokens, avg response: ~50 tokens
- Cost: ~$0.02/hour for 10 bots

---

## 5. Data Flow

### 5.1 Guard Bot Full Lifecycle

```
1. Orchestrator spawns GuardBot
   ↓
2. Bot registers via POST /auth/register
   ↓
3. Bot logs in via POST /auth/login
   → Receives JWT token
   ↓
4. Bot updates profile via PATCH /users/me
   → Sets hourly rate, license number
   ↓
5. Bot sets available via PATCH /users/me
   → isAvailable = true
   ↓
6. Bot polls for jobs via GET /jobs?status=requested
   ↓
7. [AI Decision or Script] Should I accept this job?
   ↓
8. Bot accepts job via POST /jobs/:id/accept
   ↓
9. GPS Simulator generates route to customer location
   ↓
10. Bot starts location tracking loop (every 10 seconds):
    → GET current GPS position from simulator
    → POST /jobs/:id/location { lat, lon }
    → Ably publishes to jobs:{id}:location channel
   ↓
11. Bot arrives at destination (distance < 50m)
    → POST /jobs/:id/arrive
   ↓
12. Bot marks job in progress
    → PATCH /jobs/:id { status: 'in_progress' }
   ↓
13. Wait for job duration (simulated or fast-forwarded)
   ↓
14. Bot completes job via POST /jobs/:id/complete
   ↓
15. Payment automatically captured by backend
   ↓
16. Bot sets available again
   ↓
17. Repeat from step 6
```

### 5.2 Customer Bot Full Lifecycle

```
1. Orchestrator spawns CustomerBot
   ↓
2. Bot registers via POST /auth/register
   ↓
3. Bot logs in via POST /auth/login
   ↓
4. [AI Decision or Script] Create booking
   ↓
5. Generate random service address near bot location
   ↓
6. Geocode address via frontend logic
   → Uses Nominatim API (same as real app)
   → Gets lat/lon
   ↓
7. Bot creates booking via POST /jobs
   {
     serviceAddress: "123 Main St",
     location: { latitude: 34.05, longitude: -118.24 },
     startDateTime: "2025-11-15T14:00:00Z",
     durationHours: 4
   }
   ↓
8. Backend matching service finds available guard
   → SimpleMatchingService.findBestGuard()
   ↓
9. Bot receives booking response with guardId
   ↓
10. Bot authorizes payment via POST /payments/authorize
    → Uses Stripe test card: 4242 4242 4242 4242
   ↓
11. Bot subscribes to Ably channel jobs:{id}:location
    ↓
12. Bot tracks guard location updates
    → Logs: "Guard is 2.3 miles away"
   ↓
13. Guard completes job
   ↓
14. Backend captures payment automatically
   ↓
15. [AI Decision or Script] Rate guard
    → POST /jobs/:id/rating { rating: 4-5, review: "..." }
   ↓
16. Wait for next booking cycle
   ↓
17. Repeat from step 4
```

---

## 6. Implementation Plan

### 6.1 Phase 1: Traditional Bot Framework (Week 1)

**Day 1-2: Core Infrastructure**
- [ ] Create simulator package structure
- [ ] Implement Bot base class
- [ ] Implement GuardBot with scripted behavior
- [ ] Implement CustomerBot with scripted behavior
- [ ] Create BotOrchestrator
- [ ] Add basic CLI interface

**Day 3-4: Supporting Services**
- [ ] Implement GPS Movement Simulator
- [ ] Create Address Generator (random addresses in city)
- [ ] Create Name Generator (realistic names)
- [ ] Add Metrics Collector
- [ ] Add Event Logger

**Day 5: Scenarios & Testing**
- [ ] Implement Scenario Engine
- [ ] Create 3 basic scenarios (smoke, rush hour, quiet)
- [ ] Test end-to-end with real backend
- [ ] Fix bugs, tune parameters

**Deliverables**:
- CLI tool: `npm run simulator -- --scenario rush-hour`
- Working bots that can complete full booking lifecycle
- Metrics output (JSON report)

### 6.2 Phase 2: AI Agent Layer (Week 2)

**Day 1-2: AI Integration**
- [ ] Implement AIAgent interface
- [ ] Create ClaudeAIAgent with API integration
- [ ] Design prompt templates for guards and customers
- [ ] Add personality configurations
- [ ] Test AI decision-making with 1-2 bots

**Day 3-4: Advanced Behaviors**
- [ ] Implement agent memory (context from past actions)
- [ ] Add personality-driven decision variations
- [ ] Create "learning" behaviors (agents improve over time)
- [ ] Add fallback to scripted behavior on API failure

**Day 5: Chaos & Edge Cases**
- [ ] Implement chaos scenario (random failures)
- [ ] Test AI response to edge cases
- [ ] Add AI decision logging for debugging
- [ ] Performance tuning

**Deliverables**:
- AI-powered bots with realistic behavior
- Configurable personalities
- Cost tracking for LLM API usage

### 6.3 Phase 3: Web Dashboard (Week 3)

**Day 1-2: Dashboard Setup**
- [ ] Create Next.js app in `mvp/packages/simulator-ui`
- [ ] Set up WebSocket server for real-time updates
- [ ] Implement Simulation Control page
- [ ] Add scenario configuration UI

**Day 3-4: Visualization**
- [ ] Implement Live Map with Mapbox GL
- [ ] Add bot markers (guards/customers)
- [ ] Show active job connections
- [ ] Real-time position updates

**Day 5: Metrics & Polish**
- [ ] Create Metrics Dashboard with graphs
- [ ] Add Event Log viewer
- [ ] Implement Bot Inspector
- [ ] Polish UI/UX

**Deliverables**:
- Full-featured web dashboard
- Real-time visualization
- User-friendly scenario configuration

---

## 7. Technology Stack

### 7.1 Simulator Backend

```typescript
// mvp/packages/simulator/

// Core
- TypeScript
- Node.js 20+
- Commander.js (CLI)
- Zod (validation)

// API Client
- Axios (HTTP requests)
- Ably SDK (real-time subscriptions)
- Stripe SDK (payment mocking)

// GPS & Routing
- OpenRouteService or OSRM
- Turf.js (geospatial calculations)

// AI (Phase 2)
- Anthropic SDK (Claude API)
- OpenAI SDK (GPT-4 alternative)

// Utilities
- Faker.js (fake data generation)
- Winston (logging)
- Prometheus client (metrics)
```

### 7.2 Simulator Dashboard

```typescript
// mvp/packages/simulator-ui/

// Frontend
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS

// Visualization
- Mapbox GL JS (maps)
- Recharts (metrics graphs)
- React Table (data tables)

// Real-time
- Socket.io client
- React Query

// State
- Zustand
```

---

## 8. Metrics & Observability

### 8.1 Key Metrics

**Simulation Metrics**:
- Total bots spawned
- Active bots
- Total bookings created
- Successful matches
- Failed matches
- Average match time
- Average guard response time
- Payment success rate
- Error rate by type

**Performance Metrics**:
- API latency (p50, p95, p99)
- Ably message delivery time
- GPS update frequency
- Bot action throughput (actions/sec)

**Cost Metrics** (Phase 2):
- LLM API calls
- Total tokens consumed
- Cost per simulation
- Cost per bot per hour

### 8.2 Logging

**Event Types**:
```typescript
enum EventType {
  // Bot lifecycle
  BOT_SPAWNED = 'bot.spawned',
  BOT_STOPPED = 'bot.stopped',
  BOT_ERROR = 'bot.error',

  // Bot actions
  BOT_LOGIN = 'bot.login',
  BOT_REGISTER = 'bot.register',
  GUARD_AVAILABLE = 'guard.available',
  GUARD_JOB_ACCEPTED = 'guard.job_accepted',
  GUARD_JOB_REJECTED = 'guard.job_rejected',
  GUARD_LOCATION_UPDATE = 'guard.location_update',
  CUSTOMER_BOOKING_CREATED = 'customer.booking_created',
  CUSTOMER_BOOKING_CANCELLED = 'customer.booking_cancelled',

  // System events
  MATCHING_STARTED = 'matching.started',
  MATCHING_SUCCESS = 'matching.success',
  MATCHING_FAILED = 'matching.failed',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_CAPTURED = 'payment.captured',

  // AI events (Phase 2)
  AI_DECISION = 'ai.decision',
  AI_ERROR = 'ai.error',
}

interface SimulatorEvent {
  timestamp: Date;
  type: EventType;
  botId?: string;
  botType?: 'guard' | 'customer';
  message: string;
  metadata?: Record<string, any>;
  level: 'info' | 'warn' | 'error';
}
```

**Example Log Output**:
```
[2025-11-15T10:30:15Z] [INFO] bot.spawned | Guard Bot #1 spawned at (34.05, -118.24)
[2025-11-15T10:30:16Z] [INFO] bot.register | Guard Bot #1 registered as john.doe@example.com
[2025-11-15T10:30:17Z] [INFO] bot.login | Guard Bot #1 logged in successfully
[2025-11-15T10:30:18Z] [INFO] guard.available | Guard Bot #1 set availability to true
[2025-11-15T10:30:25Z] [INFO] customer.booking_created | Customer Bot #1 created booking #abc123
[2025-11-15T10:30:26Z] [INFO] matching.started | Matching booking #abc123 to available guards
[2025-11-15T10:30:26Z] [INFO] matching.success | Booking #abc123 matched to Guard Bot #1
[2025-11-15T10:30:30Z] [INFO] guard.job_accepted | Guard Bot #1 accepted booking #abc123
[2025-11-15T10:30:31Z] [INFO] payment.authorized | Payment authorized for booking #abc123
[2025-11-15T10:30:35Z] [INFO] guard.location_update | Guard Bot #1 at (34.06, -118.23), 1.2mi away
```

---

## 9. Configuration

### 9.1 Simulator Configuration File

```typescript
// simulator.config.ts

export const config = {
  // Backend API
  apiBaseUrl: process.env.API_URL || 'http://localhost:3000',

  // Geographic bounds (Los Angeles area)
  geoBounds: {
    north: 34.3373,
    south: 33.7037,
    east: -118.1553,
    west: -118.6682,
  },

  // Bot defaults
  defaults: {
    guard: {
      hourlyRate: { min: 15, max: 35 },
      acceptanceRate: 0.7,
      responseTime: { min: 5, max: 30 },
      movementSpeed: 30, // mph
    },
    customer: {
      bookingFrequency: 0.1, // per minute
      duration: { min: 2, max: 8 },
      cancellationRate: 0.05,
    },
  },

  // GPS simulation
  gps: {
    updateInterval: 10000, // ms
    accuracy: 10, // meters
    routingService: 'openrouteservice',
    apiKey: process.env.ORS_API_KEY,
  },

  // AI configuration (Phase 2)
  ai: {
    enabled: false,
    provider: 'anthropic', // 'anthropic' | 'openai'
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 200,
    temperature: 0.7,
    apiKey: process.env.ANTHROPIC_API_KEY,
    fallbackToScripted: true,
  },

  // Metrics
  metrics: {
    enabled: true,
    prometheusPort: 9090,
  },

  // Logging
  logging: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    format: 'json', // 'json' | 'pretty'
    destination: './logs/simulator.log',
  },
};
```

---

## 10. Testing Strategy

### 10.1 Simulator Self-Testing

The simulator itself needs testing to ensure reliability:

**Unit Tests**:
- GPS movement calculations
- Route generation
- Decision tree logic
- Scenario configuration parsing

**Integration Tests**:
- Bot can register and login
- Bot can create/accept bookings
- Bot can update location
- Payment flow completes

**Validation Tests**:
- Ensure bots don't cause data corruption
- Verify cleanup after simulation
- Check for memory leaks with long-running simulations

### 10.2 Regression Testing

Use simulator to catch regressions in main app:

1. **Baseline Recording**: Run scenario on known-good version, record metrics
2. **Comparison**: Run same scenario on new version, compare metrics
3. **Alert**: If metrics deviate >10%, flag for investigation

**Example**:
```bash
# Record baseline
npm run simulator -- --scenario rush-hour --record-baseline

# Compare after changes
npm run simulator -- --scenario rush-hour --compare-baseline
# Output: ❌ REGRESSION: avg_match_time increased from 12s to 45s
```

---

## 11. Deployment

### 11.1 Local Development

```bash
# Terminal 1: Start backend
cd mvp/packages/backend
npm run start:dev

# Terminal 2: Start simulator
cd mvp/packages/simulator
npm run dev -- --scenario smoke-test

# Terminal 3: Start dashboard (Phase 3)
cd mvp/packages/simulator-ui
npm run dev
```

### 11.2 CI/CD Integration

Run simulator in CI pipeline:

```yaml
# .github/workflows/simulator-test.yml
name: Simulator Tests

on: [pull_request]

jobs:
  simulator-smoke-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.3
    steps:
      - uses: actions/checkout@v3
      - name: Start Backend
        run: cd mvp/packages/backend && npm run start:dev &
      - name: Wait for Backend
        run: npx wait-on http://localhost:3000/health
      - name: Run Smoke Test
        run: cd mvp/packages/simulator && npm run test:smoke
      - name: Check Metrics
        run: |
          if [ $(jq '.match_success_rate' report.json) -lt 0.95 ]; then
            echo "❌ Smoke test failed: match success rate too low"
            exit 1
          fi
```

---

## 12. Future Enhancements

### 12.1 Phase 4: Advanced Features

**Recorded Scenarios**:
- Record real user sessions from production
- Replay them with bots to test changes
- "Time travel" debugging

**Multi-Region Simulation**:
- Simulate users in different cities simultaneously
- Test geographic load balancing
- Validate timezone handling

**Failure Injection**:
- Simulate Stripe API failures
- Simulate Ably disconnections
- Simulate database slow queries

**Machine Learning**:
- Train bots on real user behavior patterns
- Predict system bottlenecks before they happen
- Optimize matching algorithm with RL

### 12.2 Phase 5: Production Monitoring

**Synthetic Monitoring**:
- Deploy bots to production (test accounts only)
- Run smoke tests every 5 minutes
- Alert on failures

**Shadow Testing**:
- Mirror production traffic to staging with bots
- Validate new features before release
- Compare old vs new system behavior

---

## 13. Success Criteria

### 13.1 Phase 1 Success Criteria

- [ ] Simulator can spawn 10 guards and 10 customers concurrently
- [ ] Bots complete full booking lifecycle without errors
- [ ] GPS simulation produces realistic movement patterns
- [ ] Rush hour scenario completes with >95% match success rate
- [ ] Metrics are accurate and comprehensive
- [ ] Simulator runs for 1+ hour without crashing

### 13.2 Phase 2 Success Criteria

- [ ] AI agents make contextually appropriate decisions
- [ ] Different personalities produce observably different behaviors
- [ ] AI decision latency <2 seconds
- [ ] Simulation cost <$1/hour for 20 bots
- [ ] Fallback to scripted behavior works when API unavailable

### 13.3 Phase 3 Success Criteria

- [ ] Dashboard updates in real-time (<1s latency)
- [ ] Map shows all bots accurately
- [ ] Metrics graphs are clear and useful
- [ ] Scenario configuration UI is intuitive
- [ ] Can run simulation entirely from dashboard

---

## 14. References

- **TESTING_STRATEGY.md**: Overall testing approach for Aegis MVP
- **MVP_IMPLEMENTATION_PLAN.md**: Current implementation status
- **Backend API**: `/mvp/packages/backend/src/presentation/controllers/`
- **Frontend Components**: `/mvp/packages/frontend/src/components/`
- **Real-Time Implementation**: `/mvp/packages/backend/src/infrastructure/realtime/`

---

**Document Status**: Design Complete - Ready for Implementation
**Next Steps**: Begin Phase 1 implementation
**Estimated Timeline**: 3 weeks for full implementation (all phases)
**Primary Contact**: Development Team
