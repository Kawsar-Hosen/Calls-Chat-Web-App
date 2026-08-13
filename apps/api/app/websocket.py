from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> bool:
        self.connections[user_id].discard(websocket)
        if not self.connections[user_id]:
            self.connections.pop(user_id, None)
            return True
        return False

    async def send_user(self, user_id: str, event: dict) -> None:
        stale = []
        for socket in self.connections.get(user_id, set()).copy():
            try:
                await socket.send_json(event)
            except Exception:
                stale.append(socket)
        for socket in stale:
            self.disconnect(user_id, socket)

    async def send_users(self, user_ids: list[str], event: dict, exclude: str | None = None) -> None:
        for user_id in user_ids:
            if user_id != exclude:
                await self.send_user(user_id, event)


manager = ConnectionManager()
