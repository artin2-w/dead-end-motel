const INCIDENTS = [
  'A guest complained about sounds inside an empty room.',
  'The parking lot camera went to static for 12 seconds.',
  'The ice machine activated by itself.',
  'A room key was found at the front desk with no assigned owner.',
  'A hallway light flickered three times and stopped.'
];

export function createIncidentLogLine() {
  return INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)];
}
