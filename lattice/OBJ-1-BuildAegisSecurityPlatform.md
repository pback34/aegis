---
node_type: Objective
status: Active
priority: Critical
created: 2025-11-09
updated: 2025-11-09
spawned_by: []
informs: []
tags:
  - marketplace
  - on-demand
  - security
  - mobile-platform
  - mvp
  - root-objective
---

# OBJ-1: Build Aegis On-Demand Security Platform

## Objective Statement

Build Aegis, an app-based platform that connects certified security professionals with individuals and businesses who need on-demand or scheduled security services. The platform will function as "Uber for Security" - providing immediate access to vetted security professionals through a mobile-first technology solution.

---

## Success Criteria

The objective is achieved when:

1. **Platform is operational** with functional customer and security professional mobile apps
2. **Core booking flow** works end-to-end (request → match → service → payment → review)
3. **Security professionals are vetted** through background checks and license verification
4. **Payment processing** is integrated and secure
5. **Real-time tracking and communication** enables customer-guard coordination
6. **Initial market launch** is complete with 50-100 active security professionals
7. **Legal compliance** is achieved for pilot market (licensing, insurance, regulations)

---

## Scope

### In Scope

**Customer Experience:**
- User registration and verification
- Service selection (guard types, duration, location)
- Real-time guard tracking (GPS)
- In-app messaging and emergency features
- Payment processing and receipts
- Rating and review system

**Security Professional Experience:**
- Professional profile management
- Availability scheduling
- Job acceptance/rejection interface
- Navigation to customer location
- Check-in/check-out system
- Incident reporting tools
- Earnings tracking

**Backend Platform:**
- Matching algorithm (location, skills, availability)
- Background check integration
- License verification system
- Payment processing and escrow
- Insurance management
- Communication systems (SMS, push notifications)
- Emergency response protocols

**Service Types (Phase 1):**
- Basic Security Guard (presence, access control, patrol)
- Event Security (crowd control, entry/exit management)
- Executive Protection (personal bodyguard, travel security)
- Specialized Services (K-9, armed security where legal, loss prevention)

### Out of Scope (For Initial Release)

- International markets (US-only initially)
- Custom enterprise security software integrations
- Proprietary security equipment manufacturing
- Long-term security contracts (focus on on-demand/short-term)
- Adjacent services (private investigation, cybersecurity consulting)

---

## Target Outcomes

### Customer Value
- **Immediate access** to vetted security professionals (< 30 minute response for on-demand)
- **Transparent pricing** with upfront cost estimates
- **Quality assurance** through ratings and professional vetting
- **Safety and reliability** through real-time tracking and emergency features

### Security Professional Value
- **Flexible work opportunities** with control over scheduling
- **Fair compensation** with transparent commission structure
- **Reduced administrative burden** through automated matching and payment
- **Professional growth** through ratings and performance tracking

### Business Value
- **Viable unit economics** (20-30% commission supports operations)
- **Scalable marketplace** with balanced supply and demand
- **Defensible competitive position** through technology and quality
- **Foundation for expansion** to additional markets and service types

---

## Key Constraints

### Legal & Regulatory
- Must comply with state-by-state security guard licensing requirements
- Requires comprehensive liability insurance coverage
- Must navigate independent contractor vs. employee classification
- Armed security services subject to additional regulations
- Background check processes must comply with FCRA

### Technical
- Mobile apps must work on iOS and Android
- Real-time GPS tracking requires consistent connectivity
- Must handle offline scenarios gracefully
- Payment processing must be PCI-DSS compliant
- Platform must scale to handle surge demand

### Business
- Initial launch limited to single pilot market
- Guard supply must reach critical mass before customer marketing
- Commission rate must balance competitiveness and profitability
- Insurance costs directly impact unit economics
- Customer trust depends on rigorous vetting process

### Operational
- 24/7 support required for emergency scenarios
- Replacement guard procedures needed for no-shows
- Incident management requires immediate response capability
- Quality control must maintain consistent service standards

