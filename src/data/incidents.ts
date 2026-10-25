// The incident catalogue, as the Rust engine has it (safe/docs/FEATURES.md §3, config/model-v1.toml).
export type Tier = 'context' | 'watch' | 'danger';
export type Family = 'fall' | 'gait' | 'phone' | 'location' | 'checkin' | 'audio' | 'device';

export interface Incident { name: string; tier: Tier; family: Family; opens: string; clears: string; }

export const FAMILY_LABEL: Record<Family, string> = {
    fall: 'Fall', gait: 'Walking', phone: 'Phone', location: 'Location', checkin: 'Check-in', audio: 'Sound', device: 'Device',
};

export const INCIDENTS: Incident[] = [
    { name: 'Possible fall', tier: 'watch', family: 'fall', opens: 'An impact above 3 g, a tilt, then little movement. Or a free fall and a hard landing.', clears: 'Steps resume' },
    { name: 'Down after fall', tier: 'danger', family: 'fall', opens: 'After a fall or hard impact: no steps and no touch for 15 s.', clears: 'Steps resume' },
    { name: 'Fall, recovered', tier: 'context', family: 'fall', opens: 'Walking again after a possible fall.', clears: 'A moment, kept in the log' },
    { name: 'Hard impact', tier: 'watch', family: 'fall', opens: 'A hit with a tilt that was neither a fall nor a dropped phone.', clears: 'Walking resumes' },
    { name: 'High-g impact', tier: 'watch', family: 'fall', opens: 'The first reading above 3 g, shown at once. Mid-walk, a bump is held 10 s and dropped if you keep walking.', clears: 'Reclassified ~2.4 s later' },
    { name: 'Unsteady walking', tier: 'watch', family: 'gait', opens: 'Regularity, sway or wobble outside your own normal range for 35 s of walking.', clears: '2 min of in-range walking' },
    { name: 'Slowed walking', tier: 'watch', family: 'gait', opens: 'Pace 20 % below your normal for a minute of walking.', clears: '30 s at your normal pace' },
    { name: 'Stumble', tier: 'context', family: 'gait', opens: 'One step far off rhythm with a sideways jolt, while walking continues.', clears: 'Pruned after 30 min' },
    { name: 'Repeated stumbles', tier: 'watch', family: 'gait', opens: 'Three stumbles within 5 min.', clears: '10 min without one' },
    { name: 'Grab', tier: 'danger', family: 'phone', opens: 'Phone in hand, a yank with a twist, then running away.', clears: 'The owner unlocks the phone' },
    { name: 'Phone drop', tier: 'watch', family: 'phone', opens: 'A long free fall, lands flat, dead still, not picked up within 60 s.', clears: 'Picked up' },
    { name: 'Phone left behind', tier: 'watch', family: 'phone', opens: 'Set down and untouched for 20 min while out late.', clears: 'Picked up or touched' },
    { name: 'Separated', tier: 'watch', family: 'location', opens: 'Over 150 m from every friend for 10 min, and not heading home.', clears: 'Back with someone' },
    { name: 'Stopped on the way home', tier: 'watch', family: 'location', opens: 'Was heading home, then stopped for 10 min somewhere that isn’t home.', clears: 'Moving again, or home' },
    { name: 'In a vehicle', tier: 'context', family: 'location', opens: 'The phone reports a vehicle.', clears: 'Out of the vehicle' },
    { name: 'Check-in missed', tier: 'danger', family: 'checkin', opens: '“You okay?” unanswered for 2 min.', clears: 'Answered' },
    { name: 'Check-in typing off', tier: 'watch', family: 'checkin', opens: 'The check-in was typed far off your normal rhythm.', clears: 'A normal check-in' },
    { name: 'Scream or shout', tier: 'watch', family: 'audio', opens: 'Two frames within 2 min of a fall or grab, in a venue that isn’t loud.', clears: '10 min' },
    { name: 'Snoring while down', tier: 'danger', family: 'audio', opens: 'Snoring while down after a fall, with a check-in missed.', clears: 'Answered, or steps resume' },
    { name: 'Battery critical', tier: 'context', family: 'device', opens: '10 % or less, not charging, while out late. Uploads a last encrypted location.', clears: 'Charging, or 15 %' },
    { name: 'Phone offline', tier: 'watch', family: 'device', opens: 'The server misses heartbeats for 10 min at night. Friends can start a fallback unlock.', clears: 'Heartbeat returns' },
];
