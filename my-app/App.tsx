import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';

import AnimationTab from './AnimationTab';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <AnimationTab />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101820',
  },
});
