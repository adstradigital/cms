from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


def _clamp_0_100(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return float(value)


@dataclass
class AIBrainResult:
    """
    Standard response envelope for *all* AI Brain outputs.

    Goals:
    - measurable: scores/confidence exist everywhere
    - explainable: human-readable explanations are always present
    - extensible: recommendations/alerts can be added without breaking clients
    """

    success: bool
    task: str
    data: Dict[str, Any] = field(default_factory=dict)
    scores: Dict[str, float] = field(default_factory=dict)
    confidence: Optional[float] = None  # 0..100
    explanations: List[str] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    alerts: List[Dict[str, Any]] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        payload = {
            "success": bool(self.success),
            "task": self.task,
            "data": self.data or {},
            "scores": {k: _clamp_0_100(v) for k, v in (self.scores or {}).items()},
            "confidence": _clamp_0_100(self.confidence) if self.confidence is not None else None,
            "explanations": self.explanations or [],
            "recommendations": self.recommendations or [],
            "alerts": self.alerts or [],
            "meta": self.meta or {},
        }
        if self.error:
            payload["error"] = self.error
        return payload

