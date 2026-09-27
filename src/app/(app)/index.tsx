import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/api/client';
import { Account, StatementEntry, StatementResponse } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardRoute() {
  const { user, logout } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available accounts and load the active account's statement
  const loadData = async (targetAccountId?: number) => {
    try {
      setError(null);

      // Fetch accounts list
      const accountsRes = await apiClient.get('/accounts');
      const accountsList: Account[] = accountsRes.data?.data || accountsRes.data || [];
      setAccounts(accountsList);

      // Determine which account to load:
      // Priority: targetAccountId -> account matching logged-in user.id -> first account
      let selectedAcc: Account | undefined;
      if (targetAccountId) {
        selectedAcc = accountsList.find((a) => a.id === targetAccountId);
      } else {
        selectedAcc =
          accountsList.find((a) => a.user_id === user?.id) ||
          accountsList[0];
      }

      if (selectedAcc) {
        setActiveAccount(selectedAcc);
        await fetchStatement(selectedAcc.id);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load statement');
      setIsLoading(false);
    }
  };

  // 2. Fetch statement for the chosen account ID: /accounts/{id}/statement
  const fetchStatement = async (accountId: number) => {
    try {
      const res = await apiClient.get<StatementResponse>(`/accounts/${accountId}/statement`);
      setStatement(res.data?.statement || []);
      if (res.data?.account) {
        setCurrentBalance(Number(res.data.account.current_balance) || 0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load statement details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeAccount) {
      fetchStatement(activeAccount.id);
    } else {
      loadData();
    }
  };

  const handleSelectAccount = (acc: Account) => {
    setActiveAccount(acc);
    setIsLoading(true);
    fetchStatement(acc.id);
  };

  // Calculate summary counts
  const totalIn = statement
    .filter((s) => s.direction === 'in')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const totalOut = statement
    .filter((s) => s.direction === 'out')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Assalam-o-Alaikum 👋</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>


      {/* Hero Passbook Balance Card */}
      <View style={styles.overviewCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="wallet-outline" size={15} color="#9ca3af" />
            <Text style={styles.accountBadge}>
              {activeAccount?.name || 'Khata Statement'}
            </Text>
          </View>
          <View
            style={[
              styles.balanceBadge,
              currentBalance > 0
                ? styles.badgeRed
                : currentBalance < 0
                ? styles.badgeGreen
                : styles.badgeNeutral,
            ]}>
            <Text
              style={[
                styles.badgeText,
                currentBalance > 0
                  ? styles.badgeTextRed
                  : currentBalance < 0
                  ? styles.badgeTextGreen
                  : styles.badgeTextNeutral,
              ]}>
              {currentBalance > 0
                ? 'Dene hain (Wajib)'
                : currentBalance < 0
                ? 'Lene hain (Wasool)'
                : 'Hisaab Barabar'}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.overviewAmount,
            currentBalance > 0
              ? styles.negativeText
              : currentBalance < 0
              ? styles.positiveText
              : styles.neutralText,
          ]}>
          Rs. {Math.abs(currentBalance).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
        </Text>

        {/* Mini Summary: Total IN vs Total OUT */}
        <View style={styles.miniSummaryRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>Kul Aaye (IN)</Text>
            <Text style={styles.miniStatIn}>
              + Rs. {totalIn.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.miniDivider} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>Kul Gaye (OUT)</Text>
            <Text style={styles.miniStatOut}>
              - Rs. {totalOut.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Statement Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Roznamcha / Statement ({statement.length})
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshLink}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Statement Transactions List */}
      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Statement load ho raha hai...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryText}>Dobara Koshish Karein</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={statement}
          keyExtractor={(item, index) => `${item.created_at}-${index}`}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isIn = item.direction === 'in';
            const amountVal = Number(item.amount) || 0;

            return (
              <View style={styles.statementCard}>
                {/* Top Row: Direction Tag + Amount */}
                <View style={styles.statementTopRow}>
                  <View
                    style={[
                      styles.directionPill,
                      isIn ? styles.pillGreen : styles.pillRed,
                    ]}>
                    <Ionicons
                      name={isIn ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={12}
                      color={isIn ? '#059669' : '#dc2626'}
                    />
                    <Text style={isIn ? styles.pillTextGreen : styles.pillTextRed}>
                      {isIn ? 'IN (Aaye)' : 'OUT (Gaye)'}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.statementAmount,
                      isIn ? styles.amountGreen : styles.amountRed,
                    ]}>
                    {isIn ? '+' : '-'} Rs.{' '}
                    {amountVal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {/* Middle Row: From Account -> To Account */}
                <View style={styles.routingRow}>
                  <View style={styles.accountParty}>
                    <Text style={styles.partyLabel}>From</Text>
                    <Text style={styles.partyName} numberOfLines={1}>
                      {item.from_account || 'N/A'}
                    </Text>
                  </View>

                  <Ionicons name="arrow-forward" size={13} color="#9ca3af" style={styles.arrowIcon} />

                  <View style={styles.accountParty}>
                    <Text style={styles.partyLabel}>To</Text>
                    <Text style={styles.partyName} numberOfLines={1}>
                      {item.to_account || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Note / Remarks */}
                {Boolean(item.note) && (
                  <View style={styles.noteBox}>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color="#059669" />
                    <Text style={styles.noteText}>{item.note}</Text>
                  </View>
                )}

                {/* Bottom Snapshot Row: Balance Before / After & Date */}
                <View style={styles.statementBottomRow}>
                  <View style={styles.snapshotBox}>
                    <Text style={styles.snapshotText}>
                      Balance:{' '}
                      <Text style={styles.snapshotVal}>
                        Rs. {Number(item.balance_before || 0).toLocaleString()}
                      </Text>{' '}
                      ➔{' '}
                      <Text style={styles.snapshotValBold}>
                        Rs. {Number(item.balance_after || 0).toLocaleString()}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Ionicons name="receipt-outline" size={44} color="#9ca3af" />
              <Text style={styles.emptyTitle}>Koi Transaction Record Nahi Mila</Text>
              <Text style={styles.emptySub}>
                Is account mein abhi tak koi transaction record nahi hui
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: 48,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  chipScrollContainer: {
    marginBottom: 12,
  },
  chipList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  accountChip: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accountChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  accountChipTextSelected: {
    color: '#ffffff',
  },
  overviewCard: {
    marginHorizontal: 20,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountBadge: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeGreen: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  badgeRed: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  badgeNeutral: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextGreen: {
    color: '#34d399',
  },
  badgeTextRed: {
    color: '#f87171',
  },
  badgeTextNeutral: {
    color: '#9ca3af',
  },
  overviewAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 14,
  },
  positiveText: {
    color: '#34d399',
  },
  negativeText: {
    color: '#f87171',
  },
  neutralText: {
    color: '#e5e7eb',
  },
  miniSummaryRow: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  miniStat: {
    flex: 1,
  },
  miniStatLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
  miniStatIn: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  miniStatOut: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  miniDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#374151',
    marginHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  refreshLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  statementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statementTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  directionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pillGreen: {
    backgroundColor: '#ecfdf5',
  },
  pillRed: {
    backgroundColor: '#fef2f2',
  },
  pillTextGreen: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  pillTextRed: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '800',
  },
  statementAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  amountGreen: {
    color: '#059669',
  },
  amountRed: {
    color: '#dc2626',
  },
  routingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  accountParty: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
  },
  statementBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  snapshotBox: {
    flex: 1,
  },
  snapshotText: {
    fontSize: 11,
    color: '#6b7280',
  },
  snapshotVal: {
    color: '#9ca3af',
  },
  snapshotValBold: {
    color: '#111827',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 8,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
