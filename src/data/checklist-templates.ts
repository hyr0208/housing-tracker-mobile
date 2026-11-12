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
    key: 'documents',
    label: '당첨·서류',
    items: [
      { id: 'tpl-winner-check', title: '당첨자·서류 제출 대상자 발표 확인', detail: '청약플러스·공급기관 사이트와 문자 안내를 확인해요.' },
      { id: 'tpl-income-docs', title: '소득·자산 증빙 서류 발급', detail: '건강보험 자격득실 확인서, 소득금액증명 등 공고문에 적힌 서류를 준비해요.' },
      { id: 'tpl-family-docs', title: '가족관계증명서·주민등록등본 발급', detail: '세대원 전원이 나오도록 상세로 발급해요.' },
      { id: 'tpl-submit-deadline', title: '서류 제출 기한 확인하고 제출', detail: '기한을 넘기면 부적격이 될 수 있어요. 마감일을 넣어 두세요.' },
    ],
  },
  {
    key: 'contract',
    label: '계약',
    items: [
      { id: 'tpl-contract-date', title: '계약일·장소 확인', detail: '공급기관 안내문에서 계약 일정과 장소를 확인해요.' },
      { id: 'tpl-contract-money', title: '계약금 준비', detail: '임대보증금의 일부를 계약 때 내요. 금액은 공고문에서 확인해요.' },
      { id: 'tpl-contract-items', title: '신분증·도장 챙기기', detail: '대리 계약이면 위임장과 대리인 신분증도 필요해요.' },
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
    ],
  },
];
