import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { supabase } from '../../supabaseClient';

export default function DashboardLayout() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          // Only navigate if authentication failed
          router.replace('/(frontpage)');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.replace('/(frontpage)');
      } finally {
        // Set checking to false regardless of outcome
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, []);

  // Use Slot instead of Redirect to render child routes
  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});