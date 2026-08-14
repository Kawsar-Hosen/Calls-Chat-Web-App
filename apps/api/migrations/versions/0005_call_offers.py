"""Call offers.

Adds the call_offers table so pending WebRTC offers can be stored briefly
and picked up again (e.g. by a push notification that woke the app) when a
socket-delivered offer was missed while the recipient was offline.
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_call_offers"
down_revision = "0004_account_deletion"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    if "call_offers" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "call_offers",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("conversation_id", sa.String(36), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("caller_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("sdp", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("consumed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
        op.create_index("ix_call_offers_conversation_id", "call_offers", ["conversation_id"])
        op.create_index("ix_call_offers_caller_id", "call_offers", ["caller_id"])
        op.create_index("ix_call_offers_created_at", "call_offers", ["created_at"])

def downgrade():
    op.drop_index("ix_call_offers_created_at", table_name="call_offers")
    op.drop_index("ix_call_offers_caller_id", table_name="call_offers")
    op.drop_index("ix_call_offers_conversation_id", table_name="call_offers")
    op.drop_table("call_offers")
