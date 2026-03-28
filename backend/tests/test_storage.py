import pytest
from app.storage.filesystem import FilesystemStorage


@pytest.mark.asyncio
async def test_write_document_creates_file(tmp_path):
    storage = FilesystemStorage(docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static"))
    await storage.write_document("getting-started", "installation", "# Hello")
    out = tmp_path / "docs" / "getting-started" / "installation.md"
    assert out.exists()
    assert "# Hello" in out.read_text()


@pytest.mark.asyncio
async def test_write_document_includes_frontmatter(tmp_path):
    storage = FilesystemStorage(docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static"))
    await storage.write_document("guide", "intro", "Body text", title="Intro", order=2)
    content = (tmp_path / "docs" / "guide" / "intro.md").read_text()
    assert "title: Intro" in content
    assert "sidebar_position: 2" in content


@pytest.mark.asyncio
async def test_delete_document_removes_file(tmp_path):
    storage = FilesystemStorage(docs_dir=str(tmp_path / "docs"), static_dir=str(tmp_path / "static"))
    await storage.write_document("guide", "intro", "Body")
    await storage.delete_document("guide", "intro")
    assert not (tmp_path / "docs" / "guide" / "intro.md").exists()


@pytest.mark.asyncio
async def test_save_image_returns_url(tmp_path):
    storage = FilesystemStorage(
        docs_dir=str(tmp_path / "docs"),
        static_dir=str(tmp_path / "static"),
        base_url="http://localhost:8000"
    )
    url = await storage.save_image("test.png", b"fakeimagedata")
    assert url == "http://localhost:8000/static/img/test.png"
    assert (tmp_path / "static" / "test.png").exists()
