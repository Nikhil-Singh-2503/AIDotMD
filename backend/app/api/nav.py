from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any, Optional
from app.db import get_db
from app.services import nav_service, permission_service
from app.models.models import User

router = APIRouter(prefix="/api/v1/nav", tags=["navigation"])


def _get_user(request: Request) -> Optional[User]:
    return getattr(request.state, "user", None)


@router.get("/tree")
async def get_nav_tree(request: Request, db: AsyncSession = Depends(get_db)):
    user = _get_user(request)
    link = getattr(request.state, "share_link", None)
    tree = await nav_service.get_tree(db)

    # Share link user — only show the shared resource
    if link:
        restricted = await _filter_tree_by_share_link(db, link, tree)
        return restricted

    if user:
        return await _filter_tree(db, user, tree)
    return tree


@router.get("/sidebar")
async def get_sidebar_config(request: Request, db: AsyncSession = Depends(get_db)):
    user = _get_user(request)
    link = getattr(request.state, "share_link", None)
    tree = await nav_service.get_tree(db)

    if link:
        restricted = await _filter_tree_by_share_link(db, link, tree)
        return await nav_service.get_sidebar_config_from_tree(restricted)

    if user:
        filtered = await _filter_tree(db, user, tree)
        return await nav_service.get_sidebar_config_from_tree(filtered)
    return await nav_service.get_sidebar_config(db)


async def _filter_tree_by_share_link(db: AsyncSession, link, tree: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Restrict nav tree to only the resource a share link grants access to."""
    from app.models.models import ShareLink
    target_doc_id = link.document_id
    target_section_id = link.section_id

    async def _keep_node(node: Dict) -> Optional[Dict]:
        section_id = node["id"]
        docs = node["documents"]

        # If share link targets a specific doc, only keep that doc
        if target_doc_id:
            visible = [d for d in docs if d["id"] == target_doc_id]
        else:
            # Keep all docs (section-level share link covers everything in the section)
            visible = docs

        children = []
        for child in node.get("children", []):
            processed = await _keep_node(child)
            if processed:
                children.append(processed)

        # Section-level share link: show the full section
        if target_section_id == section_id:
            return {**node, "documents": docs, "children": children}

        # Doc-level share link: only show the section containing the doc
        if target_doc_id and visible:
            return {**node, "documents": visible, "children": children}

        if children:
            return {**node, "documents": visible, "children": children}

        return None

    result = []
    for node in tree:
        processed = await _keep_node(node)
        if processed:
            result.append(processed)
    return result


async def _filter_tree(db: AsyncSession, user: User, tree: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    async def _visible_docs_in_section(section_id: str, docs: List[Dict]) -> List[Dict]:
        doc_tuples = [(d["id"], section_id) for d in docs]
        visible_ids = set(await permission_service.filter_visible(db, user, doc_tuples))
        return [d for d in docs if d["id"] in visible_ids]

    async def _process_node(node: Dict) -> Optional[Dict]:
        section_id = node["id"]
        children = []
        for child in node.get("children", []):
            processed = await _process_node(child)
            if processed:
                children.append(processed)

        visible_docs = await _visible_docs_in_section(section_id, node["documents"])

        # Check if user has section-level access
        can_see_section = await permission_service.can_access(db, user, "read", section_id=section_id)

        if not can_see_section and not visible_docs and not children:
            return None

        return {
            **node,
            "documents": visible_docs,
            "children": children,
        }

    result = []
    for node in tree:
        processed = await _process_node(node)
        if processed:
            result.append(processed)
    return result
