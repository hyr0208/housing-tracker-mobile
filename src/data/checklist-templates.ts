export type ChecklistTemplateItem = {
  id: string;
  title: string;
  detail: string;
};

export type ChecklistTemplateStage = {
  key: string;
  label: string;
  items: ChecklistTemplateItem[];
};

// 무엇부터 할지 모르는 사람을 위한 추천 항목. 공급기관·유형마다 서류와 순서가 조금씩 달라서 공고문 확인 안내를 함께 보여준다.
export const CHECKLIST_TEMPLATES: ChecklistTemplateStage[] = [
  {
    key: 'before',
    label: '신청 전',
    items: [
      { id: 'tpl-eligibility', title: '공고문 자격 요건 확인', detail: '무주택 여부, 소득·자산 기준, 거주지 요건을 확인해요.' },
      { id: 'tpl-no-house', title: '세대원 주택 소유 여부 확인', detail: '세대원 전원이 무주택이어야 하는 유형이 많아요.' },
      { id: 'tpl-car-value', title: '자동차 가액 확인', detail: '자산 기준에 자동차 가액 기준이 따로 있어요.' },
      { id: 'tpl-savings-account', title: '청약통장 확인', detail: '유형에 따라 필요해요. 공고문에서 확인해요.' },
      { id: 'tpl-apply-schedule', title: '신청 일정 등록하기', detail: '접수 기간이 짧아요. 홈의 일정에 넣어 두면 알려드려요.' },
    ],
  },
  {
    key: 'documents',
    label: '당첨·서류',
    items: [
      { id: 'tpl-winner-check', title: '당첨자·서류 제출 대상자 발표 확인', detail: '청약플러스·공급기관 사이트와 문자 안내를 확인해요.' },
      { id: 'tpl-income-docs', title: '소득·자산 증빙 서류 발급', detail: '건강보험 자격득실 확인서, 소득금액증명 등 공고문에 적힌 서류를 준비해요.' },
      { id: 'tpl-family-docs', title: '가족관계증명서·주민등록등본 발급', detail: '세대원 전원이 나오도록 상세로 발급해요.' },
      { id: 'tpl-submit-deadline', title: '서류 제출 기한 확인하고 제출', detail: '기한을 넘기면 부적격이 될 수 있어요. 마감일을 넣어 두세요.' },
      { id: 'tpl-financial-consent', title: '금융정보 제공 동의서 제출', detail: '자산 조회에 필요해요. 세대원 동의가 모두 필요할 수 있어요.' },
      { id: 'tpl-doc-copies', title: '제출 서류 사본 보관', detail: '보완 요청이 오면 바로 대응할 수 있어요.' },
    ],
  },
  {
    key: 'contract',
    label: '계약',
    items: [
      { id: 'tpl-contract-date', title: '계약일·장소 확인', detail: '공급기관 안내문에서 계약 일정과 장소를 확인해요.' },
      { id: 'tpl-contract-money', title: '계약금 준비', detail: '임대보증금의 일부를 계약 때 내요. 금액은 공고문에서 확인해요.' },
      { id: 'tpl-contract-items', title: '신분증·도장 챙기기', detail: '대리 계약이면 위임장과 대리인 신분증도 필요해요.' },
      { id: 'tpl-deposit-account', title: '보증금 납부 계좌·기한 확인', detail: '납부 계좌와 기한을 안내문에서 확인해요.' },
      { id: 'tpl-move-in-period', title: '입주 지정 기간 확인', detail: '이 기간 안에 잔금을 내고 입주해야 해요.' },
      { id: 'tpl-contract-copy', title: '계약서 사본 보관', detail: '전입신고, 대출, 재계약 때 필요해요.' },
    ],
  },
  {
    key: 'prepare',
    label: '입주 준비',
    items: [
      { id: 'tpl-loan', title: '잔금·보증금 대출 알아보기', detail: '버팀목 전세자금 등 대출은 심사 기간이 있어 미리 알아봐요.' },
      { id: 'tpl-inspection', title: '사전점검 날짜 확인', detail: '신규 단지는 입주 전 사전점검 기간이 있어요.' },
      { id: 'tpl-current-home', title: '지금 집 계약 만료·보증금 반환 일정 맞추기', detail: '입주일과 지금 집 퇴거일이 겹치지 않게 조율해요.' },
      { id: 'tpl-moving', title: '이사업체 견적 받기', detail: '손 없는 날과 주말은 일찍 예약이 차요.' },
      { id: 'tpl-deposit-conversion', title: '전환보증금 검토', detail: '보증금을 올리고 월 임대료를 낮출 수 있어요. 가능 여부는 공급기관에 확인해요.' },
      { id: 'tpl-furniture-size', title: '평면도 보고 가구 치수 재기', detail: '냉장고·세탁기·침대가 들어가는지 미리 확인해요.' },
      { id: 'tpl-keys', title: '열쇠 받는 방법 확인', detail: '관리사무소나 공급기관에서 받는 곳과 필요한 서류를 확인해요.' },
      { id: 'tpl-settle-bills', title: '지금 집 관리비·공과금 정산', detail: '이사 당일 계량기 숫자로 정산해요.' },
    ],
  },
  {
    key: 'move',
    label: '입주',
    items: [
      { id: 'tpl-defects', title: '하자 점검하고 사진 남기기', detail: '입주 직후 상태를 사진으로 남기면 퇴거할 때 도움이 돼요.' },
      { id: 'tpl-move-in-report', title: '전입신고·확정일자 받기', detail: '이사한 날부터 14일 안에 정부24나 주민센터에서 해요.' },
      { id: 'tpl-utilities', title: '전기·가스·인터넷 신청', detail: '가스는 개통 방문 예약이 필요해요.' },
      { id: 'tpl-management-office', title: '관리사무소 입주 등록', detail: '차량 등록과 관리비 자동이체도 같이 신청해요.' },
      { id: 'tpl-address-change', title: '은행·카드·보험 주소 변경', detail: '정부24 주소 일괄 변경 서비스로 한 번에 할 수 있어요.' },
      { id: 'tpl-mail-forwarding', title: '우편물 주소 이전 신청', detail: '우체국 전송 서비스로 예전 주소 우편물을 받아요.' },
      { id: 'tpl-rent-autopay', title: '임대료 자동이체 신청', detail: '연체되면 재계약에 불리할 수 있어요.' },
      { id: 'tpl-meter-photo', title: '계량기 숫자 사진 남기기', detail: '전기·가스·수도 첫 숫자를 기록해 두면 정산할 때 좋아요.' },
      { id: 'tpl-school-transfer', title: '자녀 전학 신청', detail: '전입신고 후 새 학교나 주민센터에서 신청해요.' },
    ],
  },
  {
    key: 'after',
    label: '입주 후',
    items: [
      { id: 'tpl-renewal-date', title: '재계약 일정 확인', detail: '보통 2년마다 소득·자산을 다시 심사해요.' },
      { id: 'tpl-income-change', title: '소득·자산 변동 확인', detail: '기준을 넘으면 재계약이 어렵거나 임대료가 오를 수 있어요.' },
    ],
  },
];
