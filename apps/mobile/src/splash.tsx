import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

export function SplashScreen({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring3, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start(() => {});

    Animated.loop(
      Animated.sequence([
        Animated.timing(barWidth, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.delay(500),
        Animated.timing(barWidth, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, [fade, iconScale, iconOpacity, ring1, ring2, ring3, barWidth]);

  useEffect(() => {
    if (ready) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1.4, duration: 400, useNativeDriver: true }),
      ]).start(() => onFinish());
    }
  }, [ready, fade, iconScale, onFinish]);

  const ringScale1 = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.0] });
  const ringOpacity1 = ring1.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.4, 0] });
  const ringScale2 = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] });
  const ringOpacity2 = ring2.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.3, 0] });
  const ringScale3 = ring3.interpolate({ inputRange: [0, 1], outputRange: [0.2, 3.2] });
  const ringOpacity3 = ring3.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.2, 0] });

  const barW = barWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 180] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <View style={styles.center}>
        {/* Rings burst outward from icon */}
        <Animated.View style={[styles.ring, { opacity: ringOpacity1, transform: [{ scale: ringScale1 }] }]} />
        <Animated.View style={[styles.ring, { opacity: ringOpacity2, transform: [{ scale: ringScale2 }] }]} />
        <Animated.View style={[styles.ring, { opacity: ringOpacity3, transform: [{ scale: ringScale3 }] }]} />

        {/* Icon */}
        <Animated.Image
          source={require('../assets/splash-icon.png')}
          style={[styles.icon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}
          resizeMode="contain"
        />

        {/* Loading bar under icon */}
        <View style={styles.barWrap}>
          <Animated.View style={[styles.bar, { width: barW }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#4D82FF' },
  icon: { width: 120, height: 120, borderRadius: 22 },
  barWrap: { marginTop: 14, width: 180, height: 3, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  bar: { height: 3, borderRadius: 2, backgroundColor: '#4D82FF' },
});
