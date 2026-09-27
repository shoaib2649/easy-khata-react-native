import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function IndexRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return user ? <Redirect href="/(app)" /> : <Redirect href="/(auth)/login" />;
}
