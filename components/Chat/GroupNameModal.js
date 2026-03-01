import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from './styles';

const GroupNameModal = ({
  isGroupNameModalVisible,
  setGroupNameModalVisible,
  newGroupName,
  setNewGroupName,
  updateGroupName,
}) => {
  return (
    <Modal visible={isGroupNameModalVisible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Grup Adını Düzenle</Text>
          <TextInput
            style={styles.modalInput}
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="Yeni grup adı..."
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setGroupNameModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={updateGroupName}
            >
              <Text style={styles.modalButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default GroupNameModal;
