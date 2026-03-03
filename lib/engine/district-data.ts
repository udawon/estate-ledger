// ─── 서울 구(區)별 입지 특성 데이터 v4 ──────────────────────
// 7카테고리(A-G) 기준으로 재구조화
// location_engine_live.md 준수

export interface DistrictScore {
  transport:   number;  // A. 교통
  jobDemand:   number;  // B. 일자리·수요
  living:      number;  // C. 생활인프라
  education:   number;  // D. 교육
  envRisk:     number;  // E. 환경위험 (높을수록 안전)
  futureValue: number;  // F. 미래가치
  supply:      number;  // G. 상품·공급
}

export interface DistrictDetails {
  transport:   string[];
  jobDemand:   string[];
  living:      string[];
  education:   string[];
  envRisk:     string[];
  futureValue: string[];
  supply:      string[];
}

// ─── 서울 25개 구 기본 점수 ───────────────────────────────────
export const DISTRICT_SCORES: Record<string, DistrictScore> = {
  강남구:   { transport: 95, jobDemand: 97, living: 88, education: 97, envRisk: 82, futureValue: 80, supply: 65 },
  서초구:   { transport: 88, jobDemand: 90, living: 86, education: 92, envRisk: 90, futureValue: 78, supply: 68 },
  송파구:   { transport: 87, jobDemand: 80, living: 84, education: 83, envRisk: 80, futureValue: 68, supply: 75 },
  강동구:   { transport: 78, jobDemand: 68, living: 78, education: 72, envRisk: 58, futureValue: 62, supply: 80 },
  강서구:   { transport: 80, jobDemand: 70, living: 72, education: 68, envRisk: 65, futureValue: 70, supply: 75 },
  강북구:   { transport: 67, jobDemand: 55, living: 68, education: 72, envRisk: 82, futureValue: 72, supply: 62 },
  동작구:   { transport: 82, jobDemand: 75, living: 78, education: 75, envRisk: 80, futureValue: 82, supply: 65 },
  영등포구: { transport: 86, jobDemand: 85, living: 82, education: 68, envRisk: 68, futureValue: 85, supply: 70 },
  마포구:   { transport: 84, jobDemand: 82, living: 82, education: 75, envRisk: 72, futureValue: 78, supply: 72 },
  용산구:   { transport: 87, jobDemand: 88, living: 82, education: 75, envRisk: 78, futureValue: 80, supply: 68 },
  종로구:   { transport: 88, jobDemand: 85, living: 80, education: 70, envRisk: 75, futureValue: 65, supply: 60 },
  중구:     { transport: 89, jobDemand: 82, living: 78, education: 65, envRisk: 68, futureValue: 62, supply: 55 },
  성동구:   { transport: 80, jobDemand: 78, living: 80, education: 75, envRisk: 78, futureValue: 90, supply: 78 },
  광진구:   { transport: 76, jobDemand: 72, living: 76, education: 72, envRisk: 76, futureValue: 62, supply: 65 },
  성북구:   { transport: 72, jobDemand: 62, living: 72, education: 70, envRisk: 80, futureValue: 58, supply: 60 },
  도봉구:   { transport: 70, jobDemand: 55, living: 68, education: 70, envRisk: 78, futureValue: 58, supply: 62 },
  노원구:   { transport: 76, jobDemand: 62, living: 75, education: 90, envRisk: 82, futureValue: 60, supply: 70 },
  은평구:   { transport: 71, jobDemand: 60, living: 70, education: 70, envRisk: 82, futureValue: 78, supply: 65 },
  서대문구: { transport: 78, jobDemand: 68, living: 74, education: 72, envRisk: 78, futureValue: 62, supply: 60 },
  양천구:   { transport: 77, jobDemand: 68, living: 74, education: 88, envRisk: 78, futureValue: 65, supply: 72 },
  구로구:   { transport: 76, jobDemand: 68, living: 70, education: 65, envRisk: 72, futureValue: 62, supply: 65 },
  금천구:   { transport: 73, jobDemand: 65, living: 68, education: 62, envRisk: 70, futureValue: 58, supply: 63 },
  관악구:   { transport: 77, jobDemand: 65, living: 74, education: 72, envRisk: 75, futureValue: 60, supply: 62 },
  동대문구: { transport: 79, jobDemand: 72, living: 74, education: 68, envRisk: 70, futureValue: 68, supply: 65 },
  중랑구:   { transport: 70, jobDemand: 58, living: 65, education: 62, envRisk: 55, futureValue: 55, supply: 62 },
};

