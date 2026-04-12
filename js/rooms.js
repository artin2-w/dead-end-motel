export function createDefaultRooms() {
  return Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    label: `Room ${index + 1}`,
    occupied: false,
    guestName: null,
    condition: 'Stable'
  }));
}

export function getAvailableRoom(rooms) {
  return rooms.find((room) => !room.occupied) || null;
}
