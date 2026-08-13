"""Group conversations.

Adds group, group_member, and group_application tables. The groups are backed
by the existing conversation/message machinery via a 1:1 conversation_id link.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_groups"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    from app.db import Base
    from app import models  # noqa: F401
    Base.metadata.create_all(op.get_bind())

def downgrade():
    op.drop_table("group_applications")
    op.drop_table("group_members")
    op.drop_table("groups")
