"""add_versioning_tables

Revision ID: 778662323c0c
Revises: d49d331cad58
Create Date: 2026-03-28 14:03:13.822244

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '778662323c0c'
down_revision: Union[str, None] = 'd49d331cad58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add version column to existing tables (idempotent — skip if already present)
    conn = op.get_bind()

    doc_cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(documents)"))]
    if 'version' not in doc_cols:
        with op.batch_alter_table('documents', schema=None) as batch_op:
            batch_op.add_column(sa.Column('version', sa.String(length=50), nullable=False, server_default=''))

    sec_cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(sections)"))]
    if 'version' not in sec_cols:
        with op.batch_alter_table('sections', schema=None) as batch_op:
            batch_op.add_column(sa.Column('version', sa.String(length=50), nullable=False, server_default=''))

    # Create document_versions table (skip if already created)
    existing_tables = sa.inspect(conn).get_table_names()

    if 'document_versions' not in existing_tables:
        op.create_table(
            'document_versions',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('document_id', sa.String(), nullable=False),
            sa.Column('version', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('section_id', sa.String(), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('order', sa.Integer(), nullable=True),
            sa.Column('is_published', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_document_versions_document_id', 'document_versions', ['document_id'])

    if 'section_versions' not in existing_tables:
        op.create_table(
            'section_versions',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('section_id', sa.String(), nullable=False),
            sa.Column('version', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('parent_id', sa.String(), nullable=True),
            sa.Column('order', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_section_versions_section_id', 'section_versions', ['section_id'])


def downgrade() -> None:
    op.drop_index('ix_section_versions_section_id', table_name='section_versions')
    op.drop_table('section_versions')
    op.drop_index('ix_document_versions_document_id', table_name='document_versions')
    op.drop_table('document_versions')

    with op.batch_alter_table('sections', schema=None) as batch_op:
        batch_op.drop_column('version')

    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_column('version')
