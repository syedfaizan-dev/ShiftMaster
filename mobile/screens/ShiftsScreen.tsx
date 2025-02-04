import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';

type ShiftWithRelations = {
  id: number;
  inspectorId: number;
  roleId: number;
  startTime: string;
  endTime: string;
  week: string;
  backupId: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  rejectionReason: string | null;
  inspector: { id: number; fullName: string; username: string };
  role: { id: number; name: string };
  backup?: { id: number; fullName: string; username: string } | null;
};

export default function ShiftsScreen() {
  const [shifts, setShifts] = useState<ShiftWithRelations[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftWithRelations | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);

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

  const handleAccept = async (shift: ShiftWithRelations) => {
    try {
      const response = await fetch(`http://0.0.0.0:5000/api/shifts/${shift.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'ACCEPT' }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Shift accepted successfully');
        fetchShifts();
      } else {
        Alert.alert('Error', 'Failed to accept shift');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process request');
    }
  };

  const handleReject = async () => {
    if (!selectedShift) return;

    try {
      const response = await fetch(`http://0.0.0.0:5000/api/shifts/${selectedShift.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Shift rejected successfully');
        setIsRejectModalVisible(false);
        setRejectionReason('');
        setSelectedShift(null);
        fetchShifts();
      } else {
        Alert.alert('Error', 'Failed to reject shift');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process request');
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
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
            <Text style={[
              styles.shiftStatus,
              shift.status === 'ACCEPTED' && styles.statusAccepted,
              shift.status === 'REJECTED' && styles.statusRejected,
            ]}>
              Status: {shift.status}
            </Text>

            {shift.status === 'PENDING' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAccept(shift)}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => {
                    setSelectedShift(shift);
                    setIsRejectModalVisible(true);
                  }}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={isRejectModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Shift</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter rejection reason..."
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsRejectModalVisible(false);
                  setRejectionReason('');
                  setSelectedShift(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleReject}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  shiftStatus: {
    marginTop: 5,
    fontWeight: '500',
  },
  statusAccepted: {
    color: '#22c55e',
  },
  statusRejected: {
    color: '#ef4444',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#ef4444',
  },
});