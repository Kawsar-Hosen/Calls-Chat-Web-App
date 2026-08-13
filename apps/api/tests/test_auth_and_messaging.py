import pytest

async def register(client, username):
    response = await client.post("/api/v1/auth/register", json={"email": f"{username}@example.com", "username": username, "display_name": username.title(), "password": "password123"})
    assert response.status_code == 200
    return response.json()

@pytest.mark.asyncio
async def test_auth_friend_conversation_messages(client):
    first = await register(client, "alice")
    second = await register(client, "bob")
    headers = {"Authorization": f"Bearer {first['access_token']}"}
    request = await client.post("/api/v1/friends/requests", headers=headers, json={"user_id": second["user"]["id"]})
    assert request.status_code == 201
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}
    accepted = await client.post(f"/api/v1/friends/requests/{request.json()['id']}/accept", headers=second_headers)
    assert accepted.status_code == 200
    conversation = await client.post("/api/v1/conversations", headers=headers, json={"user_id": second["user"]["id"]})
    assert conversation.status_code == 200
    conversation_id = conversation.json()["id"]
    message = await client.post(f"/api/v1/conversations/{conversation_id}/messages", headers=headers, json={"content": "hello"})
    assert message.status_code == 201
    listed = await client.get(f"/api/v1/conversations/{conversation_id}/messages", headers=second_headers)
    assert listed.json()["items"][0]["content"] == "hello"
    search = await client.get("/api/v1/messages/search?q=hello", headers=second_headers)
    assert len(search.json()) == 1

    outsider = await register(client, "carol")
    denied = await client.get(
        f"/api/v1/conversations/{conversation_id}/messages",
        headers={"Authorization": f"Bearer {outsider['access_token']}"},
    )
    assert denied.status_code == 404

@pytest.mark.asyncio
async def test_refresh_rotation_and_logout(client):
    auth = await register(client, "dave")
    refreshed = await client.post("/api/v1/auth/refresh", json={"refresh_token": auth["refresh_token"]})
    assert refreshed.status_code == 200
    reused = await client.post("/api/v1/auth/refresh", json={"refresh_token": auth["refresh_token"]})
    assert reused.status_code == 401
    headers = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert (await client.post("/api/v1/auth/logout", headers=headers)).status_code == 204
    assert (await client.get("/api/v1/profile", headers=headers)).status_code == 401


@pytest.mark.asyncio
async def test_media_read_and_device_foundations(client):
    first = await register(client, "erin")
    second = await register(client, "frank")
    first_headers = {"Authorization": f"Bearer {first['access_token']}"}
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}
    friend_request = await client.post(
        "/api/v1/friends/requests", headers=first_headers, json={"user_id": second["user"]["id"]}
    )
    await client.post(f"/api/v1/friends/requests/{friend_request.json()['id']}/accept", headers=second_headers)
    conversation = await client.post(
        "/api/v1/conversations", headers=first_headers, json={"user_id": second["user"]["id"]}
    )
    upload = await client.post(
        "/api/v1/media/upload",
        headers=first_headers,
        files={"file": ("note.txt", b"XYTEEE attachment", "text/plain")},
    )
    assert upload.status_code == 201
    message = await client.post(
        f"/api/v1/conversations/{conversation.json()['id']}/messages",
        headers=first_headers,
        json={"content": "", "attachment_ids": [upload.json()["id"]]},
    )
    assert message.status_code == 201
    assert message.json()["attachments"][0]["name"] == "note.txt"
    assert (await client.post(
        f"/api/v1/conversations/{conversation.json()['id']}/read",
        headers=second_headers,
        json={"message_id": message.json()["id"]},
    )).status_code == 204
    assert (await client.post(
        "/api/v1/devices",
        headers=second_headers,
        json={"push_token": "ExponentPushToken[test-device-token]", "platform": "android"},
    )).status_code == 204
