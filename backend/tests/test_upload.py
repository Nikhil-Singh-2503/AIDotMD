import pytest
from io import BytesIO


@pytest.mark.asyncio
async def test_upload_markdown_file(client, db_session):
    from app.schemas.section import SectionCreate
    from app.services import section_service
    section = await section_service.create(db_session, SectionCreate(title="Test"))

    content = b"# Hello World\n\nThis is content."
    response = await client.post(
        f"/api/v1/upload/markdown?section_id={section.id}",
        files={"file": ("hello-world.md", BytesIO(content), "text/markdown")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Hello World"


@pytest.mark.asyncio
async def test_upload_markdown_with_frontmatter(client, db_session):
    from app.schemas.section import SectionCreate
    from app.services import section_service
    section = await section_service.create(db_session, SectionCreate(title="Test"))

    content = b"---\ntitle: Custom Title\nid: custom-slug\n---\n\n# Body"
    response = await client.post(
        f"/api/v1/upload/markdown?section_id={section.id}",
        files={"file": ("doc.md", BytesIO(content), "text/markdown")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Custom Title"
    assert data["slug"] == "custom-slug"


@pytest.mark.asyncio
async def test_upload_image(client):
    response = await client.post(
        "/api/v1/upload/image",
        files={"file": ("test.png", BytesIO(b"fakedata"), "image/png")},
    )
    assert response.status_code == 200
    assert "url" in response.json()
    assert response.json()["url"].endswith("test.png")
