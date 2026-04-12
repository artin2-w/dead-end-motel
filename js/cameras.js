const CAMERA_NAMES = ['Lobby', 'Parking Lot', 'Hallway', 'Laundry', 'Ice Machine', 'Rear Exit'];
const CAMERA_STATUSES = ['Clear', 'Static', 'Blocked', 'Movement Detected'];

export function createDefaultCameras() {
  return CAMERA_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    status: 'Clear'
  }));
}

export function scanCameras(cameras) {
  return cameras.map((camera) => ({
    ...camera,
    status: CAMERA_STATUSES[Math.floor(Math.random() * CAMERA_STATUSES.length)]
  }));
}
