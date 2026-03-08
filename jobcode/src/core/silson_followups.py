"""Rule-based follow-up suggestion generator for silson search results.

No LLM call — zero latency. Returns up to 3 contextual follow-up suggestions.
All suggestions are concrete, actionable search queries (not guidance text).
"""
from __future__ import annotations

import re
from typing import Any, Dict, List


def _extract_topic(query: str) -> str:
    """Extract the core topic keyword from query. Returns short keyword or empty string."""
    cleaned = query.strip()
    # Remove generation markers
    cleaned = re.sub(r"[1-4]세대\s*", "", cleaned)
    cleaned = re.sub(r"(구실손|착한실손|표준화\s*실손|유병자\s*실손)\s*", "", cleaned)
    # Remove source_kind markers (whole words)
    cleaned = re.sub(r"(상해\s*면책사항|질병\s*면책사항|상해\s*면책|질병\s*면책|보상기준|면책사항|보상\s*제외)\s*", "", cleaned)
    # Remove common question phrases / natural language tails
    cleaned = re.sub(r"(하다가?|하면|다치면|다쳐서|입원하면)\s*", "", cleaned)
    cleaned = re.sub(r"(보험|실손|실비|의료비)?\s*(되나요|나오나요|나오나|적용되나요|가능한가요|인가요|인지|할까요|일까요|해주세요|알려주세요|알려줘|확인해|볼까요|보세요|됩니까)\s*", "", cleaned)
    cleaned = re.sub(r"[?？!~·\s]+$", "", cleaned)
    cleaned = cleaned.strip()
    # If result is too long or looks like a full sentence, discard
    if len(cleaned) > 15 or not cleaned:
        return ""
    return cleaned


def generate_followups(
    query: str,
    hits: list,
    filters: Dict[str, Any],
) -> List[str]:
    """Generate up to 3 follow-up suggestions as concrete search queries."""
    suggestions: List[str] = []
    query_lower = query.lower()
    topic = _extract_topic(query)

    generation = filters.get("generation")
    source_kind = filters.get("source_kind")

    # Collect metadata from hits
    hit_coverage_names: set[str] = set()
    hit_generations: set[str] = set()
    for hit in hits:
        cn = getattr(hit, "coverage_name", "") or ""
        gen = getattr(hit, "generation", "") or ""
        hit_coverage_names.add(cn.lower())
        if gen:
            hit_generations.add(gen)

    gen_prefix = f"{generation} " if generation else ""

    # Rule 1: Generation specified → suggest same topic in another generation
    if generation:
        other_gens = sorted({"1세대", "2세대", "3세대", "4세대"} - {generation})
        if other_gens and topic:
            suggestions.append(f"{other_gens[0]} {topic}")

    # Rule 2: coverage_criteria → suggest exclusion query
    if source_kind == "coverage_criteria":
        if topic:
            suggestions.append(f"{gen_prefix}{topic} 면책사항".strip())
        else:
            hit_coverages = [getattr(h, "coverage_name", "") for h in hits if getattr(h, "coverage_name", "")]
            cov = hit_coverages[0] if hit_coverages else "상해의료비"
            suggestions.append(f"{gen_prefix}{cov} 면책사항".strip())

    # Rule 3: exclusion → suggest coverage criteria query
    if source_kind in ("injury_exclusion", "disease_exclusion"):
        if topic:
            suggestions.append(f"{gen_prefix}{topic} 보상기준".strip())
        else:
            # topic empty (e.g. "3세대 상해 면책사항") → use hit coverage name
            hit_coverages = [getattr(h, "coverage_name", "") for h in hits if getattr(h, "coverage_name", "")]
            cov = hit_coverages[0] if hit_coverages else "상해의료비"
            suggestions.append(f"{gen_prefix}{cov} 보상기준".strip())

    # Rule 4: 상해 matched → suggest 질병 query
    injury_keywords = {"상해", "상해의료비", "사고", "골절", "입원"}
    if any(k in query_lower for k in injury_keywords) or any("상해" in cn for cn in hit_coverage_names):
        suggestions.append(f"{gen_prefix}질병의료비 보상기준".strip())

    # Rule 5: 질병 matched → suggest 상해 query
    disease_keywords = {"질병", "질병의료비", "암", "고혈압"}
    if any(k in query_lower for k in disease_keywords) or any("질병" in cn for cn in hit_coverage_names):
        suggestions.append(f"{gen_prefix}상해의료비 보상기준".strip())

    # Rule 6: 자기부담금 → suggest 보상한도
    deductible_keywords = {"자기부담금", "공제금액", "본인부담금"}
    if any(k in query_lower for k in deductible_keywords):
        suggestions.append(f"{gen_prefix}보상한도")

    # Rule 7: No generation → suggest with a specific generation
    if not generation:
        pick_gen = "4세대"
        if hit_generations:
            pick_gen = sorted(hit_generations)[0]
        if topic:
            suggestions.append(f"{pick_gen} {topic}")
        else:
            # For natural-language queries without clear topic, suggest generation-scoped versions
            hit_coverages = [getattr(h, "coverage_name", "") for h in hits if getattr(h, "coverage_name", "")]
            if hit_coverages:
                suggestions.append(f"{pick_gen} {hit_coverages[0]} 보상기준")

    # Deduplicate and limit to 3
    seen: set[str] = set()
    unique: List[str] = []
    for s in suggestions:
        normalized = s.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(normalized)
        if len(unique) >= 3:
            break

    return unique
