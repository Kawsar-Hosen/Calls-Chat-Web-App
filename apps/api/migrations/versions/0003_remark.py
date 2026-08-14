"""Friend remarks.

Adds per-user remark columns to the friendships table so each side of a
friendship can store a display alias for the other person.
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_remark"
down_revision = "0002_groups"
branch_labels = None
depends_on = None

def _columns(bind, table):
    return [c["name"] for c in sa.inspect(bind).get_columns(table)]

def upgrade():
    bind = op.get_bind()
    existing = _columns(bind, "friendships")
    if "low_remark" not in existing:
        op.add_column("friendships", sa.Column("low_remark", sa.String(80), nullable=True))
    if "high_remark" not in existing:
        op.add_column("friendships", sa.Column("high_remark", sa.String(80), nullable=True))

def downgrade():
    bind = op.get_bind()
    existing = _columns(bind, "friendships")
    if "high_remark" in existing:
        op.drop_column("friendships", "high_remark")
    if "low_remark" in existing:
        op.drop_column("friendships", "low_remark")
