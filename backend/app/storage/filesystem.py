import aiofiles
from pathlib import Path


class FilesystemStorage:
    def __init__(self, docs_dir: str, static_dir: str, base_url: str = ""):
        self.docs_dir = Path(docs_dir)
        self.static_dir = Path(static_dir)
        self.base_url = base_url.rstrip("/")

    async def write_document(
        self, section_slug: str, doc_slug: str, content: str,
        title: str = "", order: int = 0
    ) -> None:
        target_dir = self.docs_dir / section_slug
        target_dir.mkdir(parents=True, exist_ok=True)
        frontmatter = f"---\nid: {doc_slug}\ntitle: {title}\nsidebar_position: {order}\n---\n\n"
        async with aiofiles.open(target_dir / f"{doc_slug}.md", "w") as f:
            await f.write(frontmatter + content)

    async def delete_document(self, section_slug: str, doc_slug: str) -> None:
        target = self.docs_dir / section_slug / f"{doc_slug}.md"
        if target.exists():
            target.unlink()

    async def save_image(self, filename: str, data: bytes) -> str:
        self.static_dir.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(self.static_dir / filename, "wb") as f:
            await f.write(data)
        return f"{self.base_url}/static/img/{filename}"
