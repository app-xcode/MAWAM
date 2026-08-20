import React, { useMemo, useState } from 'react';
import {
  TouchableOpacity, Modal, FlatList, StyleSheet, ViewStyle,
  TextStyle, Dimensions, Keyboard, TextInput, View
} from 'react-native';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';

// Definisikan tipe data untuk kejelasan (opsional jika pakai .tsx)
interface OptionItem {
  label: string;
  value: string | number;
}

interface CustomSelectProps {
    value?: any;
    data: OptionItem[];
    onSelect: (item: OptionItem) => void;
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    inputStyle?: {
        button?: ViewStyle,
        buttonText?: TextStyle
        overlay?: ViewStyle
        item?: ViewStyle
        itemText?: TextStyle
    }
}
const { height } = Dimensions.get('window')

export const CustomSelect = ({
    value,
    data = [],
    onSelect,
    placeholder = "Pilih...",
    inputStyle,
    searchable = false,
    searchPlaceholder = 'Cari...'
}: CustomSelectProps) => {

  const [visible, setVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OptionItem | null>(null);
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return keyword ? data.filter((item) => item.label.toLowerCase().includes(keyword)) : data;
  }, [data, search]);

  const handleSelect = (item: OptionItem) => {
    setSelectedItem(item);
    onSelect(item);
    setSearch('');
    setVisible(false);
  };

  const showLabel = (id: any) => {
    if (id === undefined || id === null || id === '') return null;

    const item = data.find(item => item.value == id);

    return item?.label ?? null;
  };

  return (
    <React.Fragment>
      <TouchableOpacity style={[styles.button, inputStyle?.button]} onPress={() => {
        Keyboard.dismiss();
        setTimeout(() => {
          setVisible(true)
        }, 150);
      }}>
        <ThemedText style={[styles.text, inputStyle?.buttonText]}>
          {showLabel(value) || (selectedItem?.label ?? placeholder)}
        </ThemedText>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" >
        <TouchableOpacity
          style={[styles.overlay, inputStyle?.overlay]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
        <ThemedView style={styles.dropdown}>
            {searchable && (
              <View style={styles.searchWrap}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#888"
                  style={styles.searchInput}
                  autoFocus
                />
              </View>
            )}
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <ThemedView>
                  <TouchableOpacity style={[styles.item, inputStyle?.item]} onPress={() => handleSelect(item)}>
                    <ThemedText style={[styles.itemText, inputStyle?.itemText]}>{item.label}</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              )}
            />
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </React.Fragment>
  );
};


const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'hsla(0, 0%, 0%, 0.56)%, 0%, 0.18)',
    paddingHorizontal: 20,
  },
  dropdown: {
    borderRadius: 8,
    maxHeight: height - (0.3 * height),
    overflow: 'hidden',
    padding: 8
  },
  searchWrap: {
    paddingBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111',
  },
  item: {
    padding: 10,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginVertical: 1
  },
  itemText: {
    fontSize: 16,
  }
});
