import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CollapsibleFilters } from '@/components/collapsible-filters';
import { loadAppData, saveAppData, subscribeToAppData, type NoticeAlertSettings, type ScheduleEvent } from '@/data/storage';
import { applyPhaseOf, fetchNotices, matchesNoticeSettings, NOTICE_REGIONS, NOTICE_SORTS, NOTICE_SUPPLY_TYPES, saveNoticeAlert, sortNotices, type HousingNotice, type NoticeSort } from '@/services/notices';
import { toDateKey } from '@/services/schedule';

const defaultSettings: NoticeAlertSettings = { enabled: false, regions: [], supplyTypes: [] };
const VISIBLE_COUNT = 8;

function formatShortDay(value: string) {
  return value ? value.slice(5).replace('-', '.') : '';
}

// 관심 지역·공급유형의 모집공고를 보여주고, 새 공고가 올라오면 푸시로 받을지 설정한다.
export function NoticeAlertsSection() {
  const [settings, setSettings] = useState<NoticeAlertSettings>(defaultSettings);
  const [pushToken, setPushToken] = useState<string>();
  const [notices, setNotices] = useState<HousingNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [statusMessage, setStatusMessage] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<NoticeSort>('latest');
  const [hideClosed, setHideClosed] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  const loadNotices = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(undefined);
    fetchNotices()
      .then(setNotices)
      .catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : '모집공고를 불러오지 못했어요.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadAppData().then((data) => {
      setSettings(data.noticeAlert ?? defaultSettings);
      setPushToken(data.pushToken);
      setEvents(data.events ?? []);
    });
    loadNotices();
    return subscribeToAppData((data) => setEvents(data.events ?? []));
  }, [loadNotices]);

  // 공고의 접수 기간을 홈의 '다가오는 일정'에 넣거나 뺀다. 알림 예약은 홈 화면이 일정 목록을 보고 처리한다.
  const toggleApplyEvent = async (notice: HousingNotice) => {
    const data = await loadAppData();
    const current = data.events ?? [];
    const exists = current.some((event) => event.noticeId === notice.id);
    const nextEvents = exists
      ? current.filter((event) => event.noticeId !== notice.id)
      : [...current, { id: `event-${Date.now()}`, title: notice.title, kind: 'apply' as const, date: notice.applyBegin, endDate: notice.applyEnd || undefined, noticeId: notice.id, url: notice.url }];
    setEvents(nextEvents);
    await saveAppData({ ...data, events: nextEvents });
  };

  const persist = async (next: NoticeAlertSettings) => {
    setSettings(next);
    const data = await loadAppData();
    await saveAppData({ ...data, noticeAlert: next });
    if (!pushToken) {
      setStatusMessage(next.enabled ? '알림 권한이 꺼져 있어 푸시를 보낼 수 없어요. 설정에서 알림을 허용해 주세요.' : undefined);
      return;
    }
    try {
      await saveNoticeAlert(pushToken, next);
      setStatusMessage(next.enabled && next.regions.length > 0 ? '조건에 맞는 새 공고가 올라오면 알려드릴게요.' : undefined);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '알림 설정을 저장하지 못했어요.');
    }
  };

  const toggleItem = (key: 'regions' | 'supplyTypes', value: string) => {
    const list = settings[key];
    const nextList = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    const next = { ...settings, [key]: nextList };
    // 지역을 모두 빼면 받을 공고가 없으므로 알림도 끈다.
    void persist(next.regions.length === 0 ? { ...next, enabled: false } : next);
  };

  const toggleEnabled = () => {
    if (!settings.enabled && settings.regions.length === 0) {
      setStatusMessage('알림을 받을 관심 지역을 먼저 골라 주세요.');
      return;
    }
    void persist({ ...settings, enabled: !settings.enabled });
  };

  const today = toDateKey(new Date());
  const matched = useMemo(() => sortNotices(
    notices.filter((notice) => matchesNoticeSettings(notice, settings) && (!hideClosed || applyPhaseOf(notice, today).phase !== 'closed')),
    sort,
    today,
  ), [notices, settings, sort, hideClosed, today]);
  const visible = showAll ? matched : matched.slice(0, VISIBLE_COUNT);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.settingsTitle}>새 공고 알림</Text>
        <Pressable style={[styles.toggle, settings.enabled && styles.toggleOn]} onPress={toggleEnabled} accessibilityRole="switch" accessibilityState={{ checked: settings.enabled }}>
          <Text style={[styles.toggleText, settings.enabled && styles.toggleTextOn]}>{settings.enabled ? '알림 받는 중' : '알림 받기'}</Text>
        </Pressable>
      </View>
      <Text style={styles.description}>관심 지역을 고르고 알림을 켜면, 조건에 맞는 새 공고가 올라올 때 알려드려요.</Text>

      <CollapsibleFilters summary={`${settings.regions.length ? settings.regions.join(', ') : '전국'} · ${settings.supplyTypes.length ? settings.supplyTypes.join(', ') : '전체 유형'}`}>
      <Text style={styles.groupLabel}>관심 지역</Text>
      <View style={styles.chips}>
        {NOTICE_REGIONS.map((region) => <Pressable key={region} style={[styles.chip, settings.regions.includes(region) && styles.chipSelected]} onPress={() => toggleItem('regions', region)}><Text style={[styles.chipText, settings.regions.includes(region) && styles.chipTextSelected]}>{region}</Text></Pressable>)}
      </View>
      <Text style={styles.groupLabel}>공급유형 <Text style={styles.groupHint}>(안 고르면 전체)</Text></Text>
      <View style={styles.chips}>
        {NOTICE_SUPPLY_TYPES.map((type) => <Pressable key={type} style={[styles.chip, settings.supplyTypes.includes(type) && styles.chipSelected]} onPress={() => toggleItem('supplyTypes', type)}><Text style={[styles.chipText, settings.supplyTypes.includes(type) && styles.chipTextSelected]}>{type}</Text></Pressable>)}
      </View>
      </CollapsibleFilters>
      {statusMessage && <Text style={styles.status}>{statusMessage}</Text>}

      <View style={styles.listHeader}>
        <Text style={styles.groupLabel}>{settings.regions.length || settings.supplyTypes.length ? `조건에 맞는 공고 ${matched.length}건` : `진행 중인 전국 공고 ${matched.length}건`}</Text>
        <Pressable onPress={loadNotices} disabled={isLoading}><Text style={styles.refresh}>{isLoading ? '불러오는 중…' : '새로고침'}</Text></Pressable>
      </View>
      <View style={styles.sortRow}>
        {NOTICE_SORTS.map((item) => <Pressable key={item.key} style={[styles.sortChip, sort === item.key && styles.sortChipOn]} onPress={() => { setSort(item.key); setShowAll(false); }}><Text style={[styles.sortText, sort === item.key && styles.sortTextOn]}>{item.label}</Text></Pressable>)}
        <Pressable style={[styles.sortChip, hideClosed && styles.sortChipOn]} onPress={() => setHideClosed((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: hideClosed }}><Text style={[styles.sortText, hideClosed && styles.sortTextOn]}>{hideClosed ? '✓ ' : ''}마감 숨기기</Text></Pressable>
      </View>
      {isLoading && notices.length === 0 ? <ActivityIndicator color="#327e67" style={styles.loading} />
        : errorMessage ? <Text style={styles.empty}>{errorMessage}</Text>
        : matched.length === 0 ? <Text style={styles.empty}>지금은 조건에 맞는 공고가 없어요. 새로 올라오면 알려드릴게요.</Text>
        : visible.map((notice) => <Pressable key={notice.id} style={({ pressed }) => [styles.notice, pressed && styles.noticePressed]} onPress={() => void Linking.openURL(notice.url)}>
          <View style={styles.noticeTags}>
            <Text style={styles.noticeTag}>{notice.supplyType}</Text>
            <Text style={styles.noticeRegion}>{[notice.region, notice.districts[0]].filter(Boolean).join(' ')}{notice.districts.length > 1 ? ` 외 ${notice.districts.length - 1}곳` : ''}</Text>
            {(() => {
              const phase = applyPhaseOf(notice, today);
              return phase.label ? <Text style={[styles.phase, phase.phase === 'open' && styles.phaseOpen, phase.phase === 'closed' && styles.phaseClosed]}>{phase.label}</Text> : null;
            })()}
          </View>
          <Text style={styles.noticeTitle} numberOfLines={2}>{notice.title}</Text>
          <Text style={styles.noticeMeta}>{notice.institution} · 공고 {formatShortDay(notice.announcedAt)}{notice.applyBegin ? ` · 접수 ${formatShortDay(notice.applyBegin)}~${formatShortDay(notice.applyEnd)}` : ''}  ↗</Text>
          {notice.applyBegin && <Pressable style={[styles.scheduleButton, events.some((event) => event.noticeId === notice.id) && styles.scheduleButtonOn]} onPress={() => void toggleApplyEvent(notice)} hitSlop={6}>
            <Text style={[styles.scheduleText, events.some((event) => event.noticeId === notice.id) && styles.scheduleTextOn]}>{events.some((event) => event.noticeId === notice.id) ? '✓ 접수일 알림 설정됨' : '＋ 접수일 알림 받기'}</Text>
          </Pressable>}
        </Pressable>)}
      {!showAll && matched.length > VISIBLE_COUNT && <Pressable style={styles.more} onPress={() => setShowAll(true)}><Text style={styles.moreText}>{matched.length - VISIBLE_COUNT}건 더 보기</Text></Pressable>}
      <Text style={styles.source}>마이홈포털 공공임대 모집공고 기준이에요. 자세한 자격과 일정은 공고문에서 꼭 확인해 주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsTitle: { color: '#243b34', fontSize: 17, fontWeight: '800' },
  toggle: { borderRadius: 9, borderWidth: 1, borderColor: '#cfe3d9', paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#fff' },
  toggleOn: { backgroundColor: '#327e67', borderColor: '#327e67' },
  toggleText: { color: '#38856d', fontSize: 13, fontWeight: '800' },
  toggleTextOn: { color: '#fff' },
  description: { color: '#8c9c94', fontSize: 13, marginTop: 6, lineHeight: 19 },
  groupLabel: { color: '#587368', fontSize: 13, fontWeight: '800', marginTop: 16 },
  groupHint: { color: '#9aa9a1', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#dcebe2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f8fbf8' },
  chipSelected: { backgroundColor: '#d5eee2', borderColor: '#83c4aa' },
  chipText: { color: '#6b8c7d', fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: '#2f7d64' },
  status: { color: '#428b72', fontSize: 13, marginTop: 10 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  refresh: { color: '#38856d', fontSize: 13, fontWeight: '800' },
  loading: { marginTop: 18 },
  empty: { color: '#9aa9a1', fontSize: 13, marginTop: 10, lineHeight: 19 },
  notice: { backgroundColor: '#fff', borderColor: '#e4ece7', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 9 },
  noticePressed: { opacity: 0.7 },
  noticeTags: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  noticeTag: { color: '#2f7d64', backgroundColor: '#e4f3ec', overflow: 'hidden', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, fontSize: 12, fontWeight: '800' },
  noticeRegion: { color: '#72a391', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  phase: { marginLeft: 'auto', color: '#6b8c7d', fontSize: 12, fontWeight: '800' },
  phaseOpen: { color: '#d06f55' },
  phaseClosed: { color: '#a9b4ae' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sortChip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eef4f0' },
  sortChipOn: { backgroundColor: '#327e67' },
  sortText: { color: '#6b8c7d', fontSize: 12, fontWeight: '800' },
  sortTextOn: { color: '#fff' },
  noticeTitle: { color: '#243b34', fontSize: 15, fontWeight: '800', marginTop: 8, lineHeight: 21 },
  noticeMeta: { color: '#9aa9a1', fontSize: 12, marginTop: 6 },
  scheduleButton: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 7, borderWidth: 1, borderColor: '#cfe3d9', paddingHorizontal: 9, paddingVertical: 6 },
  scheduleButtonOn: { backgroundColor: '#e4f3ec', borderColor: '#e4f3ec' },
  scheduleText: { color: '#38856d', fontSize: 12, fontWeight: '800' },
  scheduleTextOn: { color: '#2f7d64' },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { color: '#38856d', fontSize: 13, fontWeight: '800' },
  source: { color: '#a9b4ae', fontSize: 11, marginTop: 10, lineHeight: 17 },
});
