// CommunityMarket logo pieces (direction B, "On the Move"): a gold road
// shaped like a C around a cream M, with a rider dot travelling along it.
//
// - BrandMark:    the still logo (with the rider dot).
// - BrandWordmark: "CommunityMarket" lettering, for light or green backgrounds.
// - BrandLoader:  the loading animation (rider dot going round the C).
// - BrandIntro:   the short opening animation, once per app start.
//
// Everything moves on the phone's graphics engine (useNativeDriver), and when
// the phone has animations switched off ("Remove animations", or battery saver
// on phones that turn animations off), the logo is shown still.

import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export const BRAND = {
  green: "#0b4a2f",
  gold: "#f2b33d",
  cream: "#fbf7ee",
};

const MARK = require("../../assets/images/brand/logo-mark.png");
const MARK_STILL = require("../../assets/images/brand/logo-mark-dot.png");
const WORDMARK_DARK = require("../../assets/images/brand/wordmark-dark.png");
const WORDMARK_LIGHT = require("../../assets/images/brand/wordmark-light.png");
const WORDMARK_RATIO = 1085 / 114; // width / height of the wordmark pictures

// Positions in the logo picture (a 300 x 300 drawing).
const RING_TOP = 40 / 300; // rider dot's path, top of the C
const DOT_R = 18 / 300;
const HOME_X = 262 / 300; // where the rider arrives (the C's opening)
const HOME_Y = 150 / 300;
const HOME_R = 9 / 300;

// The C runs from the bottom right, round the left, to the top right.
const ROTATE_FROM = "-225deg";
const ROTATE_TO = "45deg";

/** true when the phone asks apps not to animate. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setReduce(on))
      .catch(() => alive && setReduce(false));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => setReduce(on));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function BrandMark({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessible accessibilityRole="image" accessibilityLabel="CommunityMarket">
      <Image source={MARK_STILL} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

export function BrandWordmark({ height = 22, light = false }: { height?: number; light?: boolean }) {
  return (
    <Image
      source={light ? WORDMARK_LIGHT : WORDMARK_DARK}
      style={{ height, width: height * WORDMARK_RATIO }}
      resizeMode="contain"
      accessibilityLabel="CommunityMarket"
    />
  );
}

// The rider dot, placed on the C; turning the box moves it along the road.
function RiderDot({ size, spin, opacity }: { size: number; spin: Animated.Value; opacity: Animated.AnimatedInterpolation<number> | number }) {
  const r = size * DOT_R;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: [ROTATE_FROM, ROTATE_TO] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, transform: [{ rotate }] }]}>
      <View
        style={{
          position: "absolute",
          left: size / 2 - r,
          top: size * RING_TOP - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: BRAND.cream,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: r * 0.9, height: r * 0.9, borderRadius: r, backgroundColor: BRAND.green }} />
      </View>
    </Animated.View>
  );
}

/** Loading animation: the rider dot keeps travelling round the C. */
export function BrandLoader({ size = 56, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce !== false) return; // still logo (or not known yet)
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1150,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, spin]);

  const box = [{ width: size, height: size, alignSelf: "center" as const }, style];
  if (reduce !== false) {
    return (
      <View style={box} accessibilityRole="progressbar" accessibilityLabel="Loading">
        <Image source={MARK_STILL} style={{ width: size, height: size }} resizeMode="contain" />
      </View>
    );
  }
  const opacity = spin.interpolate({ inputRange: [0, 0.1, 0.88, 1], outputRange: [0, 1, 1, 0] });
  return (
    <View style={box} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />
      <RiderDot size={size} spin={spin} opacity={opacity} />
    </View>
  );
}

// Plays once per app start (not when coming back to the app).
let introPlayed = false;

/** Opening animation over the app: about 1.5 seconds, then it fades away. */
export function BrandIntro() {
  const [show, setShow] = useState(() => !introPlayed && Platform.OS !== "web");
  const reduce = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!show || reduce === null) return;
    introPlayed = true;
    const native = Platform.OS !== "web";
    const out = Animated.timing(fade, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: native });
    const run = reduce
      ? Animated.sequence([Animated.timing(words, { toValue: 1, duration: 1, useNativeDriver: native }), Animated.delay(550), out])
      : Animated.sequence([
          Animated.parallel([
            Animated.timing(words, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: native }),
            Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
          ]),
          Animated.timing(flash, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: native }),
          out,
        ]);
    run.start(() => setShow(false));
    // Never hold the app up, whatever happens.
    const safety = setTimeout(() => setShow(false), 3000);
    return () => {
      run.stop();
      clearTimeout(safety);
    };
  }, [show, reduce, spin, words, flash, fade]);

  if (!show) return null;

  const size = 150;
  const homeR = size * HOME_R;
  const dotOpacity = spin.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 1, 1, 0] });
  const homeScale = flash.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.9, 1] });
  const ringScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.8] });
  const ringOpacity = flash.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });
  const rise = words.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[styles.intro, { opacity: fade }]} pointerEvents="none">
      <View style={{ width: size, height: size }}>
        <Image source={reduce ? MARK_STILL : MARK} style={{ width: size, height: size }} resizeMode="contain" />
        {reduce ? null : (
          <>
            <Animated.View
              style={{
                position: "absolute",
                left: size * HOME_X - homeR,
                top: size * HOME_Y - homeR,
                width: homeR * 2,
                height: homeR * 2,
                borderRadius: homeR,
                borderWidth: 2,
                borderColor: BRAND.gold,
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                left: size * HOME_X - homeR,
                top: size * HOME_Y - homeR,
                width: homeR * 2,
                height: homeR * 2,
                borderRadius: homeR,
                backgroundColor: BRAND.cream,
                transform: [{ scale: homeScale }],
              }}
            />
            <RiderDot size={size} spin={spin} opacity={dotOpacity} />
          </>
        )}
      </View>
      <Animated.View style={{ alignItems: "center", marginTop: 26, opacity: words, transform: [{ translateY: rise }] }}>
        <BrandWordmark height={30} light />
        <Text style={styles.tagline}>Your market, at your door.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  intro: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: BRAND.green,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: { color: "#e7efe9", fontSize: 15, marginTop: 12, letterSpacing: 0.3 },
});
