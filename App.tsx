import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Stash Photos</Text>
      <Text style={styles.subtitle}>ThePornDB Auto-Tagger</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e6edf3',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 10,
  },
});
