"""add doc_permissions table

Revision ID: 28ab1a41923b
Revises: c2278f072ab2
Create Date: 2026-05-16 14:55:27.337041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '28ab1a41923b'
down_revision: Union[str, None] = 'c2278f072ab2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('doc_permissions',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('document_id', sa.String(), nullable=True),
    sa.Column('section_id', sa.String(), nullable=True),
    sa.Column('permission', sa.String(length=50), nullable=False),
    sa.Column('granted_by', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('doc_permissions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_doc_permissions_user_id'), ['user_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('doc_permissions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_doc_permissions_user_id'))

    op.drop_table('doc_permissions')
