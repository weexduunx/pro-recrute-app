import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/(app)/home'); // ou une autre route
    }
  }, [user, router]);

  return <Slot />;
}
