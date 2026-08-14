import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const NAVY = '#0F1520';
const NAVY_LIGHT = '#1B2640';

export function SplashScreen({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const overlay = useRef(new Animated.Value(0)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlay, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(logo, { toValue: 1, friction: 5, tension: 42, useNativeDriver: true }),
    ]).start();
    const spinner = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 950, easing: Easing.linear, useNativeDriver: true }));
    const ping = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]));
    spinner.start();
    ping.start();
    return () => { spinner.stop(); ping.stop(); };
  }, [overlay, logo, spin, pulse]);

  useEffect(() => {
    if (ready) {
      Animated.parallel([
        Animated.timing(overlay, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(logo, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(() => onFinish());
    }
  }, [ready, overlay, logo, onFinish]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.05] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Animated.View style={[styles.root, { opacity: overlay }]}>
      <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <View style={styles.logoArea}>
          <Animated.View pointerEvents="none" style={[styles.ping, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          <Animated.View pointerEvents="none" style={[styles.ping, { opacity: ringOpacity, transform: [{ scale: ringScale }] }, { position: 'absolute' }]} />
          <Animated.Image
            source={require('../assets/splash-icon.png')}
            style={[styles.logo, { opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}
          />
        </View>
        <Animated.Text style={[styles.brand, { opacity: logo }]}>XYTEEE</Animated.Text>
        <View style={styles.spinnerWrap}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
          <Animated.View style={[styles.spinnerReverse, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }] }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoArea: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  ping: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#4D82FF',
  },
  logo: { width: 132, height: 132 },
  brand: { marginTop: 8, color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 6 },
  spinnerWrap: { position: 'absolute', bottom: 120, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  spinner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopColor: '#4D82FF',
  },
  spinnerReverse: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
    borderBottomColor: '#FFFFFF',
  },
});
