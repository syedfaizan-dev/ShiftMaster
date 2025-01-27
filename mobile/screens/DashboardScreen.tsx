import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Shift } from '../../db/schema';

type NavigationProps = {
  navigation: {
    replace: (screen: string) => void;
    navigate: (screen: string) => void;
  };
};

export default function DashboardScreen({ navigation }: NavigationProps) {
  const [user, setUser] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    loadUser();
    fetchShifts();
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/shifts', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setShifts(data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch shifts');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      await AsyncStorage.removeItem('user');
      navigation.replace('Auth');
    } catch (error) {
      Alert.alert('Error', 'Logout failed');
    }
  };

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
        <Text style={styles.shiftsButtonText}>View Shifts</Text>
      </TouchableOpacity>

      <ScrollView style={styles.shiftsContainer}>
        <Text style={styles.sectionTitle}>Recent Shifts</Text>
        {shifts.map((shift) => (
          <View key={shift.id} style={styles.shiftCard}>
            <Text style={styles.shiftDate}>
              {new Date(shift.startTime).toLocaleDateString()}
            </Text>
            <Text style={styles.shiftTime}>
              {new Date(shift.startTime).toLocaleTimeString()} - 
              {new Date(shift.endTime).toLocaleTimeString()}
            </Text>
            {shift.notes && (
              <Text style={styles.shiftNotes}>{shift.notes}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  shiftCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  shiftDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shiftTime: {
    color: '#666',
    marginTop: 5,
  },
  shiftNotes: {
    marginTop: 5,
    color: '#666',
    fontStyle: 'italic',
  },
});