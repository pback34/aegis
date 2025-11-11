# Aegis - Security Services Platform

> On-demand security guard platform connecting certified security professionals with customers in need of temporary security services.

## 📋 Project Overview

Aegis is an "Uber for Security" platform that enables:
- **Customers**: Request security services on-demand or schedule ahead
- **Guards**: Find flexible work opportunities with transparent pricing
- **Businesses**: Access vetted security professionals quickly

## 🏗️ Project Structure

```
aegis/
├── backend/              # NestJS backend API
│   ├── src/
│   │   ├── matching/    # Core matching algorithm
│   │   ├── location/    # Real-time location tracking
│   │   ├── booking/     # Booking lifecycle management
│   │   ├── notification/# Multi-channel notifications
│   │   ├── messaging/   # Real-time chat
│   │   └── rating/      # Rating & review system
│   ├── prisma/          # Database schema & migrations
│   └── test/            # Test files
├── mobile/              # React Native mobile apps
├── product-dev/         # Product documentation
├── docs/                # Technical documentation
└── docker-compose.yml   # Local development stack
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- Docker and Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd aegis
```

### 2. Start Infrastructure
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (with PostGIS) on port 5432
- Redis on port 6379

### 3. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

### 4. Initialize Database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run Backend
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`

## 📚 Documentation

- **[Objective](product-dev/Objective.md)**: Business objectives and market analysis
- **[Platform Architecture](product-dev/Platform%20Architecture.md)**: Technical architecture and stack
- **[MVP Implementation Plan](MVP_IMPLEMENTATION_PLAN.md)**: Phased development roadmap
- **[TODO](TODO.md)**: Current phase tasks and progress

## 🎯 Current Phase: Phase 3

**Status**: 🟡 In Progress

**Focus**: Core Services & Matching Logic
- Intelligent guard matching algorithm
- Real-time location tracking
- Notification & messaging services
- Booking lifecycle management
- Mobile app foundation

See [TODO.md](TODO.md) for detailed tasks.

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 20.x + TypeScript 5.x
- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 15 + PostGIS
- **Cache**: Redis 7.x
- **ORM**: Prisma 5.x
- **Real-time**: Socket.io

### Mobile
- **Framework**: React Native 0.72
- **State**: Redux Toolkit + React Query
- **Maps**: MapBox
- **UI**: React Native Paper

### Infrastructure
- **Cloud**: AWS (planned)
- **Container**: Docker + Kubernetes
- **CI/CD**: GitHub Actions

### Third-Party Services
- **Payments**: Stripe Connect
- **Maps**: MapBox
- **SMS**: Twilio
- **Email**: SendGrid
- **Push Notifications**: Firebase Cloud Messaging
- **Background Checks**: Checkr

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📦 Available Scripts

### Backend
```bash
npm run start        # Start production server
npm run start:dev    # Start with watch mode
npm run build        # Build for production
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm run test         # Run tests
```

### Database
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
npm run prisma:seed      # Seed database with sample data
```

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection protection (Prisma ORM)
- XSS protection
- Rate limiting on API endpoints
- CORS configuration
- Environment variable validation

## 🌟 Core Features (Phase 3)

### Matching Algorithm
- Geospatial indexing with H3 hexagonal grid
- Multi-criteria scoring (distance, rating, experience, price)
- Real-time availability checking
- Skill and certification matching

### Location Tracking
- Real-time guard location via WebSocket
- ETA calculation and updates
- Geofencing for arrival detection
- Location history storage

### Booking Lifecycle
- State machine for status transitions
- Automatic timeout handling
- Cancellation policies
- Event timeline tracking

### Notifications
- Push notifications (FCM)
- SMS via Twilio
- Email via SendGrid
- In-app notifications

### Messaging
- Real-time chat (Socket.io)
- Message persistence
- Read receipts
- File/image sharing
- Emergency flagging

## 📈 Performance Targets

- API Response Time: p95 < 200ms
- Match Finding: < 3 seconds
- WebSocket Latency: < 100ms
- Location Accuracy: < 50m
- Test Coverage: > 80%
- Uptime: > 99.9%

## 🤝 Contributing

This is currently a private project. For team members:

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Submit a pull request

### Commit Conventions
```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
test: Add/update tests
refactor: Code refactoring
perf: Performance improvements
chore: Build/tooling changes
```

## 📝 License

Proprietary - All rights reserved

## 👥 Team

For questions or support, contact the development team.

## 🗺️ Roadmap

- [x] **Phase 1**: Foundation & Infrastructure
- [x] **Phase 2**: Core APIs & Authentication
- [ ] **Phase 3**: Core Services & Matching Logic (Current)
- [ ] **Phase 4**: Advanced Features & Launch
- [ ] **Phase 5**: Scale & Expansion
- [ ] **Phase 6**: Ecosystem Development

---

**Last Updated**: November 11, 2025
**Version**: 0.1.0 (MVP Phase 3)
