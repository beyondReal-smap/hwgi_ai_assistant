"""Tests for silson_rag metadata filters."""
from silson_rag.src.engine.filters import (
    detect_filters,
    detect_generation,
    detect_join_ym,
    detect_source_kind,
    infer_generation_from_join_ym,
)


class TestDetectGeneration:
    def test_explicit_generation(self):
        assert detect_generation("3세대 상해의료비") == "3세대"
        assert detect_generation("착한실손 보상기준") == "3세대"
        assert detect_generation("유병자실손 가입한도") == "기타실손"

    def test_no_generation(self):
        assert detect_generation("병실료차액") is None


class TestDetectSourceKind:
    def test_injury_exclusion(self):
        assert detect_source_kind("상해 면책사항") == "injury_exclusion"
        assert detect_source_kind("상해면책") == "injury_exclusion"

    def test_disease_exclusion(self):
        assert detect_source_kind("질병 면책") == "disease_exclusion"

    def test_coverage_criteria(self):
        assert detect_source_kind("보상기준") == "coverage_criteria"
        assert detect_source_kind("자기부담금 기준") == "coverage_criteria"

    def test_no_source_kind(self):
        assert detect_source_kind("일반 검색어") is None


class TestDetectJoinYm:
    def test_year_month(self):
        assert detect_join_ym("2018년 4월 가입") == 201804
        assert detect_join_ym("2020.03 가입") == 202003

    def test_year_only(self):
        assert detect_join_ym("2018년에 가입") == 201801

    def test_no_date(self):
        assert detect_join_ym("병실료차액") is None


class TestInferGeneration:
    def test_1st_gen(self):
        assert infer_generation_from_join_ym(200201) == "1세대"

    def test_2nd_gen(self):
        assert infer_generation_from_join_ym(201405) == "2세대"

    def test_3rd_gen(self):
        assert infer_generation_from_join_ym(201801) == "3세대"

    def test_4th_gen(self):
        assert infer_generation_from_join_ym(202201) == "4세대"


class TestDetectFilters:
    def test_combined_detection(self):
        result = detect_filters("2018년에 가입한 착한실손에서 병실료차액은?")
        assert result.generation == "3세대"
        assert result.join_ym == 201801

    def test_2014_join_maps_to_2nd_gen(self):
        result = detect_filters("2014년에 가입한 실손 자기부담금")
        assert result.generation == "2세대"
        assert result.join_ym == 201401

    def test_join_ym_infers_generation(self):
        result = detect_filters("2022년 가입 보상기준")
        assert result.generation == "4세대"
        assert result.join_ym == 202201
        assert result.source_kind == "coverage_criteria"
