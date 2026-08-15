"""Call offer kind.

Adds the kind column (audio/video) to call_offers so an incoming call
received via push or the pending-call fallback can be presented with the
correct media type (fixes video calls arriving as audio on the receiver).
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_call_offer_kind"
down_revision = "0005_call_offers"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("call_offers", sa.Column("kind", sa.String(8), nullable=False, server_default="audio"))

def downgrade():
    op.drop_column("call_offers", "kind")
