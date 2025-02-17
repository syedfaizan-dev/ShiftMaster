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

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type Inspector = {
  id: number;
  fullName: string;
  username: string;
};

type DayShift = {
  id: number;
  dayOfWeek: number;
  shiftType: ShiftType;
};

type ShiftWithRelations = {
  id: number;
  week: string;
  groupName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  rejectionReason: string | null;
  role: { id: number; name: string };
  inspectors: Array<{
    inspector: Inspector;
    isPrimary: boolean;
  }>;
  days: DayShift[];
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getShiftTypeDisplay = (shiftType?: ShiftType) => {
  if (!shiftType) return '-';
  if (shiftType.name.toLowerCase().includes('morning')) return 'Mo';
  if (shiftType.name.toLowerCase().includes('afternoon')) return 'A';
  if (shiftType.name.toLowerCase().includes('night')) return 'N';
  return '-';
};

const getShiftTypeColor = (shiftType?: ShiftType) => {
  if (!shiftType) return styles.noShift;
  if (shiftType.name.toLowerCase().includes('morning')) return styles.morningShift;
  if (shiftType.name.toLowerCase().includes('afternoon')) return styles.afternoonShift;
  if (shiftType.name.toLowerCase().includes('night')) return styles.nightShift;
  return styles.noShift;
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

  const renderDayShift = (days: DayShift[], dayOfWeek: number) => {
    const dayShift = days.find(d => d.dayOfWeek === dayOfWeek);
    const shiftType = dayShift?.shiftType;
    const displayText = getShiftTypeDisplay(shiftType);
    const colorStyle = getShiftTypeColor(shiftType);

    return (
      <View style={[styles.dayCell, colorStyle]}>
        <Text style={styles.shiftTypeText}>{displayText}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {shifts.map((shift) => (
          <View key={shift.id} style={styles.weekCard}>
            <Text style={styles.weekHeader}>
              Week: {shift.week} - Group: {shift.groupName}
            </Text>
            <Text style={styles.roleText}>
              Role: {shift.role?.name || 'Unknown'}
            </Text>

            {/* Weekly Table */}
            <View style={styles.weekTable}>
              {/* Header Row */}
              <View style={styles.tableRow}>
                <View style={[styles.inspectorCell, styles.headerCell]}>
                  <Text style={styles.headerText}>Inspectors</Text>
                </View>
                {DAYS.map((day) => (
                  <View key={day} style={[styles.dayCell, styles.headerCell]}>
                    <Text style={styles.headerText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Inspector Rows */}
              {shift.inspectors.map((inspector) => (
                <View key={inspector.inspector.id} style={styles.tableRow}>
                  <View style={styles.inspectorCell}>
                    <Text style={styles.inspectorName}>
                      {inspector.inspector.fullName}
                      {inspector.isPrimary ? ' (P)' : ''}
                    </Text>
                  </View>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <React.Fragment key={day}>
                      {renderDayShift(shift.days, day)}
                    </React.Fragment>
                  ))}
                </View>
              ))}
            </View>

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
    padding: 10,
  },
  weekCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weekHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  weekTable: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    backgroundColor: '#f8f9fa',
    padding: 8,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  inspectorCell: {
    flex: 2,
    padding: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  inspectorName: {
    fontSize: 12,
  },
  dayCell: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  shiftTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noShift: {
    backgroundColor: '#ffffff',
  },
  morningShift: {
    backgroundColor: '#e3f2fd',
  },
  afternoonShift: {
    backgroundColor: '#fff3e0',
  },
  nightShift: {
    backgroundColor: '#f3e5f5',
  },
  shiftStatus: {
    marginTop: 10,
    fontSize: 14,
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