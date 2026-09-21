# Milestone 5 — Advanced Analytics Features

Milestone 5 delivers conversion tracking, user journey funnels, cohort retention, and data portability.

## Architectural Objectives Achieved

1. **Custom Events & Goal Conversion (`/goals`)**:
   - Event-based conversions tracked via `gravlytics.track(eventName, props)`.
   - Pageview-based conversions triggered when visitors land on specific URL patterns (e.g. `/pricing`, `/checkout/thank-you`).
   - Dedicated dashboard view computing conversion totals, completion rates, and comparative period trends.
   - Interactive modal to define and remove conversion goals.

2. **Funnel Analysis (`/funnels`)**:
   - Multi-step funnel visualization mapping visitor progression across milestones.
   - Computes:
     - Step-by-step conversion rates (percentage of users progressing from previous step).
     - Overall conversion rate from funnel entrance.
     - Drop-off analysis pinpointing high-friction steps.
   - Gradient progression bars with user counts and percentage indicators.

3. **Cohort Retention (`/retention`)**:
   - Visual cohort retention matrix tracking user return rates over weekly intervals (W0 through W6).
   - Dynamic heatmap shading corresponding to engagement intensity.
   - Benchmarking cards for Day 1, Day 7, and Day 30 stickiness.

4. **Data Export (`/`)**:
   - Immediate client-side CSV report generation via the dashboard Header.
   - Generates formatted analytical summaries for external reporting or spreadsheet ingestion.
