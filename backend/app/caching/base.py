"""Re-export the cache ABC so `app.caching` is a self-contained package."""

from app.core.interfaces import BaseCache

__all__ = ["BaseCache"]
