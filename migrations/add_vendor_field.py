"""
Migration script to add vendor field to Item table
"""
from sqlalchemy import Column, String
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add vendor column to Item table
    op.add_column('item', Column('vendor', String(100), nullable=True))
    
def downgrade():
    # Remove vendor column from Item table
    op.drop_column('item', 'vendor')
