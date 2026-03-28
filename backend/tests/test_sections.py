import pytest
from app.schemas.section import SectionCreate, SectionUpdate
from app.services import section_service


@pytest.mark.asyncio
async def test_create_section(db_session):
    section = await section_service.create(db_session, SectionCreate(title="Getting Started"))
    assert section.id is not None
    assert section.slug == "getting-started"
    assert section.title == "Getting Started"


@pytest.mark.asyncio
async def test_create_section_custom_slug(db_session):
    section = await section_service.create(db_session, SectionCreate(title="My Section", slug="custom-slug"))
    assert section.slug == "custom-slug"


@pytest.mark.asyncio
async def test_list_sections_ordered(db_session):
    await section_service.create(db_session, SectionCreate(title="B Section", order=2))
    await section_service.create(db_session, SectionCreate(title="A Section", order=1))
    sections = await section_service.list_all(db_session)
    assert sections[0].title == "A Section"
    assert sections[1].title == "B Section"


@pytest.mark.asyncio
async def test_update_section(db_session):
    section = await section_service.create(db_session, SectionCreate(title="Old Title"))
    updated = await section_service.update(db_session, section.id, SectionUpdate(title="New Title"))
    assert updated.title == "New Title"


@pytest.mark.asyncio
async def test_delete_section(db_session):
    section = await section_service.create(db_session, SectionCreate(title="To Delete"))
    await section_service.delete(db_session, section.id)
    result = await section_service.get(db_session, section.id)
    assert result is None


@pytest.mark.asyncio
async def test_reorder_sections(db_session):
    s1 = await section_service.create(db_session, SectionCreate(title="First", order=0))
    s2 = await section_service.create(db_session, SectionCreate(title="Second", order=1))
    await section_service.reorder(db_session, [s2.id, s1.id])
    sections = await section_service.list_all(db_session)
    assert sections[0].id == s2.id
    assert sections[1].id == s1.id
