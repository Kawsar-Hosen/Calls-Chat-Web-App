"""Initial messaging schema.

This first migration intentionally creates the complete v0.1 metadata so a fresh
PostgreSQL or local SQLite database starts from the same relational contract.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    from app.db import Base
    from app import models  # noqa: F401
    Base.metadata.create_all(op.get_bind())

def downgrade():
    from app.db import Base
    from app import models  # noqa: F401
    Base.metadata.drop_all(op.get_bind())
