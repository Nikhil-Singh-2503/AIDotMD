"""add_document_is_published

Revision ID: a1b2c3d4e5f6
Revises: 1dcc365c751f
Create Date: 2026-03-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '1dcc365c751f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'documents',
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='1')
    )
    # SQLite does not support ALTER TABLE ADD CONSTRAINT;
    # server_default='1' sets all existing rows to published (True).


def downgrade() -> None:
    op.drop_column('documents', 'is_published')
