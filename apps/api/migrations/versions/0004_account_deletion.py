"""Account deletion.

Adds the account_deletions table so pending email-verified deletion codes
can be stored per user with an expiry.
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_account_deletion"
down_revision = "0003_remark"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    if "account_deletions" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "account_deletions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("code_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_account_deletions_user_id", "account_deletions", ["user_id"])
        op.create_index("ix_account_deletions_expires_at", "account_deletions", ["expires_at"])

def downgrade():
    op.drop_index("ix_account_deletions_expires_at", table_name="account_deletions")
    op.drop_index("ix_account_deletions_user_id", table_name="account_deletions")
    op.drop_table("account_deletions")
