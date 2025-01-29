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
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadUser();
        // Fetch users and roles first
        await Promise.all([
          fetchUsers(),
          fetchRoles(),
          fetchShifts()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
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

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/roles`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      console.log('Fetching shifts from:', `${API_BASE_URL}/api/shifts`);

      const response = await fetch(`${API_BASE_URL}/api/shifts`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Received shifts data:', data);

        // Enhance shift data with user and role information
        const enhancedShifts = data.map((shift: any) => ({
          ...shift,
          inspector: users.find(u => u.id === shift.inspectorId) || { fullName: 'Unknown' },
          role: roles.find(r => r.id === shift.roleId) || { name: 'Unknown' },
          backup: shift.backupId ? users.find(u => u.id === shift.backupId) : null,
        }));

        if (enhancedShifts.length > 0) {
          // Only show the most recent shifts on dashboard
          setShifts(enhancedShifts.slice(0, 5));
        } else {
          console.log('No shifts data received or empty array');
          setShifts([]);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch shifts:', errorText);
        throw new Error(`Failed to fetch shifts: ${errorText}`);
      }
    } catch (error) {
      console.error('Error in fetchShifts:', error);
      Alert.alert('Error', 'Failed to fetch shifts');
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
              <Text style={styles.shiftTime}>
                {new Date(shift.startTime).toLocaleDateString()} {new Date(shift.startTime).toLocaleTimeString()} - 
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

      <TouchableOpacity 
        style={styles.shiftsButton}
        onPress={() => navigation.navigate('Shifts')}
      >
        <Text style={styles.shiftsButtonText}>View All Shifts</Text>
      </TouchableOpacity>
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
  shiftsContainer: {
    flex: 1,
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
  shiftTime: {
    color: '#666',
    marginBottom: 5,
  },
  shiftInspector: {
    color: '#444',
    fontWeight: '500',
  },
  shiftBackup: {
    marginTop: 2,
    color: '#666',
    fontStyle: 'italic',
  },
});