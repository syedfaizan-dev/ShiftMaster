import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://0.0.0.0:5000';

type NavigationProps = {
  navigation: {
    replace: (screen: string) => void;
    navigate: (screen: string) => void;
  };
};

type ShiftWithRelations = {
  id: number;
  inspectorId: number;
  roleId: number;
  startTime: string;
  endTime: string;
  week: string;
  backupId: number | null;
  inspector: { id: number; fullName: string; username: string };
  role: { id: number; name: string };
  backup?: { id: number; fullName: string; username: string } | null;
};

export default function DashboardScreen({ navigation }: NavigationProps) {
  const [user, setUser] = useState<any>(null);
  const [shifts, setShifts] = useState<ShiftWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    fetchShifts();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/shifts`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Only show the most recent shifts on dashboard
        setShifts(data.slice(0, 5));
      } else {
        throw new Error('Failed to fetch shifts');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch shifts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      await AsyncStorage.removeItem('user');
      navigation.replace('Auth');
    } catch (error) {
      Alert.alert('Error', 'Logout failed');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#01843d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.shiftsButton}
        onPress={() => navigation.navigate('Shifts')}
      >
        <Text style={styles.shiftsButtonText}>View All Shifts</Text>
      </TouchableOpacity>

      <ScrollView style={styles.shiftsContainer}>
        <Text style={styles.sectionTitle}>Recent Shifts</Text>
        {shifts.length === 0 ? (
          <Text style={styles.noShifts}>No shifts found</Text>
        ) : (
          shifts.map((shift) => (
            <View key={shift.id} style={styles.shiftCard}>
              <Text style={styles.shiftRole}>
                {shift.role?.name || 'Unknown Role'}
              </Text>
              <Text style={styles.shiftDate}>
                {new Date(shift.startTime).toLocaleDateString()}
              </Text>
              <Text style={styles.shiftTime}>
                {new Date(shift.startTime).toLocaleTimeString()} - 
                {new Date(shift.endTime).toLocaleTimeString()}
              </Text>
              <Text style={styles.shiftInspector}>
                Inspector: {shift.inspector?.fullName || 'Unknown'}
              </Text>
              {shift.backup && (
                <Text style={styles.shiftBackup}>
                  Backup: {shift.backup.fullName}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#01843d',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: '#00a3df',
    padding: 10,
    borderRadius: 5,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  shiftsButton: {
    backgroundColor: '#01843d',
    margin: 20,
    padding: 15,
    borderRadius: 5,
  },
  shiftsButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  shiftsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noShifts: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  shiftCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  shiftRole: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#01843d',
    marginBottom: 5,
  },
  shiftDate: {
    fontSize: 14,
    color: '#444',
  },
  shiftTime: {
    color: '#666',
    marginTop: 2,
  },
  shiftInspector: {
    marginTop: 5,
    color: '#444',
    fontWeight: '500',
  },
  shiftBackup: {
    marginTop: 2,
    color: '#666',
    fontStyle: 'italic',
  },
});