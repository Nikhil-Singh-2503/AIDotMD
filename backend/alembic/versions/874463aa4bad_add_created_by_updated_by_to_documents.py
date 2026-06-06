"""add_created_by_updated_by_to_documents

Revision ID: 874463aa4bad
Revises: 907573ed2243
Create Date: 2026-06-06 13:41:19.264514

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '874463aa4bad'
down_revision: Union[str, None] = '907573ed2243'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_by', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('updated_by', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_documents_created_by', 'users', ['created_by'], ['id'])
        batch_op.create_foreign_key('fk_documents_updated_by', 'users', ['updated_by'], ['id'])

    with op.batch_alter_table('document_versions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_by', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_doc_versions_created_by', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_constraint('fk_documents_updated_by', type_='foreignkey')
        batch_op.drop_constraint('fk_documents_created_by', type_='foreignkey')
        batch_op.drop_column('updated_by')
        batch_op.drop_column('created_by')

    with op.batch_alter_table('document_versions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_doc_versions_created_by', type_='foreignkey')
        batch_op.drop_column('created_by')
