"""add_section_parent_id

Revision ID: 1dcc365c751f
Revises: 90e7e3da4dd3
Create Date: 2026-03-23 16:55:04.732315

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1dcc365c751f'
down_revision: Union[str, None] = '90e7e3da4dd3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sections', sa.Column('parent_id', sa.String(), nullable=True))
    # SQLite does not support ALTER TABLE ADD CONSTRAINT;
    # the FK is declared in the ORM model only.


def downgrade() -> None:
    op.drop_column('sections', 'parent_id')
