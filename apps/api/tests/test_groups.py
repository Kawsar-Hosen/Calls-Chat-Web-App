import pytest

from tests.test_auth_and_messaging import register


@pytest.mark.asyncio
async def test_group_lifecycle_members_and_applications(client):
    owner = await register(client, "gina")
    alice = await register(client, "helen")
    bob = await register(client, "ivan")
    stranger = await register(client, "judy")

    owner_headers = {"Authorization": f"Bearer {owner['access_token']}"}
    alice_headers = {"Authorization": f"Bearer {alice['access_token']}"}
    bob_headers = {"Authorization": f"Bearer {bob['access_token']}"}
    stranger_headers = {"Authorization": f"Bearer {stranger['access_token']}"}

    created = await client.post(
        "/api/v1/groups",
        headers=owner_headers,
        json={"name": "Design Team", "description": "Shared space", "member_ids": [alice["user"]["id"], bob["user"]["id"]]},
    )
    assert created.status_code == 201
    group = created.json()
    assert group["my_role"] == "owner"
    assert group["member_count"] == 3
    assert group["conversation_id"]

    conversation_id = group["conversation_id"]

    message = await client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        headers=owner_headers,
        json={"content": "welcome"},
    )
    assert message.status_code == 201
    listed = await client.get(
        f"/api/v1/conversations/{conversation_id}/messages", headers=alice_headers
    )
    assert listed.json()["items"][0]["content"] == "welcome"

    conversations = (await client.get("/api/v1/conversations", headers=alice_headers)).json()
    group_conv = next((item for item in conversations if item["id"] == conversation_id), None)
    assert group_conv is not None
    assert group_conv["kind"] == "group"
    assert group_conv["title"] == "Design Team"
    assert group_conv["group"]["member_count"] == 3

    outside = await client.get(
        f"/api/v1/conversations/{conversation_id}/messages", headers=stranger_headers
    )
    assert outside.status_code == 404

    promoted = await client.patch(
        f"/api/v1/groups/{group['id']}/members/{alice['user']['id']}/role",
        headers=owner_headers,
        json={"role": "admin"},
    )
    assert promoted.status_code == 200
    assert next(m for m in promoted.json()["members"] if m["user"]["id"] == alice["user"]["id"])["role"] == "admin"

    demoted = await client.patch(
        f"/api/v1/groups/{group['id']}/members/{alice['user']['id']}/role",
        headers=owner_headers,
        json={"role": "member"},
    )
    assert demoted.status_code == 200

    removed = await client.delete(
        f"/api/v1/groups/{group['id']}/members/{bob['user']['id']}", headers=owner_headers
    )
    assert removed.status_code == 200
    assert removed.json()["member_count"] == 2

    searched = (await client.get("/api/v1/groups/search?q=Design", headers=stranger_headers)).json()
    assert any(item["id"] == group["id"] for item in searched)

    application = await client.post(
        f"/api/v1/groups/{group['id']}/applications", headers=stranger_headers, json={}
    )
    assert application.status_code == 201
    assert application.json()["status"] == "pending"

    duplicate = await client.post(
        f"/api/v1/groups/{group['id']}/applications", headers=stranger_headers, json={}
    )
    assert duplicate.status_code == 409

    pending = (await client.get(
        f"/api/v1/groups/{group['id']}/applications", headers=owner_headers
    )).json()
    assert len(pending) == 1
    assert pending[0]["applicant"]["id"] == stranger["user"]["id"]

    accepted = await client.post(
        f"/api/v1/groups/{group['id']}/applications/{pending[0]['id']}/accept",
        headers=owner_headers,
    )
    assert accepted.status_code == 200
    joined = await client.get(f"/api/v1/groups/{group['id']}", headers=stranger_headers)
    assert joined.status_code == 200
    assert joined.json()["member_count"] == 3

    denied = await client.patch(
        f"/api/v1/groups/{group['id']}",
        headers=stranger_headers,
        json={"name": "Hijack"},
    )
    assert denied.status_code == 403

    left = await client.delete(
        f"/api/v1/groups/{group['id']}/members/{stranger['user']['id']}", headers=stranger_headers
    )
    assert left.status_code == 200

    deleted = await client.delete(f"/api/v1/groups/{group['id']}", headers=owner_headers)
    assert deleted.status_code == 204
    assert (await client.get(f"/api/v1/groups/{group['id']}", headers=owner_headers)).status_code == 404
