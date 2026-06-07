"""add mcp_key to users table

Revision ID: 907573ed2243
Revises: 1d2619c5d9f5
Create Date: 2026-06-06 18:26:35.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '907573ed2243'
down_revision: Union[str, None] = '1d2619c5d9f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mcp_key', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'mcp_key')
