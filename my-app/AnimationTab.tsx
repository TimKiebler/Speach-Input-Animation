import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import HexNative from './HexNative';
import OrbNative from './OrbNative';

const AnimationTab: React.FC = () => {
  const [shape, setShape] = React.useState<'circle' | 'hex'>('circle');

  const renderToggle = (value: 'circle' | 'hex', label: string) => {
    const active = shape === value;
    return (
      <Pressable
        key={value}
        onPress={() => setShape(value)}
        style={[styles.toggleButton, active && styles.toggleButtonActive]}
      >
        <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleBar}>
        {renderToggle('circle', 'Circle')}
        {renderToggle('hex', 'Hexagon')}
      </View>
      <View style={styles.renderer}>
        {shape === 'circle' ? <OrbNative /> : <HexNative />}
      </View>
    </View>
  );
};

export default AnimationTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050014',
  },
  toggleBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(9,4,24,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    marginHorizontal: 8,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.95)',
    borderColor: 'rgba(180, 140, 255, 0.8)',
    shadowOpacity: 0.6,
    shadowColor: 'rgba(64, 32, 160, 1)',
  },
  toggleLabel: {
    color: 'rgba(240,244,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 13,
  },
  toggleLabelActive: {
    color: '#fff',
  },
  renderer: {
    flex: 1,
  },
});
