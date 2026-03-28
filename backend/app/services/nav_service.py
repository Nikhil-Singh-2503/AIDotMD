from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.section_service import list_all as list_sections
from app.services.document_service import list_published as list_published_docs


async def get_tree(db: AsyncSession) -> List[Dict[str, Any]]:
    sections = await list_sections(db)
    all_docs = await list_published_docs(db)

    # Group docs by section_id
    docs_by_section: Dict[str, list] = {}
    for doc in all_docs:
        docs_by_section.setdefault(doc.section_id, []).append(doc)

    # Group sub-sections by parent_id
    children_by_parent: Dict[str, list] = {}
    for s in sections:
        if s.parent_id:
            children_by_parent.setdefault(s.parent_id, []).append(s)

    def build_node(section: Any) -> Dict[str, Any]:
        section_docs = sorted(
            docs_by_section.get(section.id, []),
            key=lambda d: (d.order, d.created_at),
        )
        sub_sections = sorted(
            children_by_parent.get(section.id, []),
            key=lambda s: (s.order, s.created_at),
        )
        return {
            "id": section.id,
            "title": section.title,
            "slug": section.slug,
            "order": section.order,
            "documents": [
                {"id": d.id, "title": d.title, "slug": d.slug, "order": d.order}
                for d in section_docs
            ],
            "children": [build_node(s) for s in sub_sections],
        }

    top_level = sorted(
        [s for s in sections if not s.parent_id],
        key=lambda s: (s.order, s.created_at),
    )
    return [build_node(s) for s in top_level]


async def get_sidebar_config(db: AsyncSession) -> Dict[str, Any]:
    tree = await get_tree(db)

    def build_sidebar_items(nodes: List[Dict[str, Any]]) -> list:
        items = []
        for node in nodes:
            category: Dict[str, Any] = {
                "type": "category",
                "label": node["title"],
                "items": [
                    {"type": "doc", "id": f"{node['slug']}/{doc['slug']}", "label": doc["title"]}
                    for doc in node["documents"]
                ],
            }
            if node["children"]:
                category["items"] += build_sidebar_items(node["children"])
            items.append(category)
        return items

    return {"docs": build_sidebar_items(tree)}
