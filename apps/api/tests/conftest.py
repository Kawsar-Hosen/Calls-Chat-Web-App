import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.main import app

engine = create_async_engine(os.environ["DATABASE_URL"])
TestingSession = async_sessionmaker(engine, expire_on_commit=False)

@pytest.fixture(autouse=True)
async def database():
    async with engine.begin() as connection: await connection.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as connection: await connection.run_sync(Base.metadata.drop_all)

async def override_db():
    async with TestingSession() as session: yield session

app.dependency_overrides[get_db] = override_db

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as value: yield value
