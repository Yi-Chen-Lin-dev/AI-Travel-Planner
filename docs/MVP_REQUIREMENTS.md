# AI Travel Planner - MVP Requirements

## MVP Goal

The goal of the MVP is to allow a user to enter travel information and preferences,
receive personalized POI recommendations, and automatically generate an optimized
travel itinerary.

Target completion date: November 30, 2026.

## Core User Flow

Create Trip
→ Enter Travel Preferences
→ Generate Personalized POI Recommendations
→ Generate Itinerary
→ Optimize Route and Schedule
→ Display Itinerary and Map
→ Save / View Trip

## 1. Create Trip

### Input
- Destination
- Travel dates / number of travel days
- Budget
- Transportation
- Travel pace

### Definition of Done
- User can successfully create a trip.
- Invalid input is rejected.
- Trip information can be sent to the backend.

## 2. Travel Preferences

### Preferences
- Food
- Culture
- Shopping
- Nature
- Entertainment

### Definition of Done
- User can select one or more interests.
- Preferences can be stored.
- Preferences can be used by the recommendation system.

## 3. POI Data

### Required Data
- POI ID
- Name
- Category
- Latitude
- Longitude
- Rating
- Price level
- Opening hours
- Stay duration
- Tags

### Definition of Done
- POI data can be stored and retrieved.
- POI data can be used by the recommendation system.
- POI data can be used by the itinerary optimization system.

## 4. Personalized Recommendation

### Input
- User preferences
- Budget
- Available POIs

### Output
- Ranked POIs
- Recommendation score
- Recommendation reason

### Definition of Done
- Different user preferences can produce different POI rankings.
- Recommended POIs include a recommendation score.
- The system can provide a basic recommendation reason.

## 5. Itinerary Generation

### Output
- Day number
- POI
- Visit order
- Start time
- End time

### Definition of Done
- Recommended POIs can be converted into a multi-day itinerary.
- POIs are assigned to travel days.
- Each itinerary item has a visit order.

## 6. Route / Constraint Optimization

### Constraints
- Travel time
- Opening hours
- Stay duration
- Daily available time
- Number of travel days
- Transportation

### Definition of Done
- The generated itinerary respects basic travel constraints.
- POIs are arranged in a reasonable travel order.
- The itinerary does not contain obvious time conflicts.

## 7. Map Display

### Definition of Done
- POI locations can be shown on a map.
- The generated itinerary can be understood visually.
- The travel order between POIs can be displayed.

## 8. Save / View Trip

### Definition of Done
- A generated itinerary can be saved.
- Users can reopen a saved trip.
- Saved trip information can be retrieved from the backend.

## Overall MVP Definition of Done

The November MVP is complete when:

- [ ] Users can create a trip and enter travel preferences
- [ ] POI data can be stored and retrieved
- [ ] Personalized POI recommendations can be generated
- [ ] Recommended POIs can be converted into an itinerary
- [ ] The itinerary considers basic travel constraints
- [ ] The itinerary and POIs can be displayed on a map
- [ ] Generated trips can be saved and viewed
- [ ] Frontend, backend, recommendation, and optimization modules are integrated
- [ ] The complete user flow can run without critical errors
- [ ] The system is ready for a live demonstration

## Out of Scope for November MVP

The following features are not required for the November MVP:

- Dynamic replanning
- Weather-based replanning
- Feedback learning
- Group recommendation
- AI chatbot
- Flight booking
- Hotel booking
- Social features
- Multi-city planning

## Team Responsibilities

- Fah — UI/UX and Frontend
- Allen — Backend and Database
- William — Recommendation System and POI Data
- Yi-Chen — Itinerary, Optimization, System Integration and Coordination
