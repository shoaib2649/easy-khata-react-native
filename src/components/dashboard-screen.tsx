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

interface Account {
  id: number;
  name: string;
  phone?: string;
  bank_name?: string;
  account_number?: string;
  current_balance: number;
}

export function DashboardScreen() {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/accounts');
      setAccounts(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAccounts();
  };

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (Number(acc.current_balance) || 0),
    0
  );

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

      {/* Main Balance Overview Card */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewLabel}>Total Net Khata Balance</Text>
        <Text
          style={[
            styles.overviewAmount,
            totalBalance >= 0 ? styles.positiveText : styles.negativeText,
          ]}>
          Rs. {totalBalance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Backend API Connected</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Khata Accounts ({accounts.length})</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshLink}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Accounts List */}
      {isLoading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Accounts load ho rahe hain...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAccounts}>
            <Text style={styles.retryText}>Dobara Koshish Karein</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const balance = Number(item.current_balance) || 0;
            return (
              <View style={styles.accountCard}>
                <View style={styles.accountLeft}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.avatarLetter}>
                      {item.name ? item.name.charAt(0).toUpperCase() : 'A'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.accountName}>{item.name}</Text>
                    <Text style={styles.accountSub}>
                      {item.bank_name || item.phone || 'Cash / Wallet'}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountRight}>
                  <Text
                    style={[
                      styles.accountBalance,
                      balance >= 0 ? styles.balanceGreen : styles.balanceRed,
                    ]}>
                    Rs. {balance.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={styles.balanceStatus}>
                    {balance >= 0 ? 'Lene hain' : 'Dene hain'}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Text style={styles.emptyEmoji}>📂</Text>
              <Text style={styles.emptyTitle}>Koi Account Nahi Mila</Text>
              <Text style={styles.emptySub}>Aap backend se accounts add kar sakte hain</Text>
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
    marginBottom: 16,
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
    marginBottom: 20,
  },
  overviewLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  overviewAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  positiveText: {
    color: '#34d399',
  },
  negativeText: {
    color: '#f87171',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 14,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  statusText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  accountSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  accountRight: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: 15,
    fontWeight: '800',
  },
  balanceGreen: {
    color: '#059669',
  },
  balanceRed: {
    color: '#dc2626',
  },
  balanceStatus: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
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
  },
});