---

## Open Questions

(These should become research Question nodes)

### Market & Product
- What is the total addressable market for on-demand security?
- What are current pain points with traditional security companies?
- What price points are customers willing to pay?
- What percentage of security guards would consider gig work?

### Legal & Regulatory
- Which states have most favorable regulatory environments for pilot?
- What are minimum insurance requirements by state?
- How do we handle armed vs. unarmed security legally?
- What are implications of AB5-style legislation on business model?

### Technical
- Build vs. buy decision for core platform components?
- Which third-party integrations are essential (payments, background checks)?
- How to handle offline/poor connectivity scenarios?
- What data must be collected for compliance and liability?

### Operational
- What is optimal guard-to-customer ratio by market?
- What background check services are most comprehensive and cost-effective?
- How much training can be delivered digitally vs. in-person?
- What is typical guard response time feasibility?

### Financial
- What commission rate is competitive yet profitable?
- What are average hourly rates for security guards by market?
- What are typical insurance costs per guard/per booking?
- What is expected customer acquisition cost by channel?

---

## Implementation Approach

### Phase 1: Foundation (Months 1-6)
- Legal entity formation and initial licensing
- MVP technology development (mobile apps + backend)
- Insurance procurement
- Initial guard recruitment (50-100)
- Beta testing program

### Phase 2: Launch (Months 6-12)
- Soft launch in single pilot market
- Customer feedback integration
- Operational refinement and support processes
- Marketing campaign launch
- Guard supply scaling (200-500)

### Phase 3: Growth (Year 2)
- Multi-market expansion
- Service line additions
- Corporate account development
- Technology enhancements
- Guard network expansion (1000+)

### Phase 4: Scale (Years 3-5)
- National expansion
- International opportunities exploration
- Adjacent service offerings
- M&A opportunities
- IPO preparation

---

## Risk Factors

### Critical Risks

1. **Liability for security incidents**
   - Guards acting in scope of service could create platform liability
   - Mitigation: Comprehensive insurance, clear contracts, thorough vetting

2. **Regulatory changes or enforcement**
   - State regulations could change or increase enforcement
   - Mitigation: Legal compliance team, industry relationships, flexible model

3. **Guard quality and reliability**
   - Poor guard performance damages brand and creates liability
   - Mitigation: Strict vetting, performance monitoring, backup coverage

4. **Technology security breaches**
   - Customer/guard data breach would be catastrophic
   - Mitigation: Security audits, encryption, incident response plans

5. **Market adoption challenges**
   - Customers may prefer traditional security companies
   - Mitigation: Superior service, competitive pricing, strong marketing

---

## Dependencies

### External Dependencies
- State security licensing boards (license verification)
- Insurance providers (liability coverage availability)
- Background check services (integration partners)
- Payment processors (Stripe, Square, or similar)
- Mobile platform providers (Apple App Store, Google Play)

### Internal Dependencies
- Legal counsel with security industry expertise
- Technology development team (mobile + backend)
- Operations team for 24/7 support
- Initial capital for insurance deposits and development
- Guard recruitment and onboarding capabilities

---

## Next Actions

To proceed with this objective, we need to:

1. **Generate research Questions** to explore open questions systematically
2. **Conduct market validation** to confirm demand and pricing assumptions
3. **Assess legal/regulatory landscape** to identify best pilot market
4. **Define MVP feature set** through technical research questions
5. **Develop financial model** to validate unit economics

---

## Reference Documentation

The original detailed planning document is available at:
- `product-dev/Objective.md` - Contains comprehensive details on all aspects
- `product-dev/Architecture.md` - Contains technical architecture planning

These documents contain valuable research and planning details that will inform future Questions, Decisions, and Artifacts.

---

## Metadata

**Stakeholders:** Product, Engineering, Legal, Operations
**Priority:** P0 (Foundational)
**Effort Estimate:** 6-12 months to MVP
**Tags:** #marketplace #on-demand #security #mobile-platform #mvp
