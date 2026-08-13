import pytest

from app.emoji import get_manifest


@pytest.mark.asyncio
async def test_emoji_endpoint_validation(client):
    invalid_family = await client.get("/api/v1/emoji/unknown/any-slug.gif")
    assert invalid_family.status_code == 404
    invalid_slug = await client.get("/api/v1/emoji/fluent/does-not-exist.gif")
    assert invalid_slug.status_code == 404
    injection = await client.get("/api/v1/emoji/fluent/..%2F..%2Fetc.gif")
    assert injection.status_code == 404


def test_emoji_manifest_loads():
    manifest = get_manifest()
    assert "fluent" in manifest and "telegram" in manifest
    assert len(manifest["fluent"]) == 3051
    assert len(manifest["telegram"]) == 631
