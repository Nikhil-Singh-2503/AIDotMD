"""add_deleted_at

Revision ID: d49d331cad58
Revises: d07b7a07ded7
Create Date: 2026-03-28 12:41:37.151396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd49d331cad58'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sections', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('documents', 'deleted_at')
    op.drop_column('sections', 'deleted_at')
