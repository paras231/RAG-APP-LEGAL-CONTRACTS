from app.retrieval.vector_store import PgVectorStore


def test_reciprocal_rank_fusion_combines_and_ranks():
    store = PgVectorStore(session=None, rrf_k=60)

    vector_rows = [
        {"id": "a", "content": "vector top result", "metadata": {}},
        {"id": "b", "content": "vector second result", "metadata": {}},
    ]
    fts_rows = [
        {"id": "b", "content": "vector second result", "metadata": {}},
        {"id": "c", "content": "keyword only result", "metadata": {}},
    ]

    fused = store._reciprocal_rank_fusion(vector_rows, fts_rows)

    # "b" appears in both lists, so it should outrank items that appear once.
    assert fused[0].chunk_id == "b"
    ids = [r.chunk_id for r in fused]
    assert set(ids) == {"a", "b", "c"}


def test_reciprocal_rank_fusion_handles_empty_lists():
    store = PgVectorStore(session=None, rrf_k=60)
    assert store._reciprocal_rank_fusion([], []) == []