// ─── 서울 25개 구 세부 근거 ───────────────────────────────────
export const DISTRICT_DETAILS: Record<string, DistrictDetails> = {
  강남구: {
    transport:   ['2·3·7·9호선 4개 노선 경유', '강남역·선릉역·삼성역 도보 10분 이내', '광역버스 60개 이상 노선', '경부고속도로 진입 3분'],
    jobDemand:   ['강남 업무지구 직접 위치 (최고)', '삼성서울병원·강남세브란스 반경 3km', '서울 자치구별 평균 소득 최상위', '테헤란로 오피스 임대 수요 최고'],
    living:      ['코엑스몰·현대백화점·신세계 인접', '반경 500m 음식점·카페 500개 이상', '양재천·탄천 산책로 접근 가능', '병원·약국 밀도 서울 최상위'],
    education:   ['대치동 학원가 전국 최고 밀도', '초등학교 1km 이내 다수', '학군 선호도 서울 1위', '어린이집·유치원 밀도 높음'],
    envRisk:     ['CCTV 설치 밀도 서울 평균 2배', '강남경찰서·방범 순찰 강화 구역', '혐오시설 거의 없음', '단, 테헤란로 교통량 많아 소음 주의'],
    futureValue: ['GTX-A·C 수혜 예정', '공급 희소 (재건축 위주)', '강남 업무지구 수요 지속 증가'],
    supply:      ['구축 아파트 비율 높음 (재건축 대기)', '실거래 건수 서울 상위', '반경 1km 아파트 단지 밀도 높음'],
  },
  서초구: {
    transport:   ['2·3호선·신분당선 경유', '서울고속버스터미널 반경 2km', '강남순환도시고속도로 접근', '서초역·반포역 환승 용이'],
    jobDemand:   ['서초 업무지구·강남 업무지구 인접', '서울대병원·강남성모병원 3km', '소득 수준 서울 최상위', '법조·금융 업종 임대 수요 높음'],
    living:      ['서초대로·반포대로 대형 상권', '한강시민공원(반포) 도보 10분', '대형마트·복합쇼핑몰 다수', '병원·약국 밀도 높음'],
    education:   ['방배·서초 학원가 발달', '초등학교 우수 학군 포함', '학군 선호도 서울 2위', '사교육 접근성 최상'],
    envRisk:     ['법조단지 인근 치안 강화', '방범 CCTV 고밀도 구역', '혐오시설 없음', '쾌적한 주거환경'],
    futureValue: ['GTX-C 예정', '반포 재건축 진행 중', '공급 희소 지역'],
    supply:      ['반포·잠원 재건축 신축 진행', '실거래 활발', '고가 단지 중심 공급'],
  },
  송파구: {
    transport:   ['2·5·8·9호선 4개 노선 경유', '잠실역·석촌역 복합 환승', 'SRT 수서역 10분 거리', '올림픽대로·강변북로 접근'],
    jobDemand:   ['잠실·문정 업무지구 인접', '아산병원·강동경희대병원 3km', '소득 수준 서울 상위', '문정 법조단지 성장 중'],
    living:      ['롯데월드몰·롯데백화점 잠실점', '석촌호수·올림픽공원 인접', '반경 1km 대형마트 3개', '병원·약국 밀도 양호'],
    education:   ['잠실·방이동 학원가 발달', '초등학교 인근 다수', '학군 선호도 높음', '어린이집 밀도 높음'],
    envRisk:     ['잠실·문정 법조단지 치안 강화', 'CCTV 밀도 상위 구역', '혐오시설 적음', '올림픽대로 소음 일부 구간 주의'],
    futureValue: ['가락·문정 재개발 진행', '공급 다소 많음 (위례 등)', 'GTX-A 연장 기대'],
    supply:      ['위례·문정 신축 공급 많음', '실거래 건수 서울 상위', '단지 밀도 높음'],
  },
  강동구: {
    transport:   ['5·8호선 경유', '천호역·강동역 교통 결절점', '강동대로·올림픽대로 차량 접근', '광역버스 20개 이상 노선'],
    jobDemand:   ['강동 업무지구 성장 중', '강동경희대병원 인근', '소득 수준 서울 중위', '하남·미사 성장 수혜'],
    living:      ['천호·강동 중심 상권', '일자산 자연공원 도보 20분', '이마트·홈플러스 반경 2km', '병원·약국 밀도 보통'],
    education:   ['강동 학원가 성장 중', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 다수'],
    envRisk:     ['한강·암사 침수 위험 지역 포함', '강동경찰서 관할 치안 양호', '혐오시설 적음', '침수 위험 구역 주의 필요'],
    futureValue: ['고덕·강일 신도시 개발 진행', '공급 많음 (신규 아파트)', '지하철 연장 검토 중'],
    supply:      ['고덕·강일 신축 많음', '실거래 활발', '신축 공급 서울 상위'],
  },
  강서구: {
    transport:   ['5·9호선 경유', '공항철도 김포공항역 접근', '마곡산업단지 셔틀 운행', '올림픽대로·강변북로 접근'],
    jobDemand:   ['마곡 R&D 단지 성장 중', '이대서울병원 인근', '소득 수준 서울 중위', '마곡 임대 수요 증가'],
    living:      ['마곡공원·강서습지생태공원', '마곡지구 신흥 상권 성장 중', '대형마트 3개 반경 3km', '병원·약국 밀도 보통'],
    education:   ['마곡·화곡 학원가', '초등학교 학군 보통', '학군 선호도 중하위', '어린이집 보통'],
    envRisk:     ['한강변 일부 침수 취약', '마곡 신도시 치안 인프라 완비', '공항 소음 일부 지역', '혐오시설 적음'],
    futureValue: ['마곡 R&D 단지 지속 성장', '공급 많음', '김포공항 복합개발 기대'],
    supply:      ['마곡 신축 공급 많음', '실거래 활발', '신축 비율 높음'],
  },
  강북구: {
    transport:   ['4호선 일부 경유', '우이신설경전철 통과', '도봉로·솔매로 버스 노선', '자가용 의존도 높은 구조'],
    jobDemand:   ['업무지구 접근성 낮음', '가까운 대학병원 부재', '소득 수준 서울 하위', '임대 수요 낮음'],
    living:      ['수유시장·미아 상권', '반경 1km 편의시설 제한', '북한산·수유계곡 자연환경 우수', '대형마트 접근 20분 이상'],
    education:   ['미아 학원가 보통', '초등학교 인근 존재', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['비교적 조용한 주거 환경', '방범 인프라 개선 진행 중', '혐오시설 적음', '녹지 비율 38% 청정 환경'],
    futureValue: ['미아 뉴타운 재개발 진행', '우이신설선 수혜', '개발 기대감 있음'],
    supply:      ['구축 위주', '실거래 적음', '재개발 완료 후 신축 기대'],
  },
  동작구: {
    transport:   ['1·2·4·7·9호선 경유', '노량진역·대방역 복합 환승', '동작대교·한강대교 차량 접근', '광역버스 30개 이상 노선'],
    jobDemand:   ['여의도·강남 업무지구 접근 우수', '중앙대병원·보라매병원 인근', '소득 수준 서울 중상위', '임대 수요 양호'],
    living:      ['노량진 수산시장·학원가 상권', '보라매공원 도보 15분', '대형마트 2개 반경 2km', '병원·약국 밀도 양호'],
    education:   ['노량진 공무원 학원가 특화', '초등학교 우수 학군 일부', '학군 선호도 중상위', '어린이집 보통'],
    envRisk:     ['동작경찰서 관할 치안 양호', '노량진 학원가 방범 강화', '혐오시설 거의 없음', '한강 소음 일부'],
    futureValue: ['노량진 재개발 활발', '9호선·7호선 수혜', '공급 적정 수준'],
    supply:      ['노량진 재개발 신축 진행', '실거래 보통', '신축 공급 증가 추세'],
  },
  영등포구: {
    transport:   ['1·2·5·9호선 경유', '영등포역·여의도역 복합 환승', '경인로·올림픽대로 접근', '지하철 일일 유동인구 최상위'],
    jobDemand:   ['여의도 금융 업무지구 직접 위치', '한양대병원·성애병원 인근', '소득 수준 서울 중상위', '여의도 금융·증권 임대 수요 최고'],
    living:      ['여의도 IFC몰·더현대서울', 'CGV·롯데시네마 문화시설 인접', '여의도한강공원 도보 10분', '병원·약국 밀도 양호'],
    education:   ['학원가 보통', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['여의도 금융지구 보안 강화', 'CCTV 고밀도 설치', '야간 유동인구 많아 체감 안전도 우수', '경인로 소음 일부 구간'],
    futureValue: ['여의도 재건축·재개발 대규모 진행', '공급 증가 예정', 'GTX-B 수혜 기대'],
    supply:      ['여의도 재건축 신축 예정', '실거래 활발', '구축 단지 위주 (재건축 대기)'],
  },
  마포구: {
    transport:   ['2·5·6호선·공항철도 경유', '홍대입구역 환승 허브', '마포대로·강변북로 차량 접근', '광역버스 40개 이상 노선'],
    jobDemand:   ['상암 DMC·홍대 업무지구 인접', '세브란스 신촌병원 3km', '소득 수준 서울 중상위', '미디어·IT 기업 임대 수요 높음'],
    living:      ['홍대·연남·상암 트리플 상권', '경의선 숲길 공원 관통', '한강시민공원(망원) 도보 10분', '병원·약국 밀도 양호'],
    education:   ['홍대 주변 학원가 발달', '초등학교 학군 중상위', '학군 선호도 중상위', '어린이집 밀도 양호'],
    envRisk:     ['유흥가 방범 강화 (주말 순찰)', 'CCTV 고밀도 홍대 상권', '혐오시설 적음', '홍대 유흥 소음 일부 구간 주의'],
    futureValue: ['아현·공덕 재개발 진행', '9호선 연장 수혜', '공급 적정'],
    supply:      ['공덕·아현 신축 공급', '실거래 활발', '신축·구축 혼재'],
  },
  용산구: {
    transport:   ['1·4·6호선·경의중앙선·공항철도 경유', '용산역 KTX·SRT 접근', '이태원역·한강진역 인접', '고속도로 다수 진입로'],
    jobDemand:   ['강남·여의도 업무지구 접근 우수', '순천향대병원·국립중앙의료원 3km', '소득 수준 서울 최상위', '외국인·법인 임대 수요 높음'],
    living:      ['용산 아이파크몰·전자상가', '이태원·한남 글로벌 상권', '남산공원 도보 20분', '병원·약국 밀도 양호'],
    education:   ['이태원 국제 학교 인근', '초등학교 학군 중상위', '학군 선호도 중상위', '어린이집 보통'],
    envRisk:     ['용산 개발 이후 환경 개선', '이태원 방범 집중 관리', '혐오시설 없음', 'CCTV 고밀도 구역'],
    futureValue: ['용산 국제업무지구 개발 진행', '공급 희소', '미래가치 서울 최고 수준'],
    supply:      ['용산 신규 공급 제한적', '실거래 활발 (고가)', '구축·신축 혼재'],
  },
  종로구: {
    transport:   ['1·3·5호선 경유', '광화문·종각·종로3가 환승', '청계천·세종대로 버스 집중', '광역버스 50개 이상 노선'],
    jobDemand:   ['광화문 업무지구 직접 위치', '서울대병원·서울적십자병원 3km', '소득 수준 서울 중상위', '관광·행정 임대 수요'],
    living:      ['인사동·북촌 관광 상권', '경복궁·창덕궁·북악산 인근', '서울 녹지 역사 공원 밀집', '기본 생활 편의 보통'],
    education:   ['학원가 보통', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['광화문 집회 관리·경찰 상주', '역사 보존 구역 특별 관리', '혐오시설 없음', '광화문 교통 소음 일부'],
    futureValue: ['재개발 제한 (문화재 보호구역)', '공급 희소', '역사 가치 기반 장기 보유 적합'],
    supply:      ['공급 매우 제한적', '실거래 적음', '단지 밀도 낮음'],
  },
  중구: {
    transport:   ['1·2·3·4·5호선 경유', '서울역·시청·명동 환승', '공항철도 서울역 직결', '광역버스 70개 이상 노선 (전국 최상)'],
    jobDemand:   ['CBD(광화문·을지로) 업무지구', '서울역 인근 의료시설', '소득 수준 서울 중상위', '상업·업무 임대 수요 높음'],
    living:      ['명동·남대문시장·을지로 핵심 상권', '롯데백화점 본점·신세계 본점', '문화·의료 인프라 최상', '주거 생활인프라 상업 위주'],
    education:   ['학원가 제한적', '주거 인구 적어 학군 미발달', '학군 선호도 낮음', '어린이집 제한적'],
    envRisk:     ['명동 방범 강화 (24시간 순찰)', '관광지 특별 방범 구역', '혐오시설 없음', '교통 소음 많음 (중심지 특성)'],
    futureValue: ['재개발 제한 (도심 특성)', '공급 희소', '업무용 전환 위주'],
    supply:      ['주거 공급 매우 제한적', '실거래 적음', '오피스텔 위주'],
  },
  성동구: {
    transport:   ['2·5호선·경의중앙선 경유', '왕십리역 복합 환승', '동부간선도로·강변북로 접근', '광역버스 20개 이상 노선'],
    jobDemand:   ['성수동 IT·스타트업 업무지구 급성장', '한양대병원 3km', '소득 수준 서울 중상위 (급등 중)', '성수 창업 임대 수요 최고'],
    living:      ['성수동 카페·팝업 트렌디 상권', '서울숲 도보 15분', '한강시민공원(뚝섬) 인접', '병원·약국 밀도 양호'],
    education:   ['학원가 성장 중', '초등학교 학군 중상위', '학군 선호도 중상위 (상승 중)', '어린이집 밀도 양호'],
    envRisk:     ['성동경찰서 관할 치안 양호', '성수 상권 방범 강화', '혐오시설 거의 없음', '중랑천 일부 소음'],
    futureValue: ['성수전략정비구역 재개발 서울 최고 기대', '공급 증가 예정', '성수동 업무·주거 복합 개발'],
    supply:      ['성수 신축 빠르게 증가', '실거래 활발 (급등)', '신축·구축 혼재'],
  },
  광진구: {
    transport:   ['2·5·7호선 경유', '건대입구역 복합 환승', '강변북로·천호대로 접근', '광역버스 20개 이상 노선'],
    jobDemand:   ['잠실·강남 업무지구 접근 가능', '건국대병원 인근', '소득 수준 서울 중위', '대학가 임대 수요'],
    living:      ['건대 입구·자양 먹자골목', '이마트·롯데마트 반경 2km', '아차산·용마산 자연공원', '병원·약국 밀도 보통'],
    education:   ['건대·세종대 주변 학원가', '초등학교 학군 중위', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['건대 상권 방범 강화 구역', '광진경찰서 관할', '혐오시설 적음', '강변 소음 일부'],
    futureValue: ['재개발 잠재력 있음', '공급 보통', '5호선·7호선 기존 수혜'],
    supply:      ['구축 위주', '실거래 보통', '신축 공급 제한적'],
  },
  성북구: {
    transport:   ['4·6호선 경유', '길음역·미아사거리역 환승', '내부순환도로 접근', '광역버스 15개 이상 노선'],
    jobDemand:   ['업무지구 접근성 보통', '고려대병원·성북구보건소 인근', '소득 수준 서울 중하위', '대학가 임대 수요'],
    living:      ['길음·돈암 근린 상권', '북한산·정릉 자연환경 우수', '대형마트 2개 반경 2km', '병원·약국 밀도 보통'],
    education:   ['성신여대·고려대 주변 학원가', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['성북경찰서 관할 치안', '대학가 방범 강화', '혐오시설 적음', '녹지 비율 35% 쾌적'],
    futureValue: ['재개발 진행 일부', '공급 보통', '지하철 접근성 개선 예정'],
    supply:      ['구축 위주', '실거래 보통', '신축 소규모'],
  },
  도봉구: {
    transport:   ['1·7호선 경유', '도봉산역·방학역 환승', '도봉로·북부간선도로 접근', '의정부 방향 광역버스 운행'],
    jobDemand:   ['업무지구 접근성 낮음', '가까운 대학병원 부재', '소득 수준 서울 하위', '임대 수요 낮음'],
    living:      ['방학·창동 근린 상권', '도봉산·수락산 국립공원 접근', '이마트·하나로마트 인접', '병원·약국 밀도 보통'],
    education:   ['창동 학원가 발달', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['도봉경찰서 관할 치안 양호', '주거 중심 지역 방범', '혐오시설 적음', '도봉구 일부 중랑천 침수 위험'],
    futureValue: ['창동 상계 신경제 중심지 개발', '공급 적정', 'GTX-C 도봉산역 수혜 가능'],
    supply:      ['창동 신축 개발 진행', '실거래 보통', '재개발 기대'],
  },
  노원구: {
    transport:   ['4·6·7호선·우이신설경전철 경유', '노원역 환승 허브', '동부간선도로·북부간선도로', '광역버스 30개 이상 노선'],
    jobDemand:   ['업무지구 접근성 보통', '을지대병원·노원을지대병원 인근', '소득 수준 서울 중하위', '학원 종사자 임대 수요'],
    living:      ['노원·상계 대형 상권', '불암산·수락산 자연공원 접근', '이마트·롯데마트·홈플러스 다수', '병원·약국 밀도 양호'],
    education:   ['중계 학원가 강남 다음 전국 2위', '초등학교 학군 우수', '학군 선호도 서울 상위', '어린이집·유치원 밀도 높음'],
    envRisk:     ['노원경찰서 관할 치안 양호', '학원가 학생 방범 강화', '혐오시설 없음', '녹지 비율 37% 쾌적'],
    futureValue: ['GTX-C 노원역 수혜 가능성', '공급 일부', '교통 개선 기대'],
    supply:      ['대단지 아파트 밀집', '실거래 활발', '구축 많음 (재건축 대기)'],
  },
  은평구: {
    transport:   ['3·6호선 경유', '연신내역·불광역 환승', '통일로·은평로 차량 접근', '광역버스 20개 이상 노선'],
    jobDemand:   ['업무지구 접근성 보통', '서울대학교병원(은평) 3km', '소득 수준 서울 중하위', '임대 수요 보통'],
    living:      ['연신내·은평 뉴타운 상권', '북한산 자락 접근 우수', '이마트·롯데마트 반경 2km', '병원·약국 밀도 보통'],
    education:   ['학원가 보통', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['은평경찰서 관할 치안', '뉴타운 신도시 방범 완비', '혐오시설 적음', '녹지 비율 33% 쾌적'],
    futureValue: ['GTX-A 은평역(연신내) 수혜', '은평 뉴타운 개발 완료', '추가 개발 기대'],
    supply:      ['은평 뉴타운 신축 많음', '실거래 활발', '신축 비율 높음'],
  },
  서대문구: {
    transport:   ['2·3·5호선 경유', '충정로·아현역 환승', '성산대로·독립문 버스 집중', '광역버스 25개 이상 노선'],
    jobDemand:   ['광화문 업무지구 접근 가능', '세브란스 신촌병원 3km 이내', '소득 수준 서울 중위', '대학가 임대 수요'],
    living:      ['신촌·홍제 대학가 상권', '안산·인왕산 자연공원 접근', '독립공원 인접', '병원·약국 밀도 보통'],
    education:   ['신촌 학원가 발달', '초등학교 학군 중위', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['서대문경찰서 관할', '대학가 방범 강화', '혐오시설 적음', '녹지 비율 28% 쾌적'],
    futureValue: ['아현 재개발 진행', '공급 보통', '지하철 접근성 양호'],
    supply:      ['아현·북아현 재개발 신축', '실거래 보통', '신구 혼재'],
  },
  양천구: {
    transport:   ['2·5·9호선 경유', '목동역·신정역 환승', '경인로·신월로 접근', '광역버스 25개 이상 노선'],
    jobDemand:   ['여의도·강남 업무지구 접근 가능', '이대목동병원 인근', '소득 수준 서울 중상위', '학원 강사 임대 수요'],
    living:      ['목동 학원가·오목교 상권', '안양천 자전거도로 인접', '이마트·롯데마트 반경 2km', '병원·약국 밀도 양호'],
    education:   ['목동 학원가 전국 3위 수준', '초등학교 학군 우수', '학군 선호도 서울 4위', '어린이집 밀도 높음'],
    envRisk:     ['목동 아파트 단지 방범 완비', '양천경찰서 관할 치안 양호', '혐오시설 없음', '경인로 소음 일부'],
    futureValue: ['목동 재건축 추진 중', '공급 증가 예정', '9호선 연장 수혜'],
    supply:      ['목동 재건축 대기 중', '실거래 활발', '구축 단지 위주'],
  },
  구로구: {
    transport:   ['1·2·7호선 경유', '구로디지털단지역 환승 허브', '경인로·서부간선도로 접근', '광역버스 20개 이상 노선'],
    jobDemand:   ['구로디지털단지 IT 업무지구', '고려대안암병원 접근', '소득 수준 서울 중위', 'IT·스타트업 임대 수요'],
    living:      ['구로디지털단지 상권', '신도림 테크노마트·이마트', '안양천 산책로 접근', '병원·약국 밀도 보통'],
    education:   ['학원가 보통', '초등학교 학군 보통', '학군 선호도 중하위', '어린이집 보통'],
    envRisk:     ['구로경찰서 관할', '디지털단지 보안 강화', '혐오시설 일부 (공장 지역)', '녹지 비율 18%'],
    futureValue: ['구로 산업단지 재편 중', '공급 보통', '지하철 접근성 양호'],
    supply:      ['신구 혼재', '실거래 보통', '오래된 단지 많음'],
  },
  금천구: {
    transport:   ['1·7호선 경유', '가산디지털단지역 환승', '서부간선도로·시흥대로 접근', '광역버스 15개 이상 노선'],
    jobDemand:   ['가산디지털단지 IT 업무지구', '한림대학교강남성심병원 접근', '소득 수준 서울 하위', 'IT·물류 임대 수요'],
    living:      ['가산디지털단지 업무 상권', 'W몰·마리오아울렛 반경 1km', '삼성산·호압사 자연환경', '병원·약국 밀도 보통'],
    education:   ['학원가 제한적', '초등학교 학군 하위', '학군 선호도 낮음', '어린이집 보통'],
    envRisk:     ['금천경찰서 관할', '디지털단지 야간 방범', '공장·물류 혐오시설 일부', '녹지 비율 23%'],
    futureValue: ['가산 산업단지 재편', '공급 보통', '업무용 지역 성격 강함'],
    supply:      ['신구 혼재', '실거래 적음', '주거 공급 제한'],
  },
  관악구: {
    transport:   ['2호선·신림선 경유', '신림역·봉천역 환승', '남부순환도로·과천대로 접근', '광역버스 25개 이상 노선'],
    jobDemand:   ['여의도·강남 접근 가능', '보라매병원 3km', '소득 수준 서울 중하위', '대학생 임대 수요 높음'],
    living:      ['신림·봉천 대학가 상권', '관악산 국립공원 도보 20분', '이마트·홈플러스 반경 2km', '병원·약국 밀도 보통'],
    education:   ['신림 학원가 발달', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['관악경찰서 관할', '대학가 방범 강화', '혐오시설 적음', '녹지 비율 32% 쾌적'],
    futureValue: ['신림선 신규 수혜', '공급 보통', '재개발 잠재력'],
    supply:      ['구축 위주', '실거래 보통', '원룸·오피스텔 많음'],
  },
  동대문구: {
    transport:   ['1·2·5호선 경유', '동대문역사문화공원 환승', '왕산로·천호대로 버스 집중', '광역버스 25개 이상 노선'],
    jobDemand:   ['동대문 패션 업무지구', '한양대병원 3km', '소득 수준 서울 중위', '패션·의류 임대 수요'],
    living:      ['동대문 패션타운 핵심 상권', 'DDP·두타·밀리오레 쇼핑 복합', '용마산·배봉산 공원 접근', '병원·약국 밀도 보통'],
    education:   ['학원가 보통', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['동대문 관광지 방범 강화', '24시간 상업 지구 순찰', '혐오시설 적음', '청계천 주변 소음 일부'],
    futureValue: ['재개발 진행 일부', '공급 보통', '동대문 패션 지구 재편'],
    supply:      ['구축 위주', '실거래 보통', '상업·주거 혼재'],
  },
  중랑구: {
    transport:   ['7호선·경의중앙선 경유', '상봉역·면목역 환승', '동부간선도로·망우로 접근', '광역버스 15개 이상 노선'],
    jobDemand:   ['업무지구 접근성 낮음', '가까운 대학병원 부재', '소득 수준 서울 하위', '임대 수요 낮음'],
    living:      ['상봉 터미널 주변 상권', '중랑천 자전거도로 인접', '이마트 중랑점 반경 2km', '병원·약국 밀도 보통'],
    education:   ['학원가 제한적', '초등학교 학군 하위', '학군 선호도 낮음', '어린이집 보통'],
    envRisk:     ['중랑경찰서 관할 치안', '망우로 방범 강화', '중랑천 침수 위험 높음', '일부 혐오시설 존재'],
    futureValue: ['재개발 잠재력 있음', '공급 보통', '지하철 접근성 개선 필요'],
    supply:      ['구축 위주', '실거래 적음', '오래된 주거지 많음'],
  },
};

// ─── 경기도·인천 주요 시·구 점수 ────────────────────────────
// Kakao API 미설정 시 fallback — 서울 25개 구와 동일한 구조
export const GYEONGGI_SCORES: Record<string, DistrictScore> = {
  광명시:   { transport: 72, jobDemand: 58, living: 68, education: 62, envRisk: 72, futureValue: 55, supply: 65 },
  과천시:   { transport: 75, jobDemand: 65, living: 65, education: 70, envRisk: 85, futureValue: 77, supply: 58 },
  분당구:   { transport: 82, jobDemand: 78, living: 80, education: 85, envRisk: 80, futureValue: 65, supply: 70 },
  수정구:   { transport: 65, jobDemand: 60, living: 65, education: 65, envRisk: 70, futureValue: 48, supply: 62 },
  중원구:   { transport: 65, jobDemand: 60, living: 65, education: 65, envRisk: 70, futureValue: 46, supply: 62 },
  하남시:   { transport: 68, jobDemand: 55, living: 65, education: 58, envRisk: 72, futureValue: 45, supply: 62 },
  구리시:   { transport: 68, jobDemand: 55, living: 65, education: 60, envRisk: 72, futureValue: 52, supply: 62 },
  남양주시: { transport: 62, jobDemand: 50, living: 60, education: 55, envRisk: 70, futureValue: 38, supply: 58 },
  덕양구:   { transport: 70, jobDemand: 55, living: 65, education: 60, envRisk: 72, futureValue: 50, supply: 60 },
  일산동구: { transport: 72, jobDemand: 58, living: 70, education: 65, envRisk: 75, futureValue: 51, supply: 62 },
  일산서구: { transport: 70, jobDemand: 56, living: 68, education: 63, envRisk: 75, futureValue: 45, supply: 60 },
  부천시:   { transport: 72, jobDemand: 60, living: 68, education: 62, envRisk: 68, futureValue: 52, supply: 62 },
  동안구:   { transport: 75, jobDemand: 65, living: 72, education: 70, envRisk: 78, futureValue: 57, supply: 65 },
  만안구:   { transport: 68, jobDemand: 58, living: 65, education: 62, envRisk: 72, futureValue: 49, supply: 62 },
  팔달구:   { transport: 68, jobDemand: 60, living: 65, education: 62, envRisk: 70, futureValue: 52, supply: 60 },
  영통구:   { transport: 72, jobDemand: 63, living: 70, education: 68, envRisk: 75, futureValue: 42, supply: 62 },
  장안구:   { transport: 65, jobDemand: 55, living: 63, education: 60, envRisk: 70, futureValue: 42, supply: 58 },
  권선구:   { transport: 63, jobDemand: 53, living: 62, education: 58, envRisk: 70, futureValue: 38, supply: 58 },
  의왕시:   { transport: 65, jobDemand: 55, living: 62, education: 60, envRisk: 75, futureValue: 43, supply: 58 },
  군포시:   { transport: 65, jobDemand: 55, living: 63, education: 60, envRisk: 72, futureValue: 35, supply: 58 },
  의정부시: { transport: 67, jobDemand: 52, living: 63, education: 60, envRisk: 70, futureValue: 50, supply: 60 },
  연수구:   { transport: 70, jobDemand: 62, living: 68, education: 65, envRisk: 75, futureValue: 38, supply: 58 },
  남동구:   { transport: 68, jobDemand: 58, living: 65, education: 62, envRisk: 70, futureValue: 44, supply: 60 },
  부평구:   { transport: 72, jobDemand: 60, living: 68, education: 62, envRisk: 68, futureValue: 49, supply: 62 },
  계양구:   { transport: 68, jobDemand: 55, living: 63, education: 60, envRisk: 70, futureValue: 38, supply: 58 },
};

export const GYEONGGI_DETAILS: Record<string, DistrictDetails> = {
  광명시: {
    transport:   ['1호선 광명역 인접', 'GTX-B 광명역 2028년 개통 예정', 'KTX 광명역 고속철도 이용', '서해안고속도로 접근'],
    jobDemand:   ['가산디지털단지 접근 가능', '광명시내 일자리 보통', '서울 접근성 확보 시 직주근접 가능', '시흥·부천 산업단지 인접'],
    living:      ['광명시청·광명역 인근 상권', '이케아·롯데아울렛 광명점 인접', '광명동굴 관광자원', '근린공원 접근 가능'],
    education:   ['광명 학원가 중위권', '초등학교 반경 내 위치', '학군 선호도 수도권 보통', '어린이집 적정 수준'],
    envRisk:     ['경기도 수준 방범 서비스', '광명경찰서 관할', '혐오시설 일부 (산업시설)', '광명시흥 신도시 개발 진행'],
    futureValue: ['GTX-B 광명역 수혜', '철산·하안 재건축 진행', '광명시흥 신도시 공급 압박'],
    supply:      ['철산래미안자이 등 대단지 인접', '실거래 발생', '신도시 공급 예정'],
  },
  과천시: {
    transport:   ['4호선 과천역·정부청사역·경마공원역', 'GTX-C 과천청사역 2028년 예정', '과천대로 차량 접근', '서울 강남 20분 내'],
    jobDemand:   ['정부과천청사 공무원 수요', '과천지식정보타운 IT 클러스터', '서울 접근 우수', '고소득 직군 거주 선호'],
    living:      ['과천시장·중앙동 상권', '과천서울대공원·국립현대미술관', '관악산 등산로 인접', '대형마트 접근 20분'],
    education:   ['과천 학군 수도권 우수', '초등학교 학군 우수', '학군 선호도 높음', '어린이집 충분'],
    envRisk:     ['개발제한구역 많아 청정 환경', '과천경찰서 관할', '혐오시설 없음', '그린벨트 녹지 비율 높음'],
    futureValue: ['GTX-C 수혜', '과천지식정보타운 완료', '공급 극히 희소'],
    supply:      ['공급 제한적', '실거래 활발 (고가)', '구축·신축 혼재'],
  },
  분당구: {
    transport:   ['신분당선·분당선 두 노선 수혜', 'GTX-A 야탑·서현역 예정', '분당~내곡간 고속도로', '광역버스 강남 직통 다수'],
    jobDemand:   ['판교테크노밸리 10분 접근', '분당 업무지구 인접', '소득 수준 수도권 최상위급', 'IT·바이오 임대 수요 높음'],
    living:      ['서현·정자·수내 트리플 상권', '중앙공원·율동공원 도보권', '현대백화점·AK플라자 분당점', '병원·약국 밀도 높음'],
    education:   ['분당 학원가 수도권 2위급', '초등학교 우수 학군', '학군 선호도 수도권 최상위', '어린이집 밀도 높음'],
    envRisk:     ['분당경찰서 관할 치안 양호', 'CCTV 고밀도 신도시', '혐오시설 없음', '쾌적한 계획도시 환경'],
    futureValue: ['신분당선 연장·GTX-A 수혜', '분당 리모델링 진행', '공급 균형'],
    supply:      ['분당 대단지 밀집', '실거래 활발', '구축 위주 (리모델링 예정)'],
  },
  하남시: {
    transport:   ['5호선 미사역·하남풍산역 개통', '9호선 연장 계획', '하남~서울 광역버스', '경강선 접근'],
    jobDemand:   ['서울 강동·송파 출퇴근 가능', '하남 스타필드 주변 상권 성장', '소득 수준 수도권 중위', '미사·감일 신도시 성장'],
    living:      ['하남 스타필드 쇼핑·문화', '미사리 한강 수변공원', '이케아 하남점 인접', '병원·약국 밀도 보통'],
    education:   ['하남 학원가 성장 중', '초등학교 학군 보통', '학군 선호도 중위', '신도시 어린이집 충분'],
    envRisk:     ['하남경찰서 관할', '신도시 방범 인프라 완비', '혐오시설 적음', '일부 침수 위험 지역'],
    futureValue: ['5호선 연장 완료', '대규모 신규 공급', '신도시 성장 잠재력'],
    supply:      ['미사·감일 신규 아파트 다수', '실거래 활발', '신축 비율 높음'],
  },
  의정부시: {
    transport:   ['1호선 의정부역·경전철 운행', 'GTX-C 의정부역 2028년 예정', '의정부~서울 광역버스', '서울외곽순환도로 접근'],
    jobDemand:   ['의정부 시청 공무원 수요', '서울 접근 40~50분', '소득 수준 수도권 중하위', '임대 수요 보통'],
    living:      ['의정부역 인근 상권', '망월사·사패산 자연환경', '이마트·롯데마트 반경 3km', '병원·약국 밀도 보통'],
    education:   ['의정부 학원가 보통', '초등학교 학군 보통', '학군 선호도 중위', '어린이집 보통'],
    envRisk:     ['의정부경찰서 관할', 'CCTV 기본 설치 구역', '혐오시설 적음', '환경 보통'],
    futureValue: ['GTX-C 수혜 예정', '역세권 재개발 진행', '공급 보통'],
    supply:      ['구축 위주', '실거래 보통', '신축 소규모'],
  },
};

// ─── 기본값 (구 정보 미확인 시) ──────────────────────────────
export const DEFAULT_SCORE: DistrictScore = {
  transport:   72,
  jobDemand:   60,
  living:      70,
  education:   65,
  envRisk:     72,
  futureValue: 58,
  supply:      60,
};

export const DEFAULT_DETAILS: DistrictDetails = {
  transport:   ['시내버스 노선 이용 가능', '도보 이동 가능 거리 내 버스 정류장', '자가용 접근 가능'],
  jobDemand:   ['업무지구 접근 가능', '기본 의료시설 인근', '평균 소득 수준', '일반 임대 수요'],
  living:      ['근린 생활 편의시설 기본 충족', '슈퍼마켓·편의점 접근 가능', '근린공원 접근 가능'],
  education:   ['초등학교 반경 내 위치', '기본 학원 접근 가능', '평균적인 교육 환경'],
  envRisk:     ['경찰서 관할 방범 서비스', '기본 CCTV 설치 구역', '일반적인 주거 안전 환경'],
  futureValue: ['대규모 개발 계획 미확인', '현재 교통·인프라 수준 유지', '장기적 가치 불확실'],
  supply:      ['기본 아파트 단지 존재', '실거래 발생 중', '일반 주거 공급 수준'],
};

/**
 * 주소 문자열에서 구(區) 또는 독립시(市) 이름 추출
 * - 구 우선: "서울특별시 강남구 테헤란로 123" → "강남구"
 * - 독립시 fallback: "경기 광명시 시청로 50" → "광명시"
 *   (구 하위 행정구역이 없는 시 단위만 해당, Kakao API 없을 때 사용)
 */
export function extractDistrict(address: string): string {
  // 1) 구(區) 매칭 우선
  const guMatch = address.match(/([가-힣]+구)/);
  if (guMatch) return guMatch[1];
  // 2) 독립시(市) fallback — "~시" 뒤에 구가 없는 경우만
  // 예: "광명시", "하남시", "의왕시" 등
  const siMatch = address.match(/([가-힣]+시)(?!\s*[가-힣]+구)/);
  return siMatch ? siMatch[1] : '';
}

/**
 * 구·시 이름으로 점수 데이터 조회
 * 우선순위: 서울 25개 구 → 경기도·인천 → 기본값
 */
export function getDistrictScore(district: string): DistrictScore {
  return DISTRICT_SCORES[district] ?? GYEONGGI_SCORES[district] ?? DEFAULT_SCORE;
}

/**
 * 구·시 이름으로 세부 근거 조회
 * 우선순위: 서울 25개 구 → 경기도·인천 → 기본값
 */
export function getDistrictDetails(district: string): DistrictDetails {
  return DISTRICT_DETAILS[district] ?? GYEONGGI_DETAILS[district] ?? DEFAULT_DETAILS;
}
