# Calendar App Tab Synchronization

All three tabs (Home, Calendar, Social) now work in perfect unison as a cohesive calendar application.

## ✅ Completed Features

### 1. **Unified Event Store**
- All tabs now read from the same Zustand global store (`useAppStore`)
- Events are automatically synced across Home, Calendar, and Social tabs
- Changes in one tab instantly reflect in all others
- Single source of truth for all calendar data

### 2. **Social → Calendar Integration**
When you interact with social invites, they automatically sync to your calendar:

#### Social Invites (RSVPing "Yes")
- When you RSVP "yes" to a social invite, it automatically adds to your calendar as a "meetup" event
- Includes organizer and group info in the event notes
- Prevents duplicates - won't add if the same event already exists

#### Calendar Events (Accepting)
- When you accept a calendar event from social tab, it automatically adds to your main calendar
- Smart type detection based on title keywords:
  - "study" or "homework" → Study event
  - "meet", "coffee", or "hangout" → Meetup event
  - Default → Class event
- Includes creator and group info in notes

### 3. **Conflict Detection System**
Advanced conflict detection across all tabs:

#### Home Tab
- Red warning banner at top when conflicts detected today
- Shows number of conflicts with visual warning
- Individual conflicting events highlighted with red borders
- Conflict details shown in event groups

#### Calendar Tab
- Conflict warning banner when viewing a day with conflicts
- Conflicting events highlighted with red border and red background
- Visual indicators make overlapping events immediately obvious

#### How It Works
- Compares event start/end times to detect overlaps
- Works per-day or across entire calendar
- Efficient algorithm sorts by time and checks adjacent events

### 4. **Smart Badge Indicators**
Visual notifications for pending items:

#### Home Tab Social Section
- Red badge on "Social" header shows total pending count
- Individual badges on Social (invites) and Calendar (events) buttons
- Red highlighted borders when items pending
- Emoji indicators: ✅ when caught up, ⏳ when pending

#### Counts Update in Real-Time
- Pending social invites (no RSVP yet)
- Pending calendar events (not accepted/declined yet)
- Total count badge for quick overview

### 5. **Seamless Navigation with Date Context**
- **Click day cards in Home "Your Week"** → Navigate to Calendar tab with that specific date selected
- **Example**: Tap "Tap to view →" on Jan 7th card → Calendar opens showing Jan 7th
- **Click "Open" on Social card** → Navigate to Social tab
- All navigation preserves app state
- Calendar auto-focuses on passed date or today when switching tabs
- Date parameter persists across navigation

### 6. **Event Count Synchronization**
All stats pull from the same source:

#### Home Tab
- "Your Week" cards show accurate event counts
- Today/This Week/Next Week stats update live
- Quick Stats Banner reflects real-time data

#### Calendar Tab
- Event dots on calendar grid sync with actual events
- Light/Busy/Packed indicators based on real counts
- List view shows all events from store

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Zustand Store                         │
│  - events[] (unified calendar events)                   │
│  - groupInvites[] (social invites from groups)          │
│  - friendInvites[] (social invites from friends)        │
│  - groupCalendarEvents[] (calendar invites from groups) │
│  - friendCalendarEvents[] (calendar invites)            │
└─────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Home Tab   │ │Calendar Tab │ │ Social Tab  │
    │             │ │             │ │             │
    │ • Reads     │ │ • Reads     │ │ • Reads     │
    │   events    │ │   events    │ │   invites   │
    │ • Shows     │ │ • Shows     │ │ • Updates   │
    │   conflicts │ │   conflicts │ │   RSVPs     │
    │ • Displays  │ │ • Displays  │ │             │
    │   counts    │ │   grid      │ │ → Adds to   │
    │             │ │             │ │   events[]  │
    └─────────────┘ └─────────────┘ └─────────────┘
```

## 🎨 Visual Enhancements

### Conflict Warnings
- **Color**: Red (#ef4444, #dc2626, #b91c1c)
- **Icons**: ⚠️ warning emoji
- **Borders**: 2px red borders on conflicting events
- **Backgrounds**: Light red (#fef2f2, #fef2f2) for visibility

### Badge Indicators
- **Color**: Red (#ef4444) badges with white text
- **Position**: Next to section titles and on buttons
- **Style**: Rounded pill shape, minimum width for single digits

### Status Indicators
- ✅ All caught up (green theme)
- ⏳ Pending action (amber/red theme)
- 📅 Event counts on week cards

## 🧪 Testing Scenarios

### Scenario 1: Accept Social Invite
1. Open Social tab
2. RSVP "yes" to a social invite
3. Switch to Calendar tab → Event appears on calendar
4. Switch to Home tab → Event shows in "Your Week" and upcoming lists

### Scenario 2: Accept Calendar Event
1. Open Social tab, go to Calendar section
2. Accept a calendar event
3. Switch to Calendar tab → Event appears with smart type detection
4. Switch to Home tab → Counts and stats update

### Scenario 3: Create Overlapping Event
1. Open Home or Calendar tab
2. Create event that overlaps with existing event
3. Conflict warning appears immediately
4. Both tabs show conflict indicators
5. Conflicting events highlighted in red

### Scenario 4: Badge Updates
1. Check Home tab Social section
2. See badge count on header
3. Open Social tab and respond to invites
4. Return to Home → Badges decrease/disappear
5. Message changes to "All caught up!"

### Scenario 5: Date Navigation from Week View
1. Open Home tab
2. Scroll to "Your Week" section
3. Tap "Tap to view →" on any day card (e.g., Jan 7th)
4. Calendar tab opens with Jan 7th selected
5. Calendar shows events for that specific day
6. Month view automatically scrolls to correct month

## 📁 Files Modified

### Store ([lib/store.ts](lib/store.ts))
- Added `getConflicts()` function for overlap detection
- Modified `updateInviteRSVP()` to auto-add accepted invites to calendar
- Modified `updateCalendarEvent()` to auto-add accepted events to calendar
- Exported `EventConflict` type for UI components

### Home Tab ([app/(tabs)/index.tsx](app/(tabs)/index.tsx))
- Removed local state, now uses `useAppStore`
- Added conflict detection and warning banner
- Enhanced Social section with badge indicators
- Updated event handlers to use store functions
- Removed duplicate type definitions
- Added date-aware navigation to Calendar tab (passes specific date as param)

### Calendar Tab ([app/(tabs)/calendar.tsx](app/(tabs)/calendar.tsx))
- Added conflict detection for selected date
- Added conflict warning banner
- Highlighted conflicting events with red styling
- Already using `useAppStore` (no changes needed here)
- **Added URL parameter support for `selectedDate`**
- Auto-selects date from navigation params when passed from Home tab
- Updates month view to show correct month for navigated date

### Social Tab ([app/(tabs)/social.tsx](app/(tabs)/social.tsx))
- Already using `useAppStore` for invites/events
- Auto-sync to calendar already implemented in store

## 🚀 Future Enhancements

Possible additions:
- Push notifications for upcoming conflicts
- Conflict resolution suggestions (reschedule options)
- Color-coded event types across all tabs
- Drag-and-drop event rescheduling
- Calendar event editing from Home tab
- Batch RSVP for multiple invites
- Export calendar to external apps
