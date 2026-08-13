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

def upgrade():
    op.add_column("friendships", sa.Column("low_remark", sa.String(80), nullable=True))
    op.add_column("friendships", sa.Column("high_remark", sa.String(80), nullable=True))

def downgrade():
    op.drop_column("friendships", "high_remark")
    op.drop_column("friendships", "low_remark")
