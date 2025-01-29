import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';

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

export default function ShiftsScreen() {
  const [shifts, setShifts] = useState<ShiftWithRelations[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShifts = async () => {
    try {
      const response = await fetch('http://0.0.0.0:5000/api/shifts', {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShifts();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {shifts.map((shift) => (
        <View key={shift.id} style={styles.shiftCard}>
          <Text style={styles.shiftDate}>
            {new Date(shift.startTime).toLocaleDateString()}
          </Text>
          <Text style={styles.shiftTime}>
            {new Date(shift.startTime).toLocaleTimeString()} - 
            {new Date(shift.endTime).toLocaleTimeString()}
          </Text>
          <Text style={styles.shiftRole}>
            Role: {shift.role?.name || 'Unknown'}
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
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
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
  shiftRole: {
    marginTop: 5,
    fontWeight: '500',
  },
  shiftInspector: {
    marginTop: 2,
    color: '#444',
  },
  shiftBackup: {
    marginTop: 2,
    color: '#666',
    fontStyle: 'italic',
  },
});