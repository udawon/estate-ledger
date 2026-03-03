# Location Scoring Engine v2.0 (Developer Full Version)

주거용 부동산 입지 분석 엔진 - 개발자 상세 구현 명세서

------------------------------------------------------------------------

## 1. System Architecture

### 1.1 Core Modules

-   Input Validator
-   Feature Normalizer
-   Scoring Engine
-   Penalty Engine
-   Relative Scoring Engine (Optional)
-   Report Generator

### 1.2 Score Formula

sub_score = Σ(feature_score × subweight)\
category_score = category_weight × sub_score\
total_score = Σ(category_score)\
final_score = clamp(total_score + penalty_score, 0, 100)

Penalty floor: -30

------------------------------------------------------------------------

## 2. Category Structure (Residential)

### A. Transport (20)

-   station_walk_time
-   line_count
-   job_center_commute_min
-   bus_grade
-   car_access_grade

### B. Job & Demand (15)

-   employment_hubs_30min
-   income_grade
-   rental_turnover
-   university_hospital_access

### C. Living Infrastructure (15)

-   mart_walk
-   hospital_walk
-   park_walk
-   noise_from_commercial

### D. Education (15)

-   elementary_walk
-   school_safety
-   academy_access
-   district_preference

### E. Environment Risk (15)

-   road_noise
-   rail_air_noise
-   odor
-   flood_risk
-   sunlight
-   view

### F. Future Value (10)

-   transit_project_stage
-   redevelopment_stage
-   3y_supply_pressure

### G. Product & Supply (10)

-   complex_scale
-   parking_ratio
-   management
-   new_build_competition
-   layout_quality

------------------------------------------------------------------------

## 3. Scoring Bands

### Walk Time Bands

0-5min: 1.00\
6-10min: 0.85\
11-15min: 0.60\
16-20min: 0.35\
20min+: 0.15

### Commute Time Bands

≤30min: 1.00\
≤40min: 0.80\
≤50min: 0.55\
≤60min: 0.35\
60min+: 0.15

------------------------------------------------------------------------

## 4. Red Flag Penalty Rules

  Condition               Penalty
  ----------------------- ---------
  Severe flood risk       -15
  Severe rail/air noise   -10
  Chronic odor exposure   -8
  Massive supply in 3y    -10

Penalty cumulative, max -30.

------------------------------------------------------------------------

## 5. Missing Data Policy

Default Strategy: Conservative\
Fallback normalized score: 0.35\
All missing inputs logged in report.

------------------------------------------------------------------------

## 6. Relative Scoring (Optional)

Peer Definition: - Radius: 2km - Build year band ±7 years - Price band
±15%

Blend: - Absolute 70% - Relative 30%

------------------------------------------------------------------------

## 7. Report Output Schema

{ "total_score": number, "penalty_score": number, "final_score": number,
"category_scores": {...}, "top_strengths": \[...\], "top_risks":
\[...\], "data_quality": "HIGH\|MEDIUM\|LOW" }

------------------------------------------------------------------------

This version is intended for backend integration and automated scoring
pipeline deployment.
