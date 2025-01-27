import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { type Shift } from '../../db/schema';

export default function ShiftsScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
          {shift.notes && (
            <Text style={styles.shiftNotes}>{shift.notes}</Text>
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
  shiftNotes: {
    marginTop: 5,
    color: '#666',
    fontStyle: 'italic',
  },
});